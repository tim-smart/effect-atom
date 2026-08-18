/**
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as Cause from "effect/Cause"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import { constTrue, dual, identity } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { Predicate, Refinement } from "effect/Predicate"
import { hasProperty, isIterable } from "effect/Predicate"
import * as Schema_ from "effect/Schema"
import type * as Types from "effect/Types"

type TypeId = "~effect-atom/atom/Result"
const TypeId: TypeId = "~effect-atom/atom/Result"

/**
 * @since 1.0.0
 * @category models
 */
export type Result<A, E = never> = Initial<A, E> | Success<A, E> | Failure<A, E>

/**
 * @since 1.0.0
 * @category Guards
 */
export const isResult = (u: unknown): u is Result<unknown, unknown> => hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Result {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<A, E> extends Pipeable {
    readonly [TypeId]: {
      readonly E: (_: never) => E
      readonly A: (_: never) => A
    }
    readonly waiting: boolean
  }

  /**
   * @since 1.0.0
   */
  export type Success<R> = R extends Result<infer A, infer _> ? A : never

  /**
   * @since 1.0.0
   */
  export type Failure<R> = R extends Result<infer _, infer E> ? E : never
}

/**
 * @since 1.0.0
 */
export type With<R extends Result<any, any>, A, E> = R extends Initial<infer _A, infer _E> ? Initial<A, E>
  : R extends Success<infer _A, infer _E> ? Success<A, E>
  : R extends Failure<infer _A, infer _E> ? Failure<A, E>
  : never

const ResultProto = {
  [TypeId]: {
    E: identity,
    A: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Equal.symbol](this: Result<any, any>, that: Result<any, any>): boolean {
    if (this._tag !== that._tag || this.waiting !== that.waiting) {
      return false
    }
    switch (this._tag) {
      case "Initial":
        return true
      case "Success":
        return Equal.equals(this.value, (that as Success<any, any>).value)
      case "Failure":
        return Equal.equals(this.cause, (that as Failure<any, any>).cause)
    }
  },
  [Hash.symbol](this: Result<any, any>): number {
    const tagHash = Hash.string(`${this._tag}:${this.waiting}`)
    if (this._tag === "Initial") {
      return Hash.cached(this, tagHash)
    }
    return Hash.cached(
      this,
      Hash.combine(tagHash)(this._tag === "Success" ? Hash.hash(this.value) : Hash.hash(this.cause))
    )
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isWaiting = <A, E>(result: Result<A, E>): boolean => result.waiting

/**
 * @since 1.0.0
 * @category models
 */
export interface Initial<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Initial"
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExit = <A, E>(exit: Exit.Exit<A, E>): Success<A, E> | Failure<A, E> =>
  exit._tag === "Success" ? success(exit.value) : failure(exit.cause)

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExitWithPrevious = <A, E>(
  exit: Exit.Exit<A, E>,
  previous: Option.Option<Result<A, E>>
): Success<A, E> | Failure<A, E> =>
  exit._tag === "Success" ? success(exit.value) : failureWithPrevious(exit.cause, { previous })

/**
 * @since 1.0.0
 * @category constructors
 */
export const waitingFrom = <A, E>(previous: Option.Option<Result<A, E>>): Result<A, E> => {
  if (previous._tag === "None") {
    return initial<A, E>(true)
  }
  return waiting(previous.value)
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInitial = <A, E>(result: Result<A, E>): result is Initial<A, E> => result._tag === "Initial"

/**
 * @since 1.0.0
 * @category refinements
 */
export const isNotInitial = <A, E>(result: Result<A, E>): result is Success<A, E> | Failure<A, E> =>
  result._tag !== "Initial"

/**
 * @since 1.0.0
 * @category constructors
 */
export const initial = <A = never, E = never>(waiting = false): Initial<A, E> => {
  const result = Object.create(ResultProto)
  result._tag = "Initial"
  result.waiting = waiting
  return result
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Success<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Success"
  readonly value: A
  readonly timestamp: number
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSuccess = <A, E>(result: Result<A, E>): result is Success<A, E> => result._tag === "Success"

/**
 * @since 1.0.0
 * @category constructors
 */
export const success = <A, E = never>(value: A, options?: {
  readonly waiting?: boolean | undefined
  readonly timestamp?: number | undefined
}): Success<A, E> => {
  const result = Object.create(ResultProto)
  result._tag = "Success"
  result.value = value
  result.waiting = options?.waiting ?? false
  result.timestamp = options?.timestamp ?? Date.now()
  return result
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Failure<A, E = never> extends Result.Proto<A, E> {
  readonly _tag: "Failure"
  readonly cause: Cause.Cause<E>
  readonly previousSuccess: Option.Option<Success<A, E>>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFailure = <A, E>(result: Result<A, E>): result is Failure<A, E> => result._tag === "Failure"

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInterrupted = <A, E>(result: Result<A, E>): result is Failure<A, E> =>
  result._tag === "Failure" && Cause.isInterruptedOnly(result.cause)

/**
 * @since 1.0.0
 * @category constructors
 */
export const failure = <A, E = never>(
  cause: Cause.Cause<E>,
  options?: {
    readonly previousSuccess?: Option.Option<Success<A, E>> | undefined
    readonly waiting?: boolean | undefined
  }
): Failure<A, E> => {
  const result = Object.create(ResultProto)
  result._tag = "Failure"
  result.cause = cause
  result.previousSuccess = options?.previousSuccess ?? Option.none()
  result.waiting = options?.waiting ?? false
  return result
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const failureWithPrevious = <A, E>(
  cause: Cause.Cause<E>,
  options: {
    readonly previous: Option.Option<Result<A, E>>
    readonly waiting?: boolean | undefined
  }
): Failure<A, E> =>
  failure(cause, {
    previousSuccess: Option.flatMap(options.previous, (result) =>
      isSuccess(result)
        ? Option.some(result)
        : isFailure(result)
        ? result.previousSuccess
        : Option.none()),
    waiting: options.waiting
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const fail = <E, A = never>(error: E, options?: {
  readonly previousSuccess?: Option.Option<Success<A, E>> | undefined
  readonly waiting?: boolean | undefined
}): Failure<A, E> => failure(Cause.fail(error), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const failWithPrevious = <A, E>(
  error: E,
  options: {
    readonly previous: Option.Option<Result<A, E>>
    readonly waiting?: boolean | undefined
  }
): Failure<A, E> => failureWithPrevious(Cause.fail(error), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const waiting = <R extends Result<any, any>>(self: R, options?: {
  readonly touch?: boolean | undefined
}): R => {
  if (self.waiting) {
    return options?.touch ? touch(self) : self
  }
  const result = Object.assign(Object.create(ResultProto), self)
  result.waiting = true
  if (options?.touch && isSuccess(result)) {
    ;(result as any).timestamp = Date.now()
  }
  return result
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const touch = <A extends Result<any, any>>(result: A): A => {
  if (isSuccess(result)) {
    return success(result.value, { waiting: result.waiting }) as A
  }
  return result
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const replacePrevious = <R extends Result<any, any>, XE, A>(
  self: R,
  previous: Option.Option<Result<A, XE>>
): With<R, A, Result.Failure<R>> => {
  if (self._tag === "Failure") {
    return failureWithPrevious(self.cause, { previous, waiting: self.waiting }) as any
  }
  return self as any
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const value = <A, E>(self: Result<A, E>): Option.Option<A> => {
  if (self._tag === "Success") {
    return Option.some(self.value)
  } else if (self._tag === "Failure") {
    return Option.map(self.previousSuccess, (s) => s.value)
  }
  return Option.none()
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const getOrElse: {
  <B>(orElse: LazyArg<B>): <A, E>(self: Result<A, E>) => A | B
  <A, E, B>(self: Result<A, E>, orElse: LazyArg<B>): A | B
} = dual(2, <A, E, B>(self: Result<A, E>, orElse: LazyArg<B>): A | B => Option.getOrElse(value(self), orElse))

/**
 * @since 1.0.0
 * @category accessors
 */
export const getOrThrow = <A, E>(self: Result<A, E>): A =>
  Option.getOrThrowWith(value(self), () => new Cause.NoSuchElementException("Result.getOrThrow: no value found"))

/**
 * @since 1.0.0
 * @category accessors
 */
export const cause = <A, E>(self: Result<A, E>): Option.Option<Cause.Cause<E>> =>
  self._tag === "Failure" ? Option.some(self.cause) : Option.none()

/**
 * @since 1.0.0
 * @category accessors
 */
export const error = <A, E>(self: Result<A, E>): Option.Option<E> =>
  self._tag === "Failure" ? Cause.failureOption(self.cause) : Option.none()

/**
 * @since 1.0.0
 * @category combinators
 */
export const toExit = <A, E>(
  self: Result<A, E>
): Exit.Exit<A, E | Cause.NoSuchElementException> => {
  switch (self._tag) {
    case "Success": {
      return Exit.succeed(self.value)
    }
    case "Failure": {
      return Exit.failCause(self.cause)
    }
    default: {
      return Exit.fail(new Cause.NoSuchElementException())
    }
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <A, B>(f: (a: A) => B): <E>(self: Result<A, E>) => Result<B, E>
  <E, A, B>(self: Result<A, E>, f: (a: A) => B): Result<B, E>
} = dual(2, <E, A, B>(self: Result<A, E>, f: (a: A) => B): Result<B, E> => {
  switch (self._tag) {
    case "Initial":
      return self as any as Result<B, E>
    case "Failure":
      return failure(self.cause, {
        previousSuccess: Option.map(self.previousSuccess, (s) => success(f(s.value), s)),
        waiting: self.waiting
      })
    case "Success":
      return success(f(self.value), self)
  }
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const flatMap: {
  <A, E, B, E2>(f: (a: A, prev: Success<A, E>) => Result<B, E2>): (self: Result<A, E>) => Result<B, E | E2>
  <E, A, B, E2>(self: Result<A, E>, f: (a: A, prev: Success<A, E>) => Result<B, E2>): Result<B, E | E2>
} = dual(2, <E, A, B, E2>(self: Result<A, E>, f: (a: A, prev: Success<A, E>) => Result<B, E2>): Result<B, E | E2> => {
  switch (self._tag) {
    case "Initial":
      return self as any as Result<B, E>
    case "Failure":
      return failure<B, E | E2>(self.cause, {
        previousSuccess: Option.flatMap(self.previousSuccess, (s) => {
          const next = f(s.value, s)
          return isSuccess(next) ? Option.some(next) : Option.none()
        }),
        waiting: self.waiting
      })
    case "Success":
      return f(self.value, self)
  }
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const match: {
  <A, E, X, Y, Z>(options: {
    readonly onInitial: (_: Initial<A, E>) => X
    readonly onFailure: (_: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => X | Y | Z
  <A, E, X, Y, Z>(self: Result<A, E>, options: {
    readonly onInitial: (_: Initial<A, E>) => X
    readonly onFailure: (_: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): X | Y | Z
} = dual(2, <A, E, X, Y, Z>(self: Result<A, E>, options: {
  readonly onInitial: (_: Initial<A, E>) => X
  readonly onFailure: (_: Failure<A, E>) => Y
  readonly onSuccess: (_: Success<A, E>) => Z
}): X | Y | Z => {
  switch (self._tag) {
    case "Initial":
      return options.onInitial(self)
    case "Failure":
      return options.onFailure(self)
    case "Success":
      return options.onSuccess(self)
  }
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const matchWithError: {
  <A, E, W, X, Y, Z>(options: {
    readonly onInitial: (_: Initial<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => W | X | Y | Z
  <A, E, W, X, Y, Z>(self: Result<A, E>, options: {
    readonly onInitial: (_: Initial<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): W | X | Y | Z
} = dual(2, <A, E, W, X, Y, Z>(self: Result<A, E>, options: {
  readonly onInitial: (_: Initial<A, E>) => W
  readonly onError: (error: E, _: Failure<A, E>) => X
  readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
  readonly onSuccess: (_: Success<A, E>) => Z
}): W | X | Y | Z => {
  switch (self._tag) {
    case "Initial":
      return options.onInitial(self)
    case "Failure": {
      const e = Cause.failureOrCause(self.cause)
      if (e._tag === "Right") {
        return options.onDefect(Cause.squash(e.right), self)
      }
      return options.onError(e.left, self)
    }
    case "Success":
      return options.onSuccess(self)
  }
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const matchWithWaiting: {
  <A, E, W, X, Y, Z>(options: {
    readonly onWaiting: (_: Result<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): (self: Result<A, E>) => W | X | Y | Z
  <A, E, W, X, Y, Z>(self: Result<A, E>, options: {
    readonly onWaiting: (_: Result<A, E>) => W
    readonly onError: (error: E, _: Failure<A, E>) => X
    readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
    readonly onSuccess: (_: Success<A, E>) => Z
  }): W | X | Y | Z
} = dual(2, <A, E, W, X, Y, Z>(self: Result<A, E>, options: {
  readonly onWaiting: (_: Result<A, E>) => W
  readonly onError: (error: E, _: Failure<A, E>) => X
  readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y
  readonly onSuccess: (_: Success<A, E>) => Z
}): W | X | Y | Z => {
  if (self.waiting) {
    return options.onWaiting(self)
  }
  switch (self._tag) {
    case "Initial":
      return options.onWaiting(self)
    case "Failure": {
      const e = Cause.failureOrCause(self.cause)
      if (e._tag === "Right") {
        return options.onDefect(Cause.squash(e.right), self)
      }
      return options.onError(e.left, self)
    }
    case "Success":
      return options.onSuccess(self)
  }
})

/**
 * Combines multiple results into a single result. Also works with non-result
 * values.
 *
 * @since 1.0.0
 * @category combinators
 */
export const all = <const Arg extends Iterable<any> | Record<string, any>>(
  results: Arg
): Result<
  [Arg] extends [ReadonlyArray<any>] ? {
      -readonly [K in keyof Arg]: [Arg[K]] extends [Result<infer _A, infer _E>] ? _A : Arg[K]
    }
    : [Arg] extends [Iterable<infer _A>] ? _A extends Result<infer _AA, infer _E> ? _AA : _A
    : [Arg] extends [Record<string, any>] ? {
        -readonly [K in keyof Arg]: [Arg[K]] extends [Result<infer _A, infer _E>] ? _A : Arg[K]
      }
    : never,
  [Arg] extends [ReadonlyArray<any>] ? Result.Failure<Arg[number]>
    : [Arg] extends [Iterable<infer _A>] ? Result.Failure<_A>
    : [Arg] extends [Record<string, any>] ? Result.Failure<Arg[keyof Arg]>
    : never
> => {
  const isIter = isIterable(results)
  const entries = isIter
    ? Array.from(results, (result, i) => [i, result] as const)
    : Object.entries(results)
  const successes: any = isIter ? [] : {}
  let waiting = false
  for (let i = 0; i < entries.length; i++) {
    const [key, result] = entries[i]
    if (!isResult(result)) {
      successes[key] = result
      continue
    } else if (!isSuccess(result)) {
      return result as any
    }
    successes[key] = result.value
    if (result.waiting) {
      waiting = true
    }
  }
  return success(successes, { waiting }) as any
}

/**
 * @since 1.0.0
 * @category Builder
 */
export const builder = <A extends Result<any, any>>(self: A): Builder<
  never,
  A extends Success<infer _A, infer _E> ? _A : never,
  A extends Failure<infer _A, infer _E> ? _E : never,
  A extends Initial<infer _A, infer _E> ? true : never
> => new BuilderImpl(self) as any

/**
 * @since 1.0.0
 * @category Builder
 */
export type Builder<Out, A, E, I> =
  & Pipeable
  & {
    onWaiting<B>(f: (result: Result<A, E>) => B): Builder<Out | B, A, E, I>
    onDefect<B>(f: (defect: unknown, result: Failure<A, E>) => B): Builder<Out | B, A, E, I>
    orElse<B>(orElse: LazyArg<B>): Out | B
    orNull(): Out | null
    render(): [A | I] extends [never] ? Out : Out | null
  }
  & ([I] extends [never] ? {} :
    {
      onInitial<B>(f: (result: Initial<A, E>) => B): Builder<Out | B, A, E, never>
      onInitialOrWaiting<B>(f: (result: Result<A, E>) => B): Builder<Out | B, A, E, never>
    })
  & ([A] extends [never] ? {} :
    {
      onSuccess<B>(f: (value: A, result: Success<A, E>) => B): Builder<Out | B, never, E, I>
    })
  & ([E] extends [never] ? {} : {
    onFailure<B>(f: (cause: Cause.Cause<E>, result: Failure<A, E>) => B): Builder<Out | B, A, never, I>

    onError<B>(f: (error: E, result: Failure<A, E>) => B): Builder<Out | B, A, never, I>

    onErrorIf<B extends E, C>(
      refinement: Refinement<E, B>,
      f: (error: B, result: Failure<A, E>) => C
    ): Builder<Out | C, A, Types.EqualsWith<E, B, E, Exclude<E, B>>, I>
    onErrorIf<C>(
      predicate: Predicate<E>,
      f: (error: E, result: Failure<A, E>) => C
    ): Builder<Out | C, A, E, I>

    onErrorTag<const Tags extends ReadonlyArray<Types.Tags<E>>, B>(
      tags: Tags,
      f: (error: Types.ExtractTag<E, Tags[number]>, result: Failure<A, E>) => B
    ): Builder<Out | B, A, Types.ExcludeTag<E, Tags[number]>, I>
    onErrorTag<const Tag extends Types.Tags<E>, B>(
      tag: Tag,
      f: (error: Types.ExtractTag<E, Tag>, result: Failure<A, E>) => B
    ): Builder<Out | B, A, Types.ExcludeTag<E, Tag>, I>
  })

class BuilderImpl<Out, A, E> {
  constructor(readonly result: Result<A, E>) {}
  public output = Option.none<Out>()

  when<B extends Result<A, E>, C>(
    refinement: Refinement<Result<A, E>, B>,
    f: (result: B) => Option.Option<C>
  ): any
  when<C>(
    refinement: Predicate<Result<A, E>>,
    f: (result: Result<A, E>) => Option.Option<C>
  ): any {
    if (Option.isNone(this.output) && refinement(this.result)) {
      const b = f(this.result)
      if (Option.isSome(b)) {
        ;(this as any).output = b
      }
    }
    return this
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  onWaiting<B>(f: (result: Result<A, E>) => B): BuilderImpl<Out | B, A, E> {
    return this.when((r) => r.waiting, (r) => Option.some(f(r)))
  }

  onInitialOrWaiting<B>(f: (result: Result<A, E>) => B): BuilderImpl<Out | B, A, E> {
    return this.when((r) => isInitial(r) || r.waiting, (r) => Option.some(f(r)))
  }

  onInitial<B>(f: (result: Initial<A, E>) => B): BuilderImpl<Out | B, A, E> {
    return this.when(isInitial, (r) => Option.some(f(r)))
  }

  onSuccess<B>(f: (value: A, result: Success<A, E>) => B): BuilderImpl<Out | B, never, E> {
    return this.when(isSuccess, (r) => Option.some(f(r.value, r)))
  }

  onFailure<B>(f: (cause: Cause.Cause<E>, result: Failure<A, E>) => B): BuilderImpl<Out | B, A, never> {
    return this.when(isFailure, (r) => Option.some(f(r.cause, r)))
  }

  onError<B>(f: (error: E, result: Failure<A, E>) => B): BuilderImpl<Out | B, A, never> {
    return this.onErrorIf(constTrue, f) as any
  }

  onErrorIf<C, B extends E = E>(
    refinement: Refinement<E, B> | Predicate<E>,
    f: (error: B, result: Failure<A, E>) => C
  ): BuilderImpl<Out | C, A, Types.EqualsWith<E, B, E, Exclude<E, B>>> {
    return this.when(isFailure, (result) =>
      Cause.failureOption(result.cause).pipe(
        Option.filter(refinement),
        Option.map((error) => f(error as B, result))
      ))
  }

  onErrorTag<B>(
    tag: string | ReadonlyArray<string>,
    f: (error: Types.ExtractTag<E, any>, result: Failure<A, E>) => B
  ): BuilderImpl<Out | B, A, Types.ExcludeTag<E, any>> {
    return this.onErrorIf(
      (e) => hasProperty(e, "_tag") && (Array.isArray(tag) ? tag.includes(e._tag) : e._tag === tag),
      f
    ) as any
  }

  onDefect<B>(f: (defect: unknown, result: Failure<A, E>) => B): BuilderImpl<Out | B, A, E> {
    return this.when(isFailure, (result) =>
      Cause.dieOption(result.cause).pipe(
        Option.map((defect) => f(defect, result))
      ))
  }

  orElse<B>(orElse: LazyArg<B>): Out | B {
    return Option.getOrElse(this.output, orElse)
  }

  orNull(): Out | null {
    return Option.getOrNull(this.output)
  }

  render(): Out | null {
    if (Option.isSome(this.output)) {
      return this.output.value
    } else if (isFailure(this.result)) {
      throw Cause.squash(this.result.cause)
    }
    return null
  }
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export type PartialEncoded<A, E> = {
  readonly _tag: "Initial"
  readonly waiting: boolean
} | {
  readonly _tag: "Success"
  readonly waiting: boolean
  readonly timestamp: number
  readonly value: A
} | {
  readonly _tag: "Failure"
  readonly waiting: boolean
  readonly previousValue: Option.Option<A>
  readonly cause: Cause.Cause<E>
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export type Encoded<A, E> = {
  readonly _tag: "Initial"
  readonly waiting: boolean
} | {
  readonly _tag: "Success"
  readonly waiting: boolean
  readonly timestamp: number
  readonly value: A
} | {
  readonly _tag: "Failure"
  readonly waiting: boolean
  readonly previousValue: Schema_.OptionEncoded<A>
  readonly cause: Schema_.CauseEncoded<E, unknown>
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaFromSelf: Schema_.Schema<Result<any, any>> = Schema_.declare(isResult, {
  identifier: "Result"
})

/**
 * @since 1.0.0
 * @category Schemas
 */
export interface Schema<
  Success extends Schema_.Schema.All,
  Error extends Schema_.Schema.All
> extends
  Schema_.Schema<
    Result<Success["Type"], Error["Type"]>,
    Encoded<Success["Encoded"], Error["Encoded"]>,
    Success["Context"] | Error["Context"]
  >
{}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const Schema = <
  Success extends Schema_.Schema.All = typeof Schema_.Never,
  Error extends Schema_.Schema.All = typeof Schema_.Never
>(
  options: {
    readonly success?: Success | undefined
    readonly error?: Error | undefined
  }
): Schema<Success, Error> => {
  const success_: Success = options.success ?? Schema_.Never as any
  const error: Error = options.error ?? Schema_.Never as any
  const Success = Schema_.TaggedStruct("Success", {
    waiting: Schema_.Boolean,
    timestamp: Schema_.Number,
    value: success_
  })
  return Schema_.transform(
    Schema_.Union(
      Schema_.TaggedStruct("Initial", {
        waiting: Schema_.Boolean
      }),
      Success,
      Schema_.TaggedStruct("Failure", {
        waiting: Schema_.Boolean,
        previousSuccess: Schema_.Option(Success as any),
        cause: Schema_.Cause({
          error,
          defect: Schema_.Defect
        })
      })
    ) as Schema_.Schema<
      PartialEncoded<Success["Type"], Error["Type"]>,
      Encoded<Success["Encoded"], Error["Encoded"]>,
      Success["Context"] | Error["Context"]
    >,
    schemaFromSelf,
    {
      strict: false,
      decode: (e) =>
        e._tag === "Initial"
          ? initial(e.waiting)
          : e._tag === "Success"
          ? success(e.value, e)
          : failure(e.cause, e),
      encode: identity
    }
  ) as any
}
