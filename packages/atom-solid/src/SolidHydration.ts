/**
 * @since 1.0.0
 */
import * as Hydration from "@effect-atom/atom/Hydration"
import * as Result from "@effect-atom/atom/Result"
import { createEffect, createMemo, type JSX } from "solid-js"
import { useRegistry } from "./Context.js"

/**
 * Check if hydration data is newer than the existing node value
 *
 * @since 1.0.0
 * @category utils
 */
function isHydrationDataNewer(
  existingNode: any,
  dehydratedAtom: Hydration.DehydratedAtom
): boolean {
  try {
    const currentValue = existingNode.value()

    // If current value is a Success Result, compare timestamps
    if (Result.isResult(currentValue) && Result.isSuccess(currentValue)) {
      return dehydratedAtom.dehydratedAt > currentValue.timestamp
    }

    // For Failure Results, check if there's a previousSuccess with timestamp
    if (Result.isResult(currentValue) && Result.isFailure(currentValue)) {
      const previousSuccess = currentValue.previousSuccess
      if (previousSuccess._tag === "Some" && Result.isSuccess(previousSuccess.value)) {
        return dehydratedAtom.dehydratedAt > previousSuccess.value.timestamp
      }
    }

    // For Initial Results or non-Result values, we can't determine age reliably
    // Default to hydrating if the dehydrated data is recent (within last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    return dehydratedAtom.dehydratedAt > fiveMinutesAgo
  } catch {
    // If we can't get the current value, default to hydrating
    return true
  }
}

/**
 * @since 1.0.0
 * @category components
 */
export interface HydrationBoundaryProps {
  state?: Iterable<Hydration.DehydratedAtom>
  children?: JSX.Element
}

/**
 * @since 1.0.0
 * @category components
 */
export function HydrationBoundary(props: HydrationBoundaryProps) {
  const registry = useRegistry()

  // This createMemo is for performance reasons only, everything inside it must
  // be safe to run in every render and code here should be read as "in render".
  //
  // This code needs to happen during the render phase, because after initial
  // SSR, hydration needs to happen _before_ children render. Also, if hydrating
  // during a transition, we want to hydrate as much as is safe in render so
  // we can prerender as much as possible.
  //
  // For any Atom values that already exist in the registry, we want to hold back on
  // hydrating until _after_ the render phase. The reason for this is that during
  // transitions, we don't want the existing Atom values and subscribers to update to
  // the new data on the current page, only _after_ the transition is committed.
  // If the transition is aborted, we will have hydrated any _new_ Atom values, but
  // we throw away the fresh data for any existing ones to avoid unexpectedly
  // updating the UI.
  const hydrationQueue = createMemo(() => {
    const state = props.state
    if (state) {
      const dehydratedAtoms = Array.from(state)
      const nodes = registry.getNodes()

      const newDehydratedAtoms: Array<Hydration.DehydratedAtom> = []
      const existingDehydratedAtoms: Array<Hydration.DehydratedAtom> = []

      for (const dehydratedAtom of dehydratedAtoms) {
        const existingNode = nodes.get(dehydratedAtom.key)

        if (!existingNode) {
          // This is a new Atom value, safe to hydrate immediately
          newDehydratedAtoms.push(dehydratedAtom)
        } else {
          // This Atom value already exists, check if hydration data is newer
          const shouldHydrate = isHydrationDataNewer(existingNode, dehydratedAtom)

          if (shouldHydrate) {
            // Hydration data is newer, queue it for later hydration
            existingDehydratedAtoms.push(dehydratedAtom)
          }
          // If hydration data is older or same age, ignore it
        }
      }

      if (newDehydratedAtoms.length > 0) {
        // It's actually fine to call this with state that already exists
        // in the registry, or is older. hydrate() is idempotent.
        Hydration.hydrate(registry, newDehydratedAtoms)
      }

      if (existingDehydratedAtoms.length > 0) {
        return existingDehydratedAtoms
      }
    }
    return undefined
  })

  createEffect(() => {
    const queue = hydrationQueue()
    if (queue) {
      Hydration.hydrate(registry, queue)
    }
  })

  return props.children
}
