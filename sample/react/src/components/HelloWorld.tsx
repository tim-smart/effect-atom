import { Atom, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { memo, useEffect, useMemo, useState } from "react"
import { TestClient } from "../fixtures/TestClient"
import { Exit } from "effect"

const INTERVAL_DURATION = 1_000
const countAtom = Atom.make(0)

// separate component to visualize that only this part re-renders on count change
// memo to prevent re-renders when the parent re-renders
// use react-scan to see the visualization
const Counter = memo(function Counter() {
  const count = useAtomValue(countAtom)
  const setCount = useAtomSet(countAtom)
  return (
    <button onClick={() => setCount((count) => count + 1)}>
      count is {count}
    </button>
  )
})

export function HelloWorld() {
  const [intervalEnabled, setIntervalEnabled] = useState(false)
  const [value, setValue] = useState({
    echo: "initial",
    state: "",
    at: new Date(),
  })

  const queryAtom = useMemo(() => {
    return TestClient.query("Get", value, {
      reactivityKeys: ["Get"],
    })
      .pipe(Atom.refreshOnWindowFocus)
      .pipe(
        Atom.map((res) => {
          console.log("Got query result", res)
          return res
        }),
      )
  }, [value])

  const result = useAtomValue(queryAtom)

  const set = useAtomSet(TestClient.mutation("Set"), {
    mode: "promiseExit",
  })

  const onSet = () => {
    set({
      payload: { state: "state " + new Date().toISOString() },
      reactivityKeys: ["Get"],
    }).then((_) =>
      console.log(
        "finished",
        Exit.match(_, {
          onSuccess: (_) => ({ success: _ }),
          onFailure: (_) => ({ failure: _ }),
        }),
      ),
    )
  }

  useEffect(() => {
    if (!intervalEnabled) return

    const interval = setInterval(() => {
      setValue({
        echo: `Hello World ${new Date().toLocaleTimeString()}`,
        state: "",
        at: new Date(),
      })
    }, INTERVAL_DURATION)

    return () => clearInterval(interval)
  }, [intervalEnabled])

  return (
    <>
      {result._tag === "Initial" && <div>Initial</div>}
      {result._tag === "Failure" && (
        <div>
          {result.waiting && <div>Waiting...</div>}
          Failure.. {String(result.cause)}
        </div>
      )}
      {result._tag === "Success" && (
        <div>
          {result.waiting && <div>Waiting...</div>}
          Success: {JSON.stringify(result.value)}
        </div>
      )}

      <button onClick={onSet}>Set State</button>
      <button onClick={() => setIntervalEnabled(!intervalEnabled)}>
        Set Interval {intervalEnabled ? "OFF" : "ON"}
      </button>

      <div className="card">
        <Counter />
      </div>
    </>
  )
}
