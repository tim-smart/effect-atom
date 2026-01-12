/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import { hasProperty } from "effect/Predicate"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Atom from "./Atom.js"
import type { Registry } from "./index.js"
import * as internal from "./internal/registry.js"
import * as Result from "./Result.js"

const TypeId: TypeId = "~effect-atom/atom/Registry"
type TypeId = "~effect-atom/atom/Registry"

/**
 * @since 1.0.0
 * @category guards
 */
export const isRegistry = (u: unknown): u is Registry => hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Registry {
  readonly [TypeId]: TypeId
  readonly getNodes: () => ReadonlyMap<Atom.Atom<any> | string, Node<any>>
  readonly get: <A>(atom: Atom.Atom<A>) => A
  readonly mount: <A>(atom: Atom.Atom<A>) => () => void
  readonly refresh: <A>(atom: Atom.Atom<A>) => void
  readonly set: <R, W>(atom: Atom.Writable<R, W>, value: W) => void
  readonly setSerializable: (key: string, encoded: unknown) => void
  readonly modify: <R, W, A>(atom: Atom.Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]) => A
  readonly update: <R, W>(atom: Atom.Writable<R, W>, f: (_: R) => W) => void
  readonly subscribe: <A>(atom: Atom.Atom<A>, f: (_: A) => void, options?: {
    readonly immediate?: boolean
  }) => () => void
  readonly reset: () => void
  readonly dispose: () => void
}

/**
 * @since 1.0.0
 * @category models
 */
interface Node<A> {
  readonly atom: Atom.Atom<A>
  readonly value: () => A
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options?: {
    readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
    readonly scheduleTask?: ((f: () => void) => void) | undefined
    readonly timeoutResolution?: number | undefined
    readonly defaultIdleTTL?: number | undefined
  } | undefined
) => Registry = internal.make

/**
 * @since 1.0.0
 * @category Tags
 */
export class AtomRegistry extends Context.Tag("@effect/atom/Registry/CurrentRegistry")<
  AtomRegistry,
  Registry
>() {}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerOptions = (options?: {
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}): Layer.Layer<AtomRegistry> =>
  Layer.scoped(
    AtomRegistry,
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const scheduler = yield* FiberRef.get(FiberRef.currentScheduler)
      const registry = internal.make({
        ...options,
        scheduleTask: options?.scheduleTask ?? ((f) => scheduler.scheduleTask(f, 0))
      })
      yield* Scope.addFinalizer(scope, Effect.sync(() => registry.dispose()))
      return registry
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<Registry.AtomRegistry> = layerOptions()

// -----------------------------------------------------------------------------
// conversions
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toStream: {
  <A>(atom: Atom.Atom<A>): (self: Registry) => Stream.Stream<A>
  <A>(self: Registry, atom: Atom.Atom<A>): Stream.Stream<A>
} = dual(
  2,
  <A>(self: Registry, atom: Atom.Atom<A>) =>
    Stream.unwrapScoped(
      Effect.contextWithEffect((context: Context.Context<Scope.Scope>) => {
        const scope = Context.get(context, Scope.Scope)
        return Mailbox.make<A>().pipe(
          Effect.tap((mailbox) => {
            const cancel = self.subscribe(atom, (value) => mailbox.unsafeOffer(value), {
              immediate: true
            })
            return Scope.addFinalizer(
              scope,
              Effect.suspend(() => {
                cancel()
                return mailbox.shutdown
              })
            )
          }),
          Effect.uninterruptible,
          Effect.map((mailbox) => Mailbox.toStream(mailbox))
        )
      })
    )
)

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toStreamResult: {
  <A, E>(atom: Atom.Atom<Result.Result<A, E>>): (self: Registry) => Stream.Stream<A, E>
  <A, E>(self: Registry, atom: Atom.Atom<Result.Result<A, E>>): Stream.Stream<A, E>
} = dual(
  2,
  <A, E>(self: Registry, atom: Atom.Atom<Result.Result<A, E>>): Stream.Stream<A, E> =>
    toStream(self, atom).pipe(
      Stream.filter(Result.isNotInitial),
      Stream.mapEffect((result) =>
        result._tag === "Success" ? Effect.succeed(result.value) : Effect.failCause(result.cause)
      )
    )
)

/**
 * @since 1.0.0
 * @category Conversions
 */
export const getResult: {
  <A, E>(atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }): (self: Registry) => Effect.Effect<A, E>
  <A, E>(self: Registry, atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }): Effect.Effect<A, E>
} = dual(
  (args) => isRegistry(args[0]),
  <A, E>(self: Registry, atom: Atom.Atom<Result.Result<A, E>>, options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }): Effect.Effect<A, E> => {
    const suspendOnWaiting = options?.suspendOnWaiting ?? false
    return Effect.async((resume) => {
      const result = self.get(atom)
      if (result._tag !== "Initial" && !(suspendOnWaiting && result.waiting)) {
        return resume(Result.toExit(result) as any)
      }
      const cancel = self.subscribe(atom, (value) => {
        if (value._tag !== "Initial" && !(suspendOnWaiting && value.waiting)) {
          resume(Result.toExit(value) as any)
          cancel()
        }
      })
      return Effect.sync(cancel)
    })
  }
)
