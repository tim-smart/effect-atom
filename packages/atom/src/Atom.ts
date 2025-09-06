/**
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Arr from "effect/Array"
import { NoSuchElementException } from "effect/Cause"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as EffectContext from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import type { LazyArg } from "effect/Function"
import { constant, constVoid, dual, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import { hasProperty, isObject } from "effect/Predicate"
import type { ReadonlyRecord } from "effect/Record"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Subscribable from "effect/Subscribable"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type { NoInfer } from "effect/Types"
import * as internalRegistry from "./internal/registry.js"
import { runCallbackSync } from "./internal/runtime.js"
import * as Registry from "./Registry.js"
import { AtomRegistry as AtomRegistry } from "./Registry.js"
import * as Result from "./Result.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: TypeId = "~effect-atom/atom/Atom"

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = "~effect-atom/atom/Atom"

/**
 * @since 1.0.0
 * @category models
 */
export interface Atom<A> extends Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly keepAlive: boolean
  readonly lazy: boolean
  readonly read: (get: Context) => A
  readonly refresh?: (f: <A>(atom: Atom<A>) => void) => void
  readonly label?: readonly [name: string, stack: string]
  readonly idleTTL?: number
}

/**
 * @since 1.0.0
 * @category Guards
 */
export const isAtom = (u: unknown): u is Atom<any> => hasProperty(u, TypeId)

/**
 * @since 1.0.0
 */
export type Type<T extends Atom<any>> = T extends Atom<infer A> ? A : never

/**
 * @since 1.0.0
 */
export type Success<T extends Atom<any>> = T extends Atom<Result.Result<infer A, infer _>> ? A : never

/**
 * @since 1.0.0
 */
export type PullSuccess<T extends Atom<any>> = T extends Atom<PullResult<infer A, infer _>> ? A : never

/**
 * @since 1.0.0
 */
export type Failure<T extends Atom<any>> = T extends Atom<Result.Result<infer _, infer E>> ? E : never

/**
 * @since 1.0.0
 */
export type WithoutSerializable<T extends Atom<any>> = T extends Writable<infer R, infer W> ? Writable<R, W>
  : Atom<Type<T>>

/**
 * @since 1.0.0
 * @category type ids
 */
export const WritableTypeId: WritableTypeId = "~effect-atom/atom/Atom/Writable"

/**
 * @since 1.0.0
 * @category type ids
 */
export type WritableTypeId = "~effect-atom/atom/Atom/Writable"

/**
 * @since 1.0.0
 * @category models
 */
export interface Writable<R, W = R> extends Atom<R> {
  readonly [WritableTypeId]: WritableTypeId
  readonly write: (ctx: WriteContext<R>, value: W) => void
}

/**
 * @since 1.0.0
 * @category context
 */
export interface Context {
  <A>(atom: Atom<A>): A
  readonly get: <A>(atom: Atom<A>) => A
  readonly result: <A, E>(atom: Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }) => Effect.Effect<A, E>
  readonly resultOnce: <A, E>(atom: Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }) => Effect.Effect<A, E>
  readonly once: <A>(atom: Atom<A>) => A
  readonly addFinalizer: (f: () => void) => void
  readonly mount: <A>(atom: Atom<A>) => void
  readonly refresh: <A>(atom: Atom<A>) => void
  readonly refreshSelf: () => void
  readonly self: <A>() => Option.Option<A>
  readonly setSelf: <A>(a: A) => void
  readonly set: <R, W>(atom: Writable<R, W>, value: W) => void
  readonly some: <A>(atom: Atom<Option.Option<A>>) => Effect.Effect<A>
  readonly someOnce: <A>(atom: Atom<Option.Option<A>>) => Effect.Effect<A>
  readonly stream: <A>(atom: Atom<A>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }) => Stream.Stream<A>
  readonly streamResult: <A, E>(atom: Atom<Result.Result<A, E>>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }) => Stream.Stream<A, E>
  readonly subscribe: <A>(atom: Atom<A>, f: (_: A) => void, options?: {
    readonly immediate?: boolean
  }) => void
  readonly registry: Registry.Registry
}

/**
 * @since 1.0.0
 * @category context
 */
export interface WriteContext<A> {
  readonly get: <A>(atom: Atom<A>) => A
  readonly refreshSelf: () => void
  readonly setSelf: (a: A) => void
  readonly set: <R, W>(atom: Writable<R, W>, value: W) => void
}

const AtomProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  toJSON(this: Atom<any>) {
    return {
      _id: "Atom",
      keepAlive: this.keepAlive,
      lazy: this.lazy,
      label: this.label
    }
  },
  toString() {
    return Inspectable.format(this)
  },
  [Inspectable.NodeInspectSymbol](this: Atom<any>) {
    return this.toJSON()
  }
} as const

const RuntimeProto = {
  ...AtomProto,
  atom(this: AtomRuntime<any, any>, arg: any, options?: { readonly initialValue?: unknown }) {
    const read = makeRead(arg, options)
    return readable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return read(get, runtimeResult.value)
    })
  },

  fn(this: AtomRuntime<any, any>, arg: any, options?: {
    readonly initialValue?: unknown
    readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
  }) {
    if (arguments.length === 0) {
      return (arg: any, options?: {}) => makeFnRuntime(this, arg, options)
    }
    return makeFnRuntime(this, arg, options)
  },

  pull(this: AtomRuntime<any, any>, arg: any, options?: {
    readonly disableAccumulation?: boolean
    readonly initialValue?: ReadonlyArray<any>
  }) {
    const pullSignal = state(0)
    const pullAtom = readable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return makeEffect(
        get,
        makeStreamPullEffect(get, pullSignal, arg, options),
        Result.initial(true),
        runtimeResult.value
      )
    })
    return makeStreamPull(pullSignal, pullAtom)
  },

  subscriptionRef(this: AtomRuntime<any, any>, ref: any) {
    return makeSubRef(
      readable((get) => {
        const previous = get.self<Result.Result<any, any>>()
        const runtimeResult = get(this)
        if (runtimeResult._tag !== "Success") {
          return Result.replacePrevious(runtimeResult, previous)
        }
        const value = typeof ref === "function" ? ref(get) : ref
        return SubscriptionRef.SubscriptionRefTypeId in value
          ? value
          : makeEffect(get, value, Result.initial(true), runtimeResult.value)
      }),
      (get, ref) => {
        const runtime = Result.getOrThrow(get(this))
        return readSubscribable(get, ref, runtime)
      }
    )
  },

  subscribable(this: AtomRuntime<any, any>, arg: any) {
    return makeSubscribable(
      readable((get) => {
        const previous = get.self<Result.Result<any, any>>()
        const runtimeResult = get(this)
        if (runtimeResult._tag !== "Success") {
          return Result.replacePrevious(runtimeResult, previous)
        }
        const value = typeof arg === "function" ? arg(get) : arg
        return Subscribable.isSubscribable(value) ?
          value as Subscribable.Subscribable<any, any>
          : makeEffect(get, value, Result.initial(true), runtimeResult.value)
      }),
      (get, ref) => {
        const runtime = Result.getOrThrow(get(this))
        return readSubscribable(get, ref, runtime)
      }
    )
  }
}

const makeFnRuntime = (
  self: AtomRuntime<any, any>,
  arg: (
    arg: any,
    get: FnContext
  ) =>
    | Effect.Effect<any, any, Scope.Scope | AtomRegistry>
    | Stream.Stream<any, any, AtomRegistry>,
  options?: {
    readonly initialValue?: unknown
    readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
  }
) => {
  const [read, write, argAtom] = makeResultFn(
    options?.reactivityKeys ?
      ((a: any, get: FnContext) => {
        const effect = arg(a, get)
        return Effect.isEffect(effect)
          ? Reactivity.mutation(effect, options.reactivityKeys!)
          : Stream.ensuring(effect, Reactivity.invalidate(options.reactivityKeys!))
      }) as any :
      arg,
    options
  )
  return writable((get) => {
    get.get(argAtom)
    const previous = get.self<Result.Result<any, any>>()
    const runtimeResult = get.get(self)
    if (runtimeResult._tag !== "Success") {
      return Result.replacePrevious(runtimeResult, previous)
    }
    return read(get, runtimeResult.value)
  }, write)
}

const WritableProto = {
  ...AtomProto,
  [WritableTypeId]: WritableTypeId
} as const

/**
 * @since 1.0.0
 * @category refinements
 */
export const isWritable = <R, W>(atom: Atom<R>): atom is Writable<R, W> => WritableTypeId in atom

/**
 * @since 1.0.0
 * @category constructors
 */
export const readable = <A>(
  read: (get: Context) => A,
  refresh?: (f: <A>(atom: Atom<A>) => void) => void
): Atom<A> => {
  const self = Object.create(AtomProto)
  self.keepAlive = false
  self.lazy = true
  self.read = read
  self.refresh = refresh
  return self
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const writable = <R, W>(
  read: (get: Context) => R,
  write: (ctx: WriteContext<R>, value: W) => void,
  refresh?: (f: <A>(atom: Atom<A>) => void) => void
): Writable<R, W> => {
  const self = Object.create(WritableProto)
  self.keepAlive = false
  self.lazy = true
  self.read = read
  self.write = write
  self.refresh = refresh
  return self
}

function constSetSelf<A>(ctx: WriteContext<A>, value: A) {
  ctx.setSelf(value)
}

// -----------------------------------------------------------------------------
// constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <A, E>(create: (get: Context) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A
  }): Atom<Result.Result<A, E>>
  <A, E>(effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A
  }): Atom<Result.Result<A, E>>
  <A, E>(create: (get: Context) => Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A
  }): Atom<Result.Result<A, E>>
  <A, E>(stream: Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A
  }): Atom<Result.Result<A, E>>
  <A>(create: (get: Context) => A): Atom<A>
  <A>(initialValue: A): Writable<A>
} = (arg: any, options?: { readonly initialValue?: unknown }) => {
  const readOrAtom = makeRead(arg, options)
  if (TypeId in readOrAtom) {
    return readOrAtom as any
  }
  return readable(readOrAtom)
}

// -----------------------------------------------------------------------------
// constructors - effect
// -----------------------------------------------------------------------------

const isDataType = (u: object): u is Option.Option<unknown> | Either.Either<unknown, unknown> =>
  Option.TypeId in u ||
  Either.TypeId in u

const makeRead: {
  <A, E>(effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(create: (get: Context) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(stream: Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(create: (get: Context) => Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A>(create: (get: Context) => A): (get: Context, runtime?: Runtime.Runtime<any>) => A
  <A>(initialValue: A): Writable<A>
} = <A, E>(
  arg:
    | Effect.Effect<A, E, Scope.Scope | AtomRegistry>
    | ((get: Context) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>)
    | Stream.Stream<A, E, AtomRegistry>
    | ((get: Context) => Stream.Stream<A, E, AtomRegistry>)
    | ((get: Context) => A)
    | A,
  options?: { readonly initialValue?: unknown }
) => {
  if (typeof arg === "function" && !Effect.isEffect(arg) && !(Stream.StreamTypeId in arg)) {
    const create = arg as (get: Context) => any
    return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
      const value = create(get)
      if (isObject(value)) {
        if (isDataType(value)) {
          return value
        } else if (Effect.EffectTypeId in value) {
          return effect(get, value as any, options, providedRuntime)
        } else if (Stream.StreamTypeId in value) {
          return stream(get, value as any, options, providedRuntime)
        }
      }
      return value
    }
  } else if (isObject(arg)) {
    if (isDataType(arg)) {
      return state(arg)
    } else if (Effect.EffectTypeId in arg) {
      return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
        return effect(get, arg as any, options, providedRuntime)
      }
    } else if (Stream.StreamTypeId in arg) {
      return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
        return stream(get, arg as any, options, providedRuntime)
      }
    }
  }

  return state(arg) as any
}

const state = <A>(
  initialValue: A
): Writable<A> =>
  writable(function(_get) {
    return initialValue
  }, constSetSelf)

const effect = <A, E>(
  get: Context,
  effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
  options?: { readonly initialValue?: A; readonly uninterruptible?: boolean },
  runtime?: Runtime.Runtime<any>
): Result.Result<A, E> => {
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()
  return makeEffect(get, effect, initialValue, runtime, options?.uninterruptible)
}

function makeEffect<A, E>(
  ctx: Context,
  effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
  initialValue: Result.Result<A, E>,
  runtime = Runtime.defaultRuntime,
  uninterruptible = false
): Result.Result<A, E> {
  const previous = ctx.self<Result.Result<A, E>>()

  const scope = Effect.runSync(Scope.make())
  ctx.addFinalizer(() => {
    Effect.runFork(Scope.close(scope, Exit.void))
  })
  const contextMap = new Map(runtime.context.unsafeMap)
  contextMap.set(Scope.Scope.key, scope)
  contextMap.set(AtomRegistry.key, ctx.registry)
  const scopedRuntime = Runtime.make({
    context: EffectContext.unsafeMake(contextMap),
    fiberRefs: runtime.fiberRefs,
    runtimeFlags: runtime.runtimeFlags
  })
  let syncResult: Result.Result<A, E> | undefined
  let isAsync = false
  const cancel = runCallbackSync(scopedRuntime)(
    effect,
    function(exit) {
      syncResult = Result.fromExitWithPrevious(exit, previous)
      if (isAsync) {
        ctx.setSelf(syncResult)
      }
    },
    uninterruptible
  )
  isAsync = true
  if (cancel !== undefined) {
    ctx.addFinalizer(cancel)
  }
  if (syncResult !== undefined) {
    return syncResult
  } else if (previous._tag === "Some") {
    return Result.waitingFrom(previous)
  }
  return Result.waiting(initialValue)
}

// -----------------------------------------------------------------------------
// context
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category models
 */
export interface AtomRuntime<R, ER = never> extends Atom<Result.Result<Runtime.Runtime<R>, ER>> {
  readonly factory: RuntimeFactory

  readonly layer: Atom<Layer.Layer<R, ER>>

  readonly atom: {
    <A, E>(
      create: (get: Context) => Effect.Effect<A, E, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>,
      options?: {
        readonly initialValue?: A
      }
    ): Atom<Result.Result<A, E | ER>>
    <A, E>(effect: Effect.Effect<A, E, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>, options?: {
      readonly initialValue?: A
    }): Atom<Result.Result<A, E | ER>>
    <A, E>(create: (get: Context) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>, options?: {
      readonly initialValue?: A
    }): Atom<Result.Result<A, E | ER>>
    <A, E>(stream: Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>, options?: {
      readonly initialValue?: A
    }): Atom<Result.Result<A, E | ER>>
  }

  readonly fn: {
    <Arg>(): {
      <E, A>(
        fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry | Reactivity.Reactivity | R>,
        options?: {
          readonly initialValue?: A | undefined
          readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        }
      ): AtomResultFn<Arg, A, E | ER>
      <E, A>(
        fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
        options?: {
          readonly initialValue?: A | undefined
          readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        }
      ): AtomResultFn<Arg, A, E | ER | NoSuchElementException>
    }
    <E, A, Arg = void>(
      fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A | undefined
        readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      }
    ): AtomResultFn<Arg, A, E | ER>
    <E, A, Arg = void>(
      fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A | undefined
        readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      }
    ): AtomResultFn<Arg, A, E | ER | NoSuchElementException>
  }

  readonly pull: <A, E>(
    create:
      | ((get: Context) => Stream.Stream<A, E, R | AtomRegistry | Reactivity.Reactivity>)
      | Stream.Stream<A, E, R | AtomRegistry | Reactivity.Reactivity>,
    options?: {
      readonly disableAccumulation?: boolean
      readonly initialValue?: ReadonlyArray<A>
    }
  ) => Writable<PullResult<A, E | ER>, void>

  readonly subscriptionRef: <A, E>(
    create:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, R | AtomRegistry | Reactivity.Reactivity>
      | ((
        get: Context
      ) => Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, R | AtomRegistry | Reactivity.Reactivity>)
  ) => Writable<Result.Result<A, E>, A>

  readonly subscribable: <A, E, E1 = never>(
    create:
      | Effect.Effect<Subscribable.Subscribable<A, E, R>, E1, R | AtomRegistry | Reactivity.Reactivity>
      | ((
        get: Context
      ) => Effect.Effect<Subscribable.Subscribable<A, E, R>, E1, R | AtomRegistry | Reactivity.Reactivity>)
  ) => Atom<Result.Result<A, E | E1>>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RuntimeFactory {
  <R, E>(
    create:
      | Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>
      | ((get: Context) => Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>)
  ): AtomRuntime<R, E>
  readonly memoMap: Layer.MemoMap
  readonly addGlobalLayer: <A, E>(layer: Layer.Layer<A, E, AtomRegistry | Reactivity.Reactivity>) => void

  /**
   * Uses the `Reactivity` service from the runtime to refresh the atom whenever
   * the keys change.
   */
  readonly withReactivity: (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ) => <A extends Atom<any>>(atom: A) => A
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const context: (options: {
  readonly memoMap: Layer.MemoMap
}) => RuntimeFactory = (options) => {
  let globalLayer: Layer.Layer<any, any, AtomRegistry> = Reactivity.layer
  function factory<E, R>(
    create:
      | Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>
      | ((get: Context) => Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>)
  ): AtomRuntime<R, E> {
    const self = Object.create(RuntimeProto)
    self.keepAlive = false
    self.lazy = true
    self.refresh = undefined
    self.factory = factory

    const layerAtom = keepAlive(
      typeof create === "function"
        ? readable((get) => Layer.provideMerge(create(get), globalLayer))
        : readable(() => Layer.provideMerge(create, globalLayer))
    )
    self.layer = layerAtom

    self.read = function read(get: Context) {
      const layer = get(layerAtom)
      const build = Effect.flatMap(
        Effect.flatMap(Effect.scope, (scope) => Layer.buildWithMemoMap(layer, options.memoMap, scope)),
        (context) => Effect.provide(Effect.runtime<R>(), context)
      )
      return effect(get, build, { uninterruptible: true })
    }

    return self
  }
  factory.memoMap = options.memoMap
  factory.addGlobalLayer = (layer: Layer.Layer<any, any, AtomRegistry | Reactivity.Reactivity>) => {
    globalLayer = Layer.provideMerge(globalLayer, Layer.provide(layer, Reactivity.layer))
  }
  const reactivityAtom = make(
    Effect.scopeWith((scope) => Layer.buildWithMemoMap(Reactivity.layer, options.memoMap, scope)).pipe(
      Effect.map(EffectContext.get(Reactivity.Reactivity))
    )
  )
  factory.withReactivity =
    (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>) =>
    <A extends Atom<any>>(atom: A): A =>
      transform(atom, (get) => {
        const reactivity = Result.getOrThrow(get(reactivityAtom))
        get.addFinalizer(reactivity.unsafeRegister(keys, () => {
          get.refresh(atom)
        }))
        get.subscribe(atom, (value) => get.setSelf(value))
        return get.once(atom)
      }) as any as A
  return factory
}

/**
 * @since 1.0.0
 * @category context
 */
export const defaultMemoMap: Layer.MemoMap = globalValue(
  "@effect-atom/atom/Atom/defaultMemoMap",
  () => Effect.runSync(Layer.makeMemoMap)
)

/**
 * @since 1.0.0
 * @category context
 */
export const runtime: RuntimeFactory = globalValue(
  "@effect-atom/atom/Atom/defaultContext",
  () => context({ memoMap: defaultMemoMap })
)

/**
 * An alias to `Rx.runtime.withReactivity`, for refreshing an atom whenever the
 * keys change in the `Reactivity` service.
 *
 * @since 1.0.0
 * @category Reactivity
 */
export const withReactivity: (
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
) => <A extends Atom<any>>(atom: A) => A = runtime.withReactivity

// -----------------------------------------------------------------------------
// constructors - stream
// -----------------------------------------------------------------------------

const stream = <A, E>(
  get: Context,
  stream: Stream.Stream<A, E, AtomRegistry>,
  options?: { readonly initialValue?: A },
  runtime?: Runtime.Runtime<any>
): Result.Result<A, E | NoSuchElementException> => {
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()
  return makeStream(get, stream, initialValue, runtime)
}

function makeStream<A, E>(
  ctx: Context,
  stream: Stream.Stream<A, E, AtomRegistry>,
  initialValue: Result.Result<A, E | NoSuchElementException>,
  runtime = Runtime.defaultRuntime
): Result.Result<A, E | NoSuchElementException> {
  const previous = ctx.self<Result.Result<A, E | NoSuchElementException>>()

  const writer: Channel.Channel<never, Chunk.Chunk<A>, never, E> = Channel.readWithCause({
    onInput(input: Chunk.Chunk<A>) {
      return Channel.suspend(() => {
        const last = Chunk.last(input)
        if (last._tag === "Some") {
          ctx.setSelf(Result.success(last.value, {
            waiting: true
          }))
        }
        return writer
      })
    },
    onFailure(cause: Cause.Cause<E>) {
      return Channel.sync(() => {
        ctx.setSelf(Result.failureWithPrevious(cause, { previous }))
      })
    },
    onDone(_done: unknown) {
      return Channel.sync(() => {
        pipe(
          ctx.self<Result.Result<A, E | NoSuchElementException>>(),
          Option.flatMap(Result.value),
          Option.match({
            onNone: () => ctx.setSelf(Result.failWithPrevious(new NoSuchElementException(), { previous })),
            onSome: (a) => ctx.setSelf(Result.success(a))
          })
        )
      })
    }
  })

  const registryRuntime = Runtime.make({
    context: EffectContext.add(runtime.context, AtomRegistry, ctx.registry),
    fiberRefs: runtime.fiberRefs,
    runtimeFlags: runtime.runtimeFlags
  })

  const cancel = runCallbackSync(registryRuntime)(
    Channel.runDrain(Channel.pipeTo(Stream.toChannel(stream), writer)),
    constVoid,
    false
  )
  if (cancel !== undefined) {
    ctx.addFinalizer(cancel)
  }

  if (previous._tag === "Some") {
    return Result.waitingFrom(previous)
  }
  return Result.waiting(initialValue)
}

// -----------------------------------------------------------------------------
// constructors - subscription ref
// -----------------------------------------------------------------------------

/** @internal */
const readSubscribable = (
  get: Context,
  sub:
    | Subscribable.Subscribable<any, any>
    | Result.Result<Subscribable.Subscribable<any, any>, any>,
  runtime = Runtime.defaultRuntime
) => {
  if (Subscribable.TypeId in sub) {
    get.addFinalizer(
      sub.changes.pipe(
        Stream.runForEach((value) => {
          get.setSelf(value)
          return Effect.void
        }),
        Runtime.runCallback(runtime)
      )
    )
    return Runtime.runSync(runtime)(sub.get)
  } else if (sub._tag !== "Success") {
    return sub
  }
  return makeStream(get, sub.value.changes, Result.initial(true), runtime)
}

const makeSubRef = (
  refAtom: Atom<SubscriptionRef.SubscriptionRef<any> | Result.Result<SubscriptionRef.SubscriptionRef<any>, any>>,
  read: (
    get: Context,
    ref: SubscriptionRef.SubscriptionRef<any> | Result.Success<SubscriptionRef.SubscriptionRef<any>, any>
  ) => any
) => {
  function write(ctx: WriteContext<SubscriptionRef.SubscriptionRef<any>>, value: any) {
    const ref = ctx.get(refAtom)
    if (SubscriptionRef.SubscriptionRefTypeId in ref) {
      Effect.runSync(SubscriptionRef.set(ref, value))
    } else if (Result.isSuccess(ref)) {
      Effect.runSync(SubscriptionRef.set(ref.value, value))
    }
  }
  return writable((get) => {
    const ref = get(refAtom)
    if (SubscriptionRef.SubscriptionRefTypeId in ref) {
      return read(get, ref)
    } else if (Result.isSuccess(ref)) {
      return read(get, ref)
    }
    return ref
  }, write)
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const subscriptionRef: {
  <A>(ref: SubscriptionRef.SubscriptionRef<A> | ((get: Context) => SubscriptionRef.SubscriptionRef<A>)): Writable<A>
  <A, E>(
    effect:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry>
      | ((get: Context) => Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry>)
  ): Writable<Result.Result<A, E>, A>
} = (
  ref:
    | SubscriptionRef.SubscriptionRef<any>
    | ((get: Context) => SubscriptionRef.SubscriptionRef<any>)
    | Effect.Effect<SubscriptionRef.SubscriptionRef<any>, any, Scope.Scope | AtomRegistry>
    | ((get: Context) => Effect.Effect<SubscriptionRef.SubscriptionRef<any>, any, Scope.Scope | AtomRegistry>)
) =>
  makeSubRef(
    readable((get) => {
      const value = typeof ref === "function" ? ref(get) : ref
      return SubscriptionRef.SubscriptionRefTypeId in value
        ? value
        : makeEffect(get, value, Result.initial(true))
    }),
    readSubscribable
  )

// -----------------------------------------------------------------------------
// constructors - subscribable
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const subscribable: {
  <A, E>(
    ref: Subscribable.Subscribable<A, E> | ((get: Context) => Subscribable.Subscribable<A, E>)
  ): Atom<A>
  <A, E, E1>(
    effect:
      | Effect.Effect<Subscribable.Subscribable<A, E1>, E, Scope.Scope | AtomRegistry>
      | ((get: Context) => Effect.Effect<Subscribable.Subscribable<A, E1>, E, Scope.Scope | AtomRegistry>)
  ): Atom<Result.Result<A, E | E1>>
} = (
  ref:
    | Subscribable.Subscribable<any, any>
    | ((get: Context) => Subscribable.Subscribable<any, any>)
    | Effect.Effect<Subscribable.Subscribable<any, any>, any, Scope.Scope | AtomRegistry>
    | ((get: Context) => Effect.Effect<Subscribable.Subscribable<any, any>, any, Scope.Scope | AtomRegistry>)
) =>
  makeSubscribable(
    readable((get) => {
      const value = typeof ref === "function" ? ref(get) : ref
      return Subscribable.isSubscribable(value)
        ? value
        : makeEffect(get, value, Result.initial(true))
    }),
    readSubscribable
  )

const makeSubscribable = (
  subAtom: Atom<Subscribable.Subscribable<any, any> | Result.Result<Subscribable.Subscribable<any, any>, any>>,
  read: (
    get: Context,
    sub: Subscribable.Subscribable<any, any> | Result.Success<Subscribable.Subscribable<any, any>, any>
  ) => any
) =>
  readable((get) => {
    const sub = get(subAtom)
    if (Subscribable.isSubscribable(sub)) {
      return read(get, sub)
    } else if (Result.isSuccess(sub)) {
      return read(get, sub)
    }
    return sub
  })

// -----------------------------------------------------------------------------
// constructors - functions
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category models
 */
export interface FnContext extends Omit<Context, "get" | "once" | "resultOnce" | "someOnce" | "refreshSelf"> {
  <A>(atom: Atom<A>): A
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fnSync: {
  <Arg>(): {
    <A>(
      f: (arg: Arg, get: FnContext) => A
    ): Writable<Option.Option<A>, Arg>
    <A>(
      f: (arg: Arg, get: FnContext) => A,
      options: { readonly initialValue: A }
    ): Writable<A, Arg>
  }
  <A, Arg = void>(
    f: (arg: Arg, get: FnContext) => A
  ): Writable<Option.Option<A>, Arg>
  <A, Arg = void>(
    f: (arg: Arg, get: FnContext) => A,
    options: { readonly initialValue: A }
  ): Writable<A, Arg>
} = function(...args: ReadonlyArray<any>) {
  if (args.length === 0) {
    return makeFnSync
  }
  return makeFnSync(...args as [any, any]) as any
}

const makeFnSync = <Arg, A>(f: (arg: Arg, get: FnContext) => A, options?: {
  readonly initialValue?: A
}): Writable<Option.Option<A> | A, Arg> => {
  const argAtom = state<[number, Arg]>([0, undefined as any])
  const hasInitialValue = options?.initialValue !== undefined
  return writable(function(get) {
    ;(get as any).isFn = true
    const [counter, arg] = get.get(argAtom)
    if (counter === 0) {
      return hasInitialValue ? options.initialValue : Option.none()
    }
    return hasInitialValue ? f(arg, get) : Option.some(f(arg, get))
  }, function(ctx, arg) {
    batch(() => {
      ctx.set(argAtom, [ctx.get(argAtom)[0] + 1, arg as Arg])
      ctx.refreshSelf()
    })
  })
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AtomResultFn<Arg, A, E = never> extends Writable<Result.Result<A, E>, Arg | Reset | Interrupt> {}

/**
 * @since 1.0.0
 * @category symbols
 */
export const Reset = Symbol.for("@effect-atom/atom/Atom/Reset")

/**
 * @since 1.0.0
 * @category symbols
 */
export type Reset = typeof Reset

/**
 * @since 1.0.0
 * @category symbols
 */
export const Interrupt = Symbol.for("@effect-atom/atom/Atom/Interrupt")

/**
 * @since 1.0.0
 * @category symbols
 */
export type Interrupt = typeof Interrupt

/**
 * @since 1.0.0
 * @category constructors
 */
export const fn: {
  <Arg>(): <E, A>(fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A | undefined
  }) => AtomResultFn<Arg, A, E>
  <E, A, Arg = void>(fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: {
    readonly initialValue?: A | undefined
  }): AtomResultFn<Arg, A, E>
  <Arg>(): <E, A>(fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A | undefined
  }) => AtomResultFn<Arg, A, E | NoSuchElementException>
  <E, A, Arg = void>(fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry>, options?: {
    readonly initialValue?: A | undefined
  }): AtomResultFn<Arg, A, E | NoSuchElementException>
} = function(...args: ReadonlyArray<any>) {
  if (args.length === 0) {
    return makeFn
  }
  return makeFn(...args as [any, any]) as any
}

const makeFn = <Arg, E, A>(
  f: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry> | Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
  options?: {
    readonly initialValue?: A | undefined
  }
): AtomResultFn<Arg, A, E | NoSuchElementException> => {
  const [read, write] = makeResultFn(f, options)
  return writable(read, write) as any
}

function makeResultFn<Arg, E, A>(
  f: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry> | Stream.Stream<A, E, AtomRegistry>,
  options?: {
    readonly initialValue?: A
  }
) {
  const argAtom = state<[number, Arg | Interrupt]>([0, undefined as any])
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()

  function read(get: Context, runtime?: Runtime.Runtime<any>): Result.Result<A, E | NoSuchElementException> {
    ;(get as any).isFn = true
    const [counter, arg] = get.get(argAtom)
    if (counter === 0) {
      return initialValue
    } else if (arg === Interrupt) {
      return Result.failureWithPrevious(Cause.interrupt(FiberId.none), { previous: get.self() })
    }
    const value = f(arg, get)
    if (Effect.EffectTypeId in value) {
      return makeEffect(get, value, initialValue, runtime, false)
    }
    return makeStream(get, value, initialValue, runtime)
  }
  function write(ctx: WriteContext<Result.Result<A, E | NoSuchElementException>>, arg: Arg | Reset | Interrupt) {
    batch(() => {
      if (arg === Reset) {
        ctx.set(argAtom, [0, undefined as any])
      } else if (arg === Interrupt) {
        ctx.set(argAtom, [ctx.get(argAtom)[0] + 1, Interrupt])
      } else {
        ctx.set(argAtom, [ctx.get(argAtom)[0] + 1, arg])
      }
      ctx.refreshSelf()
    })
  }
  return [read, write, argAtom] as const
}

/**
 * @since 1.0.0
 * @category models
 */
export type PullResult<A, E = never> = Result.Result<{
  readonly done: boolean
  readonly items: Arr.NonEmptyArray<A>
}, E | Cause.NoSuchElementException>

/**
 * @since 1.0.0
 * @category constructors
 */
export const pull = <A, E>(
  create: ((get: Context) => Stream.Stream<A, E, AtomRegistry>) | Stream.Stream<A, E, AtomRegistry>,
  options?: {
    readonly disableAccumulation?: boolean
  }
): Writable<PullResult<A, E>, void> => {
  const pullSignal = state(0)
  const pullAtom = readable(
    makeRead(function(get) {
      return makeStreamPullEffect(get, pullSignal, create, options)
    })
  )
  return makeStreamPull(pullSignal, pullAtom)
}

const makeStreamPullEffect = <A, E>(
  get: Context,
  pullSignal: Atom<number>,
  create: Stream.Stream<A, E, AtomRegistry> | ((get: Context) => Stream.Stream<A, E, AtomRegistry>),
  options?: {
    readonly disableAccumulation?: boolean
  }
): Effect.Effect<
  { readonly done: boolean; readonly items: Arr.NonEmptyArray<A> },
  E | Cause.NoSuchElementException,
  Scope.Scope | AtomRegistry
> =>
  Effect.flatMap(
    Channel.toPull(
      Stream.toChannel(typeof create === "function" ? create(get) : create)
    ),
    (pullChunk) => {
      const semaphore = Effect.unsafeMakeSemaphore(1)
      const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
      const context = fiber.currentContext as EffectContext.Context<AtomRegistry | Scope.Scope>
      let acc = Chunk.empty<A>()
      const pull: Effect.Effect<
        {
          done: boolean
          items: Arr.NonEmptyArray<A>
        },
        NoSuchElementException | E,
        Registry.AtomRegistry
      > = Effect.flatMap(
        Effect.locally(
          Effect.suspend(() => pullChunk),
          FiberRef.currentContext,
          context
        ),
        Either.match({
          onLeft: (): Effect.Effect<
            { done: boolean; items: Arr.NonEmptyArray<A> },
            NoSuchElementException
          > => {
            const items = Chunk.toReadonlyArray(acc) as Array<A>
            if (!Arr.isNonEmptyArray(items)) {
              return Effect.fail(new Cause.NoSuchElementException(`Atom.pull: no items`))
            }
            return Effect.succeed({ done: true, items })
          },
          onRight(chunk) {
            let items: Chunk.Chunk<A>
            if (options?.disableAccumulation) {
              items = chunk
            } else {
              items = Chunk.appendAll(acc, chunk)
              acc = items
            }
            const arr = Chunk.toReadonlyArray(items) as Array<A>
            if (!Arr.isNonEmptyArray(arr)) {
              return pull
            }
            return Effect.succeed({ done: false, items: arr })
          }
        })
      )
      const pullWithSemaphore = semaphore.withPermits(1)(pull)

      const runCallback = runCallbackSync(Runtime.make({
        context,
        fiberRefs: fiber.getFiberRefs(),
        runtimeFlags: Runtime.defaultRuntime.runtimeFlags
      }))
      const cancels = new Set<() => void>()
      get.addFinalizer(() => {
        for (const cancel of cancels) cancel()
      })
      get.once(pullSignal)
      get.subscribe(pullSignal, () => {
        get.setSelf(Result.waitingFrom(get.self<PullResult<A, E>>()))
        let cancel: (() => void) | undefined
        // eslint-disable-next-line prefer-const
        cancel = runCallback(pullWithSemaphore, (exit) => {
          if (cancel) cancels.delete(cancel)
          const result = Result.fromExitWithPrevious(exit, get.self())
          const pending = cancels.size > 0
          get.setSelf(pending ? Result.waiting(result) : result)
        })
        if (cancel) cancels.add(cancel)
      })

      return pull
    }
  )

const makeStreamPull = <A, E>(
  pullSignal: Writable<number>,
  pullAtom: Atom<PullResult<A, E>>
) =>
  writable(pullAtom.read, function(ctx, _) {
    ctx.set(pullSignal, ctx.get(pullSignal) + 1)
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const family = typeof WeakRef === "undefined" || typeof FinalizationRegistry === "undefined" ?
  <Arg, T extends object>(
    f: (arg: Arg) => T
  ): (arg: Arg) => T => {
    const atoms = MutableHashMap.empty<Arg, T>()
    return function(arg) {
      const atomEntry = MutableHashMap.get(atoms, arg)
      if (atomEntry._tag === "Some") {
        return atomEntry.value
      }
      const newAtom = f(arg)
      MutableHashMap.set(atoms, arg, newAtom)
      return newAtom
    }
  } :
  <Arg, T extends object>(
    f: (arg: Arg) => T
  ): (arg: Arg) => T => {
    const atoms = MutableHashMap.empty<Arg, WeakRef<T>>()
    const registry = new FinalizationRegistry<Arg>((arg) => {
      MutableHashMap.remove(atoms, arg)
    })
    return function(arg) {
      const atomEntry = MutableHashMap.get(atoms, arg).pipe(
        Option.flatMapNullable((ref) => ref.deref())
      )

      if (atomEntry._tag === "Some") {
        return atomEntry.value
      }
      const newAtom = f(arg)
      MutableHashMap.set(atoms, arg, new WeakRef(newAtom))
      registry.register(newAtom, arg)
      return newAtom
    }
  }

/**
 * @since 1.0.0
 * @category combinators
 */
export const withFallback: {
  <E2, A2>(
    fallback: Atom<Result.Result<A2, E2>>
  ): <R extends Atom<Result.Result<any, any>>>(
    self: R
  ) => [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>, RW>
    : Atom<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>>
  <R extends Atom<Result.Result<any, any>>, A2, E2>(
    self: R,
    fallback: Atom<Result.Result<A2, E2>>
  ): [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>, RW>
    : Atom<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>>
} = dual(2, <R extends Atom<Result.Result<any, any>>, A2, E2>(
  self: R,
  fallback: Atom<Result.Result<A2, E2>>
): [R] extends [Writable<infer _, infer RW>]
  ? Writable<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>, RW>
  : Atom<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>> =>
{
  function withFallback(get: Context) {
    const result = get(self)
    if (result._tag === "Initial") {
      return Result.waiting(get(fallback))
    }
    return result
  }
  return isWritable(self)
    ? writable(
      withFallback,
      self.write,
      self.refresh ?? function(refresh) {
        refresh(self)
      }
    ) as any
    : readable(
      withFallback,
      self.refresh ?? function(refresh) {
        refresh(self)
      }
    ) as any
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const keepAlive = <A extends Atom<any>>(self: A): A =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    keepAlive: true
  })

/**
 * Reverts the `keepAlive` behavior of a reactive value, allowing it to be
 * disposed of when not in use.
 *
 * Note that Atom's have this behavior by default.
 *
 * @since 1.0.0
 * @category combinators
 */
export const autoDispose = <A extends Atom<any>>(self: A): A =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    keepAlive: false
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const setLazy: {
  (lazy: boolean): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, lazy: boolean): A
} = dual(2, <A extends Atom<any>>(self: A, lazy: boolean) =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    lazy
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const withLabel: {
  (name: string): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, name: string): A
} = dual<
  (name: string) => <A extends Atom<any>>(self: A) => A,
  <A extends Atom<any>>(self: A, name: string) => A
>(2, (self, name) =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    label: [name, new Error().stack?.split("\n")[5] ?? ""]
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setIdleTTL: {
  (duration: Duration.DurationInput): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, duration: Duration.DurationInput): A
} = dual<
  (duration: Duration.DurationInput) => <A extends Atom<any>>(self: A) => A,
  <A extends Atom<any>>(self: A, duration: Duration.DurationInput) => A
>(2, (self, durationInput) => {
  const duration = Duration.decode(durationInput)
  const isFinite = Duration.isFinite(duration)
  return Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    keepAlive: !isFinite,
    idleTTL: isFinite ? Duration.toMillis(duration) : undefined
  })
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const initialValue: {
  <A>(initialValue: A): (self: Atom<A>) => readonly [Atom<A>, A]
  <A>(self: Atom<A>, initialValue: A): readonly [Atom<A>, A]
} = dual<
  <A>(initialValue: A) => (self: Atom<A>) => readonly [Atom<A>, A],
  <A>(self: Atom<A>, initialValue: A) => readonly [Atom<A>, A]
>(2, (self, initialValue) => [self, initialValue])

/**
 * @since 1.0.0
 * @category combinators
 */
export const transform: {
  <R extends Atom<any>, B>(
    f: (get: Context) => B
  ): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
  <R extends Atom<any>, B>(
    self: R,
    f: (get: Context) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
} = dual(
  2,
  (<A, B>(self: Atom<A>, f: (get: Context) => B): Atom<B> =>
    isWritable(self)
      ? writable(
        f,
        function(ctx, value) {
          ctx.set(self, value)
        },
        self.refresh ?? function(refresh) {
          refresh(self)
        }
      )
      : readable(
        f,
        self.refresh ?? function(refresh) {
          refresh(self)
        }
      )) as any
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <R extends Atom<any>, B>(
    f: (_: Type<R>) => B
  ): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
  <R extends Atom<any>, B>(
    self: R,
    f: (_: Type<R>) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
} = dual(
  2,
  <A, B>(self: Atom<A>, f: (_: A) => B): Atom<B> => transform(self, (get) => f(get(self)))
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const mapResult: {
  <R extends Atom<Result.Result<any, any>>, B>(
    f: (_: Result.Result.Success<Type<R>>) => B
  ): (
    self: R
  ) => [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.Failure<Type<R>>>, RW>
    : Atom<Result.Result<B, Result.Result.Failure<Type<R>>>>
  <R extends Atom<Result.Result<any, any>>, B>(
    self: R,
    f: (_: Result.Result.Success<Type<R>>) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.Failure<Type<R>>>, RW>
    : Atom<Result.Result<B, Result.Result.Failure<Type<R>>>>
} = dual(2, <R extends Atom<Result.Result<any, any>>, B>(
  self: R,
  f: (_: Result.Result.Success<Type<R>>) => B
): [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.Failure<Type<R>>>, RW>
  : Atom<Result.Result<B, Result.Result.Failure<Type<R>>>> => map(self, Result.map(f)))

/**
 * @since 1.0.0
 * @category combinators
 */
export const debounce: {
  (duration: Duration.DurationInput): <A extends Atom<any>>(self: A) => WithoutSerializable<A>
  <A extends Atom<any>>(self: A, duration: Duration.DurationInput): WithoutSerializable<A>
} = dual(
  2,
  <A>(self: Atom<A>, duration: Duration.DurationInput): Atom<A> => {
    const millis = Duration.toMillis(duration)
    return transform(self, function(get) {
      let timeout: number | undefined
      let value = get.once(self)
      function update() {
        timeout = undefined
        get.setSelf(value)
      }
      get.addFinalizer(function() {
        if (timeout) clearTimeout(timeout)
      })
      get.subscribe(self, function(val) {
        value = val
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(update, millis)
      })
      return value
    })
  }
)

/**
 * @since 1.0.0
 * @category Optimistic
 */
export const optimistic = <A>(self: Atom<A>): Writable<A, Atom<Result.Result<A, unknown>>> => {
  let counter = 0
  const writeAtom = state(
    [
      counter,
      undefined as any as Atom<Result.Result<A, unknown>>
    ] as const
  )
  return writable(
    (get) => {
      let lastValue = get.once(self)
      let needsRefresh = false
      get.subscribe(self, (value) => {
        lastValue = value
        needsRefresh = false
        if (!Result.isResult(value)) {
          return get.setSelf(value)
        }
        const current = Option.getOrUndefined(get.self<Result.Result<any, any>>())!
        switch (value._tag) {
          case "Initial": {
            if (Result.isInitial(current)) {
              get.setSelf(value)
            }
            return
          }
          case "Success": {
            if (Result.isSuccess(current)) {
              if (value.timestamp >= current.timestamp) {
                get.setSelf(value)
              }
            } else {
              get.setSelf(value)
            }
            return
          }
          case "Failure": {
            return get.setSelf(value)
          }
        }
      })
      const transitions = new Set<Atom<Result.Result<A, unknown>>>()
      const cancels = new Set<() => void>()
      get.subscribe(writeAtom, ([, atom]) => {
        if (transitions.has(atom)) return
        transitions.add(atom)
        let cancel: (() => void) | undefined
        // eslint-disable-next-line prefer-const
        cancel = get.registry.subscribe(atom, (result) => {
          if (Result.isSuccess(result) && result.waiting) {
            return get.setSelf(result.value)
          }
          transitions.delete(atom)
          if (cancel) {
            cancels.delete(cancel)
            cancel()
          }
          if (!needsRefresh && !Result.isFailure(result)) {
            needsRefresh = true
          }
          if (transitions.size === 0) {
            if (needsRefresh) {
              needsRefresh = false
              get.refresh(self)
            } else {
              get.setSelf(lastValue)
            }
          }
        }, { immediate: true })
        if (transitions.has(atom)) {
          cancels.add(cancel)
        } else {
          cancel()
        }
      })
      get.addFinalizer(() => {
        for (const cancel of cancels) cancel()
        transitions.clear()
        cancels.clear()
      })
      return lastValue
    },
    (ctx, atom) => ctx.set(writeAtom, [++counter, atom]),
    (refresh) => refresh(self)
  )
}

/**
 * @since 1.0.0
 * @category Optimistic
 */
export const optimisticFn: {
  <A, W, XA, XE, OW = void>(
    options: {
      readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>
      readonly fn:
        | AtomResultFn<OW, XA, XE>
        | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>)
    }
  ): (
    self: Writable<A, Atom<Result.Result<W, unknown>>>
  ) => AtomResultFn<OW, XA, XE>
  <A, W, XA, XE, OW = void>(
    self: Writable<A, Atom<Result.Result<W, unknown>>>,
    options: {
      readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>
      readonly fn:
        | AtomResultFn<OW, XA, XE>
        | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>)
    }
  ): AtomResultFn<OW, XA, XE>
} = dual(2, <A, W, XA, XE, OW = void>(
  self: Writable<A, Atom<Result.Result<W, unknown>>>,
  options: {
    readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>
    readonly fn:
      | AtomResultFn<OW, XA, XE>
      | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>)
  }
): AtomResultFn<OW, XA, XE> => {
  const transition = state<Result.Result<W, unknown>>(Result.initial())
  return fn((arg: OW, get) => {
    let value = options.reducer(get(self), arg)
    if (Result.isResult(value)) {
      value = Result.waiting(value, { touch: true })
    }
    get.set(transition, Result.success(value, { waiting: true }))
    get.set(self, transition)
    const fn = typeof options.fn === "function"
      ? autoDispose(options.fn((value) =>
        get.set(
          transition,
          Result.success(Result.isResult(value) ? Result.waiting(value) : value, { waiting: true })
        )
      ))
      : options.fn
    get.set(fn, arg)
    return Effect.onExit(get.result(fn, { suspendOnWaiting: true }), (exit) => {
      get.set(transition, Result.fromExit(Exit.as(exit, value)))
      return Effect.void
    })
  })
})

/**
 * @since 1.0.0
 * @category batching
 */
export const batch: (f: () => void) => void = internalRegistry.batch

// -----------------------------------------------------------------------------
// Focus
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Focus
 */
export const windowFocusSignal: Atom<number> = readable((get) => {
  let count = 0
  function update() {
    if (document.visibilityState === "visible") {
      get.setSelf(++count)
    }
  }
  window.addEventListener("visibilitychange", update)
  get.addFinalizer(() => {
    window.removeEventListener("visibilitychange", update)
  })
  return count
})

/**
 * @since 1.0.0
 * @category Focus
 */
export const makeRefreshOnSignal = <_>(signal: Atom<_>) => <A extends Atom<any>>(self: A): WithoutSerializable<A> =>
  transform(self, (get) => {
    get.once(signal)
    get.subscribe(signal, (_) => get.refresh(self))
    get.subscribe(self, (value) => get.setSelf(value))
    return get.once(self)
  }) as any

/**
 * @since 1.0.0
 * @category Focus
 */
export const refreshOnWindowFocus: <A extends Atom<any>>(self: A) => WithoutSerializable<A> = makeRefreshOnSignal(
  windowFocusSignal
)

// -----------------------------------------------------------------------------
// KeyValueStore
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category KeyValueStore
 */
export const kvs = <A>(options: {
  readonly runtime: AtomRuntime<KeyValueStore.KeyValueStore, any>
  readonly key: string
  readonly schema: Schema.Schema<A, any>
  readonly defaultValue: LazyArg<A>
}): Writable<A> => {
  const setAtom = options.runtime.fn(
    Effect.fnUntraced(function*(value: A) {
      const store = (yield* KeyValueStore.KeyValueStore).forSchema(
        options.schema
      )
      yield* store.set(options.key, value)
    })
  )
  const resultAtom = options.runtime.atom(
    Effect.flatMap(
      KeyValueStore.KeyValueStore,
      (store) => Effect.flatten(store.forSchema(options.schema).get(options.key))
    )
  )
  return writable(
    (get) => {
      get.mount(setAtom)
      return Result.getOrElse(get(resultAtom), options.defaultValue)
    },
    (ctx, value: A) => {
      ctx.set(setAtom, value as any)
      ctx.setSelf(value)
    }
  )
}

// -----------------------------------------------------------------------------
// URL search params
// -----------------------------------------------------------------------------

/**
 * Create an Atom that reads and writes a URL search parameter.
 *
 * Note: If you pass a schema, it has to be synchronous and have no context.
 *
 * @since 1.0.0
 * @category URL search params
 */
export const searchParam = <A = never, I extends string = never>(name: string, options?: {
  readonly schema?: Schema.Schema<A, I>
}): Writable<[A] extends [never] ? string : Option.Option<A>> => {
  const decode = options?.schema && Schema.decodeEither(options.schema)
  const encode = options?.schema && Schema.encodeEither(options.schema)
  return writable(
    (get) => {
      const handleUpdate = () => {
        if (searchParamState.updating) return
        const searchParams = new URLSearchParams(window.location.search)
        const newValue = searchParams.get(name) || ""
        if (decode) {
          get.setSelf(Either.getRight(decode(newValue as I)))
        } else if (newValue !== Option.getOrUndefined(get.self())) {
          get.setSelf(newValue)
        }
      }
      window.addEventListener("popstate", handleUpdate)
      window.addEventListener("pushstate", handleUpdate)
      get.addFinalizer(() => {
        window.removeEventListener("popstate", handleUpdate)
        window.removeEventListener("pushstate", handleUpdate)
      })
      const value = new URLSearchParams(window.location.search).get(name) || ""
      return decode ? Either.getRight(decode(value as I)) : value as any
    },
    (ctx, value: any) => {
      if (encode) {
        const encoded = Option.flatMap(value, (v) => Either.getRight(encode(v as A)))
        searchParamState.updates.set(name, Option.getOrElse(encoded, () => ""))
        value = Option.zipRight(encoded, value)
      } else {
        searchParamState.updates.set(name, value)
      }
      ctx.setSelf(value)
      if (searchParamState.timeout) {
        clearTimeout(searchParamState.timeout)
      }
      searchParamState.timeout = setTimeout(updateSearchParams, 500)
    }
  )
}

const searchParamState = {
  timeout: undefined as number | undefined,
  updates: new Map<string, string>(),
  updating: false
}

function updateSearchParams() {
  searchParamState.timeout = undefined
  searchParamState.updating = true
  const searchParams = new URLSearchParams(window.location.search)
  for (const [key, value] of searchParamState.updates.entries()) {
    if (value.length > 0) {
      searchParams.set(key, value)
    } else {
      searchParams.delete(key)
    }
  }
  searchParamState.updates.clear()
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`
  window.history.pushState({}, "", newUrl)
  searchParamState.updating = false
}

// -----------------------------------------------------------------------------
// conversions
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toStream = <A>(self: Atom<A>): Stream.Stream<A, never, AtomRegistry> =>
  Stream.unwrap(Effect.map(AtomRegistry, Registry.toStream(self)))

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toStreamResult = <A, E>(self: Atom<Result.Result<A, E>>): Stream.Stream<A, E, AtomRegistry> =>
  Stream.unwrap(Effect.map(AtomRegistry, Registry.toStreamResult(self)))

/**
 * @since 1.0.0
 * @category Conversions
 */
export const get = <A>(self: Atom<A>): Effect.Effect<A, never, AtomRegistry> =>
  Effect.map(AtomRegistry, (_) => _.get(self))

/**
 * @since 1.0.0
 * @category Conversions
 */
export const modify: {
  <R, W, A>(
    f: (_: R) => [returnValue: A, nextValue: W]
  ): (self: Writable<R, W>) => Effect.Effect<A, never, AtomRegistry>
  <R, W, A>(self: Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]): Effect.Effect<A, never, AtomRegistry>
} = dual(
  2,
  <R, W, A>(self: Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]): Effect.Effect<A, never, AtomRegistry> =>
    Effect.map(AtomRegistry, (_) => _.modify(self, f))
)

/**
 * @since 1.0.0
 * @category Conversions
 */
export const set: {
  <W>(value: W): <R>(self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry>
  <R, W>(self: Writable<R, W>, value: W): Effect.Effect<void, never, AtomRegistry>
} = dual(
  2,
  <R, W>(self: Writable<R, W>, value: W): Effect.Effect<void, never, AtomRegistry> =>
    Effect.map(AtomRegistry, (_) => _.set(self, value))
)

/**
 * @since 1.0.0
 * @category Conversions
 */
export const update: {
  <R, W>(f: (_: R) => W): (self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry>
  <R, W>(self: Writable<R, W>, f: (_: R) => W): Effect.Effect<void, never, AtomRegistry>
} = dual(
  2,
  <R, W>(self: Writable<R, W>, f: (_: R) => W): Effect.Effect<void, never, AtomRegistry> =>
    Effect.map(AtomRegistry, (_) => _.update(self, f))
)

/**
 * @since 1.0.0
 * @category Conversions
 */
export const getResult = <A, E>(
  self: Atom<Result.Result<A, E>>,
  options?: { readonly suspendOnWaiting?: boolean | undefined }
): Effect.Effect<A, E, AtomRegistry> => Effect.flatMap(AtomRegistry, Registry.getResult(self, options))

/**
 * @since 1.0.0
 * @category Conversions
 */
export const refresh = <A>(self: Atom<A>): Effect.Effect<void, never, AtomRegistry> =>
  Effect.map(AtomRegistry, (_) => _.refresh(self))

// -----------------------------------------------------------------------------
// Serializable
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Serializable
 */
export const SerializableTypeId: SerializableTypeId = "~effect-atom/atom/Atom/Serializable"

/**
 * @since 1.0.0
 * @category Serializable
 */
export type SerializableTypeId = "~effect-atom/atom/Atom/Serializable"

/**
 * @since 1.0.0
 * @category Serializable
 */
export interface Serializable {
  readonly [SerializableTypeId]: {
    readonly key: string
    readonly encode: (value: unknown) => unknown
    readonly decode: (value: unknown) => unknown
  }
}

/**
 * @since 1.0.0
 * @category Serializable
 */
export const isSerializable = (self: Atom<any>): self is Atom<any> & Serializable => SerializableTypeId in self

/**
 * @since 1.0.0
 * @category combinators
 */
export const serializable: {
  <R extends Atom<any>, I>(options: {
    readonly key: string
    readonly schema: Schema.Schema<Type<R>, I>
  }): (self: R) => R & Serializable
  <R extends Atom<any>, I>(self: R, options: {
    readonly key: string
    readonly schema: Schema.Schema<Type<R>, I>
  }): R & Serializable
} = dual(2, <R extends Atom<any>, A, I>(self: R, options: {
  readonly key: string
  readonly schema: Schema.Schema<A, I>
}): R & Serializable =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    label: self.label ?? [options.key, new Error().stack?.split("\n")[5] ?? ""],
    [SerializableTypeId]: {
      key: options.key,
      encode: Schema.encodeSync(options.schema),
      decode: Schema.decodeSync(options.schema)
    }
  }))

/**
 * @since 1.0.0
 * @category ServerValue
 */
export const ServerValueTypeId = "~effect-atom/atom/Atom/ServerValue" as const

/**
 * Overrides the value of an Atom when read on the server.
 *
 * @since 1.0.0
 * @category ServerValue
 */
export const withServerValue: {
  <A extends Atom<any>>(read: (get: <A>(atom: Atom<A>) => A) => Type<A>): (self: A) => A
  <A extends Atom<any>>(self: A, read: (get: <A>(atom: Atom<A>) => A) => Type<A>): A
} = dual(
  2,
  <A extends Atom<any>>(self: A, read: (get: <A>(atom: Atom<A>) => A) => Type<A>): A =>
    Object.assign(Object.create(Object.getPrototypeOf(self)), {
      ...self,
      [ServerValueTypeId]: read
    })
)

/**
 * Sets the Atom's server value to `Result.initial(true)`.
 *
 * @since 1.0.0
 * @category ServerValue
 */
export const withServerValueInitial = <A extends Atom<Result.Result<any, any>>>(self: A): A =>
  withServerValue(self, constant(Result.initial(true)) as any)

/**
 * @since 1.0.0
 * @category ServerValue
 */
export const getServerValue: {
  (registry: Registry.Registry): <A>(self: Atom<A>) => A
  <A>(self: Atom<A>, registry: Registry.Registry): A
} = dual(
  2,
  <A>(self: Atom<A>, registry: Registry.Registry): A =>
    ServerValueTypeId in self
      ? (self as any)[ServerValueTypeId]((atom: Atom<any>) => registry.get(atom))
      : registry.get(self)
)
