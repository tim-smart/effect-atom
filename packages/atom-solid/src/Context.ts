/**
 * @since 1.0.0
 */

import type * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { globalValue } from "effect/GlobalValue"
import { createContext, type JSX, useContext } from "solid-js"

/**
 * @since 1.0.0
 * @category context
 */
export function scheduleTask(f: () => void): void {
  setTimeout(f, 0)
}

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryContext = createContext<Registry.Registry>()

/**
 * @since 1.0.0
 * @category context
 */
export const defaultRegistry: Registry.Registry = globalValue(
  "@effect-atom/atom-solid/defaultRegistry",
  () =>
    Registry.make({
      scheduleTask,
      defaultIdleTTL: 400
    })
)

/**
 * @since 1.0.0
 * @category context
 */
export const useRegistry = (): Registry.Registry => {
  const registry = useContext(RegistryContext)
  if (registry === undefined) {
    return defaultRegistry
  }
  return registry
}

/**
 * @since 1.0.0
 * @category context
 */
export interface RegistryProviderProps {
  readonly children?: any
  readonly registry?: Registry.Registry
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]>
  readonly scheduleTask?: (f: () => void) => void
  readonly timeoutResolution?: number
  readonly defaultIdleTTL?: number
}

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryProvider = (props: RegistryProviderProps): JSX.Element => {
  const registry = props.registry ?? Registry.make({
    scheduleTask: props.scheduleTask ?? scheduleTask,
    initialValues: props.initialValues,
    timeoutResolution: props.timeoutResolution,
    defaultIdleTTL: props.defaultIdleTTL ?? 400
  })

  return RegistryContext.Provider({
    value: registry,
    get children() {
      return props.children
    }
  })
}
