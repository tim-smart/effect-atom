---
title: AtomHttpApi.ts
nav_order: 2
parent: "@effect-atom/atom"
---

## AtomHttpApi overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructors](#constructors)
  - [Tag](#tag)
- [Models](#models)
  - [AtomHttpApiClient (interface)](#atomhttpapiclient-interface)

---

# Constructors

## Tag

**Signature**

```ts
export declare const Tag: <Self>() => <
  const Id extends string,
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiE,
  E,
  R
>(
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
  }
) => AtomHttpApiClient<Self, Id, Groups, ApiE, E>
```

Added in v1.0.0

# Models

## AtomHttpApiClient (interface)

**Signature**

```ts
export interface AtomHttpApiClient<Self, Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, ApiE, E>
  extends Context.Tag<Self, Simplify<HttpApiClient.Client<Groups, ApiE, never>>> {
  new (_: never): Context.TagClassShape<Id, Simplify<HttpApiClient.Client<Groups, ApiE, never>>>

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
  ]
    ? Atom.AtomResultFn<
        Simplify<
          HttpApiEndpoint.HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers, false> & {
            readonly reactivityKeys?:
              | ReadonlyArray<unknown>
              | ReadonlyRecord<string, ReadonlyArray<unknown>>
              | undefined
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
    ]
      ? Simplify<
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
  ]
    ? Atom.Atom<
        Result.Result<
          WithResponse extends true ? [_Success, HttpClientResponse] : _Success,
          _Error | HttpApiGroup.HttpApiGroup.Error<Group> | E | HttpClientError.HttpClientError | ParseResult.ParseError
        >
      >
    : never
}
```

Added in v1.0.0
