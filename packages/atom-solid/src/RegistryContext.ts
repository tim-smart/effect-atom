/**
 * @since 1.0.0
 */
import type * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import type { JSX } from "solid-js"
import { createComponent, createContext, onCleanup } from "solid-js"

const defaultScheduleTask = (f: () => void) => queueMicrotask(f)

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryContext = createContext<Registry.Registry>(Registry.make({
  scheduleTask: defaultScheduleTask
}))

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryProvider = (options: {
  readonly children?: JSX.Element | undefined
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}) => {
  const registry = Registry.make({
    scheduleTask: options.scheduleTask ?? defaultScheduleTask,
    initialValues: options.initialValues,
    timeoutResolution: options.timeoutResolution,
    defaultIdleTTL: options.defaultIdleTTL
  })
  onCleanup(() => registry.dispose())
  return createComponent(RegistryContext.Provider, {
    value: registry,
    get children() {
      return options.children
    }
  })
}
