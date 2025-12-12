---
title: Atom.ts
nav_order: 1
parent: "@effect-atom/atom"
---

## Atom overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Conversions](#conversions)
  - [get](#get)
  - [getResult](#getresult)
  - [modify](#modify)
  - [refresh](#refresh)
  - [set](#set)
  - [toStream](#tostream)
  - [toStreamResult](#tostreamresult)
  - [update](#update)
- [Focus](#focus)
  - [makeRefreshOnSignal](#makerefreshonsignal)
  - [refreshOnWindowFocus](#refreshonwindowfocus)
  - [windowFocusSignal](#windowfocussignal)
- [Guards](#guards)
  - [isAtom](#isatom)
- [KeyValueStore](#keyvaluestore)
  - [kvs](#kvs)
- [Optimistic](#optimistic)
  - [optimistic](#optimistic-1)
  - [optimisticFn](#optimisticfn)
- [Reactivity](#reactivity)
  - [withReactivity](#withreactivity)
- [Serializable](#serializable)
  - [Serializable (interface)](#serializable-interface)
  - [SerializableTypeId](#serializabletypeid)
  - [SerializableTypeId (type alias)](#serializabletypeid-type-alias)
  - [isSerializable](#isserializable)
- [ServerValue](#servervalue)
  - [ServerValueTypeId](#servervaluetypeid)
  - [getServerValue](#getservervalue)
  - [withServerValue](#withservervalue)
  - [withServerValueInitial](#withservervalueinitial)
- [URL search params](#url-search-params)
  - [searchParam](#searchparam)
- [batching](#batching)
  - [batch](#batch)
- [combinators](#combinators)
  - [autoDispose](#autodispose)
  - [debounce](#debounce)
  - [initialValue](#initialvalue)
  - [keepAlive](#keepalive)
  - [map](#map)
  - [mapResult](#mapresult)
  - [serializable](#serializable-1)
  - [setIdleTTL](#setidlettl)
  - [setLazy](#setlazy)
  - [transform](#transform)
  - [withFallback](#withfallback)
  - [withLabel](#withlabel)
- [constructors](#constructors)
  - [context](#context)
  - [family](#family)
  - [fn](#fn)
  - [fnSync](#fnsync)
  - [make](#make)
  - [pull](#pull)
  - [readable](#readable)
  - [subscribable](#subscribable)
  - [subscriptionRef](#subscriptionref)
  - [writable](#writable)
- [context](#context-1)
  - [Context (interface)](#context-interface)
  - [WriteContext (interface)](#writecontext-interface)
  - [defaultMemoMap](#defaultmemomap)
  - [runtime](#runtime)
- [models](#models)
  - [Atom (interface)](#atom-interface)
  - [AtomResultFn (interface)](#atomresultfn-interface)
  - [AtomRuntime (interface)](#atomruntime-interface)
  - [FnContext (interface)](#fncontext-interface)
  - [PullResult (type alias)](#pullresult-type-alias)
  - [RuntimeFactory (interface)](#runtimefactory-interface)
  - [Writable (interface)](#writable-interface)
- [refinements](#refinements)
  - [isWritable](#iswritable)
- [symbols](#symbols)
  - [Interrupt](#interrupt)
  - [Interrupt (type alias)](#interrupt-type-alias)
  - [Reset](#reset)
  - [Reset (type alias)](#reset-type-alias)
- [type ids](#type-ids)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
  - [WritableTypeId](#writabletypeid)
  - [WritableTypeId (type alias)](#writabletypeid-type-alias)
- [utils](#utils)
  - [Failure (type alias)](#failure-type-alias)
  - [PullSuccess (type alias)](#pullsuccess-type-alias)
  - [Success (type alias)](#success-type-alias)
  - [Type (type alias)](#type-type-alias)
  - [WithoutSerializable (type alias)](#withoutserializable-type-alias)

---

# Conversions

## get

**Signature**

```ts
export declare const get: <A>(self: Atom<A>) => Effect.Effect<A, never, AtomRegistry>
```

Added in v1.0.0

## getResult

**Signature**

```ts
export declare const getResult: <A, E>(
  self: Atom<Result.Result<A, E>>,
  options?: { readonly suspendOnWaiting?: boolean | undefined }
) => Effect.Effect<A, E, AtomRegistry>
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <R, W, A>(
    f: (_: R) => [returnValue: A, nextValue: W]
  ): (self: Writable<R, W>) => Effect.Effect<A, never, AtomRegistry>
  <R, W, A>(self: Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]): Effect.Effect<A, never, AtomRegistry>
}
```

Added in v1.0.0

## refresh

**Signature**

```ts
export declare const refresh: <A>(self: Atom<A>) => Effect.Effect<void, never, AtomRegistry>
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: {
  <W>(value: W): <R>(self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry>
  <R, W>(self: Writable<R, W>, value: W): Effect.Effect<void, never, AtomRegistry>
}
```

Added in v1.0.0

## toStream

**Signature**

```ts
export declare const toStream: <A>(self: Atom<A>) => Stream.Stream<A, never, AtomRegistry>
```

Added in v1.0.0

## toStreamResult

**Signature**

```ts
export declare const toStreamResult: <A, E>(self: Atom<Result.Result<A, E>>) => Stream.Stream<A, E, AtomRegistry>
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: {
  <R, W>(f: (_: R) => W): (self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry>
  <R, W>(self: Writable<R, W>, f: (_: R) => W): Effect.Effect<void, never, AtomRegistry>
}
```

Added in v1.0.0

# Focus

## makeRefreshOnSignal

**Signature**

```ts
export declare const makeRefreshOnSignal: <_>(
  signal: Atom<_>
) => <A extends Atom<any>>(self: A) => WithoutSerializable<A>
```

Added in v1.0.0

## refreshOnWindowFocus

**Signature**

```ts
export declare const refreshOnWindowFocus: <A extends Atom<any>>(self: A) => WithoutSerializable<A>
```

Added in v1.0.0

## windowFocusSignal

**Signature**

```ts
export declare const windowFocusSignal: Atom<number>
```

Added in v1.0.0

# Guards

## isAtom

**Signature**

```ts
export declare const isAtom: (u: unknown) => u is Atom<any>
```

Added in v1.0.0

# KeyValueStore

## kvs

**Signature**

```ts
export declare const kvs: <A>(options: {
  readonly runtime: AtomRuntime<KeyValueStore.KeyValueStore, any>
  readonly key: string
  readonly schema: Schema.Schema<A, any>
  readonly defaultValue: LazyArg<A>
}) => Writable<A>
```

Added in v1.0.0

# Optimistic

## optimistic

**Signature**

```ts
export declare const optimistic: <A>(self: Atom<A>) => Writable<A, Atom<Result.Result<A, unknown>>>
```

Added in v1.0.0

## optimisticFn

**Signature**

```ts
export declare const optimisticFn: {
  <A, W, XA, XE, OW = void>(options: {
    readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>
    readonly fn: AtomResultFn<OW, XA, XE> | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>)
  }): (self: Writable<A, Atom<Result.Result<W, unknown>>>) => AtomResultFn<OW, XA, XE>
  <A, W, XA, XE, OW = void>(
    self: Writable<A, Atom<Result.Result<W, unknown>>>,
    options: {
      readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>
      readonly fn: AtomResultFn<OW, XA, XE> | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>)
    }
  ): AtomResultFn<OW, XA, XE>
}
```

Added in v1.0.0

# Reactivity

## withReactivity

An alias to `Rx.runtime.withReactivity`, for refreshing an atom whenever the
keys change in the `Reactivity` service.

**Signature**

```ts
export declare const withReactivity: (
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
) => <A extends Atom<any>>(atom: A) => A
```

Added in v1.0.0

# Serializable

## Serializable (interface)

**Signature**

```ts
export interface Serializable<S extends Schema.Schema.Any> {
  readonly [SerializableTypeId]: {
    readonly key: string
    readonly encode: (value: S["Type"]) => S["Encoded"]
    readonly decode: (value: S["Encoded"]) => S["Type"]
  }
}
```

Added in v1.0.0

## SerializableTypeId

**Signature**

```ts
export declare const SerializableTypeId: "~effect-atom/atom/Atom/Serializable"
```

Added in v1.0.0

## SerializableTypeId (type alias)

**Signature**

```ts
export type SerializableTypeId = "~effect-atom/atom/Atom/Serializable"
```

Added in v1.0.0

## isSerializable

**Signature**

```ts
export declare const isSerializable: (self: Atom<any>) => self is Atom<any> & Serializable<any>
```

Added in v1.0.0

# ServerValue

## ServerValueTypeId

**Signature**

```ts
export declare const ServerValueTypeId: "~effect-atom/atom/Atom/ServerValue"
```

Added in v1.0.0

## getServerValue

**Signature**

```ts
export declare const getServerValue: {
  (registry: Registry.Registry): <A>(self: Atom<A>) => A
  <A>(self: Atom<A>, registry: Registry.Registry): A
}
```

Added in v1.0.0

## withServerValue

Overrides the value of an Atom when read on the server.

**Signature**

```ts
export declare const withServerValue: {
  <A extends Atom<any>>(read: (get: <A>(atom: Atom<A>) => A) => Type<A>): (self: A) => A
  <A extends Atom<any>>(self: A, read: (get: <A>(atom: Atom<A>) => A) => Type<A>): A
}
```

Added in v1.0.0

## withServerValueInitial

Sets the Atom's server value to `Result.initial(true)`.

**Signature**

```ts
export declare const withServerValueInitial: <A extends Atom<Result.Result<any, any>>>(self: A) => A
```

Added in v1.0.0

# URL search params

## searchParam

Create an Atom that reads and writes a URL search parameter.

Note: If you pass a schema, it has to be synchronous and have no context.

**Signature**

```ts
export declare const searchParam: <A = never, I extends string = never>(
  name: string,
  options?: { readonly schema?: Schema.Schema<A, I> }
) => Writable<[A] extends [never] ? string : Option.Option<A>>
```

Added in v1.0.0

# batching

## batch

**Signature**

```ts
export declare const batch: (f: () => void) => void
```

Added in v1.0.0

# combinators

## autoDispose

Reverts the `keepAlive` behavior of a reactive value, allowing it to be
disposed of when not in use.

Note that Atom's have this behavior by default.

**Signature**

```ts
export declare const autoDispose: <A extends Atom<any>>(self: A) => A
```

Added in v1.0.0

## debounce

**Signature**

```ts
export declare const debounce: {
  (duration: Duration.DurationInput): <A extends Atom<any>>(self: A) => WithoutSerializable<A>
  <A extends Atom<any>>(self: A, duration: Duration.DurationInput): WithoutSerializable<A>
}
```

Added in v1.0.0

## initialValue

**Signature**

```ts
export declare const initialValue: {
  <A>(initialValue: A): (self: Atom<A>) => readonly [Atom<A>, A]
  <A>(self: Atom<A>, initialValue: A): readonly [Atom<A>, A]
}
```

Added in v1.0.0

## keepAlive

**Signature**

```ts
export declare const keepAlive: <A extends Atom<any>>(self: A) => A
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: {
  <R extends Atom<any>, B>(
    f: (_: Type<R>) => B
  ): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
  <R extends Atom<any>, B>(
    self: R,
    f: (_: Type<R>) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
}
```

Added in v1.0.0

## mapResult

**Signature**

```ts
export declare const mapResult: {
  <R extends Atom<Result.Result<any, any>>, B>(
    f: (_: Result.Result.Success<Type<R>>) => B
  ): (
    self: R
  ) => [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<B, Result.Result.Failure<Type<R>>>, RW>
    : Atom<Result.Result<B, Result.Result.Failure<Type<R>>>>
  <R extends Atom<Result.Result<any, any>>, B>(
    self: R,
    f: (_: Result.Result.Success<Type<R>>) => B
  ): [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<B, Result.Result.Failure<Type<R>>>, RW>
    : Atom<Result.Result<B, Result.Result.Failure<Type<R>>>>
}
```

Added in v1.0.0

## serializable

**Signature**

```ts
export declare const serializable: {
  <R extends Atom<any>, S extends Schema.Schema<Type<R>, any>>(options: {
    readonly key: string
    readonly schema: S
  }): (self: R) => R & Serializable<S>
  <R extends Atom<any>, S extends Schema.Schema<Type<R>, any>>(
    self: R,
    options: { readonly key: string; readonly schema: S }
  ): R & Serializable<S>
}
```

Added in v1.0.0

## setIdleTTL

**Signature**

```ts
export declare const setIdleTTL: {
  (duration: Duration.DurationInput): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, duration: Duration.DurationInput): A
}
```

Added in v1.0.0

## setLazy

**Signature**

```ts
export declare const setLazy: {
  (lazy: boolean): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, lazy: boolean): A
}
```

Added in v1.0.0

## transform

**Signature**

```ts
export declare const transform: {
  <R extends Atom<any>, B>(
    f: (get: Context) => B
  ): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
  <R extends Atom<any>, B>(
    self: R,
    f: (get: Context) => B
  ): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>
}
```

Added in v1.0.0

## withFallback

**Signature**

```ts
export declare const withFallback: {
  <E2, A2>(
    fallback: Atom<Result.Result<A2, E2>>
  ): <R extends Atom<Result.Result<any, any>>>(
    self: R
  ) => [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>, RW>
    : Atom<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>>
  <R extends Atom<Result.Result<any, any>>, A2, E2>(
    self: R,
    fallback: Atom<Result.Result<A2, E2>>
  ): [R] extends [Writable<infer _, infer RW>]
    ? Writable<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>, RW>
    : Atom<Result.Result<Result.Result.Success<Type<R>> | A2, Result.Result.Failure<Type<R>> | E2>>
}
```

Added in v1.0.0

## withLabel

**Signature**

```ts
export declare const withLabel: {
  (name: string): <A extends Atom<any>>(self: A) => A
  <A extends Atom<any>>(self: A, name: string): A
}
```

Added in v1.0.0

# constructors

## context

**Signature**

```ts
export declare const context: (options: { readonly memoMap: Layer.MemoMap }) => RuntimeFactory
```

Added in v1.0.0

## family

**Signature**

```ts
export declare const family: <Arg, T extends object>(f: (arg: Arg) => T) => (arg: Arg) => T
```

Added in v1.0.0

## fn

**Signature**

```ts
export declare const fn: {
  <Arg>(): <E, A>(
    fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
    options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined }
  ) => AtomResultFn<Arg, A, E>
  <E, A, Arg = void>(
    fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
    options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined }
  ): AtomResultFn<Arg, A, E>
  <Arg>(): <E, A>(
    fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry>,
    options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined }
  ) => AtomResultFn<Arg, A, E | NoSuchElementException>
  <E, A, Arg = void>(
    fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry>,
    options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined }
  ): AtomResultFn<Arg, A, E | NoSuchElementException>
}
```

Added in v1.0.0

## fnSync

**Signature**

```ts
export declare const fnSync: {
  <Arg>(): {
    <A>(f: (arg: Arg, get: FnContext) => A): Writable<Option.Option<A>, Arg>
    <A>(f: (arg: Arg, get: FnContext) => A, options: { readonly initialValue: A }): Writable<A, Arg>
  }
  <A, Arg = void>(f: (arg: Arg, get: FnContext) => A): Writable<Option.Option<A>, Arg>
  <A, Arg = void>(f: (arg: Arg, get: FnContext) => A, options: { readonly initialValue: A }): Writable<A, Arg>
}
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: {
  <A, E>(
    create: (get: Context) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
    options?: { readonly initialValue?: A }
  ): Atom<Result.Result<A, E>>
  <A, E>(
    effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>,
    options?: { readonly initialValue?: A }
  ): Atom<Result.Result<A, E>>
  <A, E>(
    create: (get: Context) => Stream.Stream<A, E, AtomRegistry>,
    options?: { readonly initialValue?: A }
  ): Atom<Result.Result<A, E>>
  <A, E>(stream: Stream.Stream<A, E, AtomRegistry>, options?: { readonly initialValue?: A }): Atom<Result.Result<A, E>>
  <A>(create: (get: Context) => A): Atom<A>
  <A>(initialValue: A): Writable<A>
}
```

Added in v1.0.0

## pull

**Signature**

```ts
export declare const pull: <A, E>(
  create: ((get: Context) => Stream.Stream<A, E, AtomRegistry>) | Stream.Stream<A, E, AtomRegistry>,
  options?: { readonly disableAccumulation?: boolean | undefined }
) => Writable<PullResult<A, E>, void>
```

Added in v1.0.0

## readable

**Signature**

```ts
export declare const readable: <A>(
  read: (get: Context) => A,
  refresh?: (f: <A>(atom: Atom<A>) => void) => void
) => Atom<A>
```

Added in v1.0.0

## subscribable

**Signature**

```ts
export declare const subscribable: {
  <A, E>(ref: Subscribable.Subscribable<A, E> | ((get: Context) => Subscribable.Subscribable<A, E>)): Atom<A>
  <A, E, E1>(
    effect:
      | Effect.Effect<Subscribable.Subscribable<A, E1>, E, Scope.Scope | AtomRegistry>
      | ((get: Context) => Effect.Effect<Subscribable.Subscribable<A, E1>, E, Scope.Scope | AtomRegistry>)
  ): Atom<Result.Result<A, E | E1>>
}
```

Added in v1.0.0

## subscriptionRef

**Signature**

```ts
export declare const subscriptionRef: {
  <A>(ref: SubscriptionRef.SubscriptionRef<A> | ((get: Context) => SubscriptionRef.SubscriptionRef<A>)): Writable<A>
  <A, E>(
    effect:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry>
      | ((get: Context) => Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry>)
  ): Writable<Result.Result<A, E>, A>
}
```

Added in v1.0.0

## writable

**Signature**

```ts
export declare const writable: <R, W>(
  read: (get: Context) => R,
  write: (ctx: WriteContext<R>, value: W) => void,
  refresh?: (f: <A>(atom: Atom<A>) => void) => void
) => Writable<R, W>
```

Added in v1.0.0

# context

## Context (interface)

**Signature**

```ts
export interface Context {
  <A>(atom: Atom<A>): A
  get<A>(this: Context, atom: Atom<A>): A
  result<A, E>(
    this: Context,
    atom: Atom<Result.Result<A, E>>,
    options?: {
      readonly suspendOnWaiting?: boolean | undefined
    }
  ): Effect.Effect<A, E>
  resultOnce<A, E>(
    this: Context,
    atom: Atom<Result.Result<A, E>>,
    options?: {
      readonly suspendOnWaiting?: boolean | undefined
    }
  ): Effect.Effect<A, E>
  once<A>(this: Context, atom: Atom<A>): A
  addFinalizer(this: Context, f: () => void): void
  mount<A>(this: Context, atom: Atom<A>): void
  refresh<A>(this: Context, atom: Atom<A>): void
  refreshSelf(this: Context): void
  self<A>(this: Context): Option.Option<A>
  setSelf<A>(this: Context, a: A): void
  set<R, W>(this: Context, atom: Writable<R, W>, value: W): void
  setResult<A, E, W>(this: Context, atom: Writable<Result.Result<A, E>, W>, value: W): Effect.Effect<A, E>
  some<A>(this: Context, atom: Atom<Option.Option<A>>): Effect.Effect<A>
  someOnce<A>(this: Context, atom: Atom<Option.Option<A>>): Effect.Effect<A>
  stream<A>(
    this: Context,
    atom: Atom<A>,
    options?: {
      readonly withoutInitialValue?: boolean
      readonly bufferSize?: number
    }
  ): Stream.Stream<A>
  streamResult<A, E>(
    this: Context,
    atom: Atom<Result.Result<A, E>>,
    options?: {
      readonly withoutInitialValue?: boolean
      readonly bufferSize?: number
    }
  ): Stream.Stream<A, E>
  subscribe<A>(
    this: Context,
    atom: Atom<A>,
    f: (_: A) => void,
    options?: {
      readonly immediate?: boolean
    }
  ): void
  readonly registry: Registry.Registry
}
```

Added in v1.0.0

## WriteContext (interface)

**Signature**

```ts
export interface WriteContext<A> {
  get<T>(this: WriteContext<A>, atom: Atom<T>): T
  refreshSelf(this: WriteContext<A>): void
  setSelf(this: WriteContext<A>, a: A): void
  set<R, W>(this: WriteContext<A>, atom: Writable<R, W>, value: W): void
}
```

Added in v1.0.0

## defaultMemoMap

**Signature**

```ts
export declare const defaultMemoMap: Layer.MemoMap
```

Added in v1.0.0

## runtime

**Signature**

```ts
export declare const runtime: RuntimeFactory
```

Added in v1.0.0

# models

## Atom (interface)

**Signature**

```ts
export interface Atom<A> extends Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly keepAlive: boolean
  readonly lazy: boolean
  readonly read: (get: Context) => A
  readonly refresh?: (f: <A>(atom: Atom<A>) => void) => void
  readonly label?: readonly [name: string, stack: string]
  readonly idleTTL?: number
}
```

Added in v1.0.0

## AtomResultFn (interface)

**Signature**

```ts
export interface AtomResultFn<Arg, A, E = never> extends Writable<Result.Result<A, E>, Arg | Reset | Interrupt> {}
```

Added in v1.0.0

## AtomRuntime (interface)

**Signature**

```ts
export interface AtomRuntime<R, ER = never> extends Atom<Result.Result<Runtime.Runtime<R>, ER>> {
  readonly factory: RuntimeFactory

  readonly layer: Atom<Layer.Layer<R, ER>>

  readonly atom: {
    <A, E>(
      create: (get: Context) => Effect.Effect<A, E, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>,
      options?: {
        readonly initialValue?: A
      }
    ): Atom<Result.Result<A, E | ER>>
    <A, E>(
      effect: Effect.Effect<A, E, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>,
      options?: {
        readonly initialValue?: A
      }
    ): Atom<Result.Result<A, E | ER>>
    <A, E>(
      create: (get: Context) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A
      }
    ): Atom<Result.Result<A, E | ER>>
    <A, E>(
      stream: Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A
      }
    ): Atom<Result.Result<A, E | ER>>
  }

  readonly fn: {
    <Arg>(): {
      <E, A>(
        fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry | Reactivity.Reactivity | R>,
        options?: {
          readonly initialValue?: A | undefined
          readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
          readonly concurrent?: boolean | undefined
        }
      ): AtomResultFn<Arg, A, E | ER>
      <E, A>(
        fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
        options?: {
          readonly initialValue?: A | undefined
          readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
          readonly concurrent?: boolean | undefined
        }
      ): AtomResultFn<Arg, A, E | ER | NoSuchElementException>
    }
    <E, A, Arg = void>(
      fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A | undefined
        readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        readonly concurrent?: boolean | undefined
      }
    ): AtomResultFn<Arg, A, E | ER>
    <E, A, Arg = void>(
      fn: (arg: Arg, get: FnContext) => Stream.Stream<A, E, AtomRegistry | Reactivity.Reactivity | R>,
      options?: {
        readonly initialValue?: A | undefined
        readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        readonly concurrent?: boolean | undefined
      }
    ): AtomResultFn<Arg, A, E | ER | NoSuchElementException>
  }

  readonly pull: <A, E>(
    create:
      | ((get: Context) => Stream.Stream<A, E, R | AtomRegistry | Reactivity.Reactivity>)
      | Stream.Stream<A, E, R | AtomRegistry | Reactivity.Reactivity>,
    options?: {
      readonly disableAccumulation?: boolean
      readonly initialValue?: ReadonlyArray<A>
    }
  ) => Writable<PullResult<A, E | ER>, void>

  readonly subscriptionRef: <A, E>(
    create:
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>
      | ((
          get: Context
        ) => Effect.Effect<
          SubscriptionRef.SubscriptionRef<A>,
          E,
          Scope.Scope | R | AtomRegistry | Reactivity.Reactivity
        >)
  ) => Writable<Result.Result<A, E>, A>

  readonly subscribable: <A, E, E1 = never>(
    create:
      | Effect.Effect<Subscribable.Subscribable<A, E, R>, E1, Scope.Scope | R | AtomRegistry | Reactivity.Reactivity>
      | ((
          get: Context
        ) => Effect.Effect<
          Subscribable.Subscribable<A, E, R>,
          E1,
          Scope.Scope | R | AtomRegistry | Reactivity.Reactivity
        >)
  ) => Atom<Result.Result<A, E | E1>>
}
```

Added in v1.0.0

## FnContext (interface)

**Signature**

```ts
export interface FnContext {
  <A>(atom: Atom<A>): A
  result<A, E>(
    this: FnContext,
    atom: Atom<Result.Result<A, E>>,
    options?: {
      readonly suspendOnWaiting?: boolean | undefined
    }
  ): Effect.Effect<A, E>
  addFinalizer(this: FnContext, f: () => void): void
  mount<A>(this: FnContext, atom: Atom<A>): void
  refresh<A>(this: FnContext, atom: Atom<A>): void
  self<A>(this: FnContext): Option.Option<A>
  setSelf<A>(this: FnContext, a: A): void
  set<R, W>(this: FnContext, atom: Writable<R, W>, value: W): void
  setResult<A, E, W>(this: FnContext, atom: Writable<Result.Result<A, E>, W>, value: W): Effect.Effect<A, E>
  some<A>(this: FnContext, atom: Atom<Option.Option<A>>): Effect.Effect<A>
  stream<A>(
    this: FnContext,
    atom: Atom<A>,
    options?: {
      readonly withoutInitialValue?: boolean
      readonly bufferSize?: number
    }
  ): Stream.Stream<A>
  streamResult<A, E>(
    this: FnContext,
    atom: Atom<Result.Result<A, E>>,
    options?: {
      readonly withoutInitialValue?: boolean
      readonly bufferSize?: number
    }
  ): Stream.Stream<A, E>
  subscribe<A>(
    this: FnContext,
    atom: Atom<A>,
    f: (_: A) => void,
    options?: {
      readonly immediate?: boolean
    }
  ): void
  readonly registry: Registry.Registry
}
```

Added in v1.0.0

## PullResult (type alias)

**Signature**

```ts
export type PullResult<A, E = never> = Result.Result<
  {
    readonly done: boolean
    readonly items: Arr.NonEmptyArray<A>
  },
  E | Cause.NoSuchElementException
>
```

Added in v1.0.0

## RuntimeFactory (interface)

**Signature**

```ts
export interface RuntimeFactory {
  <R, E>(
    create:
      | Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>
      | ((get: Context) => Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>)
  ): AtomRuntime<R, E>
  readonly memoMap: Layer.MemoMap
  readonly addGlobalLayer: <A, E>(layer: Layer.Layer<A, E, AtomRegistry | Reactivity.Reactivity>) => void

  /**
   * Uses the `Reactivity` service from the runtime to refresh the atom whenever
   * the keys change.
   */
  readonly withReactivity: (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ) => <A extends Atom<any>>(atom: A) => A
}
```

Added in v1.0.0

## Writable (interface)

**Signature**

```ts
export interface Writable<R, W = R> extends Atom<R> {
  readonly [WritableTypeId]: WritableTypeId
  readonly write: (ctx: WriteContext<R>, value: W) => void
}
```

Added in v1.0.0

# refinements

## isWritable

**Signature**

```ts
export declare const isWritable: <R, W>(atom: Atom<R>) => atom is Writable<R, W>
```

Added in v1.0.0

# symbols

## Interrupt

**Signature**

```ts
export declare const Interrupt: typeof Interrupt
```

Added in v1.0.0

## Interrupt (type alias)

**Signature**

```ts
export type Interrupt = typeof Interrupt
```

Added in v1.0.0

## Reset

**Signature**

```ts
export declare const Reset: typeof Reset
```

Added in v1.0.0

## Reset (type alias)

**Signature**

```ts
export type Reset = typeof Reset
```

Added in v1.0.0

# type ids

## TypeId

**Signature**

```ts
export declare const TypeId: "~effect-atom/atom/Atom"
```

Added in v1.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = "~effect-atom/atom/Atom"
```

Added in v1.0.0

## WritableTypeId

**Signature**

```ts
export declare const WritableTypeId: "~effect-atom/atom/Atom/Writable"
```

Added in v1.0.0

## WritableTypeId (type alias)

**Signature**

```ts
export type WritableTypeId = "~effect-atom/atom/Atom/Writable"
```

Added in v1.0.0

# utils

## Failure (type alias)

**Signature**

```ts
export type Failure<T extends Atom<any>> = T extends Atom<Result.Result<infer _, infer E>> ? E : never
```

Added in v1.0.0

## PullSuccess (type alias)

**Signature**

```ts
export type PullSuccess<T extends Atom<any>> = T extends Atom<PullResult<infer A, infer _>> ? A : never
```

Added in v1.0.0

## Success (type alias)

**Signature**

```ts
export type Success<T extends Atom<any>> = T extends Atom<Result.Result<infer A, infer _>> ? A : never
```

Added in v1.0.0

## Type (type alias)

**Signature**

```ts
export type Type<T extends Atom<any>> = T extends Atom<infer A> ? A : never
```

Added in v1.0.0

## WithoutSerializable (type alias)

**Signature**

```ts
export type WithoutSerializable<T extends Atom<any>> =
  T extends Writable<infer R, infer W> ? Writable<R, W> : Atom<Type<T>>
```

Added in v1.0.0
