/**
 * @since 1.0.0
 */
import * as Hydration from "@effect-atom/atom/Hydration"
import { createEffect, createMemo, type JSX } from "solid-js"
import { useRegistry } from "./Context.js"

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
          // This Atom value already exists, queue it for later hydration
          // TODO: Add logic to check if hydration data is newer
          existingDehydratedAtoms.push(dehydratedAtom)
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
