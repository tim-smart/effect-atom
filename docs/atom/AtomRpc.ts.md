---
title: AtomRpc.ts
nav_order: 4
parent: "@effect-atom/atom"
---

## AtomRpc overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructors](#constructors)
  - [Tag](#tag)
- [Models](#models)
  - [AtomRpcClient (interface)](#atomrpcclient-interface)

---

# Constructors

## Tag

**Signature**

```ts
export declare const Tag: <Self>() => <
  const Id extends string,
  Rpcs extends Rpc.Any,
  ER,
  RM = RpcClient.Protocol | Rpc.MiddlewareClient<NoInfer<Rpcs>> | Rpc.Context<NoInfer<Rpcs>>
>(
  id: Id,
  options: {
    readonly group: RpcGroup.RpcGroup<Rpcs>
    readonly protocol: Layer.Layer<Exclude<NoInfer<RM>, Scope>, ER>
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly generateRequestId?: (() => RequestId) | undefined
    readonly disableTracing?: boolean | undefined
    readonly makeEffect?: Effect.Effect<RpcClient.RpcClient.Flat<Rpcs, RpcClientError>, never, RM> | undefined
  }
) => AtomRpcClient<Self, Id, Rpcs, ER>
```

Added in v1.0.0

# Models

## AtomRpcClient (interface)

**Signature**

```ts
export interface AtomRpcClient<Self, Id extends string, Rpcs extends Rpc.Any, E> extends Context.Tag<
  Self,
  RpcClient.RpcClient.Flat<Rpcs, RpcClientError>
> {
  new (_: never): Context.TagClassShape<Id, RpcClient.RpcClient.Flat<Rpcs, RpcClientError>>

  readonly layer: Layer.Layer<Self, E>
  readonly runtime: Atom.AtomRuntime<Self, E>

  readonly mutation: <Tag extends Rpc.Tag<Rpcs>>(
    arg: Tag
  ) => Rpc.ExtractTag<Rpcs, Tag> extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  >
    ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>]
      ? never
      : Atom.AtomResultFn<
          {
            readonly payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>
            readonly reactivityKeys?:
              | ReadonlyArray<unknown>
              | ReadonlyRecord<string, ReadonlyArray<unknown>>
              | undefined
            readonly headers?: Headers.Input | undefined
          },
          _Success["Type"],
          _Error["Type"] | E | _Middleware["failure"]["Type"]
        >
    : never

  readonly query: <Tag extends Rpc.Tag<Rpcs>>(
    tag: Tag,
    payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>,
    options?: {
      readonly headers?: Headers.Input | undefined
      readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      readonly timeToLive?: Duration.DurationInput | undefined
    }
  ) => Rpc.ExtractTag<Rpcs, Tag> extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  >
    ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>]
      ? Atom.Writable<
          Atom.PullResult<_A["Type"], _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"]>,
          void
        >
      : Atom.Atom<Result.Result<_Success["Type"], _Error["Type"] | E | _Middleware["failure"]["Type"]>>
    : never
}
```

Added in v1.0.0
