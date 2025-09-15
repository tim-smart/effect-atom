/**
 * @since 1.0.0
 */

import type * as Atom from "@effect-atom/atom/Atom"
import type * as Registry from "@effect-atom/atom/Registry"
import type * as Result from "@effect-atom/atom/Result"
import * as Cause from "effect/Cause"
import { globalValue } from "effect/GlobalValue"
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { useRegistry } from "./Context.js"

const atomPromiseMap = globalValue(
  "@effect-atom/atom-solid/atomPromiseMap",
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
): Accessor<Result.Result<A, E>> {
  const [value, setValue] = createSignal(registry.get(atom))

  createEffect(() => {
    const unsubscribe = registry.subscribe(atom, (newValue) => {
      setValue(() => newValue)
    })
    onCleanup(unsubscribe)
  })

  createEffect(() => {
    const current = value()
    if (current._tag === "Initial" || (suspendOnWaiting && current.waiting)) {
      throw atomToPromise(registry, atom, suspendOnWaiting)
    }
  })

  return value
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSuspense = <A, E, const IncludeFailure extends boolean = false>(
  atomFactory: () => Atom.Atom<Result.Result<A, E>>,
  options?: {
    readonly suspendOnWaiting?: boolean | undefined
    readonly includeFailure?: IncludeFailure | undefined
  }
): Accessor<Result.Success<A, E> | (IncludeFailure extends true ? Result.Failure<A, E> : never)> => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  const result = atomResultOrSuspend(registry, atomRef(), options?.suspendOnWaiting ?? false)

  return createMemo(() => {
    const current = result()
    if (current._tag === "Failure" && !options?.includeFailure) {
      throw Cause.squash(current.cause)
    }
    return current as any
  })
}

/**
 * @since 1.0.0
 * @category hooks
 */
export interface SuspenseResult<A, E> {
  readonly loading: boolean
  readonly data: A | null
  readonly error: Cause.Cause<E> | null
}

/**
 * Alternative to useAtomSuspense that doesn't throw but returns loading state
 * @since 1.0.0
 * @category hooks
 */
export const useAtomSuspenseResult = <A, E>(
  atomFactory: () => Atom.Atom<Result.Result<A, E>>,
  options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }
): Accessor<SuspenseResult<A, E>> => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  const [value, setValue] = createSignal(registry.get(atomRef()))

  createEffect(() => {
    const atom = atomRef()
    const unsubscribe = registry.subscribe(atom, (newValue) => {
      setValue(() => newValue)
    })
    onCleanup(unsubscribe)
  })

  return createMemo(() => {
    const current = value()
    switch (current._tag) {
      case "Initial":
        return { loading: true, data: null, error: null }
      case "Success":
        return { loading: current.waiting, data: current.value, error: null }
      case "Failure":
        return { loading: current.waiting, data: null, error: current.cause }
      default:
        return { loading: true, data: null, error: null }
    }
  })
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomError = <A, E>(
  atomFactory: () => Atom.Atom<Result.Result<A, E>>
): Accessor<Cause.Cause<E> | null> => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  const [value, setValue] = createSignal(registry.get(atomRef()))

  createEffect(() => {
    const atom = atomRef()
    const unsubscribe = registry.subscribe(atom, (newValue) => {
      setValue(() => newValue)
    })
    onCleanup(unsubscribe)
  })

  return createMemo(() => {
    const current = value()
    return current._tag === "Failure" ? current.cause : null
  })
}

/**
 * @since 1.0.0
 * @category hooks
 */
export const useAtomLoading = <A, E>(
  atomFactory: () => Atom.Atom<Result.Result<A, E>>
): Accessor<boolean> => {
  const registry = useRegistry()
  const atomRef = createMemo(atomFactory)
  const [value, setValue] = createSignal(registry.get(atomRef()))

  createEffect(() => {
    const atom = atomRef()
    const unsubscribe = registry.subscribe(atom, (newValue) => {
      setValue(() => newValue)
    })
    onCleanup(unsubscribe)
  })

  return createMemo(() => {
    const current = value()
    return current._tag === "Initial" || current.waiting
  })
}
