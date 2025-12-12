---
title: Hydration.ts
nav_order: 5
parent: "@effect-atom/atom"
---

## Hydration overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [dehydration](#dehydration)
  - [dehydrate](#dehydrate)
  - [toValues](#tovalues)
- [hydration](#hydration)
  - [hydrate](#hydrate)
- [models](#models)
  - [DehydratedAtom (interface)](#dehydratedatom-interface)
  - [DehydratedAtomValue (interface)](#dehydratedatomvalue-interface)

---

# dehydration

## dehydrate

**Signature**

```ts
export declare const dehydrate: (
  registry: Registry.Registry,
  options?: { readonly encodeInitialAs?: "ignore" | "promise" | "value-only" | undefined }
) => Array<DehydratedAtom>
```

Added in v1.0.0

## toValues

**Signature**

```ts
export declare const toValues: (state: ReadonlyArray<DehydratedAtom>) => Array<DehydratedAtomValue>
```

Added in v1.0.0

# hydration

## hydrate

**Signature**

```ts
export declare const hydrate: (registry: Registry.Registry, dehydratedState: Iterable<DehydratedAtom>) => void
```

Added in v1.0.0

# models

## DehydratedAtom (interface)

**Signature**

```ts
export interface DehydratedAtom {
  readonly "~@effect-atom/atom/DehydratedAtom": true
}
```

Added in v1.0.0

## DehydratedAtomValue (interface)

**Signature**

```ts
export interface DehydratedAtomValue extends DehydratedAtom {
  readonly key: string
  readonly value: unknown
  readonly dehydratedAt: number
  readonly resultPromise?: Promise<unknown> | undefined
}
```

Added in v1.0.0
