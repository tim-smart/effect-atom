---
title: ReactHydration.ts
nav_order: 3
parent: "@effect-atom/atom-react"
grand_parent: "Reference"
---

## ReactHydration overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [components](#components)
  - [HydrationBoundary](#hydrationboundary)
  - [HydrationBoundaryProps (interface)](#hydrationboundaryprops-interface)

---

# components

## HydrationBoundary

**Signature**

```ts
export declare const HydrationBoundary: React.FC<HydrationBoundaryProps>
```

Added in v1.0.0

## HydrationBoundaryProps (interface)

**Signature**

```ts
export interface HydrationBoundaryProps {
  state?: Iterable<Hydration.DehydratedAtom>
  children?: React.ReactNode
}
```

Added in v1.0.0
