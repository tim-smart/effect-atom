---
title: ScopedAtom.ts
nav_order: 5
parent: "@effect-atom/atom-react"
---

## ScopedAtom overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Type IDs](#type-ids)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [ScopedAtom (interface)](#scopedatom-interface)

---

# Type IDs

## TypeId

**Signature**

```ts
export declare const TypeId: "~@effect-atom/atom-react/ScopedAtom"
```

Added in v1.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = "~@effect-atom/atom-react/ScopedAtom"
```

Added in v1.0.0

# constructors

## make

**Signature**

```ts
export declare const make: <A extends Atom.Atom<any>, Input = never>(
  f: (() => A) | ((input: Input) => A)
) => ScopedAtom<A, Input>
```

Added in v1.0.0

# models

## ScopedAtom (interface)

**Signature**

```ts
export interface ScopedAtom<A extends Atom.Atom<any>, Input = never> {
  readonly [TypeId]: TypeId
  use(): A
  Provider: Input extends never
    ? React.FC<{ readonly children?: React.ReactNode | undefined }>
    : React.FC<{ readonly children?: React.ReactNode | undefined; readonly value: Input }>
  Context: React.Context<A>
}
```

Added in v1.0.0
