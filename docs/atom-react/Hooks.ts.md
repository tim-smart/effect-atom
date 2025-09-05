---
title: Hooks.ts
nav_order: 1
parent: "@effect-atom/atom-react"
---

## Hooks overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [hooks](#hooks)
  - [useAtom](#useatom)
  - [useAtomInitialValues](#useatominitialvalues)
  - [useAtomMount](#useatommount)
  - [useAtomRef](#useatomref)
  - [useAtomRefProp](#useatomrefprop)
  - [useAtomRefPropValue](#useatomrefpropvalue)
  - [useAtomRefresh](#useatomrefresh)
  - [useAtomSet](#useatomset)
  - [useAtomSubscribe](#useatomsubscribe)
  - [useAtomSuspense](#useatomsuspense)
  - [useAtomValue](#useatomvalue)

---

# hooks

## useAtom

**Signature**

```ts
export declare const useAtom: {
  <Arg, A, E, const Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.AtomResultFn<Arg, A, E>,
    options?: { readonly mode?: Mode | undefined }
  ): readonly [
    value: Result.Result<A, E>,
    write: "promise" extends Mode
      ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<A>
      : "promiseExit" extends Mode
        ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<Exit.Exit<A, E>>
        : (value: Arg | ((value: Result.Result<A, E>) => Arg)) => void
  ]
  <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.Writable<R, W>,
    options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
  ): readonly [
    value: R,
    write: "promise" extends Mode
      ? (value: W) => Promise<Result.Result.Success<R>>
      : "promiseExit" extends Mode
        ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
        : (value: W | ((value: R) => W)) => void
  ]
}
```

Added in v1.0.0

## useAtomInitialValues

**Signature**

```ts
export declare const useAtomInitialValues: (initialValues: Iterable<readonly [Atom.Atom<any>, any]>) => void
```

Added in v1.0.0

## useAtomMount

**Signature**

```ts
export declare const useAtomMount: <A>(atom: Atom.Atom<A>) => void
```

Added in v1.0.0

## useAtomRef

**Signature**

```ts
export declare const useAtomRef: <A>(ref: AtomRef.ReadonlyRef<A>) => A
```

Added in v1.0.0

## useAtomRefProp

**Signature**

```ts
export declare const useAtomRefProp: <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K) => AtomRef.AtomRef<A[K]>
```

Added in v1.0.0

## useAtomRefPropValue

**Signature**

```ts
export declare const useAtomRefPropValue: <A, K extends keyof A>(ref: AtomRef.AtomRef<A>, prop: K) => A[K]
```

Added in v1.0.0

## useAtomRefresh

**Signature**

```ts
export declare const useAtomRefresh: <A>(atom: Atom.Atom<A>) => () => void
```

Added in v1.0.0

## useAtomSet

**Signature**

```ts
export declare const useAtomSet: {
  <Arg, A, E, Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.AtomResultFn<Arg, A, E>,
    options?: { readonly mode?: Mode | undefined }
  ): "promise" extends Mode
    ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<A>
    : "promiseExit" extends Mode
      ? (value: Arg, options?: { readonly signal?: AbortSignal | undefined } | undefined) => Promise<Exit.Exit<A, E>>
      : (value: Arg | ((value: Result.Result<A, E>) => Arg)) => void
  <R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
    atom: Atom.Writable<R, W>,
    options?: { readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : "value") | undefined }
  ): "promise" extends Mode
    ? (value: W) => Promise<Result.Result.Success<R>>
    : "promiseExit" extends Mode
      ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
      : (value: W | ((value: R) => W)) => void
}
```

Added in v1.0.0

## useAtomSubscribe

**Signature**

```ts
export declare const useAtomSubscribe: <A>(
  atom: Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
) => void
```

Added in v1.0.0

## useAtomSuspense

**Signature**

```ts
export declare const useAtomSuspense: <A, E, const IncludeFailure extends boolean = false>(
  atom: Atom.Atom<Result.Result<A, E>>,
  options?: { readonly suspendOnWaiting?: boolean | undefined; readonly includeFailure?: IncludeFailure | undefined }
) => Result.Success<A, E> | (IncludeFailure extends true ? Result.Failure<A, E> : never)
```

Added in v1.0.0

## useAtomValue

**Signature**

```ts
export declare const useAtomValue: { <A>(atom: Atom.Atom<A>): A; <A, B>(atom: Atom.Atom<A>, f: (_: A) => B): B }
```

Added in v1.0.0
