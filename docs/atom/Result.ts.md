---
title: Result.ts
nav_order: 8
parent: "@effect-atom/atom"
---

## Result overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Builder](#builder)
  - [Builder (type alias)](#builder-type-alias)
  - [builder](#builder-1)
- [Guards](#guards)
  - [isResult](#isresult)
- [Schemas](#schemas)
  - [Encoded (type alias)](#encoded-type-alias)
  - [PartialEncoded (type alias)](#partialencoded-type-alias)
  - [Schema](#schema)
  - [Schema (interface)](#schema-interface)
  - [schemaFromSelf](#schemafromself)
- [accessors](#accessors)
  - [cause](#cause)
  - [error](#error)
  - [getOrElse](#getorelse)
  - [getOrThrow](#getorthrow)
  - [value](#value)
- [combinators](#combinators)
  - [all](#all)
  - [flatMap](#flatmap)
  - [map](#map)
  - [match](#match)
  - [matchWithError](#matchwitherror)
  - [matchWithWaiting](#matchwithwaiting)
  - [toExit](#toexit)
  - [touch](#touch)
- [constructors](#constructors)
  - [fail](#fail)
  - [failWithPrevious](#failwithprevious)
  - [failure](#failure)
  - [failureWithPrevious](#failurewithprevious)
  - [fromExit](#fromexit)
  - [fromExitWithPrevious](#fromexitwithprevious)
  - [initial](#initial)
  - [replacePrevious](#replaceprevious)
  - [success](#success)
  - [waiting](#waiting)
  - [waitingFrom](#waitingfrom)
- [models](#models)
  - [Failure (interface)](#failure-interface)
  - [Initial (interface)](#initial-interface)
  - [Result (type alias)](#result-type-alias)
  - [Result (namespace)](#result-namespace)
    - [Proto (interface)](#proto-interface)
    - [Failure (type alias)](#failure-type-alias)
    - [Success (type alias)](#success-type-alias)
  - [Success (interface)](#success-interface)
- [refinements](#refinements)
  - [isFailure](#isfailure)
  - [isInitial](#isinitial)
  - [isInterrupted](#isinterrupted)
  - [isNotInitial](#isnotinitial)
  - [isSuccess](#issuccess)
  - [isWaiting](#iswaiting)
- [utils](#utils)
  - [With (type alias)](#with-type-alias)

---

# Builder

## Builder (type alias)

**Signature**

```ts
export type Builder<Out, A, E, I> = Pipeable & {
  onWaiting<B>(f: (result: Result<A, E>) => B): Builder<Out | B, A, E, I>
  onDefect<B>(f: (defect: unknown, result: Failure<A, E>) => B): Builder<Out | B, A, E, I>
  orElse<B>(orElse: LazyArg<B>): Out | B
  orNull(): Out | null
  render(): [A | I] extends [never] ? Out : Out | null
} & ([I] extends [never]
    ? {}
    : {
        onInitial<B>(f: (result: Initial<A, E>) => B): Builder<Out | B, A, E, never>
        onInitialOrWaiting<B>(f: (result: Result<A, E>) => B): Builder<Out | B, A, E, never>
      }) &
  ([A] extends [never]
    ? {}
    : {
        onSuccess<B>(f: (value: A, result: Success<A, E>) => B): Builder<Out | B, never, E, I>
      }) &
  ([E] extends [never]
    ? {}
    : {
        onFailure<B>(f: (cause: Cause.Cause<E>, result: Failure<A, E>) => B): Builder<Out | B, A, never, I>

        onError<B>(f: (error: E, result: Failure<A, E>) => B): Builder<Out | B, A, never, I>

        onErrorIf<B extends E, C>(
          refinement: Refinement<E, B>,
          f: (error: B, result: Failure<A, E>) => C
        ): Builder<Out | C, A, Types.EqualsWith<E, B, E, Exclude<E, B>>, I>
        onErrorIf<C>(predicate: Predicate<E>, f: (error: E, result: Failure<A, E>) => C): Builder<Out | C, A, E, I>

        onErrorTag<const Tags extends ReadonlyArray<Types.Tags<E>>, B>(
          tags: Tags,
          f: (error: Types.ExtractTag<E, Tags[number]>, result: Failure<A, E>) => B
        ): Builder<Out | B, A, Types.ExcludeTag<E, Tags[number]>, I>
        onErrorTag<const Tag extends Types.Tags<E>, B>(
          tag: Tag,
          f: (error: Types.ExtractTag<E, Tag>, result: Failure<A, E>) => B
        ): Builder<Out | B, A, Types.ExcludeTag<E, Tag>, I>
      })
```

Added in v1.0.0

## builder

**Signature**

```ts
export declare const builder: <A extends Result<any, any>>(
  self: A
) => Builder<
  never,
  A extends Success<infer _A, infer _E> ? _A : never,
  A extends Failure<infer _A, infer _E> ? _E : never,
  A extends Initial<infer _A, infer _E> ? true : never
>
```

Added in v1.0.0

# Guards

## isResult

**Signature**

```ts
export declare const isResult: (u: unknown) => u is Result<unknown, unknown>
```

Added in v1.0.0

# Schemas

## Encoded (type alias)

**Signature**

```ts
export type Encoded<A, E> =
  | {
      readonly _tag: "Initial"
      readonly waiting: boolean
    }
  | {
      readonly _tag: "Success"
      readonly waiting: boolean
      readonly timestamp: number
      readonly value: A
    }
  | {
      readonly _tag: "Failure"
      readonly waiting: boolean
      readonly previousValue: Schema_.OptionEncoded<A>
      readonly cause: Schema_.CauseEncoded<E, unknown>
    }
```

Added in v1.0.0

## PartialEncoded (type alias)

**Signature**

```ts
export type PartialEncoded<A, E> =
  | {
      readonly _tag: "Initial"
      readonly waiting: boolean
    }
  | {
      readonly _tag: "Success"
      readonly waiting: boolean
      readonly timestamp: number
      readonly value: A
    }
  | {
      readonly _tag: "Failure"
      readonly waiting: boolean
      readonly previousValue: Option.Option<A>
      readonly cause: Cause.Cause<E>
    }
```

Added in v1.0.0

## Schema

**Signature**

```ts
export declare const Schema: <
  Success extends Schema_.Schema.All = typeof Schema_.Never,
  Error extends Schema_.Schema.All = typeof Schema_.Never
>(options: {
  readonly success?: Success | undefined
  readonly error?: Error | undefined
}) => Schema<Success, Error>
```

Added in v1.0.0

## Schema (interface)

**Signature**

```ts
export interface Schema<Success extends Schema_.Schema.All, Error extends Schema_.Schema.All> extends Schema_.Schema<
  Result<Success["Type"], Error["Type"]>,
  Encoded<Success["Encoded"], Error["Encoded"]>,
  Success["Context"] | Error["Context"]
> {}
```

Added in v1.0.0

## schemaFromSelf

**Signature**

```ts
export declare const schemaFromSelf: Schema_.Schema<Result<any, any>, Result<any, any>, never>
```

Added in v1.0.0

# accessors

## cause

**Signature**

```ts
export declare const cause: <A, E>(self: Result<A, E>) => Option.Option<Cause.Cause<E>>
```

Added in v1.0.0

## error

**Signature**

```ts
export declare const error: <A, E>(self: Result<A, E>) => Option.Option<E>
```

Added in v1.0.0

## getOrElse

**Signature**

```ts
export declare const getOrElse: {
  <B>(orElse: LazyArg<B>): <A, E>(self: Result<A, E>) => A | B
  <A, E, B>(self: Result<A, E>, orElse: LazyArg<B>): A | B
}
```

Added in v1.0.0

## getOrThrow

**Signature**

```ts
export declare const getOrThrow: <A, E>(self: Result<A, E>) => A
```

Added in v1.0.0

## value

**Signature**

```ts
export declare const value: <A, E>(self: Result<A, E>) => Option.Option<A>
```

Added in v1.0.0

# combinators

## all

Combines multiple results into a single result. Also works with non-result
values.

**Signature**

```ts
export declare const all: <const Arg extends Iterable<any> | Record<string, any>>(
  results: Arg
) => Result<
  [Arg] extends [ReadonlyArray<any>]
    ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Result<infer _A, infer _E>] ? _A : Arg[K] }
    : [Arg] extends [Iterable<infer _A>]
      ? _A extends Result<infer _AA, infer _E>
        ? _AA
        : _A
      : [Arg] extends [Record<string, any>]
        ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Result<infer _A, infer _E>] ? _A : Arg[K] }
        : never,
  [Arg] extends [ReadonlyArray<any>]
    ? Result.Failure<Arg[number]>
    : [Arg] extends [Iterable<infer _A>]
      ? Result.Failure<_A>
      : [Arg] extends [Record<string, any>]
        ? Result.Failure<Arg[keyof Arg]>
        : never
>
```

Added in v1.0.0

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <A, E, B, E2>(f: (a: A, prev: Success<A, E>) => Result<A, E2>): (self: Result<A, E>) => Result<B, E | E2>
  <E, A, B, E2>(self: Result<A, E>, f: (a: A, prev: Success<A, E>) => Result<B, E2>): Result<B, E | E2>
}
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <E>(self: Result<A, E>) => Result<B, E>
  <E, A, B>(self: Result<A, E>, f: (a: A) => B): Result<B, E>
}
```

Added in v1.0.0

## match

**Signature**

```ts
export declare const match: {
  <A, E, X, Y, Z>(options: {
    readonly onInitial: (_: Initial<A, E>) => X
    readonly onFailure: (_: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => X | Y | Z
  <A, E, X, Y, Z>(
    self: Result<A, E>,
    options: {
      readonly onInitial: (_: Initial<A, E>) => X
      readonly onFailure: (_: Failure<A, E>) => Y
      readonly onSuccess: (_: Success<A, E>) => Z
    }
  ): X | Y | Z
}
```

Added in v1.0.0

## matchWithError

**Signature**

```ts
export declare const matchWithError: {
  <A, E, W, X, Y, Z>(options: {
    readonly onInitial: (_: Initial<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => W | X | Y | Z
  <A, E, W, X, Y, Z>(
    self: Result<A, E>,
    options: {
      readonly onInitial: (_: Initial<A, E>) => W
      readonly onError: (error: E, _: Failure<A, E>) => X
      readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
      readonly onSuccess: (_: Success<A, E>) => Z
    }
  ): W | X | Y | Z
}
```

Added in v1.0.0

## matchWithWaiting

**Signature**

```ts
export declare const matchWithWaiting: {
  <A, E, W, X, Y, Z>(options: {
    readonly onWaiting: (_: Result<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => W | X | Y | Z
  <A, E, W, X, Y, Z>(
    self: Result<A, E>,
    options: {
      readonly onWaiting: (_: Result<A, E>) => W
      readonly onError: (error: E, _: Failure<A, E>) => X
      readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
      readonly onSuccess: (_: Success<A, E>) => Z
    }
  ): W | X | Y | Z
}
```

Added in v1.0.0

## toExit

**Signature**

```ts
export declare const toExit: <A, E>(self: Result<A, E>) => Exit.Exit<A, E | Cause.NoSuchElementException>
```

Added in v1.0.0

## touch

**Signature**

```ts
export declare const touch: <A extends Result<any, any>>(result: A) => A
```

Added in v1.0.0

# constructors

## fail

**Signature**

```ts
export declare const fail: <E, A = never>(
  error: E,
  options?: {
    readonly previousSuccess?: Option.Option<Success<A, E>> | undefined
    readonly waiting?: boolean | undefined
  }
) => Failure<A, E>
```

Added in v1.0.0

## failWithPrevious

**Signature**

```ts
export declare const failWithPrevious: <A, E>(
  error: E,
  options: { readonly previous: Option.Option<Result<A, E>>; readonly waiting?: boolean | undefined }
) => Failure<A, E>
```

Added in v1.0.0

## failure

**Signature**

```ts
export declare const failure: <A, E = never>(
  cause: Cause.Cause<E>,
  options?: {
    readonly previousSuccess?: Option.Option<Success<A, E>> | undefined
    readonly waiting?: boolean | undefined
  }
) => Failure<A, E>
```

Added in v1.0.0

## failureWithPrevious

**Signature**

```ts
export declare const failureWithPrevious: <A, E>(
  cause: Cause.Cause<E>,
  options: { readonly previous: Option.Option<Result<A, E>>; readonly waiting?: boolean | undefined }
) => Failure<A, E>
```

Added in v1.0.0

## fromExit

**Signature**

```ts
export declare const fromExit: <A, E>(exit: Exit.Exit<A, E>) => Success<A, E> | Failure<A, E>
```

Added in v1.0.0

## fromExitWithPrevious

**Signature**

```ts
export declare const fromExitWithPrevious: <A, E>(
  exit: Exit.Exit<A, E>,
  previous: Option.Option<Result<A, E>>
) => Success<A, E> | Failure<A, E>
```

Added in v1.0.0

## initial

**Signature**

```ts
export declare const initial: <A = never, E = never>(waiting?: boolean) => Initial<A, E>
```

Added in v1.0.0

## replacePrevious

**Signature**

```ts
export declare const replacePrevious: <R extends Result<any, any>, XE, A>(
  self: R,
  previous: Option.Option<Result<A, XE>>
) => With<R, A, Result.Failure<R>>
```

Added in v1.0.0

## success

**Signature**

```ts
export declare const success: <A, E = never>(
  value: A,
  options?: { readonly waiting?: boolean | undefined; readonly timestamp?: number | undefined }
) => Success<A, E>
```

Added in v1.0.0

## waiting

**Signature**

```ts
export declare const waiting: <R extends Result<any, any>>(
  self: R,
  options?: { readonly touch?: boolean | undefined }
) => R
```

Added in v1.0.0

## waitingFrom

**Signature**

```ts
export declare const waitingFrom: <A, E>(previous: Option.Option<Result<A, E>>) => Result<A, E>
```

Added in v1.0.0

# models

## Failure (interface)

**Signature**

```ts
export interface Failure<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Failure"
  readonly cause: Cause.Cause<E>
  readonly previousSuccess: Option.Option<Success<A, E>>
}
```

Added in v1.0.0

## Initial (interface)

**Signature**

```ts
export interface Initial<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Initial"
}
```

Added in v1.0.0

## Result (type alias)

**Signature**

```ts
export type Result<A, E = never> = Initial<A, E> | Success<A, E> | Failure<A, E>
```

Added in v1.0.0

## Result (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto<A, E> extends Pipeable {
  readonly [TypeId]: {
    readonly E: (_: never) => E
    readonly A: (_: never) => A
  }
  readonly waiting: boolean
}
```

Added in v1.0.0

### Failure (type alias)

**Signature**

```ts
export type Failure<R> = R extends Result<infer _, infer E> ? E : never
```

Added in v1.0.0

### Success (type alias)

**Signature**

```ts
export type Success<R> = R extends Result<infer A, infer _> ? A : never
```

Added in v1.0.0

## Success (interface)

**Signature**

```ts
export interface Success<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Success"
  readonly value: A
  readonly timestamp: number
}
```

Added in v1.0.0

# refinements

## isFailure

**Signature**

```ts
export declare const isFailure: <A, E>(result: Result<A, E>) => result is Failure<A, E>
```

Added in v1.0.0

## isInitial

**Signature**

```ts
export declare const isInitial: <A, E>(result: Result<A, E>) => result is Initial<A, E>
```

Added in v1.0.0

## isInterrupted

**Signature**

```ts
export declare const isInterrupted: <A, E>(result: Result<A, E>) => result is Failure<A, E>
```

Added in v1.0.0

## isNotInitial

**Signature**

```ts
export declare const isNotInitial: <A, E>(result: Result<A, E>) => result is Success<A, E> | Failure<A, E>
```

Added in v1.0.0

## isSuccess

**Signature**

```ts
export declare const isSuccess: <A, E>(result: Result<A, E>) => result is Success<A, E>
```

Added in v1.0.0

## isWaiting

**Signature**

```ts
export declare const isWaiting: <A, E>(result: Result<A, E>) => boolean
```

Added in v1.0.0

# utils

## With (type alias)

**Signature**

```ts
export type With<R extends Result<any, any>, A, E> =
  R extends Initial<infer _A, infer _E>
    ? Initial<A, E>
    : R extends Success<infer _A, infer _E>
      ? Success<A, E>
      : R extends Failure<infer _A, infer _E>
        ? Failure<A, E>
        : never
```

Added in v1.0.0
