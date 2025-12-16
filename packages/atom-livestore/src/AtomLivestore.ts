/**
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as Atom from "@effect-atom/atom/Atom"
import * as Result from "@effect-atom/atom/Result"
import type { CreateStoreOptions, LiveQueryDef, LiveStoreSchema, OtelOptions, Store } from "@livestore/livestore"
import { createStore, provideOtel } from "@livestore/livestore"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { constUndefined } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Mutable } from "effect/Types"

/**
 * @since 1.0.0
 * @category Models
 */
export interface AtomLiveStore<Self, Id extends string, S extends LiveStoreSchema, Context = {}>
  extends Context.Tag<Self, Store<S, Context>>
{
  new(
    _: never
  ): Context.TagClassShape<Id, Store<S, Context>>

  readonly layer: Layer.Layer<Self>
  readonly runtime: Atom.AtomRuntime<Self>

  /**
   * A Atom that allows you to access the Store. It will emit a `Result` that
   * contains the Store or an error if it could not be created.
   */
  readonly store: Atom.Atom<Result.Result<Store<S, Context>>>
  /**
   * A Atom that allows you to access the Store. It will emit the Store or
   * `undefined` if has not been created yet.
   */
  readonly storeUnsafe: Atom.Atom<Store<S, Context> | undefined>
  /**
   * Creates a Atom that allows you to resolve a LiveQueryDef. It embeds the loading
   * of the Store and will emit a `Result` that contains the result of the query
   */
  readonly makeQuery: <A>(
    query: LiveQueryDef<A> | ((get: Atom.Context) => LiveQueryDef<A>)
  ) => Atom.Atom<Result.Result<A>>
  /**
   * Creates a Atom that allows you to resolve a LiveQueryDef. If the Store has
   * not been created yet, it will return `undefined`.
   */
  readonly makeQueryUnsafe: <A>(
    query: LiveQueryDef<A> | ((get: Atom.Context) => LiveQueryDef<A>)
  ) => Atom.Atom<A | undefined>
  /**
   * A Atom.Writable that allows you to commit an event to the Store.
   */
  readonly commit: Atom.Writable<void, {}>
}

declare global {
  interface ErrorConstructor {
    stackTraceLimit: number
  }
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const Tag = <Self>() =>
<const Id extends string, S extends LiveStoreSchema, Context = {}>(
  id: Id,
  options: CreateStoreOptions<S, Context> & {
    readonly otelOptions?: Partial<OtelOptions> | undefined
  }
): AtomLiveStore<Self, Id, S, Context> => {
  const self: Mutable<AtomLiveStore<Self, Id, S, Context>> = Context.Tag(id)<Self, Store<S, Context>>() as any

  self.layer = Layer.scoped(
    self,
    createStore(options).pipe(
      provideOtel({
        parentSpanContext: options?.otelOptions?.rootSpanContext,
        otelTracer: options?.otelOptions?.tracer
      }),
      Effect.orDie
    )
  )
  self.runtime = Atom.runtime(self.layer)
  self.store = self.runtime.atom(Effect.contextWith(Context.get(self)) as any)
  self.storeUnsafe = Atom.readable((get) => {
    const result = get(self.store)
    return Result.getOrElse(result, constUndefined)
  })
  self.makeQuery = <A>(query: LiveQueryDef<A> | ((get: Atom.Context) => LiveQueryDef<A>)) =>
    Atom.readable((get) => {
      const store = get(self.store)
      return Result.map(store, (store) => {
        const q = typeof query === "function" ? query(get) : query
        function onUpdate(value: A) {
          get.setSelf(Result.success(value))
        }
        onUpdate.onUpdate = onUpdate
        get.addFinalizer(
          store.subscribe(q, onUpdate)
        )
        return store.query(q)
      })
    })
  self.makeQueryUnsafe = <A>(query: LiveQueryDef<A> | ((get: Atom.Context) => LiveQueryDef<A>)) =>
    Atom.readable((get) => {
      const store = get(self.storeUnsafe)
      if (store === undefined) {
        return undefined
      }
      const q = typeof query === "function" ? query(get) : query
      function onUpdate(value: A) {
        get.setSelf(value)
      }
      onUpdate.onUpdate = onUpdate
      get.addFinalizer(
        store.subscribe(q, onUpdate)
      )
      return store.query(q)
    })
  self.commit = Atom.writable((get) => {
    get(self.storeUnsafe)
  }, (ctx, value: {}) => {
    ctx.get(self.storeUnsafe)?.commit(value)
  })
  return self as AtomLiveStore<Self, Id, S, Context>
}
