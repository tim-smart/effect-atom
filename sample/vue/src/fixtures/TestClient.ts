import { AtomRpc } from "@effect-atom/atom-vue"
import { Rpc, RpcGroup, RpcTest } from "@effect/rpc"
import { Effect, Schema } from "effect"

class Rpcs extends RpcGroup.make(
  Rpc.make("Get", {
    payload: { echo: Schema.String },
    success: Schema.Struct({ echo: Schema.String, at: Schema.Date })
  }),
  Rpc.make("Set", { payload: { state: Schema.String } })
) {}

let state = "initial"
export class TestClient extends AtomRpc.Tag<TestClient>()("TestClient", {
  group: Rpcs,
  makeEffect: RpcTest.makeClient(Rpcs, { flatten: true }),
  protocol: Rpcs.toLayer({
    Get: (req) => Effect.succeed({ echo: req.echo, state, at: new Date() }),
    Set: (req) => Effect.sync(() => state = req.state)
  })
}) {}
