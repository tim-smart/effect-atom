import * as Atom from "@effect-atom/atom/Atom"
import * as AtomRef from "@effect-atom/atom/AtomRef"
import * as Registry from "@effect-atom/atom/Registry"
import type * as Result from "@effect-atom/atom/Result"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { createComponent, createRoot } from "solid-js"
import { describe, expect, it, vi } from "vitest"
import {
  RegistryContext,
  useAtom,
  useAtomInitialValues,
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
  it("useAtomValue reads and updates", () => {
    const atom = Atom.make(42)
    const registry = Registry.make()

    createRoot((dispose) => {
      let value!: () => number

      createComponent(RegistryContext.Provider, {
        value: registry,
        get children() {
          return createComponent(() => {
            value = useAtomValue(atom)
            return null as any
          }, {})
        }
      })

      expect(value()).toBe(42)
      registry.set(atom, 100)
      expect(value()).toBe(100)

      dispose()
    })
  })

  it("useAtom returns accessor + setter", () => {
    const atom = Atom.make(0)
    const registry = Registry.make()

    createRoot((dispose) => {
      let value!: () => number
      let set!: (value: number | ((n: number) => number)) => void

      createComponent(RegistryContext.Provider, {
        value: registry,
        get children() {
          return createComponent(() => {
            ;[value, set] = useAtom(atom)
            return null as any
          }, {})
        }
      })

      expect(value()).toBe(0)
      set(1)
      expect(value()).toBe(1)
      set((n) => n + 1)
      expect(value()).toBe(2)

      dispose()
    })
  })

  it("useAtomSet writes values", () => {
    const atom = Atom.make(0)
    const registry = Registry.make()

    createRoot((dispose) => {
      let set!: (value: number | ((n: number) => number)) => void

      createComponent(RegistryContext.Provider, {
        value: registry,
        get children() {
          return createComponent(() => {
            set = useAtomSet(atom)
            return null as any
          }, {})
        }
      })

      set(1)
      expect(registry.get(atom)).toBe(1)
      set((n) => n + 1)
      expect(registry.get(atom)).toBe(2)

      dispose()
    })
  })

  it("useAtomSubscribe receives updates (immediate)", () => {
    const atom = Atom.make("a")
    const registry = Registry.make()

    createRoot((dispose) => {
      const spy = vi.fn<(value: string) => void>()

      createComponent(RegistryContext.Provider, {
        value: registry,
        get children() {
          return createComponent(() => {
            useAtomSubscribe(atom, spy, { immediate: true })
            return null as any
          }, {})
        }
      })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith("a")

      registry.set(atom, "b")
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenLastCalledWith("b")

      dispose()
    })
  })

  it("useAtomRefresh triggers recomputation", () => {
    const nowAtom = Atom.make(Effect.sync(() => Date.now()))
    const registry = Registry.make()

    createRoot((dispose) => {
      let now!: () => number
      let refresh!: () => void

      const originalNow = Date.now
      let n = 0
      // Deterministic timestamps so we can assert a change.
      Date.now = () => ++n

      try {
        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            return createComponent(() => {
              now = useAtomValue(nowAtom, (r) => (r._tag === "Success" ? r.value : -1))
              refresh = useAtomRefresh(nowAtom)
              useAtomMount(nowAtom)
              return null as any
            }, {})
          }
        })

        const first = now()
        refresh()
        const second = now()
        expect(second).not.toBe(first)
      } finally {
        Date.now = originalNow
        dispose()
      }
    })
  })

  it("useAtomRef + prop helpers", () => {
    const ref = AtomRef.make({ a: 1, b: 2 })

    createRoot((dispose) => {
      let whole!: () => { a: number; b: number }
      let aRef!: AtomRef.AtomRef<number>
      let aValue!: () => number

      createComponent(() => {
        whole = useAtomRef(ref)
        aRef = useAtomRefProp(ref, "a")
        aValue = useAtomRefPropValue(ref, "a")
        return null as any
      }, {})

      expect(whole().a).toBe(1)
      expect(aRef.value).toBe(1)
      expect(aValue()).toBe(1)

      ref.set({ a: 10, b: 2 })
      expect(whole().a).toBe(10)
      expect(aRef.value).toBe(10)
      expect(aValue()).toBe(10)

      dispose()
    })
  })

  it("useAtomSet supports Result atoms (promise + promiseExit)", async () => {
    const fnAtom = Atom.fn((n: number) => Effect.succeed(n * 2))
    const registry = Registry.make()

    await new Promise<void>((outerResolve, outerReject) => {
      createRoot((dispose) => {
        let run!: (n: number) => Promise<number>
        let runExit!: (n: number) => Promise<Exit.Exit<number, unknown>>
        let last!: () => Result.Result<number, unknown>

        createComponent(RegistryContext.Provider, {
          value: registry,
          get children() {
            return createComponent(() => {
              run = useAtomSet(fnAtom, { mode: "promise" as const })
              runExit = useAtomSet(fnAtom, { mode: "promiseExit" as const }) as any
              last = useAtomValue(fnAtom)
              return null as any
            }, {})
          }
        })

        Promise.resolve()
          .then(async () => {
            expect(last()._tag).toBe("Initial")

            const value = await run(21)
            expect(value).toBe(42)
            expect(last()._tag).toBe("Success")

            const exit = await runExit(10)
            expect(Exit.isSuccess(exit)).toBe(true)
            if (Exit.isSuccess(exit)) {
              expect(exit.value).toBe(20)
            }
          })
          .then(() => {
            dispose()
            outerResolve()
          })
          .catch((e) => {
            dispose()
            outerReject(e)
          })
      })
    })
  })

  it("useAtomInitialValues only applies once per atom per registry", () => {
    const atom = Atom.make(0)
    const registry = Registry.make()

    createRoot((dispose) => {
      createComponent(RegistryContext.Provider, {
        value: registry,
        get children() {
          return createComponent(() => {
            useAtomInitialValues([[atom, 1]])
            useAtomInitialValues([[atom, 2]])
            return null as any
          }, {})
        }
      })

      expect(registry.get(atom)).toBe(1)
      dispose()
    })
  })
})
