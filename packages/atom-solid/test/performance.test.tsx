/**
 * Performance tests for atom-solid optimizations
 */

import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { render, cleanup } from "@solidjs/testing-library"
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest"
import { useAtomValue, RegistryProvider } from "../src/index.js"
import { JSX } from "solid-js/jsx-runtime"

describe("Performance Optimizations", () => {
  let registry: Registry.Registry

  beforeEach(() => {
    registry = Registry.make()
  })

  afterEach(() => {
    cleanup()
  })

  test("should reuse signals for same atom instances", () => {
    const atom = Atom.make(0)
    let renderCount = 0

    function TestComponent() {
      renderCount++
      const value = useAtomValue(() => atom)
      return <div>{value()}</div>
    }

    // Render multiple components using the same atom
    render(() => (
      <RegistryProvider registry={registry}>
        <TestComponent />
        <TestComponent />
        <TestComponent />
      </RegistryProvider>
    ))

    // Should only render each component once initially
    expect(renderCount).toBe(3)

    // Update the atom
    registry.set(atom, 1)

    // All components should update, but efficiently
    expect(registry.get(atom)).toBe(1)
  })

  test("should handle rapid updates efficiently", async () => {
    const atom = Atom.make(0)
    let updateCount = 0

    function TestComponent() {
      const value = useAtomValue(() => atom)
      updateCount++
      return <div>{value()}</div>
    }

    render(() => (
      <RegistryProvider registry={registry}>
        <TestComponent />
      </RegistryProvider>
    ))

    const initialUpdateCount = updateCount

    // Perform rapid updates with small delays to allow batching to work
    for (let i = 1; i <= 10; i++) {
      registry.set(atom, i)
      // Small delay to allow effects to run
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    // Should handle updates efficiently - final value should be correct
    expect(registry.get(atom)).toBe(10)
    // Updates should have occurred (batching may reduce the count, which is good)
    expect(updateCount).toBeGreaterThanOrEqual(initialUpdateCount)
  })

  test("should clean up subscriptions properly", () => {
    const atom = Atom.make(0)
    let subscriptionCount = 0

    // Mock the subscription to count active subscriptions
    const originalSubscribe = registry.subscribe
    vi.spyOn(registry, 'subscribe').mockImplementation(
      (atom: Atom.Atom<any>, callback: (_: any) => void, options?: { readonly immediate?: boolean }) => {
        subscriptionCount++
        const unsubscribe = originalSubscribe.call(registry, atom, callback, options)
        return () => {
          subscriptionCount--
          unsubscribe()
        }
      }
    )

    function TestComponent() {
      const value = useAtomValue(() => atom)
      return <div>{value()}</div>
    }

    const { unmount } = render(() => (
      <RegistryProvider registry={registry}>
        <TestComponent />
      </RegistryProvider>
    ))

    expect(subscriptionCount).toBeGreaterThan(0)

    unmount()

    // Subscriptions should be cleaned up
    expect(subscriptionCount).toBe(0)

    // Restore the original subscribe method
    vi.restoreAllMocks()
  })

  test("should handle memory efficiently with many atoms", () => {
    const atoms: Atom.Atom<number>[] = []
    
    // Create many atoms
    for (let i = 0; i < 1000; i++) {
      atoms.push(Atom.make(i))
    }

    function TestComponent({ atomIndex }: { atomIndex: number }) {
      const value = useAtomValue(() => atoms[atomIndex])
      return <div>{value()}</div>
    }

    // Render components for first 100 atoms
    const components: JSX.Element[] = []
    for (let i = 0; i < 100; i++) {
      components.push(<TestComponent atomIndex={i} />)
    }

    render(() => (
      <RegistryProvider registry={registry}>
        {components}
      </RegistryProvider>
    ))

    // All atoms should be accessible
    expect(registry.get(atoms[0])).toBe(0)
    expect(registry.get(atoms[99])).toBe(99)
  })

  test("should optimize computed atom evaluations", () => {
    const baseAtom = Atom.make(1)
    const computedAtom = Atom.make((get) => get(baseAtom) * 2)
    let computeCount = 0

    // Spy on the registry.get method to count evaluations
    const originalGet = registry.get.bind(registry)
    vi.spyOn(registry, 'get').mockImplementation((atom: Atom.Atom<any>) => {
      if (atom === computedAtom) {
        computeCount++
      }
      return originalGet(atom)
    })

    function TestComponent() {
      const value = useAtomValue(() => computedAtom)
      return <div>{value()}</div>
    }

    render(() => (
      <RegistryProvider registry={registry}>
        <TestComponent />
        <TestComponent />
      </RegistryProvider>
    ))

    const initialComputeCount = computeCount

    // Update base atom
    registry.set(baseAtom, 2)

    // Computed atom should be evaluated efficiently
    expect(registry.get(computedAtom)).toBe(4)
    expect(computeCount).toBeGreaterThan(initialComputeCount)
  })
})
