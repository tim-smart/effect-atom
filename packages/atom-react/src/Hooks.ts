/**
 * @since 1.0.0
 */
"use client"

import * as Atom from "@effect-atom/atom/Atom"
import type * as AtomRef from "@effect-atom/atom/AtomRef"
import * as Registry from "@effect-atom/atom/Registry"
import type * as Result from "@effect-atom/atom/Result"
import { Effect } from "effect"
import * as Cause from "effect/Cause"
import * as Exit from "effect/Exit"
import { globalValue } from "effect/GlobalValue"
import * as React from "react"
import { RegistryContext } from "./RegistryContext.js"

interface AtomStore<A> {
  readonly subscribe: (f: () => void) => () => void
  readonly snapshot: () => A
  readonly getServerSnapshot: () => A
}

const storeRegistry = globalValue(
  "@effect-atom/atom-react/storeRegistry",
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
      return registry.subscribe(atom, f)
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

function useStore<A>(registry: Registry.Registry, atom: Atom.Atom<A>): A {
  const store = makeStore(registry, atom)

  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.getServerSnapshot)
}

const initialValuesSet = globalValue(
  "@effect-atom/atom-react/initialValuesSet",
  () => new WeakMap<Registry.Registry, WeakSet<Atom.Atom<any>>>()
)

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomInitialValues = (initialValues: Iterable<readonly [Atom.Atom<any>, any]>): void => {
  const registry = React.useContext(RegistryContext)
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
  <A>(atom: Atom.Atom<A>): A
  <A, B>(atom: Atom.Atom<A>, f: (_: A) => B): B
} = <A>(atom: Atom.Atom<A>, f?: (_: A) => A): A => {
  const registry = React.useContext(RegistryContext)
  if (f) {
    const atomB = React.useMemo(() => Atom.map(atom, f), [atom, f])
    return useStore(registry, atomB)
  }
  return useStore(registry, atom)
}

function mountAtom<A>(registry: Registry.Registry, atom: Atom.Atom<A>): void {
  React.useEffect(() => registry.mount(atom), [atom, registry])
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: Registry.Registry,
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (
      value: W,
      options?: {
        readonly signal?: AbortSignal | undefined
      } | undefined
    ) => Promise<Result.Result.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (
        value: W,
        options?: {
          readonly signal?: AbortSignal | undefined
        } | undefined
      ) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void)
{
  if (options?.mode === "promise" || options?.mode === "promiseExit") {
    return React.useCallback((value: W, opts?: { readonly signal?: AbortSignal }) => {
      let removeAbortListener: (() => void) | undefined
      const signal = opts?.signal
      if (signal && typeof signal.addEventListener === "function") {
        const onAbort = () => {
          registry.set(atom, Atom.Reset as any)
        }
        signal.addEventListener("abort", onAbort, { once: true })
        removeAbortListener = () => {
          signal.removeEventListener("abort", onAbort)
        }
      }
      registry.set(atom, value)
      const promise = Effect.runPromiseExit(
        Registry.getResult(registry, atom as Atom.Atom<Result.Result<any, any>>, { suspendOnWaiting: true }),
        opts
      )
      return (options!.mode === "promise" ? promise.then(flattenExit) : promise).finally(() => {
        removeAbortListener?.()
      })
    }, [registry, atom, options.mode]) as any
  }
  return React.useCallback((value: W | ((value: R) => W)) => {
    registry.set(atom, typeof value === "function" ? (value as any)(registry.get(atom)) : value)
  }, [registry, atom]) as any
}

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomMount = <A>(atom: Atom.Atom<A>): void => {
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSet: {
  <Arg, A, E, Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.AtomResultFn<Arg, A, E>,
    options?: { readonly mode?: Mode | undefined }
  ): "promise" extends Mode
    ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<A>
    : "promiseExit" extends Mode
      ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<Exit.Exit<A, E>>
    : (value: Arg | ((value: Result.Result<A, E>) => Arg)) => void
  <R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.Writable<R, W>,
    options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
  ): "promise" extends Mode ? (value: W) => Promise<Result.Result.Success<R>>
    : "promiseExit" extends Mode ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    : (value: W | ((value: R) => W)) => void
} = ((atom: any, options?: any) => {
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
  return setAtom(registry, atom, options)
}) as any

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefresh = <A>(atom: Atom.Atom<A>): () => void => {
  const registry = React.useContext(RegistryContext)
  mountAtom(registry, atom)
  return React.useCallback(() => {
    registry.refresh(atom)
  }, [registry, atom])
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtom: {
  <Arg, A, E, const Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.AtomResultFn<Arg, A, E>,
    options?: { readonly mode?: Mode | undefined }
  ): readonly [
    value: Result.Result<A, E>,
    write: "promise" extends Mode
      ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<A>
      : "promiseExit" extends Mode
        ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<Exit.Exit<A, E>>
      : (value: Arg | ((value: Result.Result<A, E>) => Arg)) => void
  ]
  <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.Writable<R, W>,
    options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
  ): readonly [
    value: R,
    write: "promise" extends Mode ? (value: W) => Promise<Result.Result.Success<R>>
      : "promiseExit" extends Mode
        ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
      : (value: W | ((value: R) => W)) => void
  ]
} = ((atom: any, options?: any) => {
  const registry = React.useContext(RegistryContext)
  return [useStore(registry, atom), setAtom(registry, atom, options)] as const
}) as any

const atomPromiseMap = globalValue(
  "@effect-atom/atom-react/atomPromiseMap",
  () => ({
    suspendOnWaiting: new Map<Atom.Atom<any>, Promise<void>>(),
    default: new Map<Atom.Atom<any>, Promise<void>>()
  })
)

function atomToPromise<A, E>(
  registry: Registry.Registry,
  atom: Atom.Atom<Result.Result<A, E>>,
  suspendOnWaiting: boolean
) {
  const map = suspendOnWaiting ? atomPromiseMap.suspendOnWaiting : atomPromiseMap.default
  let promise = map.get(atom)
  if (promise !== undefined) {
    return promise
  }
  promise = new Promise<void>((resolve) => {
    const dispose = registry.subscribe(atom, (result) => {
      if (result._tag === "Initial" || (suspendOnWaiting && result.waiting)) {
        return
      }
      setTimeout(dispose, 1000)
      resolve()
      map.delete(atom)
    })
  })
  map.set(atom, promise)
  return promise
}

function atomResultOrSuspend<A, E>(
  registry: Registry.Registry,
  atom: Atom.Atom<Result.Result<A, E>>,
  suspendOnWaiting: boolean
) {
  const value = useStore(registry, atom)
  if (value._tag === "Initial" || (suspendOnWaiting && value.waiting)) {
    throw atomToPromise(registry, atom, suspendOnWaiting)
  }
  return value
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSuspense = <A, E, const IncludeFailure extends boolean = false>(
  atom: Atom.Atom<Result.Result<A, E>>,
  options?: {
    readonly suspendOnWaiting?: boolean | undefined
    readonly includeFailure?: IncludeFailure | undefined
  }
): Result.Success<A, E> | (IncludeFailure extends true ? Result.Failure<A, E> : never) => {
  const registry = React.useContext(RegistryContext)
  const result = atomResultOrSuspend(registry, atom, options?.suspendOnWaiting ?? false)
  if (result._tag === "Failure" && !options?.includeFailure) {
    throw Cause.squash(result.cause)
  }
  return result as any
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSubscribe = <A>(
  atom: Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
): void => {
  const registry = React.useContext(RegistryContext)
  React.useEffect(
    () => registry.subscribe(atom, f, options),
    [registry, atom, f, options?.immediate]
  )
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRef = <A>(ref: AtomRef.ReadonlyRef<A>): A => {
  const [, setValue] = React.useState(ref.value)
  React.useEffect(() => ref.subscribe(setValue), [ref])
  return ref.value
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefProp = <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): AtomRef.AtomRef<A[K]> =>
  React.useMemo(() => ref.prop(prop), [ref, prop])

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefPropValue = <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K): A[K] =>
  useAtomRef(useAtomRefProp(ref, prop))
