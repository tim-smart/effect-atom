---
title: "Usage Guides"
parent: "@effect-atom/atom-solid"
nav_order: 2
---

# Usage Guides

Practical guides for common patterns and use cases with `@effect-atom/atom-solid`.

## Table of Contents

- [Getting Started](#getting-started)
- [State Management Patterns](#state-management-patterns)
- [Async Operations](#async-operations)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Getting Started

### Project Setup

1. **Install dependencies**:
```bash
pnpm add @effect-atom/atom-solid @effect-atom/atom effect solid-js
```

2. **Setup your app**:
```tsx
// src/index.tsx
import { render } from 'solid-js/web'
import { RegistryProvider } from '@effect-atom/atom-solid'
import App from './App'

render(() => (
  <RegistryProvider>
    <App />
  </RegistryProvider>
), document.getElementById('root')!)
```

3. **Create your first atom**:
```tsx
// src/atoms.ts
import { Atom } from '@effect-atom/atom-solid'

export const counterAtom = Atom.make(0)
export const userAtom = Atom.make<User | null>(null)
```

### Basic Component

```tsx
// src/Counter.tsx
import { useAtom } from '@effect-atom/atom-solid'
import { counterAtom } from './atoms'

export function Counter() {
  const [count, setCount] = useAtom(() => counterAtom)
  
  return (
    <div>
      <h2>Counter: {count()}</h2>
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
```

## State Management Patterns

### 1. Shared State

Share state between multiple components:

```tsx
// atoms.ts
export const themeAtom = Atom.make<'light' | 'dark'>('light')

// Header.tsx
function Header() {
  const [theme, setTheme] = useAtom(() => themeAtom)
  
  return (
    <header class={theme()}>
      <button onClick={() => setTheme(theme() === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </header>
  )
}

// Sidebar.tsx  
function Sidebar() {
  const theme = useAtomValue(() => themeAtom)
  
  return (
    <aside class={`sidebar ${theme()}`}>
      {/* Sidebar content */}
    </aside>
  )
}
```

### 2. Computed State

Create derived state with computed atoms:

```tsx
// atoms.ts
export const todosAtom = Atom.make<Todo[]>([])

export const completedTodosAtom = Atom.make((get) => 
  get(todosAtom).filter(todo => todo.completed)
)

export const todoStatsAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  const completed = get(completedTodosAtom)
  
  return {
    total: todos.length,
    completed: completed.length,
    remaining: todos.length - completed.length,
    completionRate: todos.length > 0 ? completed.length / todos.length : 0
  }
})

// TodoStats.tsx
function TodoStats() {
  const stats = useAtomValue(() => todoStatsAtom)
  
  return (
    <div class="stats">
      <p>Total: {stats().total}</p>
      <p>Completed: {stats().completed}</p>
      <p>Remaining: {stats().remaining}</p>
      <p>Progress: {Math.round(stats().completionRate * 100)}%</p>
    </div>
  )
}
```

### 3. Form State

Manage complex form state:

```tsx
// atoms.ts
interface UserForm {
  name: string
  email: string
  age: number
}

export const userFormAtom = Atom.make<UserForm>({
  name: '',
  email: '',
  age: 0
})

export const formValidationAtom = Atom.make((get) => {
  const form = get(userFormAtom)
  const errors: Partial<UserForm> = {}
  
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.includes('@')) errors.email = 'Invalid email'
  if (form.age < 18) errors.age = 'Must be 18 or older'
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  }
})

// UserForm.tsx
function UserForm() {
  const [form, setForm] = useAtom(() => userFormAtom)
  const validation = useAtomValue(() => formValidationAtom)
  
  const updateField = (field: keyof UserForm, value: any) => {
    setForm({ ...form(), [field]: value })
  }
  
  return (
    <form>
      <input
        type="text"
        value={form().name}
        onInput={(e) => updateField('name', e.currentTarget.value)}
        placeholder="Name"
      />
      {validation().errors.name && <span class="error">{validation().errors.name}</span>}
      
      <input
        type="email"
        value={form().email}
        onInput={(e) => updateField('email', e.currentTarget.value)}
        placeholder="Email"
      />
      {validation().errors.email && <span class="error">{validation().errors.email}</span>}
      
      <input
        type="number"
        value={form().age}
        onInput={(e) => updateField('age', parseInt(e.currentTarget.value))}
        placeholder="Age"
      />
      {validation().errors.age && <span class="error">{validation().errors.age}</span>}
      
      <button type="submit" disabled={!validation().isValid}>
        Submit
      </button>
    </form>
  )
}
```

## Async Operations

### 1. API Data Fetching

```tsx
// api.ts
import { Effect } from 'effect'

interface User {
  id: number
  name: string
  email: string
}

export const fetchUser = (id: number) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch(`/api/users/${id}`)
    )
    const user = yield* Effect.tryPromise(() => response.json())
    return user as User
  })

// atoms.ts
export const userIdAtom = Atom.make(1)

export const userAtom = Atom.fn((get) => 
  fetchUser(get(userIdAtom))
)

// UserProfile.tsx
function UserProfile() {
  const result = useAtomSuspenseResult(() => userAtom)
  const [userId, setUserId] = useAtom(() => userIdAtom)
  const refreshUser = useAtomSet(() => userAtom)
  
  return (
    <div>
      <input
        type="number"
        value={userId()}
        onInput={(e) => setUserId(parseInt(e.currentTarget.value))}
      />
      
      {(() => {
        const current = result()
        if (current.loading) return <p>Loading user...</p>
        if (current.error) return <p>Error: {String(current.error)}</p>
        
        return (
          <div>
            <h2>{current.data.name}</h2>
            <p>{current.data.email}</p>
            <button onClick={() => refreshUser(void 0)}>
              Refresh
            </button>
          </div>
        )
      })()}
    </div>
  )
}
```

### 2. Optimistic Updates

```tsx
// atoms.ts
export const optimisticTodosAtom = Atom.make<Todo[]>([])

export const addTodoAtom = Atom.fn((get, title: string) =>
  Effect.gen(function* () {
    const tempId = Date.now()
    const tempTodo = { id: tempId, title, completed: false }
    
    // Optimistic update
    const currentTodos = get(optimisticTodosAtom)
    yield* Effect.sync(() => 
      optimisticTodosAtom.set([...currentTodos, tempTodo])
    )
    
    try {
      // API call
      const newTodo = yield* Effect.tryPromise(() =>
        fetch('/api/todos', {
          method: 'POST',
          body: JSON.stringify({ title }),
          headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json())
      )
      
      // Replace temp todo with real one
      const updatedTodos = get(optimisticTodosAtom).map(todo =>
        todo.id === tempId ? newTodo : todo
      )
      yield* Effect.sync(() => 
        optimisticTodosAtom.set(updatedTodos)
      )
      
      return newTodo
    } catch (error) {
      // Rollback on error
      const rolledBackTodos = get(optimisticTodosAtom).filter(
        todo => todo.id !== tempId
      )
      yield* Effect.sync(() => 
        optimisticTodosAtom.set(rolledBackTodos)
      )
      yield* Effect.fail(error)
    }
  })
)
```

## Performance Optimization

### 1. Selective Subscriptions

Only subscribe to specific parts of large objects:

```tsx
// Instead of subscribing to entire user object
const user = useAtomValue(() => userAtom)
const name = () => user().name  // Re-renders when any user field changes

// Create specific atoms for better performance
const userNameAtom = Atom.make((get) => get(userAtom)?.name ?? '')
const userName = useAtomValue(() => userNameAtom)  // Only re-renders when name changes
```

### 2. Memoized Computations

```tsx
// Expensive computation atom
const expensiveComputationAtom = Atom.make((get) => {
  const data = get(dataAtom)
  const filters = get(filtersAtom)
  
  // This only re-runs when data or filters change
  return data
    .filter(item => filters.categories.includes(item.category))
    .sort((a, b) => a[filters.sortBy] - b[filters.sortBy])
    .slice(0, filters.limit)
})
```

### 3. Lazy Loading

```tsx
// Only load data when needed
const lazyDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    // This only runs when the atom is first accessed
    yield* Effect.sleep(100) // Simulate delay
    const data = yield* Effect.tryPromise(() => fetch('/api/heavy-data'))
    return yield* Effect.tryPromise(() => data.json())
  })
)

function LazyComponent() {
  const [shouldLoad, setShouldLoad] = createSignal(false)
  
  return (
    <div>
      {!shouldLoad() ? (
        <button onClick={() => setShouldLoad(true)}>
          Load Data
        </button>
      ) : (
        <DataDisplay />
      )}
    </div>
  )
}

function DataDisplay() {
  const result = useAtomSuspenseResult(() => lazyDataAtom)
  // Data only loads when this component mounts
  
  return (
    <div>
      {(() => {
        const current = result()
        if (current.loading) return <p>Loading...</p>
        if (current.error) return <p>Error loading data</p>
        return <pre>{JSON.stringify(current.data, null, 2)}</pre>
      })()}
    </div>
  )
}
```

## Error Handling

### 1. Graceful Error Recovery

```tsx
// atoms.ts
export const apiDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise(() =>
      fetch('/api/data').then(r => r.json())
    )
    return data
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({ error: String(error), data: null })
    )
  )
)

// ErrorBoundary.tsx
function DataWithErrorHandling() {
  const result = useAtomSuspenseResult(() => apiDataAtom)

  return (
    <div>
      {(() => {
        const current = result()
        if (current.loading) return <p>Loading...</p>

        if (current.data?.error) {
          return (
            <div class="error-state">
              <p>Failed to load data: {current.data.error}</p>
              <button onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )
        }

        return <DataDisplay data={current.data} />
      })()}
    </div>
  )
}
```

### 2. Error Boundaries

```tsx
// ErrorBoundary.tsx
import { ErrorBoundary } from 'solid-js'

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div class="error-boundary">
          <h2>Something went wrong</h2>
          <p>{err.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    >
      <App />
    </ErrorBoundary>
  )
}
```

### 3. Retry Logic

```tsx
// atoms.ts
export const retryableDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise(() =>
      fetch('/api/unreliable-endpoint').then(r => r.json())
    )
    return data
  }).pipe(
    Effect.retry({
      times: 3,
      delay: (attempt) => `${attempt * 1000}ms`
    })
  )
)
```

## Testing

### 1. Unit Testing Atoms

```tsx
// atoms.test.ts
import { describe, test, expect } from 'vitest'
import { Registry } from '@effect-atom/atom'
import { counterAtom, doubledAtom } from './atoms'

describe('Counter Atoms', () => {
  test('should increment counter', () => {
    const registry = Registry.make()

    expect(registry.get(counterAtom)).toBe(0)

    registry.set(counterAtom, 5)
    expect(registry.get(counterAtom)).toBe(5)
  })

  test('should compute doubled value', () => {
    const registry = Registry.make()

    registry.set(counterAtom, 10)
    expect(registry.get(doubledAtom)).toBe(20)
  })
})
```

### 2. Component Testing

```tsx
// Counter.test.tsx
import { render, fireEvent } from '@solidjs/testing-library'
import { describe, test, expect } from 'vitest'
import { RegistryProvider } from '@effect-atom/atom-solid'
import { Counter } from './Counter'

describe('Counter Component', () => {
  test('should render and increment', async () => {
    const { getByText, getByRole } = render(() => (
      <RegistryProvider>
        <Counter />
      </RegistryProvider>
    ))

    expect(getByText('Counter: 0')).toBeInTheDocument()

    const incrementButton = getByRole('button', { name: /increment/i })
    fireEvent.click(incrementButton)

    expect(getByText('Counter: 1')).toBeInTheDocument()
  })
})
```

### 3. Async Testing

```tsx
// AsyncComponent.test.tsx
import { render, waitFor } from '@solidjs/testing-library'
import { describe, test, expect, vi } from 'vitest'
import { Effect } from 'effect'
import { RegistryProvider } from '@effect-atom/atom-solid'
import { AsyncDataComponent } from './AsyncDataComponent'

// Mock the API
vi.mock('./api', () => ({
  fetchData: vi.fn(() =>
    Effect.succeed({ message: 'Test data' })
  )
}))

describe('AsyncDataComponent', () => {
  test('should handle loading and success states', async () => {
    const { getByText } = render(() => (
      <RegistryProvider>
        <AsyncDataComponent />
      </RegistryProvider>
    ))

    // Should show loading initially
    expect(getByText('Loading...')).toBeInTheDocument()

    // Should show data after loading
    await waitFor(() => {
      expect(getByText('Test data')).toBeInTheDocument()
    })
  })
})
```

### 4. Integration Testing

```tsx
// App.test.tsx
import { render, fireEvent, waitFor } from '@solidjs/testing-library'
import { describe, test, expect } from 'vitest'
import { RegistryProvider } from '@effect-atom/atom-solid'
import { App } from './App'

describe('App Integration', () => {
  test('should handle complete user flow', async () => {
    const { getByText, getByPlaceholderText, getByRole } = render(() => (
      <RegistryProvider>
        <App />
      </RegistryProvider>
    ))

    // Add a todo
    const input = getByPlaceholderText('Add todo...')
    const addButton = getByRole('button', { name: /add/i })

    fireEvent.input(input, { target: { value: 'Test todo' } })
    fireEvent.click(addButton)

    // Verify todo appears
    await waitFor(() => {
      expect(getByText('Test todo')).toBeInTheDocument()
    })

    // Mark as complete
    const checkbox = getByRole('checkbox')
    fireEvent.click(checkbox)

    // Verify completion
    await waitFor(() => {
      expect(getByText('Completed: 1')).toBeInTheDocument()
    })
  })
})
```

## Best Practices Summary

### Do's ✅

- **Use atom factories**: Always pass `() => atom` to hooks
- **Leverage computed atoms**: Create derived state for better performance
- **Handle errors gracefully**: Use Effect's error handling capabilities
- **Test thoroughly**: Unit test atoms and integration test components
- **Optimize selectively**: Use specific atoms for parts of large objects
- **Clean up properly**: Let SolidJS handle cleanup automatically

### Don'ts ❌

- **Don't pass atoms directly**: Use `() => atom` instead of `atom`
- **Don't create registries manually**: Use `RegistryProvider`
- **Don't ignore errors**: Always handle async operation failures
- **Don't over-optimize**: Profile before optimizing
- **Don't mutate atoms directly**: Use setters or registry methods
- **Don't forget TypeScript**: Leverage type safety for better DX

## Advanced Patterns

### 1. Atom Families

```tsx
// Create atoms dynamically based on parameters
const todoAtomFamily = (id: string) => Atom.make<Todo | null>(null)

// Cache atoms to avoid recreation
const todoAtoms = new Map<string, Atom.Atom<Todo | null>>()

export const getTodoAtom = (id: string) => {
  if (!todoAtoms.has(id)) {
    todoAtoms.set(id, todoAtomFamily(id))
  }
  return todoAtoms.get(id)!
}
```

### 2. Middleware Pattern

```tsx
// Create reusable atom enhancers
const withLogging = <T>(atom: Atom.Atom<T>, name: string) =>
  Atom.make((get) => {
    const value = get(atom)
    console.log(`${name}:`, value)
    return value
  })

const withPersistence = <T>(atom: Atom.Atom<T>, key: string) =>
  Atom.make((get) => {
    const value = get(atom)
    localStorage.setItem(key, JSON.stringify(value))
    return value
  })

// Usage
export const persistedCounterAtom = withPersistence(
  withLogging(counterAtom, 'counter'),
  'counter-value'
)
```

This completes our comprehensive usage guide covering all major patterns and best practices for `@effect-atom/atom-solid`!
