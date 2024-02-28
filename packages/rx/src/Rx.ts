/**
 * @since 1.0.0
 */
import type { Context } from "effect"
import { NoSuchElementException } from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import { dual, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Hash from "effect/Hash"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type * as Types from "effect/Types"
import * as internalRegistry from "./internal/registry.js"
import { runCallbackSync } from "./internal/runtime.js"
import * as Result from "./Result.js"
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect-rx/rx/Rx")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Rx<A> extends Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly keepAlive: boolean
  readonly read: Rx.Read<A>
  readonly refresh?: Rx.Refresh
  readonly label?: readonly [name: string, stack: string]
  readonly idleTTL?: number
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Rx {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Read<A> = (ctx: Context) => A

  /**
   * @since 1.0.0
   * @category models
   */
  export type ReadFn<Arg, A> = (arg: Arg, ctx: Context) => A

  /**
   * @since 1.0.0
   * @category models
   */
  export type Write<R, W> = (ctx: WriteContext<R>, value: W) => void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Refresh = (f: <A>(rx: Rx<A>) => void) => void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Get = <A>(rx: Rx<A>) => A

  /**
   * @since 1.0.0
   * @category models
   */
  export type GetResult = <A, E>(rx: Rx<Result.Result<A, E>>) => Exit.Exit<A, E | NoSuchElementException>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Set = <R, W>(rx: Writable<R, W>, value: W) => void

  /**
   * @since 1.0.0
   * @category models
   */
  export type SetEffect = <R, W>(rx: Writable<R, W>, value: W) => Effect.Effect<void>

  /**
   * @since 1.0.0
   * @category models
   */
  export type RefreshRxSync = <A>(rx: Rx<A> & Refreshable) => void

  /**
   * @since 1.0.0
   * @category models
   */
  export type RefreshRx = <A>(rx: Rx<A> & Refreshable) => Effect.Effect<void>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Mount = <A>(rx: Rx<A>) => () => void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Subscribe = <A>(rx: Rx<A>, f: (_: A) => void, options?: {
    readonly immediate?: boolean
  }) => () => void

  /**
   * @since 1.0.0
   */
  export type Infer<T extends Rx<any>> = T extends Rx<infer A> ? A : never
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const RefreshableTypeId = Symbol.for("@effect-rx/rx/Rx/Refreshable")

/**
 * @since 1.0.0
 * @category type ids
 */
export type RefreshableTypeId = typeof RefreshableTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Refreshable {
  readonly [RefreshableTypeId]: RefreshableTypeId
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const WritableTypeId = Symbol.for("@effect-rx/rx/Rx/Writable")

/**
 * @since 1.0.0
 * @category type ids
 */
export type WritableTypeId = typeof WritableTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Writable<R, W> extends Rx<R> {
  readonly [WritableTypeId]: WritableTypeId
  readonly write: Rx.Write<R, W>
}

/**
 * @since 1.0.0
 * @category context
 */
export interface Context {
  <A>(rx: Rx<A>): A
  readonly get: <A>(rx: Rx<A>) => A
  readonly result: <A, E>(rx: Rx<Result.Result<A, E>>) => Exit.Exit<A, E | NoSuchElementException>
  readonly once: <A>(rx: Rx<A>) => A
  readonly addFinalizer: (f: () => void) => void
  readonly mount: <A>(rx: Rx<A>) => void
  readonly refreshSync: <A>(rx: Rx<A> & Refreshable) => void
  readonly refresh: <A>(rx: Rx<A> & Refreshable) => Effect.Effect<void>
  readonly refreshSelfSync: () => void
  readonly refreshSelf: Effect.Effect<void>
  readonly self: <A>() => Option.Option<A>
  readonly setSelfSync: <A>(a: A) => void
  readonly setSelf: <A>(a: A) => Effect.Effect<void>
  readonly setSync: <R, W>(rx: Writable<R, W>, value: W) => void
  readonly set: <R, W>(rx: Writable<R, W>, value: W) => Effect.Effect<void>
  readonly stream: <A>(rx: Rx<A>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }) => Stream.Stream<A>
  readonly streamResult: <A, E>(rx: Rx<Result.Result<A, E>>, options?: {
    readonly withoutInitialValue?: boolean
    readonly bufferSize?: number
  }) => Stream.Stream<A, E>
  readonly subscribe: <A>(rx: Rx<A>, f: (_: A) => void, options?: {
    readonly immediate?: boolean
  }) => void
}

/**
 * @since 1.0.0
 * @category context
 */
export interface WriteContext<A> {
  readonly get: <A>(rx: Rx<A>) => A
  readonly refreshSelf: () => void
  readonly setSelf: (a: A) => void
  readonly set: <R, W>(rx: Writable<R, W>, value: W) => void
}

const RxProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  toJSON(this: Rx<any>) {
    return {
      _id: "Rx",
      keepAlive: this.keepAlive,
      label: this.label
    }
  },
  toString() {
    return Inspectable.format(this)
  },
  [Inspectable.NodeInspectSymbol](this: Rx<any>) {
    return this.toJSON()
  }
} as const

const RxRuntimeProto = {
  ...RxProto,
  rx(this: RxRuntime<any, any>, arg: any, options?: { readonly initialValue?: unknown }) {
    const read = makeRead(arg, options)
    return readable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return read(get, runtimeResult.value)
    })
  },

  fn(this: RxRuntime<any, any>, arg: any, options?: { readonly initialValue?: unknown }) {
    const [read, write] = makeResultFn(arg, options)
    return writable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return read(get, runtimeResult.value)
    }, write)
  },

  pull(this: RxRuntime<any, any>, arg: any, options?: {
    readonly disableAccumulation?: boolean
    readonly initialValue?: ReadonlyArray<any>
  }) {
    const pullRx = readable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return makeEffect(
        get,
        makeStreamPullEffect(get, arg, options, runtimeResult.value),
        Result.initial(true),
        runtimeResult.value
      )
    })
    return makeStreamPull(pullRx as any, options)
  },

  subRef(this: RxRuntime<any, any>, arg: any) {
    return makeSubRef(readable((get) => {
      const previous = get.self<Result.Result<any, any>>()
      const runtimeResult = get(this)
      if (runtimeResult._tag !== "Success") {
        return Result.replacePrevious(runtimeResult, previous)
      }
      return makeEffect(
        get,
        arg,
        Result.initial(true),
        runtimeResult.value
      )
    }))
  }
}

const WritableProto = {
  ...RxProto,
  [WritableTypeId]: WritableTypeId
} as const

/**
 * @since 1.0.0
 * @category refinements
 */
export const isWritable = <R, W>(rx: Rx<R>): rx is Writable<R, W> => WritableTypeId in rx

/**
 * @since 1.0.0
 * @category constructors
 */
export const readable = <A>(
  read: Rx.Read<A>,
  refresh?: Rx.Refresh
): Rx<A> => {
  const rx = Object.create(RxProto)
  rx.keepAlive = false
  rx.read = read
  rx.refresh = refresh
  return rx
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const writable = <R, W>(
  read: Rx.Read<R>,
  write: Rx.Write<R, W>,
  refresh?: Rx.Refresh
): Writable<R, W> => {
  const rx = Object.create(WritableProto)
  rx.keepAlive = false
  rx.read = read
  rx.write = write
  rx.refresh = refresh
  return rx
}

function constSetSelf<A>(ctx: WriteContext<A>, value: A) {
  ctx.setSelf(value)
}

// -----------------------------------------------------------------------------
// constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: {
  <A, E>(effect: Effect.Effect<A, E, Scope.Scope>, options?: {
    readonly initialValue?: A
  }): Rx<Result.Result<A, E>>
  <A, E>(create: Rx.Read<Effect.Effect<A, E, Scope.Scope>>, options?: {
    readonly initialValue?: A
  }): Rx<Result.Result<A, E>>
  <A, E>(stream: Stream.Stream<A, E>, options?: {
    readonly initialValue?: A
  }): Rx<Result.Result<A, E>>
  <A, E>(create: Rx.Read<Stream.Stream<A, E>>, options?: {
    readonly initialValue?: A
  }): Rx<Result.Result<A, E>>
  <A>(create: Rx.Read<A>): Rx<A>
  <A>(initialValue: A): Writable<A, A>
} = (arg: any, options?: { readonly initialValue?: unknown }) => {
  const readOrRx = makeRead(arg, options)
  if (TypeId in readOrRx) {
    return readOrRx as any
  }
  return readable(readOrRx)
}

// -----------------------------------------------------------------------------
// constructors - effect
// -----------------------------------------------------------------------------

const isDataType = (u: object): u is Option.Option<unknown> | Either.Either<unknown, unknown> =>
  Option.TypeId in u ||
  Either.TypeId in u

const makeRead: {
  <A, E>(effect: Effect.Effect<A, E, Scope.Scope>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(create: Rx.Read<Effect.Effect<A, E, Scope.Scope>>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(stream: Stream.Stream<A, E>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A, E>(create: Rx.Read<Stream.Stream<A, E>>, options?: {
    readonly initialValue?: A
  }): (get: Context, runtime?: Runtime.Runtime<any>) => Result.Result<A, E>
  <A>(create: Rx.Read<A>): (get: Context, runtime?: Runtime.Runtime<any>) => A
  <A>(initialValue: A): Writable<A, A>
} = <A, E>(
  arg:
    | Effect.Effect<A, E, Scope.Scope>
    | Rx.Read<Effect.Effect<A, E, Scope.Scope>>
    | Stream.Stream<A, E>
    | Rx.Read<Stream.Stream<A, E>>
    | Rx.Read<A>
    | A,
  options?: { readonly initialValue?: unknown }
) => {
  if (typeof arg === "function") {
    const create = arg as Rx.Read<any>
    return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
      const value = create(get)
      if (typeof value === "object" && value !== null) {
        if (isDataType(value)) {
          return value
        } else if (Effect.EffectTypeId in value) {
          return effect(get, value as any, options, providedRuntime)
        } else if (Stream.StreamTypeId in value) {
          return stream(get, value, options, providedRuntime)
        }
      }
      return value
    }
  } else if (typeof arg === "object" && arg !== null) {
    if (isDataType(arg)) {
      return state(arg)
    } else if (Effect.EffectTypeId in arg) {
      return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
        return effect(get, arg, options, providedRuntime)
      }
    } else if (Stream.StreamTypeId in arg) {
      return function(get: Context, providedRuntime?: Runtime.Runtime<any>) {
        return stream(get, arg, options, providedRuntime)
      }
    }
  }

  return state(arg) as any
}

const state = <A>(
  initialValue: A
): Writable<A, A> =>
  writable(function(_get) {
    return initialValue
  }, constSetSelf)

const effect = <A, E>(
  get: Context,
  effect: Effect.Effect<A, E, Scope.Scope>,
  options?: { readonly initialValue?: A },
  runtime?: Runtime.Runtime<any>
): Result.Result<A, E> => {
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()
  return makeEffect(get, effect, initialValue, runtime)
}

function makeEffect<A, E>(
  ctx: Context,
  effect: Effect.Effect<A, E, Scope.Scope>,
  initialValue: Result.Result<A, E>,
  runtime = Runtime.defaultRuntime
): Result.Result<A, E> {
  const previous = ctx.self<Result.Result<A, E>>()

  const scope = Effect.runSync(Scope.make())
  ctx.addFinalizer(() => {
    Effect.runFork(Scope.close(scope, Exit.unit))
  })
  const scopedEffect = Scope.extend(effect, scope)
  const cancel = runCallbackSync(runtime)(
    scopedEffect,
    function(exit) {
      ctx.setSelfSync(Result.fromExitWithPrevious(exit, previous))
    }
  )
  if (cancel !== undefined) {
    ctx.addFinalizer(cancel)
  }

  if (previous._tag === "Some") {
    return Result.waitingFrom(previous)
  }
  return Result.waiting(initialValue)
}

// -----------------------------------------------------------------------------
// context
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category models
 */
export interface RxRuntime<R, ER> extends Rx<Result.Result<Runtime.Runtime<R>, ER>> {
  readonly layer: Rx<Layer.Layer<R, ER>>

  readonly rx: {
    <A, E>(effect: Effect.Effect<A, E, Scope.Scope | R>, options?: {
      readonly initialValue?: A
    }): Rx<Result.Result<A, E | ER>>
    <A, E>(create: Rx.Read<Effect.Effect<A, E, Scope.Scope | R>>, options?: {
      readonly initialValue?: A
    }): Rx<Result.Result<A, E | ER>>
    <A, E>(stream: Stream.Stream<A, E, never | R>, options?: {
      readonly initialValue?: A
    }): Rx<Result.Result<A, E | ER>>
    <A, E>(create: Rx.Read<Stream.Stream<A, E, never | R>>, options?: {
      readonly initialValue?: A
    }): Rx<Result.Result<A, E | ER>>
  }

  readonly fn: {
    <Arg, E, A>(fn: Rx.ReadFn<Arg, Effect.Effect<A, E, Scope.Scope | R>>, options?: {
      readonly initialValue?: A
    }): RxResultFn<Types.Equals<Arg, unknown> extends true ? void : Arg, A, E | ER>
    <Arg, E, A>(fn: Rx.ReadFn<Arg, Stream.Stream<A, E, R>>, options?: {
      readonly initialValue?: A
    }): RxResultFn<Types.Equals<Arg, unknown> extends true ? void : Arg, A, E | ER | NoSuchElementException>
  }

  readonly pull: <A, E>(create: Rx.Read<Stream.Stream<A, E, R>> | Stream.Stream<A, E, R>, options?: {
    readonly disableAccumulation?: boolean
    readonly initialValue?: ReadonlyArray<A>
  }) => Writable<PullResult<A, E | ER>, void>

  readonly subRef: <A, E>(
    create:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, R>
      | Rx.Read<Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, R>>
  ) => Writable<Result.Result<A, E>, A>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const context: () => <R, E>(
  create: Layer.Layer<R, E> | Rx.Read<Layer.Layer<R, E>>
) => RxRuntime<R, E> = () => {
  const memoMapRx = make(Layer.makeMemoMap)
  return <E, R>(create: Layer.Layer<R, E> | Rx.Read<Layer.Layer<R, E>>): RxRuntime<R, E> => {
    const rx = Object.create(RxRuntimeProto)
    rx.keepAlive = false
    rx.refresh = undefined

    const layerRx = keepAlive(typeof create === "function" ? readable(create) : readable(() => create))
    rx.layer = layerRx

    rx.read = function read(get: Context) {
      const memoMapResult = get(memoMapRx)
      if (memoMapResult._tag !== "Success") {
        return Result.initial(true)
      }
      const memoMap = memoMapResult.value
      const layer = get(layerRx)
      const build = Effect.flatMap(
        Effect.flatMap(Effect.scope, (scope) => Layer.buildWithMemoMap(layer, memoMap, scope)),
        (context) => Effect.provide(Effect.runtime<R>(), context)
      )
      return effect(get, build)
    }

    return rx
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const runtime: <R, E>(create: Layer.Layer<R, E> | Rx.Read<Layer.Layer<R, E>>) => RxRuntime<R, E> = globalValue(
  "@effect-rx/rx/Rx/defaultContext",
  () => context()
)

// -----------------------------------------------------------------------------
// constructors - stream
// -----------------------------------------------------------------------------

const stream = <A, E>(
  get: Context,
  stream: Stream.Stream<A, E>,
  options?: { readonly initialValue?: A },
  runtime?: Runtime.Runtime<any>
): Result.Result<A, E | NoSuchElementException> => {
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()
  return makeStream(get, stream, initialValue, runtime)
}

function makeStream<A, E>(
  ctx: Context,
  stream: Stream.Stream<A, E>,
  initialValue: Result.Result<A, E | NoSuchElementException>,
  runtime = Runtime.defaultRuntime
): Result.Result<A, E | NoSuchElementException> {
  const previous = ctx.self<Result.Result<A, E | NoSuchElementException>>()

  const cancel = runCallbackSync(runtime)(
    Stream.runForEach(
      stream,
      (a) => Effect.sync(() => ctx.setSelfSync(Result.waiting(Result.success(a))))
    ),
    (exit) => {
      if (exit._tag === "Failure") {
        ctx.setSelfSync(Result.failureWithPrevious(exit.cause, previous))
      } else {
        pipe(
          ctx.self<Result.Result<A, E | NoSuchElementException>>(),
          Option.flatMap(Result.value),
          Option.match({
            onNone: () => ctx.setSelfSync(Result.failWithPrevious(new NoSuchElementException(), previous)),
            onSome: (a) => ctx.setSelfSync(Result.success(a))
          })
        )
      }
    }
  )
  if (cancel !== undefined) {
    ctx.addFinalizer(cancel)
  }

  if (previous._tag === "Some") {
    return Result.waitingFrom(previous)
  }
  return Result.waiting(initialValue)
}

// -----------------------------------------------------------------------------
// constructors - subscription ref
// -----------------------------------------------------------------------------

const makeSubRef = (
  refRx: Rx<SubscriptionRef.SubscriptionRef<any> | Result.Result<SubscriptionRef.SubscriptionRef<any>, any>>
) => {
  function read(get: Context) {
    const ref = get(refRx)
    if (SubscriptionRef.SubscriptionRefTypeId in ref) {
      get.addFinalizer(
        ref.changes.pipe(
          Stream.runForEach((value) => get.setSelf(value)),
          Effect.runCallback
        )
      )
      return Effect.runSync(SubscriptionRef.get(ref))
    } else if (ref._tag !== "Success") {
      return ref
    }
    return makeStream(get, ref.value.changes, Result.initial(true))
  }

  function write(ctx: WriteContext<SubscriptionRef.SubscriptionRef<any>>, value: any) {
    const ref = ctx.get(refRx)
    if (SubscriptionRef.SubscriptionRefTypeId in ref) {
      Effect.runSync(SubscriptionRef.set(ref, value))
    } else if (Result.isSuccess(ref)) {
      Effect.runSync(SubscriptionRef.set(ref.value, value))
    }
  }

  return writable(read, write)
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const subRef: {
  <A>(ref: SubscriptionRef.SubscriptionRef<A> | Rx.Read<SubscriptionRef.SubscriptionRef<A>>): Writable<A, A>
  <A, E>(
    effect:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, never>
      | Rx.Read<Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, never>>
  ): Writable<Result.Result<A, E>, A>
} = (
  ref:
    | SubscriptionRef.SubscriptionRef<any>
    | Rx.Read<SubscriptionRef.SubscriptionRef<any>>
    | Effect.Effect<SubscriptionRef.SubscriptionRef<any>, any, never>
    | Rx.Read<Effect.Effect<SubscriptionRef.SubscriptionRef<any>, any, never>>
) =>
  makeSubRef(readable((get) => {
    let value: SubscriptionRef.SubscriptionRef<any> | Effect.Effect<SubscriptionRef.SubscriptionRef<any>, any, any>
    if (typeof ref === "function") {
      value = ref(get)
    } else {
      value = ref
    }

    return Effect.isEffect(value) ? makeEffect(get, value, Result.initial(true)) : value
  }))

// -----------------------------------------------------------------------------
// constructors - functions
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category models
 */
export interface RxResultFn<Arg, A, E = never> extends Writable<Result.Result<A, E>, Arg> {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fnSync: {
  <Arg, A>(
    f: Rx.ReadFn<Arg, A>
  ): Writable<Option.Option<A>, Arg>
  <Arg, A>(
    f: Rx.ReadFn<Arg, A>,
    options: { readonly initialValue: A }
  ): Writable<A, Arg>
} = <Arg, A>(f: Rx.ReadFn<Arg, A>, options?: {
  readonly initialValue?: A
}): Writable<Option.Option<A> | A, Arg> => {
  const argRx = state<[number, Arg]>([0, undefined as any])
  const hasInitialValue = options?.initialValue !== undefined
  return writable(function(get) {
    const [counter, arg] = get(argRx)
    if (counter === 0) {
      return hasInitialValue ? options.initialValue : Option.none()
    }
    return hasInitialValue ? f(arg, get) : Option.some(f(arg, get))
  }, function(ctx, arg) {
    ctx.set(argRx, [ctx.get(argRx)[0] + 1, arg])
  })
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fn: {
  <Arg, E, A>(fn: Rx.ReadFn<Arg, Effect.Effect<A, E, Scope.Scope>>, options?: {
    readonly initialValue?: A
  }): RxResultFn<Types.Equals<Arg, unknown> extends true ? void : Arg, A, E>
  <Arg, E, A>(fn: Rx.ReadFn<Arg, Stream.Stream<A, E>>, options?: {
    readonly initialValue?: A
  }): RxResultFn<Types.Equals<Arg, unknown> extends true ? void : Arg, A, E | NoSuchElementException>
} = <Arg, E, A>(f: Rx.ReadFn<Arg, Stream.Stream<A, E> | Effect.Effect<A, E, Scope.Scope>>, options?: {
  readonly initialValue?: A
}): RxResultFn<Types.Equals<Arg, unknown> extends true ? void : Arg, A, E | NoSuchElementException> => {
  const [read, write] = makeResultFn(f, options)
  return writable(read, write) as any
}

function makeResultFn<Arg, E, A>(
  f: Rx.ReadFn<Arg, Effect.Effect<A, E, Scope.Scope> | Stream.Stream<A, E>>,
  options?: { readonly initialValue?: A }
) {
  const argRx = state<[number, Arg]>([0, undefined as any])
  const initialValue = options?.initialValue !== undefined
    ? Result.success<A, E>(options.initialValue)
    : Result.initial<A, E>()

  function read(get: Context, runtime?: Runtime.Runtime<any>): Result.Result<A, E | NoSuchElementException> {
    const [counter, arg] = get(argRx)
    if (counter === 0) {
      return initialValue
    }
    const value = f(arg, get)
    if (Effect.EffectTypeId in value) {
      return makeEffect(get, value, initialValue, runtime)
    }
    return makeStream(get, value, initialValue, runtime)
  }
  function write(ctx: WriteContext<Result.Result<A, E | NoSuchElementException>>, arg: Arg) {
    ctx.set(argRx, [ctx.get(argRx)[0] + 1, arg])
  }
  return [read, write] as const
}

/**
 * @since 1.0.0
 * @category models
 */
export type PullResult<A, E = never> = Result.Result<{
  readonly done: boolean
  readonly items: Array<A>
}, E | NoSuchElementException>

/**
 * @since 1.0.0
 * @category constructors
 */
export const pull = <A, E>(create: Rx.Read<Stream.Stream<A, E>> | Stream.Stream<A, E>, options?: {
  readonly disableAccumulation?: boolean
  readonly initialValue?: ReadonlyArray<A>
}): Writable<PullResult<A, E>, void> => {
  const pullRx = readable(
    makeRead(function(get) {
      return makeStreamPullEffect(get, create, options)
    })
  )
  return makeStreamPull(pullRx, options)
}

const makeStreamPullEffect = <A, E>(
  get: Context,
  create: Rx.Read<Stream.Stream<A, E>> | Stream.Stream<A, E>,
  options?: { readonly disableAccumulation?: boolean },
  runtime?: Runtime.Runtime<any>
) => {
  const stream = typeof create === "function" ? create(get) : create
  return Effect.map(
    Stream.toPull(
      options?.disableAccumulation ? stream : Stream.accumulateChunks(stream)
    ),
    (pull) => [pull, runtime] as const
  )
}

const makeStreamPull = <A, E>(
  pullRx: Rx<
    Result.Result<
      readonly [Effect.Effect<Chunk.Chunk<A>, Option.Option<E>>, Runtime.Runtime<any> | undefined]
    >
  >,
  options?: { readonly initialValue?: ReadonlyArray<A> }
) => {
  const initialValue: Result.Result<{
    readonly done: boolean
    readonly items: Array<A>
  }, E | NoSuchElementException> = options?.initialValue !== undefined
    ? Result.success({ done: false, items: options.initialValue as Array<A> })
    : Result.initial()

  return writable(function(get: Context): PullResult<A, E> {
    const previous = get.self<PullResult<A, E>>()
    const pullResult = get(pullRx)
    if (pullResult._tag !== "Success") {
      return Result.replacePrevious(pullResult, previous)
    }
    const [pullEffect, runtime] = pullResult.value
    const pull = pipe(
      pullEffect,
      Effect.map((_) => ({
        done: false,
        items: Chunk.toReadonlyArray(_) as Array<A>
      })),
      Effect.catchAll((error): Effect.Effect<{
        readonly done: boolean
        readonly items: Array<A>
      }, E | NoSuchElementException> =>
        Option.match(error, {
          onNone: () =>
            pipe(
              get.self<PullResult<A, E>>(),
              Option.flatMap(Result.value),
              Option.match({
                onNone: () => Effect.fail(new NoSuchElementException()),
                onSome: ({ items }) =>
                  Effect.succeed({
                    done: true,
                    items
                  })
              })
            ),
          onSome: Effect.fail
        })
      )
    )
    return makeEffect(get, pull, initialValue, runtime)
  }, function(ctx, _) {
    ctx.refreshSelf()
  }, function(refresh) {
    refresh(pullRx)
  })
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const family = typeof WeakRef === "undefined" || typeof FinalizationRegistry === "undefined" ?
  <Arg, T extends object>(
    f: (arg: Arg) => T
  ): (arg: Arg) => T => {
    const atoms = new Map<number, T>()
    return function(arg) {
      const hash = Hash.hash(arg)
      const atom = atoms.get(hash)
      if (atom !== undefined) {
        return atom
      }
      const newAtom = f(arg)
      atoms.set(hash, newAtom)
      return newAtom
    }
  } :
  <Arg, T extends object>(
    f: (arg: Arg) => T
  ): (arg: Arg) => T => {
    const atoms = new Map<number, WeakRef<T>>()
    const registry = new FinalizationRegistry<number>((hash) => {
      atoms.delete(hash)
    })
    return function(arg) {
      const hash = Hash.hash(arg)
      const atom = atoms.get(hash)?.deref()
      if (atom !== undefined) {
        return atom
      }
      const newAtom = f(arg)
      atoms.set(hash, new WeakRef(newAtom))
      registry.register(newAtom, hash)
      return newAtom
    }
  }

/**
 * @since 1.0.0
 * @category combinators
 */
export const withFallback: {
  <E2, A2>(
    fallback: Rx<Result.Result<A2, E2>>
  ): <R extends Rx<Result.Result<any, any>>>(
    self: R
  ) => [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>, RW>
    : Rx<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>>
  <R extends Rx<Result.Result<any, any>>, A2, E2>(
    self: R,
    fallback: Rx<Result.Result<A2, E2>>
  ): [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>, RW>
    : Rx<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>>
} = dual(2, <R extends Rx<Result.Result<any, any>>, A2, E2>(
  self: R,
  fallback: Rx<Result.Result<A2, E2>>
): [R] extends [Writable<infer _, infer RW>]
  ? Writable<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>, RW>
  : Rx<Result.Result<Result.Result.InferA<Rx.Infer<R>> | A2, Result.Result.InferE<Rx.Infer<R>> | E2>> =>
{
  function withFallback(get: Context) {
    const result = get(self)
    if (result._tag === "Initial") {
      return Result.waiting(get(fallback))
    }
    return result
  }
  return isWritable(self)
    ? writable(
      withFallback,
      self.write,
      self.refresh ?? function(refresh) {
        refresh(self)
      }
    )
    : readable(
      withFallback,
      self.refresh ?? function(refresh) {
        refresh(self)
      }
    ) as any
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const keepAlive = <A extends Rx<any>>(self: A): A =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    keepAlive: true
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const refreshable = <T extends Rx<any>>(
  self: T
): T & Refreshable =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    [RefreshableTypeId]: RefreshableTypeId
  })

/**
 * @since 1.0.0
 * @category combinators
 */
export const withLabel: {
  (name: string): <A extends Rx<any>>(self: A) => A
  <A extends Rx<any>>(self: A, name: string): A
} = dual<
  (name: string) => <A extends Rx<any>>(self: A) => A,
  <A extends Rx<any>>(self: A, name: string) => A
>(2, (self, name) =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    label: [name, new Error().stack?.split("\n")[5] ?? ""]
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setIdleTTL: {
  (duration: Duration.DurationInput): <A extends Rx<any>>(self: A) => A
  <A extends Rx<any>>(self: A, duration: Duration.DurationInput): A
} = dual<
  (duration: Duration.DurationInput) => <A extends Rx<any>>(self: A) => A,
  <A extends Rx<any>>(self: A, duration: Duration.DurationInput) => A
>(2, (self, duration) =>
  Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    idleTTL: Duration.toMillis(duration)
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const initialValue: {
  <A>(initialValue: A): (self: Rx<A>) => readonly [Rx<A>, A]
  <A>(self: Rx<A>, initialValue: A): readonly [Rx<A>, A]
} = dual<
  <A>(initialValue: A) => (self: Rx<A>) => readonly [Rx<A>, A],
  <A>(self: Rx<A>, initialValue: A) => readonly [Rx<A>, A]
>(2, (self, initialValue) => [self, initialValue])

/**
 * @since 1.0.0
 * @category combinators
 */
export const map = dual<
  <R extends Rx<any>, B>(
    f: (_: Rx.Infer<R>) => B
  ) => (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Rx<B>,
  <R extends Rx<any>, B>(
    self: R,
    f: (_: Rx.Infer<R>) => B
  ) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Rx<B>
>(
  2,
  (<A, B>(self: Rx<A>, f: (_: A) => B): Rx<B> =>
    isWritable(self)
      ? writable(
        (get) => f(get(self)),
        self.write as any,
        self.refresh ?? function(refresh) {
          refresh(self)
        }
      )
      : readable(
        (get) => f(get(self)),
        self.refresh ?? function(refresh) {
          refresh(self)
        }
      )) as any
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const mapResult: {
  <R extends Rx<Result.Result<any, any>>, B>(
    f: (_: Result.Result.InferA<Rx.Infer<R>>) => B
  ): (
    self: R
  ) => [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>, RW>
    : Rx<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>>
  <R extends Rx<Result.Result<any, any>>, B>(
    self: R,
    f: (_: Result.Result.InferA<Rx.Infer<R>>) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>, RW>
    : Rx<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>>
} = dual(2, <R extends Rx<Result.Result<any, any>>, B>(
  self: R,
  f: (_: Result.Result.InferA<Rx.Infer<R>>) => B
): [R] extends [Writable<infer _, infer RW>] ? Writable<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>, RW>
  : Rx<Result.Result<B, Result.Result.InferE<Rx.Infer<R>>>> => map(self, Result.map(f)))

/**
 * @since 1.0.0
 * @category batching
 */
export const batch: (f: () => void) => void = internalRegistry.batch
