---
title: Registry.ts
nav_order: 7
parent: "@effect-atom/atom"
---

## Registry overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Conversions](#conversions)
  - [getResult](#getresult)
  - [toStream](#tostream)
  - [toStreamResult](#tostreamresult)
- [Layers](#layers)
  - [layer](#layer)
  - [layerOptions](#layeroptions)
- [Tags](#tags)
  - [AtomRegistry (class)](#atomregistry-class)
- [constructors](#constructors)
  - [make](#make)
- [guards](#guards)
  - [isRegistry](#isregistry)
- [models](#models)
  - [Registry (interface)](#registry-interface)

---

# Conversions

## getResult

**Signature**

```ts
export declare const getResult: {
  <A, E>(
    atom: Atom.Atom<Result.Result<A, E>>,
    options?: { readonly suspendOnWaiting?: boolean | undefined }
  ): (self: Registry) => Effect.Effect<A, E>
  <A, E>(
    self: Registry,
    atom: Atom.Atom<Result.Result<A, E>>,
    options?: { readonly suspendOnWaiting?: boolean | undefined }
  ): Effect.Effect<A, E>
}
```

Added in v1.0.0

## toStream

**Signature**

```ts
export declare const toStream: {
  <A>(atom: Atom.Atom<A>): (self: Registry) => Stream.Stream<A>
  <A>(self: Registry, atom: Atom.Atom<A>): Stream.Stream<A>
}
```

Added in v1.0.0

## toStreamResult

**Signature**

```ts
export declare const toStreamResult: {
  <A, E>(atom: Atom.Atom<Result.Result<A, E>>): (self: Registry) => Stream.Stream<A, E>
  <A, E>(self: Registry, atom: Atom.Atom<Result.Result<A, E>>): Stream.Stream<A, E>
}
```

Added in v1.0.0

# Layers

## layer

**Signature**

```ts
export declare const layer: Layer.Layer<Registry.AtomRegistry, never, never>
```

Added in v1.0.0

## layerOptions

**Signature**

```ts
export declare const layerOptions: (options?: {
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}) => Layer.Layer<AtomRegistry>
```

Added in v1.0.0

# Tags

## AtomRegistry (class)

**Signature**

```ts
export declare class AtomRegistry
```

Added in v1.0.0

# constructors

## make

**Signature**

```ts
export declare const make: (
  options?:
    | {
        readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
        readonly scheduleTask?: ((f: () => void) => void) | undefined
        readonly timeoutResolution?: number | undefined
        readonly defaultIdleTTL?: number | undefined
      }
    | undefined
) => Registry
```

Added in v1.0.0

# guards

## isRegistry

**Signature**

```ts
export declare const isRegistry: (u: unknown) => u is Registry
```

Added in v1.0.0

# models

## Registry (interface)

**Signature**

```ts
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
  readonly subscribe: <A>(
    atom: Atom.Atom<A>,
    f: (_: A) => void,
    options?: {
      readonly immediate?: boolean
    }
  ) => () => void
  readonly reset: () => void
  readonly dispose: () => void
}
```

Added in v1.0.0
