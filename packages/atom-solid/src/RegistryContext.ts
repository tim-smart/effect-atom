/**
 * @since 1.0.0
 */
import type * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { globalValue } from "effect/GlobalValue"
import type { ParentProps } from "solid-js"
import { createContext, onCleanup, useContext } from "solid-js"

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
  () => Registry.make()
)

/**
 * @since 1.0.0
 * @category context
 */
export const useRegistry = (): Registry.Registry => {
  return useContext(RegistryContext) ?? defaultRegistry
}

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryProvider = (
  props: ParentProps<{
    readonly registry?: Registry.Registry | undefined
    readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  }>
): ReturnType<typeof RegistryContext.Provider> => {
  const registry = props.registry ?? Registry.make({
    initialValues: props.initialValues
  })

  onCleanup(() => {
    if (!props.registry) {
      registry.dispose()
    }
  })

  return RegistryContext.Provider({
    value: registry,
    children: props.children
  })
}
