---
title: "AdvancedHooks.ts"
parent: "@effect-atom/atom-solid"
nav_order: 4
---

# Advanced Hooks

Advanced hooks for complex use cases and async atom management.

## useAtomSuspenseResult

Handle async atoms with built-in loading, success, and error states without throwing.

### Signature

```typescript
export const useAtomSuspenseResult: <A>(
  atomFactory: () => Atom.Atom<Result.Result<A, any>>
) => {
  readonly loading: boolean
  readonly data: A | undefined
  readonly error: any | undefined
}
```

### Parameters

- `atomFactory`: A function that returns an atom containing a `Result`

### Returns

An object with:
- `loading`: `true` when the atom is in loading state
- `data`: The successful result data, or `undefined` if loading/error
- `error`: The error if the atom failed, or `undefined` if loading/success

### Examples

#### Basic Async Data Fetching

```tsx
import { Atom } from "@effect-atom/atom"
import { Effect } from "effect"
import { useAtomSuspenseResult } from "@effect-atom/atom-solid"

const dataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    yield* Effect.sleep("1 second")
    const response = yield* Effect.promise(() => fetch("/api/data"))
    return yield* Effect.promise(() => response.json())
  })
)

function AsyncData() {
  const result = useAtomSuspenseResult(() => dataAtom)
  
  return (
    <div>
      {result.loading && <p>Loading data...</p>}
      {result.error && (
        <p style={{ color: "red" }}>
          Error: {result.error.message}
        </p>
      )}
      {result.data && (
        <div>
          <h3>Data loaded successfully!</h3>
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

#### With Refresh Functionality

```tsx
const refreshableDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const timestamp = new Date().toLocaleTimeString()
    yield* Effect.sleep("500 millis")
    return `Data loaded at ${timestamp}`
  })
)

function RefreshableData() {
  const result = useAtomSuspenseResult(() => refreshableDataAtom)
  const refreshData = useAtomSet(() => refreshableDataAtom)
  
  return (
    <div>
      {result.loading && <p>Loading...</p>}
      {result.error && <p>Error: {result.error.message}</p>}
      {result.data && (
        <div>
          <p>{result.data}</p>
          <button 
            onClick={() => refreshData(null)}
            disabled={result.loading}
          >
            {result.loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      )}
    </div>
  )
}
```

#### Error Handling

```tsx
const riskyAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const shouldFail = Math.random() > 0.5
    if (shouldFail) {
      yield* Effect.fail(new Error("Random failure"))
    }
    return "Success!"
  })
)

function RiskyOperation() {
  const result = useAtomSuspenseResult(() => riskyAtom)
  const retry = useAtomSet(() => riskyAtom)
  
  return (
    <div>
      {result.loading && <p>Attempting operation...</p>}
      {result.error && (
        <div>
          <p style={{ color: "red" }}>
            Operation failed: {result.error.message}
          </p>
          <button onClick={() => retry(null)}>
            Retry
          </button>
        </div>
      )}
      {result.data && (
        <p style={{ color: "green" }}>
          {result.data}
        </p>
      )}
    </div>
  )
}
```

---

## useAtomSubscribe

Subscribe to atom changes for side effects without reading the atom value.

### Signature

```typescript
export const useAtomSubscribe: <A>(
  atomFactory: () => Atom.Atom<A>,
  callback: (value: A) => void
) => void
```

### Parameters

- `atomFactory`: A function that returns the atom to subscribe to
- `callback`: Function called whenever the atom value changes

### Examples

#### Logging Changes

```tsx
import { useAtomSubscribe } from "@effect-atom/atom-solid"

const countAtom = Atom.make(0)

function Logger() {
  useAtomSubscribe(() => countAtom, (count) => {
    console.log(`Count changed to: ${count}`)
  })
  
  return null // This component doesn't render anything
}

function App() {
  return (
    <div>
      <Logger />
      <Counter />
    </div>
  )
}
```

#### Local Storage Sync

```tsx
const userPreferencesAtom = Atom.make({
  theme: "light",
  language: "en"
})

function LocalStorageSync() {
  useAtomSubscribe(() => userPreferencesAtom, (preferences) => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences))
  })
  
  return null
}
```

#### Analytics Tracking

```tsx
const pageViewAtom = Atom.make("")

function AnalyticsTracker() {
  useAtomSubscribe(() => pageViewAtom, (page) => {
    if (page) {
      // Track page view
      analytics.track("page_view", { page })
    }
  })
  
  return null
}
```

---

## useAtomMount

Ensure an atom is mounted and active in the registry.

### Signature

```typescript
export const useAtomMount: <A>(atomFactory: () => Atom.Atom<A>) => void
```

### Parameters

- `atomFactory`: A function that returns the atom to mount

### Examples

#### Preloading Data

```tsx
const expensiveDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    // Expensive computation or API call
    yield* Effect.sleep("2 seconds")
    return "Expensive data"
  })
)

function DataPreloader() {
  // Mount the atom to start loading immediately
  useAtomMount(() => expensiveDataAtom)
  
  return null
}

function App() {
  return (
    <div>
      <DataPreloader />
      {/* Data will be loading in background */}
      <OtherComponents />
    </div>
  )
}
```

#### Keeping Atoms Alive

```tsx
const importantAtom = Atom.make("important data")

function AtomKeeper() {
  // Keep this atom mounted even if no components are using it
  useAtomMount(() => importantAtom)
  
  return null
}
```

---

## Performance and Best Practices

### When to Use Advanced Hooks

#### useAtomSuspenseResult
- ✅ When you need to handle loading/error states manually
- ✅ When you want to show custom loading/error UI
- ✅ When you need to access error details
- ❌ When you want automatic suspense behavior (use regular hooks instead)

#### useAtomSubscribe
- ✅ For side effects (logging, analytics, storage sync)
- ✅ When you don't need the atom value in render
- ✅ For triggering other actions based on atom changes
- ❌ For rendering data (use `useAtomValue` instead)

#### useAtomMount
- ✅ For preloading expensive atoms
- ✅ For keeping important atoms alive
- ✅ For background data fetching
- ❌ For atoms that are already used by components

### Memory Management

Advanced hooks are automatically cleaned up when components unmount:

```tsx
function MyComponent() {
  // Subscription is automatically cleaned up on unmount
  useAtomSubscribe(() => myAtom, callback)
  
  // Mount is automatically released on unmount
  useAtomMount(() => expensiveAtom)
  
  return <div>...</div>
}
```

### Error Boundaries

For better error handling with async atoms, consider using error boundaries:

```tsx
import { ErrorBoundary } from "solid-js"

function App() {
  return (
    <ErrorBoundary fallback={(err) => <div>Error: {err.message}</div>}>
      <AsyncDataComponent />
    </ErrorBoundary>
  )
}
```

### Testing Advanced Hooks

```tsx
import { render } from "@solidjs/testing-library"
import { vi } from "vitest"

test("useAtomSubscribe calls callback", () => {
  const callback = vi.fn()
  const testAtom = Atom.make("initial")
  
  function TestComponent() {
    useAtomSubscribe(() => testAtom, callback)
    return null
  }
  
  const { unmount } = render(() => (
    <RegistryProvider>
      <TestComponent />
    </RegistryProvider>
  ))
  
  // Trigger atom change
  registry.set(testAtom, "changed")
  
  expect(callback).toHaveBeenCalledWith("changed")
  
  unmount()
})
```
