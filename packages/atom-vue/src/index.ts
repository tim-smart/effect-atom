/**
 * @since 1.0.0
 */
import type * as Atom from "@effect-atom/atom/Atom"
import type * as AtomRef from "@effect-atom/atom/AtomRef"
import * as Registry from "@effect-atom/atom/Registry"
import type * as Result from "@effect-atom/atom/Result"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { globalValue } from "effect/GlobalValue"
import type { ComputedRef, InjectionKey, Ref } from "vue"
import { computed, inject, shallowRef, watchEffect } from "vue"

/**
 * @since 1.0.0
 * @category modules
 */
export * as Registry from "@effect-atom/atom/Registry"

/**
 * @since 1.0.0
 * @category modules
 */
export * as Result from "@effect-atom/atom/Result"

/**
 * @since 1.0.0
 * @category modules
 */
export * as Atom from "@effect-atom/atom/Atom"

/**
 * @since 1.0.0
 * @category modules
 */
export * as AtomRef from "@effect-atom/atom/AtomRef"

/**
 * @since 1.0.0
 * @category re-exports
 */
export * as AtomHttpApi from "@effect-atom/atom/AtomHttpApi"

/**
 * @since 1.0.0
 * @category modules
 */
export * as AtomRpc from "@effect-atom/atom/AtomRpc"

/**
 * @since 1.0.0
 * @category registry
 */
export const registryKey = Symbol.for("@effect-atom/atom-vue/registryKey") as InjectionKey<Registry.Registry>

/**
 * @since 1.0.0
 * @category registry
 */
export const defaultRegistry: Registry.Registry = globalValue(
  "@effect-atom/atom-vue/defaultRegistry",
  () => Registry.make()
)

/**
 * @since 1.0.0
 * @category registry
 */
export const injectRegistry = (): Registry.Registry => {
  return inject(registryKey, defaultRegistry)
}

const useAtomValueRef = <A extends Atom.Atom<any>>(atom: () => A) => {
  const registry = injectRegistry()
  const atomRef = computed(atom)
  const value = shallowRef(undefined as any as A)
  watchEffect((onCleanup) => {
    onCleanup(registry.subscribe(atomRef.value, (nextValue) => {
      value.value = nextValue
    }, { immediate: true }))
  })
  return [value as Readonly<Ref<Atom.Type<A>>>, atomRef, registry] as const
}

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtom = <R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined
  }
): readonly [
  Readonly<Ref<R>>,
  write: "promise" extends Mode ? (
      (value: W) => Promise<Result.Result.Success<R>>
    ) :
    "promiseExit" extends Mode ? (
        (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
      ) :
    ((value: W | ((value: R) => W)) => void)
] => {
  const [value, atomRef, registry] = useAtomValueRef(atom)
  return [value as Readonly<Ref<R>>, setAtom(registry, atomRef, options)]
}

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomValue = <A>(atom: () => Atom.Atom<A>): Readonly<Ref<A>> => useAtomValueRef(atom)[0]

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: Registry.Registry,
  atomRef: ComputedRef<Atom.Writable<R, W>>,
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
    return ((value: W, opts?: any) => {
      registry.set(atomRef.value, value)
      const promise = Effect.runPromiseExit(
        Registry.getResult(registry, atomRef.value as Atom.Atom<Result.Result<any, any>>, { suspendOnWaiting: true }),
        opts
      )
      return options!.mode === "promise" ? promise.then(flattenExit) : promise
    }) as any
  }
  return ((value: W | ((value: R) => W)) => {
    registry.set(atomRef.value, typeof value === "function" ? (value as any)(registry.get(atomRef.value)) : value)
  }) as any
}

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomSet = <
  R,
  W,
  Mode extends "value" | "promise" | "promiseExit" = never
>(
  atom: () => Atom.Writable<R, W>,
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
  ((value: W | ((value: R) => W)) => void) =>
{
  const registry = injectRegistry()
  const atomRef = computed(atom)
  watchEffect((onCleanup) => {
    onCleanup(registry.mount(atomRef.value))
  })
  return setAtom(registry, atomRef, options)
}

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomRef = <A>(atomRef: () => AtomRef.ReadonlyRef<A>): Readonly<Ref<A>> => {
  const atomRefRef = computed(atomRef)
  const value = shallowRef<A>(atomRefRef.value.value)
  watchEffect((onCleanup) => {
    const atomRef = atomRefRef.value
    onCleanup(atomRef.subscribe((next) => {
      value.value = next
    }))
  })
  return value as Readonly<Ref<A>>
}
