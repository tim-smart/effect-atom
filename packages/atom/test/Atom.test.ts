import * as Atom from "@effect-atom/atom/Atom"
import * as Hydration from "@effect-atom/atom/Hydration"
import * as Registry from "@effect-atom/atom/Registry"
import * as Result from "@effect-atom/atom/Result"
import { addEqualityTesters, afterEach, assert, beforeEach, describe, expect, it, test, vitest } from "@effect/vitest"
import { Cause, Either, Equal, FiberRef, Schema, Struct, Subscribable, SubscriptionRef } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

addEqualityTesters()

describe("Atom", () => {
  beforeEach(() => {
    vitest.useFakeTimers()
  })
  afterEach(() => {
    vitest.useRealTimers()
  })

  it("get/set", () => {
    const counter = Atom.make(0)
    const r = Registry.make()
    expect(r.get(counter)).toEqual(0)
    r.set(counter, 1)
    expect(r.get(counter)).toEqual(1)
  })

  it("keepAlive false", async () => {
    const counter = Atom.make(0)
    const r = Registry.make()
    r.set(counter, 1)
    expect(r.get(counter)).toEqual(1)
    await new Promise((resolve) => resolve(null))
    expect(r.get(counter)).toEqual(0)
  })

  it("keepAlive true", async () => {
    const counter = Atom.make(0).pipe(
      Atom.keepAlive
    )
    const r = Registry.make()
    r.set(counter, 1)
    expect(r.get(counter)).toEqual(1)
    await new Promise((resolve) => resolve(null))
    expect(r.get(counter)).toEqual(1)
  })

  it("subscribe", async () => {
    const counter = Atom.make(0)
    const r = Registry.make()
    let count = 0
    const cancel = r.subscribe(counter, (_) => {
      count = _
    })
    r.set(counter, 1)
    expect(count).toEqual(1)
    await new Promise((resolve) => resolve(null))

    expect(r.get(counter)).toEqual(1)
    cancel()
    await new Promise((resolve) => resolve(null))
    expect(r.get(counter)).toEqual(0)
  })

  it("runtime", async () => {
    const count = counterRuntime.atom(Effect.flatMap(Counter, (_) => _.get))
    const r = Registry.make()
    const result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(1)
  })

  it("runtime replacement", async () => {
    const count = counterRuntime.atom(Effect.flatMap(Counter, (_) => _.get))
    const r = Registry.make({
      initialValues: [Atom.initialValue(counterRuntime.layer, CounterTest)]
    })
    const result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(10)
  })

  it("runtime replacement", async () => {
    const count = Atom.fnSync<number, number>((x) => x, { initialValue: 0 })
    const r = Registry.make({ initialValues: [Atom.initialValue(count, 10)] })
    const result = r.get(count)
    expect(result).toEqual(10)
    r.set(count, 20)
    const result2 = r.get(count)
    expect(result2).toEqual(20)
  })

  it("runtime multiple", async () => {
    const buildCount = buildCounterRuntime.fn<void>()((_) => Effect.flatMap(BuildCounter, (_) => _.get))
    const count = counterRuntime.atom(Effect.flatMap(Counter, (_) => _.get))
    const timesTwo = multiplierRuntime.atom((get) =>
      Effect.gen(function*() {
        const counter = yield* Counter
        const multiplier = yield* Multiplier
        yield* counter.inc
        expect(yield* get.result(count)).toEqual(2)
        return yield* multiplier.times(2)
      })
    )
    const r = Registry.make()
    const cancel = r.mount(buildCount)

    let result = r.get(timesTwo)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(4)

    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(2)

    r.set(buildCount, void 0)
    assert.deepStrictEqual(r.get(buildCount), Result.success(1))

    await new Promise((resolve) => resolve(null))
    await new Promise((resolve) => resolve(null))

    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(1)

    r.set(buildCount, void 0)
    assert.deepStrictEqual(r.get(buildCount), Result.success(2))

    cancel()
  })

  it("runtime fiber ref", async () => {
    const caching = fiberRefRuntime.atom(FiberRef.get(FiberRef.currentRequestCacheEnabled))
    const r = Registry.make()
    const result = r.get(caching)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(true)
  })

  it("runtime direct tag", async () => {
    const counter = counterRuntime.atom(Counter)
    const r = Registry.make()
    const result = r.get(counter)
    assert(Result.isSuccess(result))
    assert(Effect.isEffect(result.value.get))
  })

  it("effect initial", async () => {
    const count = Atom.make(
      Effect.succeed(1).pipe(Effect.delay(100)),
      { initialValue: 0 }
    ).pipe(Atom.keepAlive)
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isSuccess(result))
    assert.strictEqual(result.value, 0)

    await vitest.advanceTimersByTimeAsync(100)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(1)
  })

  it("effectFn", async () => {
    const count = Atom.fn((n: number) => Effect.succeed(n + 1))
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isInitial(result))
    r.set(count, 1)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(2)
  })

  it("effectFn initial", async () => {
    const count = Atom.fn((n: number) => Effect.succeed(n + 1), {
      initialValue: 0
    })
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isSuccess(result))
    assert.strictEqual(result.value, 0)
    r.set(count, 1)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(2)
  })

  it("effect mapResult", async () => {
    const count = Atom.fn((n: number) => Effect.succeed(n + 1)).pipe(
      Atom.mapResult((_) => _ + 1)
    )
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isInitial(result))
    r.set(count, 1)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(3)
  })

  it("effect double mapResult", async () => {
    const seed = Atom.make(0)
    const count = Atom.make((get) => Effect.succeed(get(seed) + 1)).pipe(
      Atom.mapResult((_) => _ + 10),
      Atom.mapResult((_) => _ + 100)
    )
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(111)
    r.set(seed, 1)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(112)
  })

  it("effect double mapResult refresh", async () => {
    let rebuilds = 0
    const count = Atom.make(() => {
      rebuilds++
      return Effect.succeed(1)
    }).pipe(
      Atom.mapResult((_) => _ + 10),
      Atom.mapResult((_) => _ + 100)
    )
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(111)
    expect(rebuilds).toEqual(1)
    r.refresh(count)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(111)
    expect(rebuilds).toEqual(2)
  })

  it("scopedFn", async () => {
    let finalized = 0
    const count = Atom.fn((n: number) =>
      Effect.succeed(n + 1).pipe(
        Effect.zipLeft(
          Effect.addFinalizer(() =>
            Effect.sync(() => {
              finalized++
            })
          )
        )
      )
    ).pipe(Atom.keepAlive)
    const r = Registry.make()
    let result = r.get(count)
    assert(Result.isInitial(result))

    await new Promise((resolve) => resolve(null))
    expect(finalized).toEqual(0)

    r.set(count, 1)
    result = r.get(count)
    assert(Result.isSuccess(result))
    expect(result.value).toEqual(2)

    r.set(count, 2)
    await new Promise((resolve) => resolve(null))
    expect(finalized).toEqual(1)
  })

  it("stream", async () => {
    const count = Atom.make(
      Stream.range(0, 2).pipe(
        Stream.tap(() => Registry.AtomRegistry),
        Stream.tap(() => Effect.sleep(50))
      )
    )
    const r = Registry.make()
    const unmount = r.mount(count)
    let result = r.get(count)
    assert(result.waiting)
    assert(Result.isInitial(result))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 0)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 1)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 2)

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isInitial(result))
  })

  it("stream initial", async () => {
    const count = Atom.make(
      Stream.range(1, 2).pipe(
        Stream.tap(() => Effect.sleep(50))
      ),
      { initialValue: 0 }
    )
    const r = Registry.make()
    const unmount = r.mount(count)
    let result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.strictEqual(result.value, 0)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 1)

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
  })

  it("streamFn", async () => {
    const count = Atom.fn((start: number) =>
      Stream.range(start, start + 1).pipe(
        Stream.tap(() => Effect.sleep(50))
      )
    )
    const r = Registry.make()
    const unmount = r.mount(count)
    let result = r.get(count)
    assert.strictEqual(result._tag, "Initial")

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert.strictEqual(result._tag, "Initial")

    r.set(count, 1)
    result = r.get(count)
    assert(result.waiting)
    assert.strictEqual(result._tag, "Initial")

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 1)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 2)

    r.set(count, 5)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 2)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 5)

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, 6)

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(Result.isInitial(result))
  })

  it("pull", async () => {
    const count = Atom.pull(
      Stream.range(0, 1, 1).pipe(
        Stream.tap(() => Effect.sleep(50))
      )
    )
    const r = Registry.make()
    const unmount = r.mount(count)

    let result = r.get(count)
    assert(result.waiting)
    assert(Option.isNone(Result.value(result)))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [0] })

    r.set(count, void 0)
    result = r.get(count)
    assert(result.waiting)
    assert.deepEqual(Result.value(result), Option.some({ done: false, items: [0] }))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [0, 1] })

    r.set(count, void 0)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: true, items: [0, 1] })

    r.refresh(count)
    result = r.get(count)
    assert(result.waiting)
    assert.deepEqual(Result.value(result), Option.some({ done: true, items: [0, 1] }))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [0] })

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(result.waiting)
    assert(Option.isNone(Result.value(result)))
  })

  it("pull runtime", async () => {
    const count = counterRuntime.pull(
      Counter.pipe(
        Effect.flatMap((_) => _.get),
        Effect.map((_) => Stream.range(_, 2, 1)),
        Stream.unwrap,
        Stream.tap(() => Effect.sleep(50))
      )
    )
    const r = Registry.make()
    const unmount = r.mount(count)

    let result = r.get(count)
    assert(result.waiting)
    assert(Option.isNone(Result.value(result)))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [1] })

    r.set(count, void 0)
    result = r.get(count)
    assert(result.waiting)
    assert.deepEqual(Result.value(result), Option.some({ done: false, items: [1] }))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [1, 2] })

    r.set(count, void 0)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: true, items: [1, 2] })

    r.refresh(count)
    result = r.get(count)
    assert(result.waiting)
    assert.deepEqual(Result.value(result), Option.some({ done: true, items: [1, 2] }))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [1] })

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(result.waiting)
    assert(Option.isNone(Result.value(result)))
  })

  it("pull refreshable", async () => {
    const count = Atom.pull(() =>
      Stream.range(1, 2, 1).pipe(
        Stream.tap(() => Effect.sleep(50))
      )
    )
    const r = Registry.make()
    const unmount = r.mount(count)

    let result = r.get(count)
    assert(result.waiting)
    assert(Result.isInitial(result))

    await vitest.advanceTimersByTimeAsync(50)
    result = r.get(count)
    assert(!result.waiting)
    assert(Result.isSuccess(result))
    assert.deepEqual(result.value, { done: false, items: [1] })

    unmount()
    await new Promise((resolve) => resolve(null))
    result = r.get(count)
    assert(result.waiting)
  })

  it("family", async () => {
    const r = Registry.make()

    const count = Atom.family((n: number) => Atom.make(n))
    const hash = Hash.hash(count(1))
    assert.strictEqual(count(1), count(1))
    r.set(count(1), 2)
    assert.strictEqual(r.get(count(1)), 2)

    const countKeep = Atom.family((n: number) => Atom.make(n).pipe(Atom.keepAlive))
    assert.strictEqual(countKeep(1), countKeep(1))
    r.get(countKeep(1))
    const hashKeep = Hash.hash(countKeep(1))

    if (global.gc) {
      vitest.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 0))
      global.gc()
      assert.notEqual(hash, Hash.hash(count(1)))
      assert.strictEqual(hashKeep, Hash.hash(countKeep(1)))
    }
  })

  it("label", async () => {
    expect(
      Atom.make(0).pipe(Atom.withLabel("counter")).label![1]
    ).toMatch(/Atom.test.ts:\d+:\d+/)
  })

  it("batching", async () => {
    const r = Registry.make()
    const state = Atom.make(1).pipe(Atom.keepAlive)
    const state2 = Atom.make("a").pipe(Atom.keepAlive)
    let count = 0
    const derived = Atom.readable((get) => {
      count++
      return get(state) + get(state2)
    })
    expect(r.get(derived)).toEqual("1a")
    expect(count).toEqual(1)
    Atom.batch(() => {
      r.set(state, 2)
      r.set(state2, "b")
    })
    expect(count).toEqual(2)
    expect(r.get(derived)).toEqual("2b")
  })

  it("nested batch", async () => {
    const r = Registry.make()
    const state = Atom.make(1).pipe(Atom.keepAlive)
    const state2 = Atom.make("a").pipe(Atom.keepAlive)
    let count = 0
    const derived = Atom.readable((get) => {
      count++
      return get(state) + get(state2)
    })
    expect(r.get(derived)).toEqual("1a")
    expect(count).toEqual(1)
    Atom.batch(() => {
      r.set(state, 2)
      Atom.batch(() => {
        r.set(state2, "b")
      })
    })
    expect(count).toEqual(2)
    expect(r.get(derived)).toEqual("2b")
  })

  it("read correct updated state in batch", async () => {
    const r = Registry.make()
    const state = Atom.make(1).pipe(Atom.keepAlive)
    const state2 = Atom.make("a").pipe(Atom.keepAlive)
    let count = 0
    const derived = Atom.readable((get) => {
      count++
      return get(state) + get(state2)
    })
    expect(r.get(derived)).toEqual("1a")
    expect(count).toEqual(1)
    Atom.batch(() => {
      r.set(state, 2)
      expect(r.get(derived)).toEqual("2a")
      r.set(state2, "b")
    })
    expect(count).toEqual(3)
    expect(r.get(derived)).toEqual("2b")
    expect(count).toEqual(3)
  })

  it("notifies listeners after batch commit", async () => {
    const r = Registry.make()
    const state = Atom.make(1).pipe(Atom.keepAlive)
    const state2 = Atom.make("a").pipe(Atom.keepAlive)
    let count = 0
    const derived = Atom.readable((get) => {
      return get(state) + get(state2)
    })
    r.subscribe(derived, () => {
      count++
    })
    Atom.batch(() => {
      r.get(derived)
      r.set(state, 2)
      r.get(derived)
      r.set(state2, "b")
    })
    expect(count).toEqual(1)
    expect(r.get(derived)).toEqual("2b")
  })

  it("initialValues", async () => {
    const state = Atom.make(0)
    const r = Registry.make({
      initialValues: [
        Atom.initialValue(state, 10)
      ]
    })
    expect(r.get(state)).toEqual(10)
    await new Promise((resolve) => resolve(null))
    expect(r.get(state)).toEqual(0)
  })

  it("idleTTL", async () => {
    const state = Atom.make(0)
    const state2 = Atom.make(0).pipe(
      Atom.setIdleTTL(10000)
    )
    const state3 = Atom.make(0).pipe(
      Atom.setIdleTTL(3000)
    )
    const r = Registry.make({ defaultIdleTTL: 2000 })
    r.set(state, 10)
    r.set(state2, 10)
    r.set(state3, 10)
    expect(r.get(state)).toEqual(10)
    expect(r.get(state2)).toEqual(10)
    expect(r.get(state3)).toEqual(10)
    await new Promise((resolve) => resolve(null))
    expect(r.get(state)).toEqual(10)
    expect(r.get(state2)).toEqual(10)
    expect(r.get(state3)).toEqual(10)

    await new Promise((resolve) => resolve(null))
    await vitest.advanceTimersByTimeAsync(10000)
    expect(r.get(state)).toEqual(0)
    expect(r.get(state2)).toEqual(10)
    expect(r.get(state3)).toEqual(0)

    await new Promise((resolve) => resolve(null))
    await vitest.advanceTimersByTimeAsync(20000)
    expect(r.get(state)).toEqual(0)
    expect(r.get(state2)).toEqual(0)
    expect(r.get(state3)).toEqual(0)
  })

  it("fn", async () => {
    const count = Atom.fnSync((n: number) => n).pipe(Atom.keepAlive)
    const r = Registry.make()
    assert.deepEqual(r.get(count), Option.none())

    r.set(count, 1)
    assert.deepEqual(r.get(count), Option.some(1))
  })

  it("fn initial", async () => {
    const count = Atom.fnSync((n: number) => n, { initialValue: 0 })
    const r = Registry.make()
    assert.deepEqual(r.get(count), 0)

    r.set(count, 1)
    assert.deepEqual(r.get(count), 1)
  })

  it("withFallback", async () => {
    const count = Atom.make(() =>
      Effect.succeed(1).pipe(
        Effect.delay(100)
      )
    ).pipe(
      Atom.withFallback(Atom.make(() => Effect.succeed(0))),
      Atom.keepAlive
    )
    const r = Registry.make()
    assert.deepEqual(r.get(count), Result.waiting(Result.success(0)))

    await vitest.advanceTimersByTimeAsync(100)
    assert.deepEqual(r.get(count), Result.success(1))
  })

  it("failure with previousSuccess", async () => {
    const count = Atom.fn((i: number) => i === 1 ? Effect.fail("fail") : Effect.succeed(i))
    const r = Registry.make()

    let result = r.get(count)
    assert(Result.isInitial(result))

    r.set(count, 0)
    result = r.get(count)
    assert(Result.isSuccess(result))
    assert.strictEqual(result.value, 0)

    r.set(count, 1)
    result = r.get(count)
    assert(Result.isFailure(result))
    assert(Cause.isFailType(result.cause))
    assert.strictEqual(result.cause.error, "fail")

    const value = Result.value(result)
    assert(Option.isSome(value))
    assert.strictEqual(value.value, 0)
  })

  it("read non-object", () => {
    const bool = Atom.make(() => true)
    const r = Registry.make()
    assert.strictEqual(r.get(bool), true)
  })

  it("get.stream", async () => {
    const count = Atom.make(0)
    const multiplied = Atom.make((get) => get.stream(count).pipe(Stream.map((_) => _ * 2)))

    const r = Registry.make()
    const cancel = r.mount(multiplied)

    assert.strictEqual(r.get(count), 0)
    assert.deepStrictEqual(r.get(multiplied), Result.success(0, { waiting: true }))

    r.set(count, 1)
    await new Promise((resolve) => resolve(null))
    assert.deepStrictEqual(r.get(multiplied), Result.success(2, { waiting: true }))

    cancel()
  })

  it("get.streamResult", async () => {
    const count = Atom.make(0)
    const multiplied = Atom.make((get) => get.stream(count).pipe(Stream.map((_) => _ * 2)))
    const plusOne = Atom.make((get) => get.streamResult(multiplied).pipe(Stream.map((_) => _ + 1)))

    const r = Registry.make()
    const cancel = r.mount(plusOne)

    assert.strictEqual(r.get(count), 0)
    assert.deepStrictEqual(r.get(plusOne), Result.success(1, { waiting: true }))

    r.set(count, 1)
    await new Promise((resolve) => resolve(null))
    await new Promise((resolve) => resolve(null))
    assert.deepStrictEqual(r.get(plusOne), Result.success(3, { waiting: true }))

    cancel()
  })

  it("Option is not an Effect", async () => {
    const atom = Atom.make(Option.none<string>())
    const r = Registry.make()
    assert.deepStrictEqual(r.get(atom), Option.none())
  })

  it("Either is not an Effect", async () => {
    const atom = Atom.make(Either.right(123))
    const r = Registry.make()
    assert.deepStrictEqual(r.get(atom), Either.right(123))
  })

  it("Subscribable", async () => {
    vitest.useRealTimers()
    const sub = Subscribable.make({ get: Effect.succeed(123), changes: Stream.empty })
    const atom = Atom.subscribable(sub)
    const r = Registry.make()
    const unmount = r.mount(atom)
    assert.deepStrictEqual(r.get(atom), 123)
    unmount()
  })

  it("Subscribable effect", async () => {
    vitest.useRealTimers()
    const sub = Subscribable.make({ get: Effect.succeed(123), changes: Stream.succeed(123) })
    const atom = Atom.subscribable(Effect.succeed(sub))
    const r = Registry.make()
    const unmount = r.mount(atom)
    assert.isTrue(Equal.equals(r.get(atom), Result.success(123)))
    unmount()
  })

  it("Subscribable/SubscriptionRef", async () => {
    vitest.useRealTimers()
    const ref = SubscriptionRef.make(123).pipe(Effect.runSync)
    const atom = Atom.subscribable(ref)
    const r = Registry.make()
    assert.deepStrictEqual(r.get(atom), 123)
    await Effect.runPromise(SubscriptionRef.update(ref, (a) => a + 1))
    assert.deepStrictEqual(r.get(atom), 124)
  })

  it("SubscriptionRef", async () => {
    vitest.useRealTimers()
    const ref = SubscriptionRef.make(0).pipe(Effect.runSync)
    const atom = Atom.subscriptionRef(ref)
    const r = Registry.make()
    const unmount = r.mount(atom)
    assert.deepStrictEqual(r.get(atom), 0)
    r.set(atom, 1)
    await new Promise((resolve) => resolve(null))
    assert.deepStrictEqual(r.get(atom), 1)
    unmount()
  })

  it("SubscriptionRef/effect", async () => {
    const atom = Atom.subscriptionRef(SubscriptionRef.make(0))
    const r = Registry.make()
    const unmount = r.mount(atom)
    assert.deepStrictEqual(r.get(atom), Result.success(0, { waiting: true }))
    r.set(atom, 1)
    await new Promise((resolve) => resolve(null))
    assert.deepStrictEqual(r.get(atom), Result.success(1, { waiting: true }))
    unmount()
  })

  it("SubscriptionRef/runtime", async () => {
    const atom = counterRuntime.subscriptionRef(SubscriptionRef.make(0))
    const r = Registry.make()
    const unmount = r.mount(atom)
    assert.deepStrictEqual(r.get(atom), Result.success(0, { waiting: true }))
    r.set(atom, 1)
    await new Promise((resolve) => resolve(null))
    assert.deepStrictEqual(r.get(atom), Result.success(1, { waiting: true }))
    unmount()
  })

  it("setLazy(true)", async () => {
    const count = Atom.make(0).pipe(Atom.keepAlive)
    let rebuilds = 0
    const double = Atom.make((get) => {
      rebuilds++
      return get(count) * 2
    }).pipe(Atom.keepAlive)
    const r = Registry.make()
    assert.strictEqual(r.get(double), 0)
    r.set(count, 1)
    assert.strictEqual(rebuilds, 1)
    assert.strictEqual(r.get(double), 2)
    assert.strictEqual(rebuilds, 2)
  })

  it("setLazy(false)", async () => {
    const count = Atom.make(0).pipe(Atom.keepAlive)
    let rebuilds = 0
    const double = Atom.make((get) => {
      rebuilds++
      return get(count) * 2
    }).pipe(Atom.setLazy(false), Atom.keepAlive)
    const r = Registry.make()
    assert.strictEqual(r.get(double), 0)
    r.set(count, 1)
    assert.strictEqual(rebuilds, 2)
    assert.strictEqual(r.get(double), 2)
    assert.strictEqual(rebuilds, 2)
  })

  it("derived derived with with effect result", async () => {
    const r = Registry.make()
    const state = Atom.fn(Effect.succeed<number>)
    let count = 0
    const derived = Atom.readable((get) => {
      count++
      return get(state).pipe(Result.getOrElse(() => -1)) % 3
    })
    let count2 = 0
    const derived2 = Atom.readable((get) => {
      count2++
      return get(derived) + 10
    })
    const cancel = r.mount(derived2)

    expect(r.get(derived)).toEqual(-1)
    expect(count).toEqual(1)
    expect(r.get(derived2)).toEqual(9)
    expect(count2).toEqual(1)
    r.set(state, 2)
    expect(r.get(derived)).toEqual(2)
    expect(count).toEqual(2)
    expect(r.get(derived2)).toEqual(12)
    expect(count2).toEqual(2)
    r.set(state, 5)
    expect(r.get(derived)).toEqual(2)
    expect(count).toEqual(3)
    expect(r.get(derived2)).toEqual(12)
    expect(count2).toEqual(2)
    cancel()
  })

  test(`toStreamResult`, async () => {
    const r = Registry.make()
    const atom = Atom.make(Effect.succeed(1))
    const eff = Atom.toStreamResult(atom).pipe(
      Stream.runHead,
      Effect.provideService(Registry.AtomRegistry, r)
    )
    const result = await Effect.runPromise(eff)
    expect(Option.getOrThrow(result)).toEqual(1)
  })

  test(`refreshOnSignal`, async () => {
    const r = Registry.make()
    let rebuilds = 0
    const signal = Atom.make(0)
    const refreshOnSignal = Atom.makeRefreshOnSignal(signal)
    const atom = Atom.make(() => {
      rebuilds++
      return 123
    }).pipe(refreshOnSignal)
    r.mount(atom)

    assert.strictEqual(r.get(atom), 123)
    assert.strictEqual(rebuilds, 1)
    r.get(atom)
    assert.strictEqual(rebuilds, 1)

    r.set(signal, 1)
    assert.strictEqual(rebuilds, 2)
  })

  it("dehydrate", async () => {
    const r = Registry.make()
    const notSerializable = Atom.make(0)
    r.mount(notSerializable)

    const basicSerializable = Atom.make(0).pipe(Atom.serializable({
      key: "basicSerializable",
      schema: Schema.Number
    }))
    r.mount(basicSerializable)

    const errored = Atom.make(Effect.fail("error")).pipe(
      Atom.serializable({
        key: "errored",
        schema: Result.Schema({
          error: Schema.String
        })
      })
    )
    r.mount(errored)

    const success = Atom.make(Effect.succeed(123)).pipe(Atom.serializable({
      key: "success",
      schema: Result.Schema({
        success: Schema.Number
      })
    }))
    r.mount(success)

    const { promise, resolve } = Promise.withResolvers<number>()

    const pending = Atom.make(Effect.promise(() => promise)).pipe(Atom.serializable({
      key: "pending",
      schema: Result.Schema({
        success: Schema.Number
      })
    }))
    r.mount(pending)

    const state = Hydration.dehydrate(r, {
      encodeInitialAs: "promise"
    })
    expect(state.map((r) => Struct.omit(r, "dehydratedAt", "resultPromise"))).toMatchInlineSnapshot(`
      [
        {
          "key": "basicSerializable",
          "value": 0,
        },
        {
          "key": "errored",
          "value": {
            "_tag": "Failure",
            "cause": {
              "_tag": "Fail",
              "error": "error",
            },
            "previousSuccess": {
              "_tag": "None",
            },
            "waiting": false,
          },
        },
        {
          "key": "success",
          "value": {
            "_tag": "Success",
            "timestamp": ${Date.now()},
            "value": 123,
            "waiting": false,
          },
        },
        {
          "key": "pending",
          "value": {
            "_tag": "Initial",
            "waiting": true,
          },
        },
      ]
    `)

    expect(state.find((r) => r.key === "pending")?.resultPromise).instanceOf(Promise)

    const r2 = Registry.make()
    Hydration.hydrate(r2, state)

    expect(r2.get(notSerializable)).toEqual(0)
    expect(r2.get(basicSerializable)).toEqual(0)
    expect(r2.get(errored)).toEqual(Result.failure(Cause.fail("error")))
    expect(r2.get(success)).toEqual(Result.success(123))
    expect(r2.get(pending)).toEqual(Result.initial(true))

    resolve(123)
    await expect(state.find((r) => r.key === "pending")?.resultPromise).resolves.toEqual({
      "_tag": "Success",
      "timestamp": expect.any(Number),
      "value": 123,
      "waiting": false
    })
  })

  describe("optimistic", () => {
    it("non-Result", async () => {
      const latch = Effect.unsafeMakeLatch()
      const r = Registry.make()
      let i = 0
      const atom = Atom.make(() => i)
      const optimisticAtom = atom.pipe(Atom.optimistic)
      const fn = optimisticAtom.pipe(
        Atom.optimisticFn({
          reducer: (_current, update: number) => update,
          fn: Atom.fn(Effect.fnUntraced(function*() {
            yield* latch.await
          }))
        }),
        Atom.keepAlive
      )

      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(0)
      r.set(fn, 1)
      i = 2

      // optimistic phase: the optimistic value is set, but the true value is not
      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(1)

      latch.unsafeOpen()
      await Effect.runPromise(Effect.yieldNow())

      // commit phase: a refresh is triggered, the authoritative value is used
      expect(r.get(atom)).toEqual(2)
      expect(r.get(optimisticAtom)).toEqual(2)
    })

    it("Result", async () => {
      const runtime = Atom.runtime(Layer.empty)
      const latch = Effect.unsafeMakeLatch()
      const r = Registry.make()
      let i = 0
      const atom = Atom.make(Effect.sync(() => {
        return i
      }))
      const optimisticAtom = atom.pipe(
        Atom.optimistic
      )
      const fn = optimisticAtom.pipe(
        Atom.optimisticFn({
          reducer: (_current, update: number) => Result.success(update),
          fn: runtime.fn(Effect.fnUntraced(function*() {
            yield* latch.await
          }))
        })
      )

      r.mount(optimisticAtom)
      r.mount(fn)

      expect(r.get(atom)).toEqual(Result.success(0))
      expect(r.get(optimisticAtom)).toEqual(Result.success(0))
      r.set(fn, 1)
      i = 2

      // optimistic phase: the optimistic value is set, but the true value is not
      expect(r.get(atom)).toEqual(Result.success(0))
      expect(r.get(optimisticAtom)).toEqual(Result.success(1))

      latch.unsafeOpen()
      await Effect.runPromise(Effect.yieldNow())

      // commit phase: a refresh is triggered, the authoritative value is used
      expect(r.get(atom)).toEqual(Result.success(2))
      expect(r.get(optimisticAtom)).toEqual(Result.success(2))
    })

    it("failures", async () => {
      const latch = Effect.unsafeMakeLatch()
      const r = Registry.make()
      const i = 0
      let rebuilds = 0
      const atom = Atom.make(() => {
        rebuilds++
        return i
      })
      const optimisticAtom = atom.pipe(
        Atom.optimistic
      )
      const fn = optimisticAtom.pipe(
        Atom.optimisticFn({
          reducer: (_, value) => value,
          fn: Atom.fn<number>()(Effect.fnUntraced(function*() {
            yield* latch.await
            return yield* Effect.fail("error")
          }))
        })
      )

      r.mount(fn)
      r.mount(optimisticAtom)

      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(0)
      r.set(fn, 1)

      // optimistic phase: the optimistic value is set, but the true value is not
      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(1)

      latch.unsafeOpen()
      await Effect.runPromise(Effect.yieldNow())

      // commit phase: the optimistic value is reset to the true value
      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(0)
      expect(rebuilds).toEqual(1)
    })

    it("sync fn", async () => {
      const r = Registry.make()
      let i = 0
      const atom = Atom.make(() => i)
      const optimisticAtom = atom.pipe(Atom.optimistic, Atom.keepAlive)
      const fn = optimisticAtom.pipe(
        Atom.optimisticFn({
          reducer: (_current, update) => update,
          fn: Atom.fn<number>()(() => {
            i = 2
            return Effect.void
          })
        })
      )

      expect(r.get(atom)).toEqual(0)
      expect(r.get(optimisticAtom)).toEqual(0)
      r.set(fn, 1)

      expect(r.get(atom)).toEqual(2)
      expect(r.get(optimisticAtom)).toEqual(2)
    })

    it("intermediate updates", async () => {
      const latch = Effect.unsafeMakeLatch()
      const r = Registry.make()
      let i = 0
      const atom = Atom.make(Effect.sync(() => i))
      const optimisticAtom = atom.pipe(
        Atom.optimistic
      )
      const fn = optimisticAtom.pipe(
        Atom.optimisticFn({
          reducer: (_current, update: number) => Result.success(update),
          fn: (set) =>
            Atom.fn(Effect.fnUntraced(function*() {
              set(Result.success(123))
              yield* latch.await
            }))
        }),
        Atom.keepAlive
      )

      expect(r.get(atom)).toEqual(Result.success(0))
      assert.deepStrictEqual(r.get(optimisticAtom), Result.success(0))
      r.set(fn, 1)
      i = 2

      // optimistic phase: the intermediate value is set, but the true value is
      // not
      assert.deepStrictEqual(r.get(atom), Result.success(0))
      assert.deepStrictEqual(r.get(optimisticAtom), Result.success(123, { waiting: true }))

      latch.unsafeOpen()
      await Effect.runPromise(Effect.yieldNow())

      // commit phase: a refresh is triggered, the authoritative value is used
      assert.deepStrictEqual(r.get(atom), Result.success(2))
      assert.deepStrictEqual(r.get(optimisticAtom), Result.success(2))
    })
  })

  describe("Reactivity", () => {
    it("rebuilds on mutation", async () => {
      const r = Registry.make()
      let rebuilds = 0
      const atom = Atom.make(() => rebuilds++).pipe(
        Atom.withReactivity(["counter"]),
        Atom.keepAlive
      )
      const fn = counterRuntime.fn(
        Effect.fn(function*() {
        }),
        { reactivityKeys: ["counter"] }
      )
      assert.strictEqual(r.get(atom), 0)
      r.set(fn, void 0)
      assert.strictEqual(r.get(atom), 1)
      r.set(fn, void 0)
      r.set(fn, void 0)
      assert.strictEqual(r.get(atom), 3)
    })
  })

  it("Atom.Interrupt", async () => {
    const r = Registry.make()
    const atom = Atom.fn(() => Effect.never)
    r.mount(atom)
    expect(r.get(atom)).toEqual(Result.initial())
    expect(r.get(atom).waiting).toBeFalsy()
    r.set(atom, void 0)
    expect(r.get(atom)).toEqual(Result.initial(true))
    expect(r.get(atom).waiting).toBeTruthy()

    r.set(atom, Atom.Interrupt)
    await Effect.runPromise(Effect.yieldNow())
    const result = r.get(atom)
    expect(Result.isInterrupted(result)).toBeTruthy()
  })
})

interface BuildCounter {
  readonly get: Effect.Effect<number>
  readonly inc: Effect.Effect<void>
}
const BuildCounter = Context.GenericTag<BuildCounter>("BuildCounter")
const BuildCounterLive = Layer.sync(BuildCounter, () => {
  let count = 0
  return BuildCounter.of({
    get: Effect.sync(() => count),
    inc: Effect.sync(() => {
      count++
    })
  })
})

interface Counter {
  readonly get: Effect.Effect<number>
  readonly inc: Effect.Effect<void>
}
const Counter = Context.GenericTag<Counter>("Counter")
const CounterLive = Layer.effect(
  Counter,
  Effect.gen(function*() {
    const buildCounter = yield* BuildCounter
    yield* buildCounter.inc
    let count = 1
    return Counter.of({
      get: Effect.sync(() => count),
      inc: Effect.sync(() => {
        count++
      })
    })
  })
).pipe(
  Layer.provide(BuildCounterLive)
)

const CounterTest = Layer.effect(
  Counter,
  Effect.gen(function*() {
    const buildCounter = yield* BuildCounter
    yield* buildCounter.inc
    let count = 10
    return Counter.of({
      get: Effect.sync(() => count),
      inc: Effect.sync(() => {
        count++
      })
    })
  })
).pipe(
  Layer.provide(BuildCounterLive)
)

interface Multiplier {
  readonly times: (n: number) => Effect.Effect<number>
}
const Multiplier = Context.GenericTag<Multiplier>("Multiplier")
const MultiplierLive = Layer.effect(
  Multiplier,
  Effect.gen(function*() {
    const counter = yield* Counter
    yield* Registry.AtomRegistry // test that we can access the registry
    return Multiplier.of({
      times: (n) => Effect.map(counter.get, (_) => _ * n)
    })
  })
).pipe(
  Layer.provideMerge(CounterLive)
)

const buildCounterRuntime = Atom.runtime(BuildCounterLive)
const counterRuntime = Atom.runtime(CounterLive)
const multiplierRuntime = Atom.runtime(MultiplierLive)
const fiberRefRuntime = Atom.runtime(Layer.setRequestCaching(true))
