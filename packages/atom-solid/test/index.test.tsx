import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library"
import * as Effect from "effect/Effect"
import { Schema } from "effect"
import { Suspense, ErrorBoundary, createResource } from "solid-js"
import { beforeEach, describe, expect, test, vi } from "vitest"
import {
  Hydration,
  HydrationBoundary,
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

  describe("useAtomSuspense", () => {
    test("basic createResource suspense test", async () => {
      // First, let's test that basic SolidJS suspense works in our test environment
      const [resource] = createResource(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return "loaded"
      })

      function TestComponent() {
        return <div data-testid="value">{resource()}</div>
      }

      render(() => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      ))

      // Initially should show loading
      expect(screen.getByTestId("loading")).toBeInTheDocument()

      // After resource resolves, should show value
      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("loaded")
      }, { timeout: 1000 })
    })

    test("useAtomSuspense with resolved atom", async () => {
      const atom = Atom.make(Effect.succeed("test-value"))

      function TestComponent() {
        const value = useAtomSuspense(() => atom)
        return <div data-testid="value">{value().value}</div>
      }

      render(() => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      ))

      // Should show the value immediately since atom is already resolved
      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("test-value")
      })
    })

    test("useAtomSuspense with async atom", async () => {
      const atom = Atom.make(Effect.sleep(50).pipe(Effect.map(() => "async-value")))

      function TestComponent() {
        const value = useAtomSuspense(() => atom)
        return <div data-testid="value">{value().value}</div>
      }

      render(() => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      ))

      // Initially should show loading
      expect(screen.getByTestId("loading")).toBeInTheDocument()

      // After effect resolves, should show value
      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("async-value")
      }, { timeout: 1000 })
    })

    test("useAtomSuspense with error", async () => {
      const atom = Atom.make(Effect.fail(new Error("test-error")))

      function TestComponent() {
        const value = useAtomSuspense(() => atom)
        return <div data-testid="value">{value()._tag}</div>
      }

      function ErrorFallback(error: any) {
        return <div data-testid="error">Error caught</div>
      }

      render(() => (
        <ErrorBoundary fallback={ErrorFallback}>
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <TestComponent />
          </Suspense>
        </ErrorBoundary>
      ))

      // Wait for the error to be thrown and caught
      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    test("useAtomSuspense is exported and callable", () => {
      // Basic test to ensure the hook is exported and can be called
      expect(typeof useAtomSuspense).toBe("function")
    })
  })

  describe("Hydration", () => {
    test("basic hydration with multiple atom types", () => {
      const atomBasic = Atom.make(0).pipe(
        Atom.serializable({
          key: "basic",
          schema: Schema.Number
        })
      )

      const e: Effect.Effect<number, string> = Effect.never
      const makeAtomResult = (key: string) =>
        Atom.make(e).pipe(
          Atom.serializable({
            key,
            schema: Result.Schema({
              success: Schema.Number,
              error: Schema.String
            })
          })
        )

      const atomResult1 = makeAtomResult("success")
      const atomResult2 = makeAtomResult("errored")
      const atomResult3 = makeAtomResult("pending")

      const dehydratedState: Array<Hydration.DehydratedAtom> = [
        {
          key: "basic",
          value: 1,
          dehydratedAt: Date.now()
        },
        {
          key: "success",
          value: {
            _tag: "Success",
            value: 123,
            waiting: false,
            timestamp: Date.now()
          },
          dehydratedAt: Date.now()
        },
        {
          key: "errored",
          value: {
            _tag: "Failure",
            cause: {
              _tag: "Fail",
              error: "error"
            },
            previousSuccess: {
              _tag: "None"
            },
            waiting: false
          },
          dehydratedAt: Date.now()
        },
        {
          key: "pending",
          value: {
            _tag: "Initial",
            waiting: true
          },
          dehydratedAt: Date.now()
        }
      ]

      function Basic() {
        const value = useAtomValue(() => atomBasic)
        return <div data-testid="value">{value()}</div>
      }

      function Result1() {
        const value = useAtomValue(() => atomResult1)
        return Result.match(value(), {
          onSuccess: (value) => <div data-testid="value-1">{value.value}</div>,
          onFailure: () => <div data-testid="error-1">Error</div>,
          onInitial: () => <div data-testid="loading-1">Loading...</div>
        })
      }

      function Result2() {
        const value = useAtomValue(() => atomResult2)
        return Result.match(value(), {
          onSuccess: (value) => <div data-testid="value-2">{value.value}</div>,
          onFailure: () => <div data-testid="error-2">Error</div>,
          onInitial: () => <div data-testid="loading-2">Loading...</div>
        })
      }

      function Result3() {
        const value = useAtomValue(() => atomResult3)
        return Result.match(value(), {
          onSuccess: (value) => <div data-testid="value-3">{value.value}</div>,
          onFailure: () => <div data-testid="error-3">Error</div>,
          onInitial: () => <div data-testid="loading-3">Loading...</div>
        })
      }

      render(() => (
        <HydrationBoundary state={dehydratedState}>
          <Basic />
          <Result1 />
          <Result2 />
          <Result3 />
        </HydrationBoundary>
      ))

      expect(screen.getByTestId("value")).toHaveTextContent("1")
      expect(screen.getByTestId("value-1")).toHaveTextContent("123")
      expect(screen.getByTestId("error-2")).toBeInTheDocument()
      expect(screen.getByTestId("loading-3")).toBeInTheDocument()
    })

    test("hydration streaming", async () => {
      const latch = Effect.runSync(Effect.makeLatch())
      let start = 0
      let stop = 0
      const atom = Atom.make(
        Effect.gen(function*() {
          start = start + 1
          yield* latch.await
          stop = stop + 1
          return 1
        })
      ).pipe(
        Atom.serializable({
          key: "test",
          schema: Result.Schema({
            success: Schema.Number
          })
        })
      )

      registry.mount(atom)

      expect(start).toBe(1)
      expect(stop).toBe(0)

      const dehydratedState = Hydration.dehydrate(registry, {
        encodeInitialAs: "promise"
      })

      function TestComponent() {
        const value = useAtomValue(() => atom)
        return <div data-testid="value">{value()._tag}</div>
      }

      render(() => (
        // provide a fresh registry each time to simulate hydration
        <RegistryProvider registry={Registry.make()}>
          <HydrationBoundary state={dehydratedState}>
            <TestComponent />
          </HydrationBoundary>
        </RegistryProvider>
      ))

      expect(screen.getByTestId("value")).toHaveTextContent("Initial")

      Effect.runSync(latch.open)
      await Effect.runPromise(latch.await)

      const test = registry.get(atom)
      expect(test._tag).toBe("Success")
      if (test._tag === "Success") {
        expect(test.value).toBe(1)
      }

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("Success")
      })

      expect(start).toBe(1)
      expect(stop).toBe(1)
    })

    test("HydrationBoundary component exists", () => {
      // Basic test to ensure HydrationBoundary is exported and can be used
      expect(typeof HydrationBoundary).toBe("function")
    })

    test("Hydration module is available", () => {
      // Test that Hydration utilities are available
      expect(typeof Hydration.dehydrate).toBe("function")
      expect(typeof Hydration.hydrate).toBe("function")
    })
  })
})
