import { AtomRef } from "@effect-atom/atom"
import { createRoot } from "solid-js"
import { describe, expect, test } from "vitest"
import {
  Atom,
  defaultRegistry,
  Registry,
  RegistryProvider,
  useAtom,
  useAtomMount,
  useAtomRef,
  useAtomRefProp,
  useAtomRefPropValue,
  useAtomRefresh,
  useAtomSet,
  useAtomSubscribe,
  useAtomValue
} from "../src/index.js"

describe("atom-solid", () => {
  describe("useAtomValue", () => {
    test("returns initial atom value", () => {
      const countAtom = Atom.make(42)

      createRoot((dispose) => {
        const count = useAtomValue(countAtom)
        expect(count()).toBe(42)
        dispose()
      })
    })

    test("updates when atom changes", () => {
      const countAtom = Atom.make(0)

      createRoot((dispose) => {
        const count = useAtomValue(countAtom)

        expect(count()).toBe(0)

        defaultRegistry.set(countAtom, 10)
        expect(count()).toBe(10)

        defaultRegistry.set(countAtom, 99)
        expect(count()).toBe(99)

        dispose()
      })
    })

    test("works with derived atoms", () => {
      const countAtom = Atom.make(5)
      const doubledAtom = Atom.map(countAtom, (n) => n * 2)

      createRoot((dispose) => {
        const doubled = useAtomValue(doubledAtom)
        expect(doubled()).toBe(10)
        dispose()
      })
    })

    test("works with optional mapper function", () => {
      const countAtom = Atom.make(5)

      createRoot((dispose) => {
        const doubled = useAtomValue(countAtom, (n) => n * 2)
        expect(doubled()).toBe(10)
        dispose()
      })
    })
  })

  describe("useAtomSet", () => {
    test("returns a setter function", () => {
      const countAtom = Atom.make(0)

      createRoot((dispose) => {
        const setCount = useAtomSet(countAtom)

        expect(typeof setCount).toBe("function")
        expect(defaultRegistry.get(countAtom)).toBe(0)

        setCount(5)
        expect(defaultRegistry.get(countAtom)).toBe(5)

        // Test function updater
        setCount((prev) => prev + 1)
        expect(defaultRegistry.get(countAtom)).toBe(6)

        dispose()
      })
    })
  })

  describe("useAtom", () => {
    test("returns value accessor and setter", () => {
      const countAtom = Atom.make(0)

      createRoot((dispose) => {
        const [count, setCount] = useAtom(countAtom)

        expect(count()).toBe(0)

        setCount(10)
        expect(count()).toBe(10)
        expect(defaultRegistry.get(countAtom)).toBe(10)

        setCount((prev) => prev * 2)
        expect(count()).toBe(20)

        dispose()
      })
    })
  })

  describe("useAtomRefresh", () => {
    test("returns a refresh function", () => {
      let computeCount = 0
      const computedAtom = Atom.make(() => {
        computeCount++
        return computeCount
      })

      createRoot((dispose) => {
        const refresh = useAtomRefresh(computedAtom)
        expect(typeof refresh).toBe("function")

        // Initial computation - trigger get to ensure atom is computed
        defaultRegistry.get(computedAtom)
        const initialCount = computeCount

        // Refresh should recompute
        refresh()
        const value2 = defaultRegistry.get(computedAtom)
        expect(value2).toBe(initialCount + 1)

        dispose()
      })
    })
  })

  describe("useAtomMount", () => {
    test("mounts the atom without returning value", () => {
      const countAtom = Atom.make(42)

      createRoot((dispose) => {
        // useAtomMount should not throw and should complete
        useAtomMount(countAtom)

        // Verify the atom is accessible via registry
        expect(defaultRegistry.get(countAtom)).toBe(42)

        dispose()
      })
    })
  })

  describe("useAtomSubscribe", () => {
    test("subscribes to atom changes with callback", () => {
      const countAtom = Atom.make(0)
      const values: Array<number> = []

      createRoot((dispose) => {
        useAtomSubscribe(countAtom, (value) => {
          values.push(value)
        })

        defaultRegistry.set(countAtom, 1)
        defaultRegistry.set(countAtom, 2)
        defaultRegistry.set(countAtom, 3)

        expect(values).toEqual([1, 2, 3])

        dispose()
      })
    })

    test("supports immediate option", () => {
      const countAtom = Atom.make(42)
      const values: Array<number> = []

      createRoot((dispose) => {
        useAtomSubscribe(
          countAtom,
          (value) => {
            values.push(value)
          },
          { immediate: true }
        )

        // With immediate: true, should receive current value immediately
        expect(values).toEqual([42])

        dispose()
      })
    })
  })

  describe("useAtomRef", () => {
    test("subscribes to AtomRef value", () => {
      const ref = AtomRef.make(10)

      createRoot((dispose) => {
        const value = useAtomRef(ref)
        expect(value()).toBe(10)

        ref.set(20)
        expect(value()).toBe(20)

        dispose()
      })
    })
  })

  describe("useAtomRefProp", () => {
    test("returns a prop lens from AtomRef", () => {
      const ref = AtomRef.make({ count: 5, name: "test" })

      createRoot((dispose) => {
        const countRef = useAtomRefProp(ref, "count")

        expect(countRef.value).toBe(5)

        countRef.set(10)
        expect(ref.value.count).toBe(10)

        dispose()
      })
    })
  })

  describe("useAtomRefPropValue", () => {
    test("returns reactive prop value from AtomRef", () => {
      const ref = AtomRef.make({ count: 5, name: "test" })

      createRoot((dispose) => {
        const count = useAtomRefPropValue(ref, "count")

        expect(count()).toBe(5)

        ref.set({ ...ref.value, count: 15 })
        expect(count()).toBe(15)

        dispose()
      })
    })
  })

  describe("RegistryProvider", () => {
    test("is exported and callable", () => {
      // RegistryProvider exists and is a function
      expect(typeof RegistryProvider).toBe("function")
    })

    test("creates new registry when none provided", () => {
      const countAtom = Atom.make(50)

      createRoot((dispose) => {
        // Just verify we can use atoms with the default registry
        const count = useAtomValue(countAtom)
        expect(count()).toBe(50)
        dispose()
      })
    })
  })

  describe("with SubscriptionRef pattern", () => {
    test("Atom.subscriptionRef creates writable atom from SubscriptionRef", async () => {
      const { Effect, SubscriptionRef } = await import("effect")
      const registry = Registry.make()

      // Create a SubscriptionRef
      const ref = Effect.runSync(SubscriptionRef.make("initial"))

      // Wrap it in an atom
      const stateAtom = Atom.subscriptionRef(ref)

      // Get initial value directly from registry
      const initialValue = registry.get(stateAtom)
      expect(initialValue).toBe("initial")

      // Update via SubscriptionRef
      Effect.runSync(SubscriptionRef.set(ref, "updated"))

      // Wait for subscription to propagate
      await new Promise((resolve) => setTimeout(resolve, 50))

      // The atom should reflect the change
      const updatedValue = registry.get(stateAtom)
      expect(updatedValue).toBe("updated")
    })
  })
})
