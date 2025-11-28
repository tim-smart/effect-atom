import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import type * as Atom from "../Atom.js"
import type * as Registry from "../Registry.js"
import * as Result from "../Result.js"

const constImmediate = { immediate: true }
function constListener(_: any) {}

/** @internal */
export const TypeId: Registry.TypeId = "~effect-atom/atom/Registry"

/** @internal */
export const make = (options?: {
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}): Registry.Registry =>
  new RegistryImpl(
    options?.initialValues,
    options?.scheduleTask,
    options?.timeoutResolution,
    options?.defaultIdleTTL
  )

const SerializableTypeId: Atom.SerializableTypeId = "~effect-atom/atom/Atom/Serializable"
const atomKey = <A>(atom: Atom.Atom<A>): Atom.Atom<A> | string =>
  SerializableTypeId in atom ? (atom as Atom.Serializable)[SerializableTypeId].key : atom

class RegistryImpl implements Registry.Registry {
  readonly [TypeId]: Registry.TypeId
  readonly timeoutResolution: number

  constructor(
    initialValues?: Iterable<readonly [Atom.Atom<any>, any]>,
    readonly scheduleTask = (cb: () => void): void => queueMicrotask(cb),
    timeoutResolution?: number,
    readonly defaultIdleTTL?: number
  ) {
    this[TypeId] = TypeId
    if (timeoutResolution === undefined && defaultIdleTTL !== undefined) {
      this.timeoutResolution = Math.round(defaultIdleTTL / 2)
    } else {
      this.timeoutResolution = timeoutResolution ?? 1000
    }
    if (initialValues !== undefined) {
      for (const [atom, value] of initialValues) {
        this.ensureNode(atom).setValue(value)
      }
    }
  }

  readonly nodes = new Map<Atom.Atom<any> | string, Node<any>>()
  readonly preloadedSerializable = new Map<string, unknown>()
  readonly timeoutBuckets = new Map<number, readonly [nodes: Set<Node<any>>, handle: number]>()
  readonly nodeTimeoutBucket = new Map<Node<any>, number>()
  disposed = false

  getNodes() {
    return this.nodes
  }

  get<A>(atom: Atom.Atom<A>): A {
    return this.ensureNode(atom).value()
  }

  set<R, W>(atom: Atom.Writable<R, W>, value: W): void {
    atom.write(this.ensureNode(atom).writeContext, value)
  }

  setSerializable(key: string, encoded: unknown): void {
    this.preloadedSerializable.set(key, encoded)
  }

  modify<R, W, A>(atom: Atom.Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]): A {
    const node = this.ensureNode(atom)
    const result = f(node.value())
    atom.write(node.writeContext, result[1])
    return result[0]
  }

  update<R, W>(atom: Atom.Writable<R, W>, f: (_: R) => W): void {
    const node = this.ensureNode(atom)
    atom.write(node.writeContext, f(node.value()))
  }

  refresh = <A>(atom: Atom.Atom<A>): void => {
    if (atom.refresh !== undefined) {
      atom.refresh(this.refresh)
    } else {
      this.invalidateAtom(atom)
    }
  }

  subscribe<A>(atom: Atom.Atom<A>, f: (_: A) => void, options?: { readonly immediate?: boolean }): () => void {
    const node = this.ensureNode(atom)
    if (options?.immediate) {
      f(node.value())
    }
    const remove = node.subscribe(function() {
      f(node._value)
    })
    return () => {
      remove()
      if (node.canBeRemoved) {
        this.scheduleNodeRemoval(node)
      }
    }
  }

  mount<A>(atom: Atom.Atom<A>) {
    return this.subscribe(atom, constListener, constImmediate)
  }

  atomHasTtl(atom: Atom.Atom<any>): boolean {
    return !atom.keepAlive && atom.idleTTL !== 0 && (atom.idleTTL !== undefined || this.defaultIdleTTL !== undefined)
  }

  ensureNode<A>(atom: Atom.Atom<A>): Node<A> {
    const key = atomKey(atom)
    let node = this.nodes.get(key)
    if (node === undefined) {
      node = this.createNode(atom)
      this.nodes.set(key, node)
    } else if (this.atomHasTtl(atom)) {
      this.removeNodeTimeout(node)
    }
    if (typeof key === "string" && this.preloadedSerializable.has(key)) {
      const encoded = this.preloadedSerializable.get(key)
      this.preloadedSerializable.delete(key)
      const decoded = (atom as any as Atom.Serializable)[SerializableTypeId].decode(encoded)
      node.setValue(decoded)
    }
    return node
  }

  createNode<A>(atom: Atom.Atom<A>): Node<A> {
    if (this.disposed) {
      throw new Error(`Cannot access Atom ${atom}: registry is disposed`)
    }

    if (!atom.keepAlive) {
      this.scheduleAtomRemoval(atom)
    }
    return new Node(this, atom)
  }

  invalidateAtom = <A>(atom: Atom.Atom<A>): void => {
    this.ensureNode(atom).invalidate()
  }

  scheduleAtomRemoval(atom: Atom.Atom<any>): void {
    this.scheduleTask(() => {
      const node = this.nodes.get(atomKey(atom))
      if (node !== undefined && node.canBeRemoved) {
        this.removeNode(node)
      }
    })
  }

  scheduleNodeRemoval(node: Node<any>): void {
    this.scheduleTask(() => {
      if (node.canBeRemoved) {
        this.removeNode(node)
      }
    })
  }

  removeNode(node: Node<any>): void {
    if (this.atomHasTtl(node.atom)) {
      this.setNodeTimeout(node)
    } else {
      this.nodes.delete(atomKey(node.atom))
      node.remove()
    }
  }

  setNodeTimeout(node: Node<any>): void {
    if (this.nodeTimeoutBucket.has(node)) {
      return
    }

    let idleTTL = node.atom.idleTTL ?? this.defaultIdleTTL!
    if (this.#currentSweepTTL !== null) {
      idleTTL -= this.#currentSweepTTL
      if (idleTTL <= 0) {
        this.nodes.delete(atomKey(node.atom))
        node.remove()
        return
      }
    }
    const ttl = Math.ceil(idleTTL! / this.timeoutResolution) * this.timeoutResolution
    const timestamp = Date.now() + ttl
    const bucket = timestamp - (timestamp % this.timeoutResolution) + this.timeoutResolution

    let entry = this.timeoutBuckets.get(bucket)
    if (entry === undefined) {
      entry = [
        new Set<Node<any>>(),
        setTimeout(() => this.sweepBucket(bucket), bucket - Date.now())
      ]
      this.timeoutBuckets.set(bucket, entry)
    }
    entry[0].add(node)
    this.nodeTimeoutBucket.set(node, bucket)
  }

  removeNodeTimeout(node: Node<any>): void {
    const bucket = this.nodeTimeoutBucket.get(node)
    if (bucket === undefined) {
      return
    }
    this.nodeTimeoutBucket.delete(node)
    this.scheduleNodeRemoval(node)

    const [nodes, handle] = this.timeoutBuckets.get(bucket)!
    nodes.delete(node)
    if (nodes.size === 0) {
      clearTimeout(handle)
      this.timeoutBuckets.delete(bucket)
    }
  }

  #currentSweepTTL: number | null = null
  sweepBucket(bucket: number): void {
    const nodes = this.timeoutBuckets.get(bucket)![0]
    this.timeoutBuckets.delete(bucket)

    nodes.forEach((node) => {
      if (!node.canBeRemoved) {
        return
      }
      this.nodeTimeoutBucket.delete(node)
      this.nodes.delete(atomKey(node.atom))
      this.#currentSweepTTL = node.atom.idleTTL ?? this.defaultIdleTTL!
      node.remove()
      this.#currentSweepTTL = null
    })
  }

  reset(): void {
    this.timeoutBuckets.forEach(([, handle]) => clearTimeout(handle))
    this.timeoutBuckets.clear()
    this.nodeTimeoutBucket.clear()

    this.nodes.forEach((node) => node.remove())
    this.nodes.clear()
  }

  dispose(): void {
    this.disposed = true
    this.reset()
  }
}

const enum NodeFlags {
  alive = 1 << 0,
  initialized = 1 << 1,
  waitingForValue = 1 << 2
}

const enum NodeState {
  uninitialized = NodeFlags.alive | NodeFlags.waitingForValue,
  stale = NodeFlags.alive | NodeFlags.initialized | NodeFlags.waitingForValue,
  valid = NodeFlags.alive | NodeFlags.initialized,
  removed = 0
}

class Node<A> {
  constructor(
    readonly registry: RegistryImpl,
    readonly atom: Atom.Atom<A>
  ) {
    this.writeContext = new WriteContextImpl(registry, this)
  }

  state: NodeState = NodeState.uninitialized
  lifetime: Lifetime<A> | undefined
  writeContext: WriteContextImpl<A>

  parents: Array<Node<any>> = []
  previousParents: Array<Node<any>> | undefined
  children: Array<Node<any>> = []
  listeners: Array<() => void> = []
  skipInvalidation = false

  get canBeRemoved(): boolean {
    return !this.atom.keepAlive && this.listeners.length === 0 && this.children.length === 0 &&
      this.state !== 0
  }

  _value: A = undefined as any
  value(): A {
    if ((this.state & NodeFlags.waitingForValue) !== 0) {
      this.lifetime = makeLifetime(this)
      const value = this.atom.read(this.lifetime)
      if ((this.state & NodeFlags.waitingForValue) !== 0) {
        this.setValue(value)
      }

      if (this.previousParents) {
        const parents = this.previousParents
        this.previousParents = undefined
        for (let i = 0; i < parents.length; i++) {
          parents[i].removeChild(this)
          if (parents[i].canBeRemoved) {
            this.registry.scheduleNodeRemoval(parents[i])
          }
        }
      }
    }

    return this._value
  }

  valueOption(): Option.Option<A> {
    if ((this.state & NodeFlags.initialized) === 0) {
      return Option.none()
    }
    return Option.some(this._value)
  }

  setValue(value: A): void {
    if ((this.state & NodeFlags.initialized) === 0) {
      this.state = NodeState.valid
      this._value = value

      if (batchState.phase === BatchPhase.collect) {
        batchState.notify.add(this)
      } else {
        this.notify()
      }

      return
    }

    this.state = NodeState.valid
    if (Equal.equals(this._value, value)) {
      return
    }

    this._value = value
    if (this.skipInvalidation) {
      this.skipInvalidation = false
    } else {
      this.invalidateChildren()
    }

    if (this.listeners.length > 0) {
      if (batchState.phase === BatchPhase.collect) {
        batchState.notify.add(this)
      } else {
        this.notify()
      }
    }
  }

  addParent(parent: Node<any>): void {
    this.parents.push(parent)
    if (this.previousParents !== undefined) {
      const index = this.previousParents.indexOf(parent)
      if (index !== -1) {
        this.previousParents[index] = this.previousParents[this.previousParents.length - 1]
        if (this.previousParents.pop() === undefined) {
          this.previousParents = undefined
        }
      }
    }

    if (parent.children.indexOf(this) === -1) {
      parent.children.push(this)
      if (parent.skipInvalidation) {
        parent.skipInvalidation = false
      }
    }
  }

  removeChild(child: Node<any>): void {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children[index] = this.children[this.children.length - 1]
      this.children.pop()
    }
  }

  invalidate(): void {
    if (this.state === NodeState.valid) {
      this.state = NodeState.stale
      this.disposeLifetime()
    }

    if (batchState.phase === BatchPhase.collect) {
      batchState.stale.push(this)
    } else if (this.atom.lazy && this.listeners.length === 0 && !childrenAreActive(this.children)) {
      this.invalidateChildren()
      this.skipInvalidation = true
    } else {
      this.value()
    }
  }

  invalidateChildren(): void {
    if (this.children.length === 0) {
      return
    }

    const children = this.children
    this.children = []
    for (let i = 0; i < children.length; i++) {
      children[i].invalidate()
    }
  }

  notify(): void {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i]()
    }

    if (batchState.phase === BatchPhase.commit) {
      batchState.notify.delete(this)
    }
  }

  disposeLifetime(): void {
    if (this.lifetime !== undefined) {
      this.lifetime.dispose()
      this.lifetime = undefined
    }

    if (this.parents.length !== 0) {
      this.previousParents = this.parents
      this.parents = []
    }
  }

  remove() {
    this.state = NodeState.removed
    this.listeners = []

    if (this.lifetime === undefined) {
      return
    }

    this.disposeLifetime()

    if (this.previousParents === undefined) {
      return
    }

    const parents = this.previousParents
    this.previousParents = undefined
    for (let i = 0; i < parents.length; i++) {
      parents[i].removeChild(this)
      if (parents[i].canBeRemoved) {
        this.registry.removeNode(parents[i])
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners[index] = this.listeners[this.listeners.length - 1]
        this.listeners.pop()
      }
    }
  }
}

function childrenAreActive(children: Array<Node<any>>): boolean {
  if (children.length === 0) {
    return false
  }
  let current: Array<Node<any>> | undefined = children
  let stack: Array<Array<Node<any>>> | undefined
  let stackIndex = 0
  while (current !== undefined) {
    for (let i = 0, len = current.length; i < len; i++) {
      const child = current[i]
      if (!child.atom.lazy || child.listeners.length > 0) {
        return true
      } else if (child.children.length > 0) {
        if (stack === undefined) {
          stack = [child.children]
        } else {
          stack.push(child.children)
        }
      }
    }
    current = stack?.[stackIndex++]
  }
  return false
}

interface Lifetime<A> extends Atom.Context {
  isFn: boolean
  readonly node: Node<A>
  finalizers: Array<() => void> | undefined
  disposed: boolean
  readonly dispose: () => void
}

const disposedError = (atom: Atom.Atom<any>): Error => new Error(`Cannot use context of disposed Atom: ${atom}`)

const LifetimeProto: Omit<Lifetime<any>, "node" | "finalizers" | "disposed" | "isFn"> = {
  get registry(): RegistryImpl {
    return (this as Lifetime<any>).node.registry
  },

  addFinalizer(this: Lifetime<any>, f: () => void): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.finalizers ??= []
    this.finalizers.push(f)
  },

  get<A>(this: Lifetime<any>, atom: Atom.Atom<A>): A {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    const parent = this.node.registry.ensureNode(atom)
    this.node.addParent(parent)
    return parent.value()
  },

  result<A, E>(this: Lifetime<any>, atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }): Effect.Effect<A, E> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    } else if (this.isFn) {
      return this.resultOnce(atom)
    }
    const result = this.get(atom)
    if (options?.suspendOnWaiting && result.waiting) {
      return Effect.never
    }
    switch (result._tag) {
      case "Initial": {
        return Effect.never
      }
      case "Failure": {
        return Exit.failCause(result.cause)
      }
      case "Success": {
        return Effect.succeed(result.value)
      }
    }
  },

  resultOnce<A, E>(this: Lifetime<any>, atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }): Effect.Effect<A, E> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    return Effect.async<A, E>((resume) => {
      const result = this.once(atom)
      if (result._tag !== "Initial" && !(options?.suspendOnWaiting && result.waiting)) {
        return resume(Result.toExit(result) as any)
      }
      const cancel = this.node.registry.subscribe(atom, (result) => {
        if (result._tag === "Initial" || (options?.suspendOnWaiting && result.waiting)) return
        cancel()
        resume(Result.toExit(result) as any)
      }, { immediate: false })
      return Effect.sync(cancel)
    })
  },

  setResult<A, E, W>(this: Lifetime<any>, atom: Atom.Writable<Result.Result<A, E>, W>, value: W): Effect.Effect<A, E> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.node.registry.set(atom, value)
    return this.resultOnce(atom, { suspendOnWaiting: true })
  },

  some<A>(this: Lifetime<any>, atom: Atom.Atom<Option.Option<A>>): Effect.Effect<A> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    } else if (this.isFn) {
      return this.someOnce(atom)
    }
    const result = this.get(atom)
    return result._tag === "None" ? Effect.never : Effect.succeed(result.value)
  },

  someOnce<A>(this: Lifetime<any>, atom: Atom.Atom<Option.Option<A>>): Effect.Effect<A> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    return Effect.async<A>((resume) => {
      const result = this.once(atom)
      if (Option.isSome(result)) {
        return resume(Effect.succeed(result.value))
      }
      const cancel = this.node.registry.subscribe(atom, (result) => {
        if (Option.isNone(result)) return
        cancel()
        resume(Effect.succeed(result.value))
      }, { immediate: false })
      return Effect.sync(cancel)
    })
  },

  once<A>(this: Lifetime<any>, atom: Atom.Atom<A>): A {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    return this.node.registry.get(atom)
  },

  self<A>(this: Lifetime<any>): Option.Option<A> {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    return this.node.valueOption() as any
  },

  refresh<A>(this: Lifetime<any>, atom: Atom.Atom<A>): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.node.registry.refresh(atom)
  },

  refreshSelf(this: Lifetime<any>): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.node.invalidate()
  },

  mount<A>(this: Lifetime<any>, atom: Atom.Atom<A>): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.addFinalizer(this.node.registry.mount(atom))
  },

  subscribe<A>(this: Lifetime<any>, atom: Atom.Atom<A>, f: (_: A) => void, options?: {
    readonly immediate?: boolean
  }): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.addFinalizer(this.node.registry.subscribe(atom, f, options))
  },

  setSelf<A>(this: Lifetime<any>, a: A): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.node.setValue(a as any)
  },

  set<R, W>(this: Lifetime<any>, atom: Atom.Writable<R, W>, value: W): void {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }
    this.node.registry.set(atom, value)
  },

  stream<A>(this: Lifetime<any>, atom: Atom.Atom<A>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }) {
    if (this.disposed) {
      throw disposedError(this.node.atom)
    }

    return pipe(
      Effect.acquireRelease(
        Queue.bounded<A>(options?.bufferSize ?? 16),
        Queue.shutdown
      ),
      Effect.tap((queue) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            return this.node.registry.subscribe(atom, (_) => {
              Queue.unsafeOffer(queue, _)
            }, { immediate: options?.withoutInitialValue !== true })
          }),
          (cancel) => Effect.sync(cancel)
        )
      ),
      Effect.map((queue) => Stream.fromQueue(queue)),
      Stream.unwrapScoped
    )
  },

  streamResult<A, E>(this: Lifetime<any>, atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }): Stream.Stream<A, E> {
    return pipe(
      this.stream(atom, options),
      Stream.filter(Result.isNotInitial),
      Stream.flatMap((result) =>
        result._tag === "Success" ? Stream.succeed(result.value) : Stream.failCause(result.cause)
      )
    )
  },

  dispose(this: Lifetime<any>): void {
    this.disposed = true
    if (this.finalizers === undefined) {
      return
    }

    const finalizers = this.finalizers
    this.finalizers = undefined
    for (let i = finalizers.length - 1; i >= 0; i--) {
      finalizers[i]()
    }
  }
}

const makeLifetime = <A>(node: Node<A>): Lifetime<A> => {
  function get<A>(atom: Atom.Atom<A>): A {
    if (get.disposed) {
      throw disposedError(atom)
    } else if (get.isFn) {
      return node.registry.get(atom)
    }
    const parent = node.registry.ensureNode(atom)
    node.addParent(parent)
    return parent.value()
  }
  Object.setPrototypeOf(get, LifetimeProto)
  get.isFn = false
  get.disposed = false
  get.finalizers = undefined
  get.node = node
  return get as any
}

class WriteContextImpl<A> implements Atom.WriteContext<A> {
  constructor(
    readonly registry: RegistryImpl,
    readonly node: Node<A>
  ) {}
  get<A>(atom: Atom.Atom<A>): A {
    return this.registry.get(atom)
  }
  set<R, W>(atom: Atom.Writable<R, W>, value: W) {
    return this.registry.set(atom, value)
  }
  setSelf(value: any) {
    return this.node.setValue(value)
  }
  refreshSelf() {
    return this.node.invalidate()
  }
}

// -----------------------------------------------------------------------------
// batching
// -----------------------------------------------------------------------------

/** @internal */
export const enum BatchPhase {
  disabled,
  collect,
  commit
}

/** @internal */
export const batchState = globalValue("@effect-atom/atom/Registry/batchState", () => ({
  phase: BatchPhase.disabled,
  depth: 0,
  stale: [] as Array<Node<any>>,
  notify: new Set<Node<any>>()
}))

/** @internal */
export function batch(f: () => void): void {
  batchState.phase = BatchPhase.collect
  batchState.depth++
  try {
    f()
    if (batchState.depth === 1) {
      for (let i = 0; i < batchState.stale.length; i++) {
        batchRebuildNode(batchState.stale[i])
      }
      batchState.phase = BatchPhase.commit
      for (const node of batchState.notify) {
        node.notify()
      }
      batchState.notify.clear()
    }
  } finally {
    batchState.depth--
    if (batchState.depth === 0) {
      batchState.phase = BatchPhase.disabled
      batchState.stale = []
    }
  }
}

function batchRebuildNode(node: Node<any>) {
  if (node.state === NodeState.valid) {
    return
  }

  for (let i = 0; i < node.parents.length; i++) {
    const parent = node.parents[i]
    if (parent.state !== NodeState.valid) {
      batchRebuildNode(parent)
    }
  }

  // @ts-ignore
  if (node.state !== NodeState.valid) {
    node.value()
  }
}
