/**
 * @since 1.0.0
 */

import * as Atom from "@effect-atom/atom/Atom"
import type * as AtomRef from "@effect-atom/atom/AtomRef"
import * as Registry from "@effect-atom/atom/Registry"
import type * as Result from "@effect-atom/atom/Result"
import { Effect } from "effect"
import * as Cause from "effect/Cause"
import * as Exit from "effect/Exit"
import { globalValue } from "effect/GlobalValue"
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { useRegistry } from "./Context.js"

interface AtomStore<A> {
  readonly subscribe: (f: () => void) => () => void
  readonly snapshot: () => A
  readonly getServerSnapshot: () => A
}

const storeRegistry = globalValue(
  "@effect-atom/atom-solid/storeRegistry",
  () => new WeakMap<Registry.Registry, WeakMap<Atom.Atom<any>, AtomStore<any>>>()
)

function makeStore<A>(registry: Registry.Registry, atom: Atom.Atom<A>): AtomStore<A> {
  let stores = storeRegistry.get(registry)
  if (stores === undefined) {
    stores = new WeakMap()
    storeRegistry.set(registry, stores)
  }
  const store = stores.get(atom)
  if (store !== undefined) {
    return store
  }
  const newStore: AtomStore<A> = {
    subscribe(f) {
      return registry.subscribe(atom, () => {
        f()
      })
    },
    snapshot() {
      return registry.get(atom)
    },
    getServerSnapshot() {
      return Atom.getServerValue(atom, registry)
    }
  }
  stores.set(atom, newStore)
  return newStore
}

function useStore<A>(registry: Registry.Registry, atom: Atom.Atom<A>): Accessor<A> {
  const store = makeStore(registry, atom)
  const [value, setValue] = createSignal(store.snapshot())

  createEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newValue = store.snapshot()
      setValue(() => newValue)
    })
    onCleanup(unsubscribe)
  })

  return value
}

const initialValuesSet = globalValue(
  "@effect-atom/atom-solid/initialValuesSet",
  () => new WeakMap<Registry.Registry, WeakSet<Atom.Atom<any>>>()
)

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomInitialValues = (initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void => {
  const registry = useRegistry()
  let set = initialValuesSet.get(registry)
  if (set === undefined) {
    set = new WeakSet()
    initialValuesSet.set(registry, set)
  }
  for (const [atom, value] of initialValues) {
    if (!set.has(atom)) {
      set.add(atom)
      ;(registry as any).ensureNode(atom).setValue(value)
    }
  }
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomValue: {
  <A>(atomFactory: () => Atom.Atom<A>): Accessor<A>
  <A, B>(atomFactory: () => Atom.Atom<A>, f: (_: A) => B): Accessor<B>
} = <A>(atomFactory: () => Atom.Atom<A>, f?: (_: A) => A): Accessor<A> => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory) // Use createMemo like useAtom does

  // Mount the atom to ensure it's active and can receive updates
  mountAtom(registry, atomRef())

  if (f) {
    const mappedAtomRef = createMemo(() => Atom.map(atomRef(), f))
    mountAtom(registry, mappedAtomRef())
    return useStore(registry, mappedAtomRef())
  }

  return useStore(registry, atomRef())
}

function mountAtom<A>(registry: Registry.Registry, atom: Atom.Atom<A>): void {
  createEffect(() => {
    const dispose = registry.mount(atom)
    onCleanup(dispose)
  })
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: Registry.Registry,
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<Result.Result.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void)
{
  if (options?.mode === "promise" || options?.mode === "promiseExit") {
    return ((value: W) => {
      registry.set(atom, value)
      const promise = Effect.runPromiseExit(
        Registry.getResult(registry, atom as Atom.Atom<Result.Result<any, any>>, { suspendOnWaiting: true })
      )
      return options!.mode === "promise" ? promise.then(flattenExit) : promise
    }) as any
  }
  return ((value: W | ((value: R) => W)) => {
    registry.set(atom, typeof value === "function" ? (value as any)(registry.get(atom)) : value)
  }) as any
}

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomMount = <A>(atomFactory: () => Atom.Atom<A>): void => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  mountAtom(registry, atomRef())
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSet = <
  R,
  W,
  Mode extends "value" | "promise" | "promiseExit" = never
>(
  atomFactory: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<Result.Result.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void) =>
{
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  mountAtom(registry, atomRef())
  return setAtom(registry, atomRef(), options)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefresh = <A>(atomFactory: () => Atom.Atom<A>): () => void => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  mountAtom(registry, atomRef())
  return () => {
    registry.refresh(atomRef())
  }
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtom = <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
  atomFactory: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined
  }
): readonly [
  value: Accessor<R>,
  write: "promise" extends Mode ? (
      (value: W) => Promise<Result.Result.Success<R>>
    ) :
    "promiseExit" extends Mode ? (
        (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
      ) :
    ((value: W | ((value: R) => W)) => void)
] => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  return [
    useStore(registry, atomRef()),
    setAtom(registry, atomRef(), options)
  ] as const
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSubscribe = <A>(
  atomFactory: () => Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
): void => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)

  createEffect(() => {
    const atom = atomRef()
    const unsubscribe = registry.subscribe(atom, f, options)
    onCleanup(unsubscribe)
  })
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRef = <A>(refFactory: () => AtomRef.ReadonlyRef<A>): Accessor<A> => {
  const refRef = createMemo(refFactory)
  const [value, setValue] = createSignal(refRef().value)

  createEffect(() => {
    const ref = refRef()
    const unsubscribe = ref.subscribe(setValue)
    onCleanup(unsubscribe)
  })

  return value
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefProp = <A, K extends keyof A>(
  refFactory: () => AtomRef.AtomRef<A>,
  prop: K
): () => AtomRef.AtomRef<A[K]> => createMemo(() => refFactory().prop(prop))

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefPropValue = <A, K extends keyof A>(
  refFactory: () => AtomRef.AtomRef<A>,
  prop: K
): Accessor<A[K]> => useAtomRef(() => useAtomRefProp(refFactory, prop)())
