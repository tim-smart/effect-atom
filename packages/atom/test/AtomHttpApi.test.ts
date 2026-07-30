import * as AtomHttpApi from "@effect-atom/atom/AtomHttpApi"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpClient } from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer } from "effect"

describe("AtomHttpApi", () => {
  it("preserves retention metadata on reactive queries", () => {
    const atom = ApiClient.query("group", "get", {
      reactivityKeys: ["users"],
      timeToLive: "1 minute"
    })
    const keepAliveAtom = ApiClient.query("group", "get", {
      reactivityKeys: ["users"],
      timeToLive: Duration.infinity
    })

    assert.strictEqual(atom.idleTTL, 60_000)
    assert.strictEqual(keepAliveAtom.keepAlive, true)
  })
})

const Api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/users")
  )
)

class ApiClient extends AtomHttpApi.Tag<ApiClient>()("ApiClient", {
  api: Api,
  httpClient: Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make(() => Effect.die("unexpected request"))
  )
}) {}
