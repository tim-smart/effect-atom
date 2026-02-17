/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import type * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiClient from "@effect/platform/HttpApiClient"
import type * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import type * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import type * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware"
import type * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientError from "@effect/platform/HttpClientError"
import type { HttpClientResponse } from "@effect/platform/HttpClientResponse"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import type * as ParseResult from "effect/ParseResult"
import type { ReadonlyRecord } from "effect/Record"
import type { Mutable, NoInfer, Simplify } from "effect/Types"
import * as Atom from "./Atom.js"
import { wrapReactivityKeys } from "./internal/data.js"
import type * as Result from "./Result.js"

/**
 * @since 1.0.0
 * @category Models
 */
export interface AtomHttpApiClient<Self, Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, ApiE, E>
  extends Context.Tag<Self, Simplify<HttpApiClient.Client<Groups, ApiE, never>>>
{
  new(_: never): Context.TagClassShape<Id, Simplify<HttpApiClient.Client<Groups, ApiE, never>>>

  readonly layer: Layer.Layer<Self, E>
  readonly runtime: Atom.AtomRuntime<Self, E>

  readonly mutation: <
    GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
    Name extends HttpApiEndpoint.HttpApiEndpoint.Name<HttpApiGroup.HttpApiGroup.Endpoints<Group>>,
    Group extends HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<Groups, GroupName>,
    Endpoint extends HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>,
      Name
    >,
    const WithResponse extends boolean = false
  >(
    group: GroupName,
    endpoint: Name,
    options?: {
      readonly withResponse?: WithResponse | undefined
    }
  ) => [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >
  ] ? Atom.AtomResultFn<
      Simplify<
        HttpApiEndpoint.HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers, false> & {
          readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        }
      >,
      WithResponse extends true ? [_Success, HttpClientResponse] : _Success,
      _Error | HttpApiGroup.HttpApiGroup.Error<Group> | E | HttpClientError.HttpClientError | ParseResult.ParseError
    >
    : never

  readonly query: <
    GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
    Name extends HttpApiEndpoint.HttpApiEndpoint.Name<HttpApiGroup.HttpApiGroup.Endpoints<Group>>,
    Group extends HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<Groups, GroupName>,
    Endpoint extends HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>,
      Name
    >,
    const WithResponse extends boolean = false
  >(
    group: GroupName,
    endpoint: Name,
    request: [Endpoint] extends [
      HttpApiEndpoint.HttpApiEndpoint<
        infer _Name,
        infer _Method,
        infer _Path,
        infer _UrlParams,
        infer _Payload,
        infer _Headers,
        infer _Success,
        infer _Error,
        infer _R,
        infer _RE
      >
    ] ? Simplify<
        HttpApiEndpoint.HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers, WithResponse> & {
          readonly reactivityKeys?:
            | ReadonlyArray<unknown>
            | ReadonlyRecord<string, ReadonlyArray<unknown>>
            | undefined
          readonly timeToLive?: Duration.DurationInput | undefined
        }
      >
      : never
  ) => [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >
  ] ? Atom.Atom<
      Result.Result<
        WithResponse extends true ? [_Success, HttpClientResponse] : _Success,
        _Error | HttpApiGroup.HttpApiGroup.Error<Group> | E | HttpClientError.HttpClientError | ParseResult.ParseError
      >
    >
    : never
}

declare global {
  interface ErrorConstructor {
    stackTraceLimit: number
  }
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const Tag =
  <Self>() =>
  <const Id extends string, ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, ApiE, E, R>(
    id: Id,
    options: {
      readonly api: HttpApi.HttpApi<ApiId, Groups, ApiE, R>
      readonly httpClient: Layer.Layer<
        | HttpApiMiddleware.HttpApiMiddleware.Without<
          NoInfer<R> | HttpApiGroup.HttpApiGroup.ClientContext<NoInfer<Groups>>
        >
        | HttpClient.HttpClient,
        E
      >
      readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
      readonly transformResponse?:
        | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
        | undefined
      readonly baseUrl?: URL | string | undefined
      readonly runtime?: Atom.RuntimeFactory | undefined
    }
  ): AtomHttpApiClient<Self, Id, Groups, ApiE, E> => {
    const self: Mutable<AtomHttpApiClient<Self, Id, Groups, ApiE, E>> = Context.Tag(id)<
      Self,
      HttpApiClient.Client<Groups, E, R>
    >() as any

    self.layer = Layer.scoped(
      self,
      HttpApiClient.make(options.api, options)
    ).pipe(Layer.provide(options.httpClient)) as Layer.Layer<Self, E>
    const runtimeFactory = options.runtime ?? Atom.runtime
    self.runtime = runtimeFactory(self.layer)

    const mutationFamily = Atom.family(({ endpoint, group, withResponse }: MutationKey) =>
      self.runtime.fn<{
        path: any
        urlParams: any
        headers: any
        payload: any
        reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      }>()(
        Effect.fnUntraced(function*(opts) {
          const client = (yield* self) as any
          const effect = client[group][endpoint]({
            ...opts,
            withResponse
          }) as Effect.Effect<any>
          return yield* opts.reactivityKeys
            ? Reactivity.mutation(effect, opts.reactivityKeys)
            : effect
        })
      )
    ) as any

    self.mutation = ((group: string, endpoint: string, options?: {
      readonly withResponse?: boolean | undefined
    }) =>
      mutationFamily(
        new MutationKey({
          group,
          endpoint,
          withResponse: options?.withResponse ?? false
        })
      )) as any

    const queryFamily = Atom.family((opts: QueryKey) => {
      let atom = self.runtime.atom(
        Effect.flatMap(self, (client_) => {
          const client = client_ as any
          return client[opts.group][opts.endpoint](opts) as Effect.Effect<any>
        })
      )
      if (opts.timeToLive) {
        atom = Duration.isFinite(opts.timeToLive)
          ? Atom.setIdleTTL(atom, opts.timeToLive)
          : Atom.keepAlive(atom)
      }
      return opts.reactivityKeys
        ? self.runtime.factory.withReactivity(opts.reactivityKeys)(atom)
        : atom
    })

    self.query = ((
      group: string,
      endpoint: string,
      request: {
        readonly path?: any
        readonly urlParams?: any
        readonly payload?: any
        readonly headers?: any
        readonly withResponse?: boolean
        readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
        readonly timeToLive?: Duration.DurationInput | undefined
      }
    ) =>
      queryFamily(
        new QueryKey({
          group,
          endpoint,
          path: request.path && Data.struct(request.path),
          urlParams: request.urlParams && Data.struct(request.urlParams),
          payload: request.payload && Data.struct(request.payload),
          headers: request.headers && Data.struct(request.headers),
          withResponse: request.withResponse ?? false,
          reactivityKeys: request.reactivityKeys
            ? wrapReactivityKeys(request.reactivityKeys)
            : undefined,
          timeToLive: request.timeToLive
            ? Duration.decode(request.timeToLive)
            : undefined
        })
      )) as any

    return self as AtomHttpApiClient<Self, Id, Groups, ApiE, E>
  }

class MutationKey extends Data.Class<{
  group: string
  endpoint: string
  withResponse: boolean
}> {
  [Equal.symbol](that: QueryKey) {
    return this.group === that.group && this.endpoint === that.endpoint && this.withResponse === that.withResponse
  }
  [Hash.symbol]() {
    return pipe(
      Hash.string(`${this.group}/${this.endpoint}/${this.withResponse}`),
      Hash.cached(this)
    )
  }
}

class QueryKey extends Data.Class<{
  group: string
  endpoint: string
  path: any
  urlParams: any
  headers: any
  payload: any
  withResponse: boolean
  reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
  timeToLive?: Duration.Duration | undefined
}> {
  [Equal.symbol](that: QueryKey) {
    return (
      this.group === that.group &&
      this.endpoint === that.endpoint &&
      Equal.equals(this.path, that.path) &&
      Equal.equals(this.urlParams, that.urlParams) &&
      Equal.equals(this.payload, that.payload) &&
      Equal.equals(this.headers, that.headers) &&
      Equal.equals(this.withResponse, that.withResponse) &&
      Equal.equals(this.reactivityKeys, that.reactivityKeys) &&
      Equal.equals(this.timeToLive, that.timeToLive)
    )
  }
  [Hash.symbol]() {
    return pipe(
      Hash.string(`${this.group}/${this.endpoint}`),
      Hash.combine(Hash.hash(this.path)),
      Hash.combine(Hash.hash(this.urlParams)),
      Hash.combine(Hash.hash(this.payload)),
      Hash.combine(Hash.hash(this.headers)),
      Hash.combine(Hash.hash(this.withResponse)),
      Hash.combine(Hash.hash(this.reactivityKeys)),
      Hash.combine(Hash.hash(this.timeToLive)),
      Hash.cached(this)
    )
  }
}
