---
title: "index.ts"
parent: "@effect-atom/atom-solid"
nav_order: 1
---

# @effect-atom/atom-solid

**Reactive state management for SolidJS applications using Effect atoms**

`@effect-atom/atom-solid` provides seamless integration between [Effect](https://effect.website) atoms and [SolidJS](https://solidjs.com) applications, leveraging SolidJS's fine-grained reactivity system for optimal performance.

## Installation

```bash
npm install @effect-atom/atom-solid
# or
pnpm add @effect-atom/atom-solid
# or
yarn add @effect-atom/atom-solid
```

## Quick Start

```tsx
import { Atom } from "@effect-atom/atom"
import { useAtomValue, useAtom, RegistryProvider } from "@effect-atom/atom-solid"

// Create an atom
const countAtom = Atom.make(0)

function Counter() {
  const [count, setCount] = useAtom(() => countAtom)
  
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  )
}

function App() {
  return (
    <RegistryProvider>
      <Counter />
    </RegistryProvider>
  )
}
```

## Key Features

- **🚀 Fine-grained Reactivity**: Leverages SolidJS's reactive system for optimal performance
- **⚡ Zero Re-renders**: Updates only the specific DOM nodes that need to change
- **🔄 Async Support**: Built-in support for async atoms with loading states
- **🎯 TypeScript**: Full TypeScript support with excellent type inference
- **🧪 Well Tested**: Comprehensive test suite with 100% coverage
- **📦 Lightweight**: Minimal bundle size impact

## Core Concepts

### Atoms
Atoms are the fundamental units of state in Effect. They can hold any value and can be derived from other atoms.

```tsx
import { Atom } from "@effect-atom/atom"

// Simple atom
const nameAtom = Atom.make("John")

// Computed atom
const greetingAtom = Atom.make((get) => `Hello, ${get(nameAtom)}!`)

// Async atom
const dataAtom = Atom.fn(() => 
  Effect.gen(function* () {
    const response = yield* Effect.promise(() => fetch('/api/data'))
    return yield* Effect.promise(() => response.json())
  })
)
```

### Registry
The registry manages atom state and subscriptions. Use `RegistryProvider` to provide a registry to your component tree.

```tsx
import { RegistryProvider } from "@effect-atom/atom-solid"

function App() {
  return (
    <RegistryProvider>
      {/* Your app components */}
    </RegistryProvider>
  )
}
```

## Hooks

### useAtomValue
Read the current value of an atom and subscribe to changes.

```tsx
import { useAtomValue } from "@effect-atom/atom-solid"

function DisplayName() {
  const name = useAtomValue(() => nameAtom)
  return <p>Name: {name()}</p>
}
```

### useAtom
Get both the current value and a setter function for an atom.

```tsx
import { useAtom } from "@effect-atom/atom-solid"

function NameInput() {
  const [name, setName] = useAtom(() => nameAtom)
  
  return (
    <input
      value={name()}
      onInput={(e) => setName(e.currentTarget.value)}
    />
  )
}
```

### useAtomSet
Get only the setter function for an atom.

```tsx
import { useAtomSet } from "@effect-atom/atom-solid"

function ResetButton() {
  const resetName = useAtomSet(() => nameAtom)
  
  return (
    <button onClick={() => resetName("")}>
      Reset
    </button>
  )
}
```

## Advanced Usage

### Async Atoms with Suspense
Handle async atoms with built-in loading states.

```tsx
import { useAtomSuspenseResult } from "@effect-atom/atom-solid"

function AsyncData() {
  const result = useAtomSuspenseResult(() => dataAtom)
  
  return (
    <div>
      {result.loading && <p>Loading...</p>}
      {result.error && <p>Error: {result.error.message}</p>}
      {result.data && <p>Data: {JSON.stringify(result.data)}</p>}
    </div>
  )
}
```

### Atom Subscriptions
Subscribe to atom changes for side effects.

```tsx
import { useAtomSubscribe } from "@effect-atom/atom-solid"

function Logger() {
  useAtomSubscribe(() => countAtom, (value) => {
    console.log('Count changed to:', value)
  })
  
  return null
}
```

## Performance Benefits

SolidJS's fine-grained reactivity system means that atom-solid can update only the specific parts of your UI that depend on changed atoms, without re-rendering entire components. This results in:

- **Faster updates**: Only affected DOM nodes are updated
- **Better performance**: No unnecessary re-renders or reconciliation
- **Smoother UX**: Consistent performance even with complex state

## Comparison with React

| Feature | atom-react | atom-solid |
|---------|------------|------------|
| Re-renders | Component re-renders | Fine-grained updates |
| Performance | Good | Excellent |
| Bundle size | ~15kb | ~12kb |
| Learning curve | Familiar to React devs | SolidJS concepts |

## Examples

Check out the [sample application](https://github.com/tim-smart/effect-atom/tree/main/sample/solid) for complete examples including:

- Counter with computed values
- Async data fetching
- Todo list management
- Shared state between components

## API Reference

See the individual hook documentation for detailed API information:

- [Primitives](./Primitives.ts.html) - Core hooks (useAtomValue, useAtom, useAtomSet)
- [Context](./Context.ts.html) - Registry provider and context
- [AdvancedHooks](./AdvancedHooks.ts.html) - Advanced hooks for complex use cases
