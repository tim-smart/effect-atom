---
title: AtomLivestore.ts
nav_order: 1
parent: "@effect-atom/atom-livestore"
---

## AtomLivestore overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructors](#constructors)
  - [Tag](#tag)
- [Models](#models)
  - [AtomLiveStore (interface)](#atomlivestore-interface)

---

# Constructors

## Tag

**Signature**

```ts
export declare const Tag: <Self>() => <const Id extends string, S extends LiveStoreSchema, Context = {}>(
  id: Id,
  options: CreateStoreOptions<S, Context> & { readonly otelOptions?: Partial<OtelOptions> | undefined }
) => AtomLiveStore<Self, Id, S, Context>
```

Added in v1.0.0

# Models

## AtomLiveStore (interface)

**Signature**

```ts
export interface AtomLiveStore<Self, Id extends string, S extends LiveStoreSchema, Context = {}>
  extends Context.Tag<Self, Store<S, Context>> {
  new (_: never): Context.TagClassShape<Id, Store<S, Context>>

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
```

Added in v1.0.0
