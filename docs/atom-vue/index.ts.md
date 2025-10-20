---
title: index.ts
nav_order: 1
parent: "@effect-atom/atom-vue"
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [composables](#composables)
  - [useAtom](#useatom)
  - [useAtomRef](#useatomref)
  - [useAtomSet](#useatomset)
  - [useAtomValue](#useatomvalue)
- [modules](#modules)
  - [From "@effect-atom/atom/Atom"](#from-effect-atomatomatom)
  - [From "@effect-atom/atom/AtomRef"](#from-effect-atomatomatomref)
  - [From "@effect-atom/atom/AtomRpc"](#from-effect-atomatomatomrpc)
  - [From "@effect-atom/atom/Registry"](#from-effect-atomatomregistry)
  - [From "@effect-atom/atom/Result"](#from-effect-atomatomresult)
- [re-exports](#re-exports)
  - [From "@effect-atom/atom/AtomHttpApi"](#from-effect-atomatomatomhttpapi)
- [registry](#registry)
  - [defaultRegistry](#defaultregistry)
  - [injectRegistry](#injectregistry)
  - [registryKey](#registrykey)

---

# composables

## useAtom

**Signature**

```ts
export declare const useAtom: <R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: () => Atom.Writable<R, W>,
  options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
) => readonly [
  Readonly<Ref<R>>,
  write: "promise" extends Mode
    ? (value: W) => Promise<Result.Result.Success<R>>
    : "promiseExit" extends Mode
      ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
      : (value: W | ((value: R) => W)) => void
]
```

Added in v1.0.0

## useAtomRef

**Signature**

```ts
export declare const useAtomRef: <A>(atomRef: () => AtomRef.ReadonlyRef<A>) => Readonly<Ref<A>>
```

Added in v1.0.0

## useAtomSet

**Signature**

```ts
export declare const useAtomSet: <R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: () => Atom.Writable<R, W>,
  options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
) => "promise" extends Mode
  ? (value: W, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<Result.Result.Success<R>>
  : "promiseExit" extends Mode
    ? (
        value: W,
        options?: { readonly signal?: AbortSignal | undefined } | undefined
      ) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    : (value: W | ((value: R) => W)) => void
```

Added in v1.0.0

## useAtomValue

**Signature**

```ts
export declare const useAtomValue: <A>(atom: () => Atom.Atom<A>) => Readonly<Ref<A>>
```

Added in v1.0.0

# modules

## From "@effect-atom/atom/Atom"

Re-exports all named exports from the "@effect-atom/atom/Atom" module as `Atom`.

**Signature**

```ts
export * as Atom from "@effect-atom/atom/Atom"
```

Added in v1.0.0

## From "@effect-atom/atom/AtomRef"

Re-exports all named exports from the "@effect-atom/atom/AtomRef" module as `AtomRef`.

**Signature**

```ts
export * as AtomRef from "@effect-atom/atom/AtomRef"
```

Added in v1.0.0

## From "@effect-atom/atom/AtomRpc"

Re-exports all named exports from the "@effect-atom/atom/AtomRpc" module as `AtomRpc`.

**Signature**

```ts
export * as AtomRpc from "@effect-atom/atom/AtomRpc"
```

Added in v1.0.0

## From "@effect-atom/atom/Registry"

Re-exports all named exports from the "@effect-atom/atom/Registry" module as `Registry`.

**Signature**

```ts
export * as Registry from "@effect-atom/atom/Registry"
```

Added in v1.0.0

## From "@effect-atom/atom/Result"

Re-exports all named exports from the "@effect-atom/atom/Result" module as `Result`.

**Signature**

```ts
export * as Result from "@effect-atom/atom/Result"
```

Added in v1.0.0

# re-exports

## From "@effect-atom/atom/AtomHttpApi"

Re-exports all named exports from the "@effect-atom/atom/AtomHttpApi" module as `AtomHttpApi`.

**Signature**

```ts
export * as AtomHttpApi from "@effect-atom/atom/AtomHttpApi"
```

Added in v1.0.0

# registry

## defaultRegistry

**Signature**

```ts
export declare const defaultRegistry: Registry.Registry
```

Added in v1.0.0

## injectRegistry

**Signature**

```ts
export declare const injectRegistry: () => Registry.Registry
```

Added in v1.0.0

## registryKey

**Signature**

```ts
export declare const registryKey: InjectionKey<Registry.Registry>
```

Added in v1.0.0
