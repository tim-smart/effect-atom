/**
 * @since 1.0.0
 */
"use client"
import * as Registry from "@effect-rx/rx/Registry"
import type * as Rx from "@effect-rx/rx/Rx"
import * as React from "react"
import * as Scheduler from "scheduler"

/**
 * @since 1.0.0
 * @category context
 */
export function scheduleTask(f: () => void): void {
  Scheduler.unstable_scheduleCallback(Scheduler.unstable_LowPriority, f)
}

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryContext = React.createContext<Registry.Registry>(Registry.make({
  scheduleTask,
  defaultIdleTTL: 400
}))

/**
 * @since 1.0.0
 * @category context
 */
export const RegistryProvider = (options: {
  readonly children?: React.ReactNode | undefined
  readonly initialValues?: Iterable<readonly [Rx.Rx<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}) => {
  const ref = React.useRef<{
    readonly registry: Registry.Registry
    timeout?: number | undefined
  }>(null)
  if (ref.current === null) {
    ref.current = {
      registry: Registry.make({
        scheduleTask: options.scheduleTask ?? scheduleTask,
        initialValues: options.initialValues,
        timeoutResolution: options.timeoutResolution,
        defaultIdleTTL: options.defaultIdleTTL
      })
    }
  }
  React.useEffect(() => {
    if (ref.current?.timeout !== undefined) {
      clearTimeout(ref.current.timeout)
    }
    return () => {
      setTimeout(() => {
        ref.current?.registry.dispose()
        ref.current = null
      }, 500)
    }
  }, [ref])
  return React.createElement(RegistryContext.Provider, { value: ref.current.registry }, options?.children)
}
