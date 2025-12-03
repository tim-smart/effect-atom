import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { act, render, screen, waitFor } from "@testing-library/react"
import { Effect, Layer, Schema } from "effect"
import { Suspense } from "react"
import { renderToString } from "react-dom/server"
import { ErrorBoundary } from "react-error-boundary"
import { beforeEach, describe, expect, it, test, vi } from "vitest"
import { Hydration, RegistryContext, RegistryProvider, Result, useAtomSuspense, useAtomValue } from "../src/index.js"
import { HydrationBoundary } from "../src/ReactHydration.js"

describe("atom-react", () => {
  let registry: Registry.Registry

  beforeEach(() => {
    registry = Registry.make()
  })

  describe("runtime", () => {
    test("can inject test layers", () => {
      class TheNumber extends Effect.Service<TheNumber>()("TheNumber", {
        succeed: { n: 42 as number }
      }) {}
      const runtime = Atom.runtime(TheNumber.Default)
      const numberAtom = runtime.atom(TheNumber.use((_) => Effect.succeed(_.n)))

      function TestComponent() {
        const value = useAtomValue(numberAtom, Result.getOrThrow)
        return <div data-testid="value">{value}</div>
      }

      render(
        <RegistryProvider
          initialValues={[
            Atom.initialValue(
              runtime.layer,
              Layer.succeed(TheNumber, new TheNumber({ n: 69 }))
            )
          ]}
        >
          <TestComponent />
        </RegistryProvider>
      )

      expect(screen.getByTestId("value")).toHaveTextContent("69")
    })
  })

  describe("useAtomValue", () => {
    test("should read value from simple Atom", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = useAtomValue(atom)
        return <div data-testid="value">{value}</div>
      }

      render(<TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("42")
    })

    test("should read value with transform function", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = useAtomValue(atom, (x) => x * 2)
        return <div data-testid="value">{value}</div>
      }

      render(<TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("84")
    })

    test("should update when Atom value changes", async () => {
      const atom = Atom.make("initial")

      function TestComponent() {
        const value = useAtomValue(atom)
        return <div data-testid="value">{value}</div>
      }

      render(
        <RegistryContext.Provider value={registry}>
          <TestComponent />
        </RegistryContext.Provider>
      )

      expect(screen.getByTestId("value")).toHaveTextContent("initial")

      act(() => {
        registry.set(atom, "updated")
      })

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("updated")
      })
    })

    test("should work with computed Atom", () => {
      const baseAtom = Atom.make(10)
      const computedAtom = Atom.make((get) => get(baseAtom) * 2)

      function TestComponent() {
        const value = useAtomValue(computedAtom)
        return <div data-testid="value">{value}</div>
      }

      render(<TestComponent />)

      expect(screen.getByTestId("value")).toHaveTextContent("20")
    })

    test("suspense success", () => {
      const atom = Atom.make(Effect.never)

      function TestComponent() {
        const value = useAtomSuspense(atom).value
        return <div data-testid="value">{value}</div>
      }

      render(
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      )

      expect(screen.getByTestId("loading")).toBeInTheDocument()
    })
  })

  test("suspense error", () => {
    const atom = Atom.make(Effect.fail(new Error("test")))
    function TestComponent() {
      const value = useAtomSuspense(atom).value
      return <div data-testid="value">{value}</div>
    }

    render(
      <ErrorBoundary fallback={<div data-testid="error">Error</div>}>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      </ErrorBoundary>,
      {
        onCaughtError: ((error: unknown) => {
          if (error instanceof Error && error.message === "test") {
            return
          }
          // eslint-disable-next-line no-console
          console.error(error)
        }) as unknown as undefined // todo: fix idk why the types are weird
      }
    )

    expect(screen.getByTestId("error")).toBeInTheDocument()
  })

  test("hydration", () => {
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
      const value = useAtomValue(atomBasic)
      return <div data-testid="value">{value}</div>
    }

    function Result1() {
      const value = useAtomValue(atomResult1)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-1">{value.value}</div>,
        onFailure: () => <div data-testid="error-1">Error</div>,
        onInitial: () => <div data-testid="loading-1">Loading...</div>
      })
    }

    function Result2() {
      const value = useAtomValue(atomResult2)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-2">{value.value}</div>,
        onFailure: () => <div data-testid="error-2">Error</div>,
        onInitial: () => <div data-testid="loading-2">Loading...</div>
      })
    }

    function Result3() {
      const value = useAtomValue(atomResult3)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-3">{value.value}</div>,
        onFailure: () => <div data-testid="error-3">Error</div>,
        onInitial: () => <div data-testid="loading-3">Loading...</div>
      })
    }

    render(
      <HydrationBoundary state={dehydratedState}>
        <Basic />
        <Result1 />
        <Result2 />
        <Result3 />
      </HydrationBoundary>
    )

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
      const value = useAtomValue(atom)
      return <div data-testid="value">{value._tag}</div>
    }

    render(
      // provide a fresh registry each time to simulate hydration
      <RegistryContext.Provider value={Registry.make()}>
        <HydrationBoundary state={dehydratedState}>
          <TestComponent />
        </HydrationBoundary>
      </RegistryContext.Provider>
    )

    expect(screen.getByTestId("value")).toHaveTextContent("Initial")

    act(() => {
      Effect.runSync(latch.open)
    })
    await Effect.runPromise(latch.await)

    const test = registry.get(atom)
    expect(test._tag).toBe("Success")
    if (test._tag === "Success") {
      expect(test.value).toBe(1)
    }

    expect(screen.getByTestId("value")).toHaveTextContent("Success")
    expect(start).toBe(1)
    expect(stop).toBe(1)
  })

  describe("SSR", () => {
    it("should run atom's during SSR by default", () => {
      const getCount = vi.fn(() => 0)
      const counterAtom = Atom.make(getCount)

      function TestComponent() {
        const count = useAtomValue(counterAtom)
        return <div>{count}</div>
      }

      function App() {
        return <TestComponent />
      }

      const ssrHtml = renderToString(<App />)

      expect(getCount).toHaveBeenCalled()
      expect(ssrHtml).toContain("0")

      render(<App />)

      expect(getCount).toHaveBeenCalled()
      expect(screen.getByText("0")).toBeInTheDocument()
    })
  })

  it("should not execute Atom effects during SSR when using withServerSnapshot", () => {
    const mockFetchData = vi.fn(() => 0)

    const userDataAtom = Atom.make(Effect.sync(() => mockFetchData())).pipe(
      Atom.withServerValueInitial
    )

    function TestComponent() {
      const result = useAtomValue(userDataAtom)

      return <div>{result._tag}</div>
    }

    function App() {
      return <TestComponent />
    }

    const ssrHtml = renderToString(<App />)

    expect(mockFetchData).not.toHaveBeenCalled()
    expect(ssrHtml).toContain("Initial")

    render(<App />)

    expect(mockFetchData).toHaveBeenCalled()
    expect(screen.getByText("Success")).toBeInTheDocument()
  })
})
