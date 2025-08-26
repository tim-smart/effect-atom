<script setup lang="ts">
import { Atom, AtomRpc, useAtomSet, useAtomValue } from "@effect-atom/atom-vue"
import { Effect, Schema } from "effect"
import { onUnmounted, ref } from "vue"
import { Rpc, RpcGroup, RpcTest } from "@effect/rpc"

defineProps<{ msg: string }>()

const count = ref(0)

const req = ref({ echo: "initial" })

class Rpcs extends RpcGroup.make(
  Rpc.make("Get", {
    payload: { echo: Schema.String },
    success: Schema.Struct({ echo: Schema.String, at: Schema.Date }),
  }),
  Rpc.make("Set", { payload: { state: Schema.String } }),
) {}

let state = "initial"
class TestClient extends AtomRpc.Tag<TestClient>()("TestClient", {
  group: Rpcs,
  makeEffect: RpcTest.makeClient(Rpcs, { flatten: true }),
  protocol: Rpcs.toLayer({
    Get: (req) => Effect.succeed({ echo: req.echo, state, at: new Date() }),
    Set: (req) => Effect.sync(() => state = req.state),
  }),
}) {}

const result = useAtomValue(() => {
  console.log("Computing Atom:", req.value)
  return Atom.refreshOnWindowFocus(TestClient.query("Get", req.value, { reactivityKeys: ["Get"]}))
})

const set = useAtomSet(() => TestClient.mutation("Set"))

const intervalEnabled = ref(false)

const interval = setInterval(
  () =>
    intervalEnabled.value &&
    (req.value = { echo: `Hello World ${new Date().toLocaleTimeString()}` }),
  5_000,
)
const onSet = () => set({ payload: { state: new Date().toISOString() }, reactivityKeys: ["Get"] })
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <h1>{{ msg }}</h1>

  <div v-if="result._tag === 'Initial'">Initial</div>
  <div v-else-if="result._tag === 'Failure'">
    <div v-if="result.waiting">Waiting...</div>
    Failure.. {{ result.cause }}
  </div>
  <div v-else>
    <div v-if="result.waiting">Waiting...</div>
    Success: {{ result.value }}
  </div>

  <button @click="onSet">Set state</button>

  <button @click="intervalEnabled = !intervalEnabled">
    Toggle interval {{ !intervalEnabled ? "ON" : "OFF" }}
  </button>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
