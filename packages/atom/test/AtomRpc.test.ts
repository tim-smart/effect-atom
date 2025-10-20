import * as AtomRpc from "@effect-atom/atom/AtomRpc"
import { Socket } from "@effect/platform"
import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc"
import { layerProtocolSocket } from "@effect/rpc/RpcClient"
import { assert, describe, it } from "@effect/vitest"
import { Layer } from "effect"

describe("AtomRpc", () => {
  describe("reactivityKeys", () => {
    it("supports objects", () => {
      const queryA = RpcClient.query("increment", void 0, {
        reactivityKeys: { query: ["a"] }
      })
      const queryB = RpcClient.query("increment", void 0, {
        reactivityKeys: { query: ["a"] }
      })
      assert.strictEqual(queryA, queryB)
    })
  })
})

const Api = RpcGroup.make(
  Rpc.make("increment")
)

class RpcClient extends AtomRpc.Tag<RpcClient>()("RpcClient", {
  group: Api,
  protocol: layerProtocolSocket({ retryTransientErrors: true }).pipe(
    Layer.provide(RpcSerialization.layerJson),
    Layer.provide(Socket.layerWebSocket("ws://localhost:8080")),
    Layer.provide(Socket.layerWebSocketConstructorGlobal)
  )
}) {}
