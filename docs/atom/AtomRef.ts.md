---
title: AtomRef.ts
nav_order: 3
parent: "@effect-atom/atom"
---

## AtomRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [collection](#collection)
  - [make](#make)
- [models](#models)
  - [AtomRef (interface)](#atomref-interface)
  - [Collection (interface)](#collection-interface)
  - [ReadonlyRef (interface)](#readonlyref-interface)

---

# constructors

## collection

**Signature**

```ts
export declare const collection: <A>(items: Iterable<A>) => Collection<A>
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: <A>(value: A) => AtomRef<A>
```

Added in v1.0.0

# models

## AtomRef (interface)

**Signature**

```ts
export interface AtomRef<A> extends ReadonlyRef<A> {
  readonly prop: <K extends keyof A>(prop: K) => AtomRef<A[K]>
  readonly set: (value: A) => AtomRef<A>
  readonly update: (f: (value: A) => A) => AtomRef<A>
}
```

Added in v1.0.0

## Collection (interface)

**Signature**

```ts
export interface Collection<A> extends ReadonlyRef<ReadonlyArray<AtomRef<A>>> {
  readonly push: (item: A) => Collection<A>
  readonly insertAt: (index: number, item: A) => Collection<A>
  readonly remove: (ref: AtomRef<A>) => Collection<A>
  readonly toArray: () => Array<A>
}
```

Added in v1.0.0

## ReadonlyRef (interface)

**Signature**

```ts
export interface ReadonlyRef<A> extends Equal.Equal {
  readonly [TypeId]: TypeId
  readonly key: string
  readonly value: A
  readonly subscribe: (f: (a: A) => void) => () => void
  readonly map: <B>(f: (a: A) => B) => ReadonlyRef<B>
}
```

Added in v1.0.0
