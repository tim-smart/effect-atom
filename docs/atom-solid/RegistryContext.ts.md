---
title: RegistryContext.ts
nav_order: 3
parent: "@effect-atom/atom-solid"
---

## RegistryContext overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [context](#context)
  - [RegistryContext](#registrycontext)
  - [RegistryProvider](#registryprovider)

---

# context

## RegistryContext

**Signature**

```ts
export declare const RegistryContext: Context<Registry.Registry>
```

Added in v1.0.0

## RegistryProvider

**Signature**

```ts
export declare const RegistryProvider: (options: {
  readonly children?: JSX.Element | undefined
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}) => any
```

Added in v1.0.0
