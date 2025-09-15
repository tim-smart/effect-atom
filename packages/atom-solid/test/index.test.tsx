import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library"
import { Effect, Schema } from "effect"
import { Suspense, ErrorBoundary } from "solid-js"
import { beforeEach, describe, expect, it, test, vi } from "vitest"
import { 
  Hydration, 
  RegistryContext, 
  RegistryProvider,
  Result, 
  useAtomSuspense, 
  useAtomValue,
  useAtom,
  useAtomSet,
  useAtomSubscribe,
  useAtomSuspenseResult
} from "../src/index.js"

describe("atom-solid", () => {
  let registry: Registry.Registry

  beforeEach(() => {
    registry = Registry.make()
  })

  describe("useAtomValue", () => {
    test("should read value from simple Atom", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = useAtomValue(() => atom)
        return <div data-testid="value">{value()}</div>
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("42")
    })

    test("should read value with transform function", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = useAtomValue(() => atom, (x) => x * 2)
        return <div data-testid="value">{value()}</div>
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("84")
    })

    test("should update when Atom value changes", async () => {
      const atom = Atom.make("initial")

      function TestComponent() {
        const value = useAtomValue(() => atom)
        return <div data-testid="value">{value()}</div>
      }

      render(() => (
        <RegistryProvider registry={registry}>
          <TestComponent />
        </RegistryProvider>
      ))

      expect(screen.getByTestId("value")).toHaveTextContent("initial")

      registry.set(atom, "updated")

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("updated")
      })
    })



    test("should work like Counter example - with useAtom and useAtomValue", async () => {
      const baseAtom = Atom.make(5)
      const doubledAtom = Atom.make((get) => get(baseAtom) * 2)

      function TestComponent() {
        const [count, setCount] = useAtom(() => baseAtom)
        const doubled = useAtomValue(() => doubledAtom)
        return (
          <div>
            <div data-testid="count">{count()}</div>
            <div data-testid="doubled">{doubled()}</div>
            <button data-testid="increment" onClick={() => setCount(count() + 1)}>
              Increment
            </button>
          </div>
        )
      }

      render(() => (
        <RegistryProvider registry={registry}>
          <TestComponent />
        </RegistryProvider>
      ))

      expect(screen.getByTestId("count")).toHaveTextContent("5")
      expect(screen.getByTestId("doubled")).toHaveTextContent("10")

      fireEvent.click(screen.getByTestId("increment"))

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("6")
        expect(screen.getByTestId("doubled")).toHaveTextContent("12")
      })
    })





    test("should work with computed Atom", () => {
      const baseAtom = Atom.make(10)
      const computedAtom = Atom.make((get) => get(baseAtom) * 2)

      function TestComponent() {
        const value = useAtomValue(() => computedAtom)
        return <div data-testid="value">{value()}</div>
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("20")
    })
  })

  describe("useAtom", () => {
    test("should provide both value and setter", async () => {
      const atom = Atom.make(0)

      function TestComponent() {
        const [count, setCount] = useAtom(() => atom)
        
        return (
          <div>
            <div data-testid="value">{count()}</div>
            <button 
              data-testid="increment" 
              onClick={() => setCount(count() + 1)}
            >
              +
            </button>
          </div>
        )
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("0")

      fireEvent.click(screen.getByTestId("increment"))

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("1")
      })
    })

    test("should work with function updater", async () => {
      const atom = Atom.make(5)

      function TestComponent() {
        const [count, setCount] = useAtom(() => atom)
        
        return (
          <div>
            <div data-testid="value">{count()}</div>
            <button 
              data-testid="double" 
              onClick={() => setCount(prev => prev * 2)}
            >
              Double
            </button>
          </div>
        )
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("5")

      fireEvent.click(screen.getByTestId("double"))

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("10")
      })
    })
  })

  describe("useAtomSet", () => {
    test("should provide only setter function", async () => {
      const atom = Atom.make(0)

      function TestComponent() {
        const value = useAtomValue(() => atom)
        const setValue = useAtomSet(() => atom)
        
        return (
          <div>
            <div data-testid="value">{value()}</div>
            <button 
              data-testid="set" 
              onClick={() => setValue(42)}
            >
              Set to 42
            </button>
          </div>
        )
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("0")

      fireEvent.click(screen.getByTestId("set"))

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("42")
      })
    })
  })

  describe("useAtomSubscribe", () => {
    test("should subscribe to atom changes", async () => {
      const atom = Atom.make("initial")
      const callback = vi.fn()

      function TestComponent() {
        useAtomSubscribe(() => atom, callback)
        const setValue = useAtomSet(() => atom)
        
        return (
          <button 
            data-testid="update" 
            onClick={() => setValue("updated")}
          >
            Update
          </button>
        )
      }

      render(() => <TestComponent />)

      fireEvent.click(screen.getByTestId("update"))

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith("updated")
      })
    })
  })

  describe("RegistryProvider", () => {
    test("should provide registry to children", () => {
      const customRegistry = Registry.make()
      const atom = Atom.make("from-custom-registry")

      function TestComponent() {
        const value = useAtomValue(() => atom)
        return <div data-testid="value">{value()}</div>
      }

      render(() => (
        <RegistryProvider registry={customRegistry}>
          <TestComponent />
        </RegistryProvider>
      ))

      expect(screen.getByTestId("value")).toHaveTextContent("from-custom-registry")
    })

    test("should work without explicit registry", () => {
      const atom = Atom.make("default-registry")

      function TestComponent() {
        const value = useAtomValue(() => atom)
        return <div data-testid="value">{value()}</div>
      }

      render(() => (
        <RegistryProvider>
          <TestComponent />
        </RegistryProvider>
      ))

      expect(screen.getByTestId("value")).toHaveTextContent("default-registry")
    })
  })

  describe("useAtomSuspenseResult", () => {
    test("should handle loading state", () => {
      const atom = Atom.make(Effect.never)

      function TestComponent() {
        const result = useAtomSuspenseResult(() => atom)
        const current = result()
        
        if (current.loading) {
          return <div data-testid="loading">Loading...</div>
        }
        
        return <div data-testid="value">{current.data}</div>
      }

      render(() => <TestComponent />)

      expect(screen.getByTestId("loading")).toBeInTheDocument()
    })

    test("should handle success state", async () => {
      const atom = Atom.make(Effect.succeed("success"))

      function TestComponent() {
        const result = useAtomSuspenseResult(() => atom)
        const current = result()
        
        if (current.loading) {
          return <div data-testid="loading">Loading...</div>
        }
        
        if (current.error) {
          return <div data-testid="error">Error</div>
        }
        
        return <div data-testid="value">{current.data}</div>
      }

      render(() => <TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("success")
      })
    })

    test("should handle error state", async () => {
      const atom = Atom.make(Effect.fail("test error"))

      function TestComponent() {
        const result = useAtomSuspenseResult(() => atom)
        const current = result()
        
        if (current.loading) {
          return <div data-testid="loading">Loading...</div>
        }
        
        if (current.error) {
          return <div data-testid="error">Error</div>
        }
        
        return <div data-testid="value">{current.data}</div>
      }

      render(() => <TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument()
      })
    })
  })
})
