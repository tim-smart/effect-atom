/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import type { RpcClientError } from "@effect/rpc/RpcClientError"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import type { RequestId } from "@effect/rpc/RpcMessage"
import * as RpcSchema from "@effect/rpc/RpcSchema"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import type { ReadonlyRecord } from "effect/Record"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Mutable, NoInfer } from "effect/Types"
import * as Atom from "./Atom.js"
import { wrapReactivityKeys } from "./internal/data.js"
import type * as Result from "./Result.js"

/**
 * @since 1.0.0
 * @category Models
 */
export interface AtomRpcClient<Self, Id extends string, Rpcs extends Rpc.Any, E>
  extends Context.Tag<Self, RpcClient.RpcClient.Flat<Rpcs, RpcClientError>>
{
  new(
    _: never
  ): Context.TagClassShape<Id, RpcClient.RpcClient.Flat<Rpcs, RpcClientError>>

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
  > ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>] ? never
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
  > ? [_Success] extends [RpcSchema.Stream<infer _A, infer _E>] ? Atom.Writable<
        Atom.PullResult<
          _A["Type"],
          _E["Type"] | _Error["Type"] | E | _Middleware["failure"]["Type"]
        >,
        void
      >
    : Atom.Atom<
      Result.Result<
        _Success["Type"],
        _Error["Type"] | E | _Middleware["failure"]["Type"]
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
export const Tag = <Self>() =>
<
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
): AtomRpcClient<Self, Id, Rpcs, ER> => {
  const self: Mutable<AtomRpcClient<Self, Id, Rpcs, ER>> = Context.Tag(id)<
    Self,
    RpcClient.RpcClient.Flat<Rpcs, RpcClientError>
  >() as any

  self.layer = Layer.scoped(
    self,
    options.makeEffect ??
      RpcClient.make(options.group, {
        ...options,
        flatten: true
      }) as Effect.Effect<RpcClient.RpcClient.Flat<Rpcs, RpcClientError>, never, RM>
  ).pipe(Layer.provide(options.protocol))
  self.runtime = Atom.runtime(self.layer)

  self.mutation = Atom.family(<Tag extends Rpc.Tag<Rpcs>>(tag: Tag) =>
    self.runtime.fn<{
      readonly payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>
      readonly reactivityKeys?:
        | ReadonlyArray<unknown>
        | ReadonlyRecord<string, ReadonlyArray<unknown>>
        | undefined
      readonly headers?: Headers.Input | undefined
    }>()(
      Effect.fnUntraced(function*({ headers, payload, reactivityKeys }) {
        const client = yield* self
        const effect = client(tag, payload, { headers } as any)
        return yield* reactivityKeys
          ? Reactivity.mutation(effect, reactivityKeys)
          : effect
      })
    )
  ) as any

  const queryFamily = Atom.family(
    ({ headers, payload, reactivityKeys, tag, timeToLive }: QueryKey) => {
      const rpc = options.group.requests.get(tag)! as any as Rpc.AnyWithProps
      let atom = RpcSchema.isStreamSchema(rpc.successSchema)
        ? self.runtime.pull(
          self.pipe(
            Effect.map((client) => client(tag, payload, { headers } as any)),
            Stream.unwrap
          )
        )
        : self.runtime.atom(
          Effect.flatMap(self, (client) => client(tag, payload, { headers } as any))
        )
      if (timeToLive) {
        atom = Duration.isFinite(timeToLive)
          ? Atom.setIdleTTL(atom, timeToLive)
          : Atom.keepAlive(atom)
      }
      return reactivityKeys
        ? self.runtime.factory.withReactivity(reactivityKeys)(atom)
        : atom
    }
  )

  self.query = <Tag extends Rpc.Tag<Rpcs>>(
    tag: Tag,
    payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>,
    options?: {
      readonly headers?: Headers.Input | undefined
      readonly reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
      readonly timeToLive?: Duration.DurationInput | undefined
    }
  ) =>
    queryFamily(
      new QueryKey({
        tag,
        payload: Data.struct(payload),
        headers: options?.headers
          ? Data.unsafeStruct(Headers.fromInput(options.headers))
          : undefined,
        reactivityKeys: options?.reactivityKeys
          ? wrapReactivityKeys(options.reactivityKeys)
          : undefined,
        timeToLive: options?.timeToLive
          ? Duration.decode(options.timeToLive)
          : undefined
      })
    ) as any

  return self as AtomRpcClient<Self, Id, Rpcs, ER>
}

class QueryKey extends Data.Class<{
  tag: string
  payload: any
  headers?: Headers.Headers | undefined
  reactivityKeys?: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>> | undefined
  timeToLive?: Duration.Duration | undefined
}> {
  [Equal.symbol](that: QueryKey) {
    return (
      this.tag === that.tag &&
      Equal.equals(this.payload, that.payload) &&
      Equal.equals(this.headers, that.headers) &&
      Equal.equals(this.reactivityKeys, that.reactivityKeys) &&
      Equal.equals(this.timeToLive, that.timeToLive)
    )
  }
  [Hash.symbol]() {
    return pipe(
      Hash.string(this.tag),
      Hash.combine(Hash.hash(this.payload)),
      Hash.combine(Hash.hash(this.headers)),
      Hash.combine(Hash.hash(this.reactivityKeys)),
      Hash.combine(Hash.hash(this.timeToLive)),
      Hash.cached(this)
    )
  }
}
