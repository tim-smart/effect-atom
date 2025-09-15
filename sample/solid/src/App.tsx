import { Atom, useAtomValue, useAtom, useAtomSet, useAtomSuspenseResult, Result } from '@effect-atom/atom-solid'
import { Effect } from 'effect'
import { createSignal, For, ErrorBoundary, createMemo } from 'solid-js'

// Basic counter atom
const counterAtom = Atom.make(0)

// Computed atom that doubles the counter
const doubledAtom = Atom.make((get) => get(counterAtom) * 2)

// Shared message atom
const messageAtom = Atom.make("Hello from Effect Atom!")

// Async atom that simulates API call - using fn pattern for refresh capability
const asyncDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    yield* Effect.sleep(1000) // Simulate delay
    return `Data loaded at ${new Date().toLocaleTimeString()}`
  })
)

// Todo list atom
const todosAtom = Atom.make<string[]>([])

function Counter() {
  const [count, setCount] = useAtom(() => counterAtom)
  const doubled = useAtomValue(() => doubledAtom)

  return (
    <div class="card">
      <h2>Basic Counter</h2>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count() - 1)}>
        Decrement
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  )
}

function SharedMessage() {
  const [message, setMessage] = useAtom(() => messageAtom)
  const [localInput, setLocalInput] = createSignal("")

  return (
    <div class="card">
      <h2>Shared Message</h2>
      <p>Current message: <strong>{message()}</strong></p>
      <input
        type="text"
        value={localInput()}
        onInput={(e) => setLocalInput(e.currentTarget.value)}
        placeholder="Enter new message"
        style={{ margin: "0.5em", padding: "0.5em" }}
      />
      <button onClick={() => {
        setMessage(localInput())
        setLocalInput("")
      }}>
        Update Message
      </button>
    </div>
  )
}

function AsyncData() {
  const result = useAtomSuspenseResult(() => asyncDataAtom)
  const refreshData = useAtomSet(() => asyncDataAtom)

  return (
    <div class="card">
      <h2>Async Data</h2>
      {(() => {
        const current = result()
        if (current.loading) {
          return <p>Loading...</p>
        }
        if (current.error) {
          return <p>Error: {String(current.error)}</p>
        }
        return <p>Status: {current.data}</p>
      })()}
      <button onClick={() => refreshData(void 0)}>
        Refresh Data
      </button>
    </div>
  )
}

function TodoList() {
  const [todos, setTodos] = useAtom(() => todosAtom)
  const [newTodo, setNewTodo] = createSignal("")

  const addTodo = () => {
    if (newTodo().trim()) {
      setTodos([...todos(), newTodo().trim()])
      setNewTodo("")
    }
  }

  const removeTodo = (index: number) => {
    setTodos(todos().filter((_: string, i: number) => i !== index))
  }

  return (
    <div class="card">
      <h2>Todo List</h2>
      <div style={{ "margin-bottom": "1em" }}>
        <input
          type="text"
          value={newTodo()}
          onInput={(e) => setNewTodo(e.currentTarget.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a todo..."
          style={{ margin: "0.5em", padding: "0.5em" }}
        />
        <button onClick={addTodo}>Add Todo</button>
      </div>
      <div style={{ "text-align": "left", "max-width": "400px", margin: "0 auto" }}>
        <For each={todos()}>
          {(todo, index) => (
            <div style={{ 
              display: "flex", 
              "justify-content": "space-between", 
              "align-items": "center",
              padding: "0.5em",
              margin: "0.25em 0",
              "background-color": "rgba(255,255,255,0.1)",
              "border-radius": "4px"
            }}>
              <span>{todo}</span>
              <button 
                onClick={() => removeTodo(index())}
                style={{ "font-size": "0.8em", padding: "0.25em 0.5em" }}
              >
                Remove
              </button>
            </div>
          )}
        </For>
        {todos().length === 0 && (
          <p style={{ "text-align": "center", color: "#888" }}>
            No todos yet. Add one above!
          </p>
        )}
      </div>
    </div>
  )
}

// Error handling example
const errorAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const shouldError = Math.random() > 0.5
    if (shouldError) {
      yield* Effect.fail(new Error("Random error occurred!"))
    }
    yield* Effect.sleep(500)
    return "Success! No error this time."
  })
)

function ErrorHandlingExample() {
  const result = useAtomValue(() => errorAtom)

  return (
    <div class="card">
      <h2>Error Handling</h2>
      <ErrorBoundary
        fallback={(err) => (
          <div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
            <strong>Error:</strong> {err.message}
            <br />
            <button onClick={() => errorAtom.refresh?.(() => {})}>
              Try Again
            </button>
          </div>
        )}
      >
        <div>
          <p>Status: {result()._tag}</p>
          {result()._tag === 'Success' && <p>Result: {(result() as any).value}</p>}
          {result()._tag === 'Failure' && <p style="color: orange;">Error handled gracefully</p>}
          {result()._tag === 'Initial' && <p>Loading...</p>}
          <button onClick={() => errorAtom.refresh?.(() => {})}>
            Trigger Random Error
          </button>
        </div>
      </ErrorBoundary>
    </div>
  )
}

// Performance monitoring example
const performanceAtom = Atom.make(0)
const heavyComputationAtom = Atom.make((get) => {
  const value = get(performanceAtom)
  // Simulate heavy computation
  let result = 0
  for (let i = 0; i < value * 100000; i++) {
    result += Math.sqrt(i)
  }
  return result
})

function PerformanceExample() {
  const [value, setValue] = useAtom(() => performanceAtom)
  const computation = useAtomValue(() => heavyComputationAtom)

  // Performance monitoring
  const renderTime = createMemo(() => {
    const start = performance.now()
    const result = computation()
    const end = performance.now()
    return { result, time: end - start }
  })

  return (
    <div class="card">
      <h2>Performance Monitoring</h2>
      <p>Input value: {value()}</p>
      <p>Computation result: {renderTime().result.toFixed(2)}</p>
      <p>Render time: {renderTime().time.toFixed(2)}ms</p>
      <input
        type="range"
        min="0"
        max="100"
        value={value()}
        onInput={(e) => setValue(parseInt(e.target.value))}
      />
      <div style="margin-top: 10px;">
        <small>
          Move the slider to see how SolidJS's fine-grained reactivity
          only updates the affected parts of the UI.
        </small>
      </div>
    </div>
  )
}



function App() {
  return (
    <>
      <div>
        <h1>SolidJS + Effect Atom</h1>
        <p class="read-the-docs">
          Reactive state management with Effect and SolidJS
        </p>
      </div>
      
      <Counter />
      <SharedMessage />
      <AsyncData />
      <TodoList />
      <ErrorHandlingExample />
      <PerformanceExample />
      
      <div class="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
