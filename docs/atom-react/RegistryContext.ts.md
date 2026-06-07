---
title: RegistryContext.ts
nav_order: 4
parent: "@effect-atom/atom-react"
grand_parent: "Reference"
---

## RegistryContext overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [context](#context)
  - [RegistryContext](#registrycontext)
  - [RegistryProvider](#registryprovider)
  - [scheduleTask](#scheduletask)

---

# context

## RegistryContext

**Signature**

```ts
export declare const RegistryContext: React.Context<Registry.Registry>
```

Added in v1.0.0

## RegistryProvider

**Signature**

```ts
export declare const RegistryProvider: (options: {
  readonly children?: React.ReactNode | undefined
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined
  readonly scheduleTask?: ((f: () => void) => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}) => React.FunctionComponentElement<React.ProviderProps<Registry.Registry>>
```

Added in v1.0.0

## scheduleTask

**Signature**

```ts
export declare function scheduleTask(f: () => void): void
```

Added in v1.0.0
