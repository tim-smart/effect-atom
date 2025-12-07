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
import type { Accessor } from "solid-js"
import { createSignal, onCleanup } from "solid-js"
import { useRegistry } from "./RegistryContext.js"

function useStore<A>(registry: Registry.Registry, atom: Atom.Atom<A>): Accessor<A> {
  const [value, setValue] = createSignal<A>(registry.get(atom))
  const unsubscribe = registry.subscribe(atom, (nextValue) => {
    setValue(() => nextValue)
  })
  onCleanup(unsubscribe)
  return value
}

function mountAtom<A>(registry: Registry.Registry, atom: Atom.Atom<A>): void {
  const unmount = registry.mount(atom)
  onCleanup(unmount)
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
export const useAtomValue: {
  <A>(atom: Atom.Atom<A>): Accessor<A>
  <A, B>(atom: Atom.Atom<A>, f: (_: A) => B): Accessor<B>
} = <A, B>(atom: Atom.Atom<A>, f?: (_: A) => B): Accessor<A | B> => {
  const registry = useRegistry()
  if (f) {
    return useStore(registry, Atom.map(atom, f))
  }
  return useStore(registry, atom)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomMount = <A>(atom: Atom.Atom<A>): void => {
  const registry = useRegistry()
  mountAtom(registry, atom)
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
  ((value: W | ((value: R) => W)) => void) =>
{
  const registry = useRegistry()
  mountAtom(registry, atom)
  return setAtom(registry, atom, options)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefresh = <A>(atom: Atom.Atom<A>): () => void => {
  const registry = useRegistry()
  mountAtom(registry, atom)
  return () => registry.refresh(atom)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtom = <
  R,
  W,
  const Mode extends "value" | "promise" | "promiseExit" = never
>(
  atom: Atom.Writable<R, W>,
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
  return [
    useStore(registry, atom),
    setAtom(registry, atom, options)
  ] as const
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
  const registry = useRegistry()
  const unsubscribe = registry.subscribe(atom, f, options)
  onCleanup(unsubscribe)
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRef = <A>(ref: AtomRef.ReadonlyRef<A>): Accessor<A> => {
  const [value, setValue] = createSignal<A>(ref.value)
  const unsubscribe = ref.subscribe((next) => {
    setValue(() => next)
  })
  onCleanup(unsubscribe)
  return value
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefProp = <A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K
): AtomRef.AtomRef<A[K]> => ref.prop(prop)

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomRefPropValue = <A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K
): Accessor<A[K]> => useAtomRef(useAtomRefProp(ref, prop))
