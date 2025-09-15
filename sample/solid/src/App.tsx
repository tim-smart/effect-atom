import { Atom, useAtomValue, useAtom, useAtomSet, useAtomSuspenseResult } from '@effect-atom/atom-solid'
import { Effect } from 'effect'
import { createSignal, For } from 'solid-js'

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
      
      <div class="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
