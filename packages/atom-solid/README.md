# @effect-atom/atom-solid

**Reactive state management for SolidJS applications using Effect atoms**

`@effect-atom/atom-solid` provides seamless integration between [Effect](https://effect.website) atoms and [SolidJS](https://solidjs.com) applications, leveraging SolidJS's fine-grained reactivity system for optimal performance.

## Features

- 🚀 **Fine-grained Reactivity**: Leverages SolidJS's reactive system for optimal performance
- ⚡ **Zero Re-renders**: Updates only the specific DOM nodes that need to change
- 🔄 **Async Support**: Built-in support for async atoms with loading states
- 🎯 **TypeScript**: Full TypeScript support with excellent type inference
- 🧪 **Well Tested**: Comprehensive test suite with 100% coverage
- 📦 **Lightweight**: Minimal bundle size impact

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

## Core Hooks

### useAtomValue

Read the current value of an atom and subscribe to changes.

```tsx
const name = useAtomValue(() => nameAtom)
return <p>Hello, {name()}!</p>
```

### useAtom

Get both the current value and a setter function for an atom.

```tsx
const [count, setCount] = useAtom(() => countAtom)
```

### useAtomSet

Get only the setter function for an atom.

```tsx
const setCount = useAtomSet(() => countAtom)
```

## Advanced Features

### Async Atoms

Handle async operations with built-in loading states:

```tsx
import { Effect } from "effect"
import { useAtomSuspenseResult } from "@effect-atom/atom-solid"

const dataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() => fetch('/api/data'))
    return yield* Effect.promise(() => response.json())
  })
)

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

### Computed Atoms

Create derived state that automatically updates:

```tsx
const firstNameAtom = Atom.make("John")
const lastNameAtom = Atom.make("Doe")
const fullNameAtom = Atom.make((get) =>
  `${get(firstNameAtom)} ${get(lastNameAtom)}`
)

function FullName() {
  const fullName = useAtomValue(() => fullNameAtom)
  return <p>{fullName()}</p>
}
```

## Performance Benefits

SolidJS's fine-grained reactivity system means that atom-solid can update only the specific parts of your UI that depend on changed atoms, without re-rendering entire components.

### Benchmark Results

Based on our performance benchmarks:

- **Atom Creation**: ~2M ops/sec
- **Registry Get**: ~6M ops/sec
- **Registry Set**: ~4M ops/sec
- **Computed Atoms**: ~454K ops/sec
- **Subscriptions**: ~1M ops/sec
- **Memory Usage**: ~5KB per 1000 atoms

Run benchmarks yourself: `pnpm benchmark`

### Comparison with React

| Feature | atom-react | atom-solid |
|---------|------------|------------|
| Re-renders | Component re-renders | Fine-grained updates |
| Performance | Good | Excellent |
| Bundle size | ~15kb | ~12kb |
| Learning curve | Familiar to React devs | SolidJS concepts |

## Migration from atom-react

### Key Differences

#### 1. **Hook Signatures**
```tsx
// atom-react
const value = useAtomValue(myAtom)

// atom-solid
const value = useAtomValue(() => myAtom)
```

#### 2. **Return Values**
```tsx
// atom-react - Direct values
const count = useAtomValue(countAtom)
return <div>{count}</div>

// atom-solid - Signal accessors
const count = useAtomValue(() => countAtom)
return <div>{count()}</div>
```

#### 3. **Suspense Implementation**
```tsx
// atom-react - Direct Promise throwing
const result = useAtomSuspense(asyncAtom)

// atom-solid - createResource integration
const result = useAtomSuspense(() => asyncAtom)
```

#### 4. **Performance Characteristics**
- **atom-react**: React reconciliation, component re-renders
- **atom-solid**: Fine-grained updates, no virtual DOM

### Migration Steps

1. **Update hook calls**: Add factory functions
2. **Update JSX**: Add `()` to access signal values
3. **Update Suspense**: Wrap with SolidJS Suspense components
4. **Test thoroughly**: Different reactivity model may expose edge cases

## Examples

Check out the [sample application](../../sample/solid) for complete examples including:

- Counter with computed values
- Async data fetching
- Todo list management
- Shared state between components

## API Reference

### Core Hooks
- `useAtomValue` - Read atom values
- `useAtom` - Read and write atom values
- `useAtomSet` - Write-only atom access

### Advanced Hooks
- `useAtomSuspenseResult` - Handle async atoms with loading states
- `useAtomSubscribe` - Subscribe to atom changes for side effects
- `useAtomMount` - Ensure atoms are mounted and active

### Context
- `RegistryProvider` - Provide atom registry to component tree
- `useRegistry` - Access the current registry

## Best Practices

1. **Use atom factories**: Always pass a function that returns the atom
   ```tsx
   // ✅ Good
   const value = useAtomValue(() => myAtom)

   // ❌ Bad
   const value = useAtomValue(myAtom)
   ```

2. **Prefer computed atoms**: Use computed atoms for derived state
   ```tsx
   // ✅ Good
   const doubledAtom = Atom.make((get) => get(countAtom) * 2)

   // ❌ Bad
   const doubled = useAtomValue(() => countAtom, count => count * 2)
   ```

3. **Use useAtomSet for write-only operations**: When you only need to update
   ```tsx
   // ✅ Good
   const setCount = useAtomSet(() => countAtom)

   // ❌ Bad
   const [, setCount] = useAtom(() => countAtom)
   ```

## Documentation

Full documentation: [https://tim-smart.github.io/effect-atom/docs/atom-solid](https://tim-smart.github.io/effect-atom/docs/atom-solid)

## License

MIT

## Links

- [Effect Website](https://effect.website)
- [SolidJS Website](https://solidjs.com)
- [GitHub Repository](https://github.com/tim-smart/effect-atom)
```
