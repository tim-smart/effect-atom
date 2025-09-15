---
title: "Context.ts"
parent: "@effect-atom/atom-solid"
nav_order: 3
---

# Context

Registry provider and context management for atom-solid.

## RegistryProvider

Provides an atom registry to the component tree. All atom operations within the provider will use this registry.

### Signature

```typescript
export const RegistryProvider: (props: RegistryProviderProps) => JSX.Element
```

### Props

```typescript
export interface RegistryProviderProps {
  readonly children?: any
  readonly registry?: Registry.Registry
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]>
  readonly scheduleTask?: ((f: () => void) => void)
  readonly timeoutResolution?: number
  readonly defaultIdleTTL?: number
}
```

#### Parameters

- `children`: Child components that will have access to the registry
- `registry` (optional): Custom registry instance. If not provided, a new registry will be created
- `initialValues` (optional): Initial values for atoms
- `scheduleTask` (optional): Custom task scheduler function
- `timeoutResolution` (optional): Timeout resolution in milliseconds (default: 200)
- `defaultIdleTTL` (optional): Default idle time-to-live in milliseconds (default: 400)

### Examples

#### Basic Usage

```tsx
import { RegistryProvider } from "@effect-atom/atom-solid"

function App() {
  return (
    <RegistryProvider>
      <Counter />
      <TodoList />
    </RegistryProvider>
  )
}
```

#### With Custom Registry

```tsx
import { Registry } from "@effect-atom/atom"
import { RegistryProvider } from "@effect-atom/atom-solid"

const customRegistry = Registry.make({
  timeoutResolution: 1000,
  defaultIdleTTL: 2000
})

function App() {
  return (
    <RegistryProvider registry={customRegistry}>
      <MyApp />
    </RegistryProvider>
  )
}
```

#### With Initial Values

```tsx
import { Atom } from "@effect-atom/atom"
import { RegistryProvider } from "@effect-atom/atom-solid"

const countAtom = Atom.make(0)
const nameAtom = Atom.make("")

function App() {
  const initialValues = [
    [countAtom, 10],
    [nameAtom, "John Doe"]
  ] as const
  
  return (
    <RegistryProvider initialValues={initialValues}>
      <MyApp />
    </RegistryProvider>
  )
}
```

#### With Custom Configuration

```tsx
function App() {
  const scheduleTask = (task: () => void) => {
    // Custom scheduling logic
    setTimeout(task, 0)
  }
  
  return (
    <RegistryProvider
      scheduleTask={scheduleTask}
      timeoutResolution={500}
      defaultIdleTTL={1000}
    >
      <MyApp />
    </RegistryProvider>
  )
}
```

---

## useRegistry

Access the current registry from context. Useful for advanced use cases where you need direct registry access.

### Signature

```typescript
export const useRegistry: () => Registry.Registry
```

### Returns

The current `Registry.Registry` instance from context, or the default registry if no provider is found.

### Examples

#### Direct Registry Access

```tsx
import { useRegistry } from "@effect-atom/atom-solid"
import { Atom } from "@effect-atom/atom"

function AdvancedComponent() {
  const registry = useRegistry()
  const myAtom = Atom.make("initial")
  
  const handleDirectUpdate = () => {
    // Direct registry manipulation (advanced use case)
    registry.set(myAtom, "updated directly")
  }
  
  return (
    <button onClick={handleDirectUpdate}>
      Update Directly
    </button>
  )
}
```

#### Registry Information

```tsx
function RegistryInfo() {
  const registry = useRegistry()
  
  return (
    <div>
      <p>Registry timeout resolution: {registry.timeoutResolution}ms</p>
      <p>Default idle TTL: {registry.defaultIdleTTL}ms</p>
    </div>
  )
}
```

---

## Registry Concepts

### What is a Registry?

A registry is the central store that manages atom state and subscriptions. It:

- **Stores atom values**: Keeps track of the current value of each atom
- **Manages subscriptions**: Handles which components are listening to which atoms
- **Coordinates updates**: Ensures that all subscribers are notified when atoms change
- **Handles cleanup**: Automatically cleans up unused atoms and subscriptions

### Registry Lifecycle

1. **Creation**: Registry is created when `RegistryProvider` mounts
2. **Atom mounting**: Atoms are mounted when first accessed by hooks
3. **Subscription management**: Components subscribe/unsubscribe as they mount/unmount
4. **Cleanup**: Unused atoms are cleaned up based on TTL settings
5. **Disposal**: Registry is disposed when provider unmounts

### Multiple Registries

You can have multiple registries in your application for different scopes:

```tsx
function App() {
  return (
    <div>
      {/* Global registry */}
      <RegistryProvider>
        <GlobalState />
        
        {/* Scoped registry for modal */}
        <RegistryProvider>
          <Modal />
        </RegistryProvider>
      </RegistryProvider>
    </div>
  )
}
```

### Performance Considerations

#### Registry Configuration

- **timeoutResolution**: Lower values = more frequent cleanup checks = higher CPU usage
- **defaultIdleTTL**: Lower values = more aggressive cleanup = lower memory usage
- **scheduleTask**: Custom schedulers can optimize for specific use cases

#### Best Practices

1. **Use a single registry per app**: Unless you need isolation, one registry is usually sufficient
2. **Configure timeouts appropriately**: Balance between memory usage and cleanup overhead
3. **Avoid direct registry access**: Use hooks instead of direct registry manipulation
4. **Initialize heavy atoms lazily**: Don't put expensive computations in initial values

### Error Handling

The registry handles errors gracefully:

```tsx
// Atoms that fail will be marked as failed
const failingAtom = Atom.fn(() => Effect.fail("Something went wrong"))

function ErrorHandling() {
  const result = useAtomSuspenseResult(() => failingAtom)
  
  if (result.error) {
    return <div>Error: {result.error.message}</div>
  }
  
  return <div>Success: {result.data}</div>
}
```

### Testing with Registries

For testing, you can provide a clean registry for each test:

```tsx
import { Registry } from "@effect-atom/atom"
import { render } from "@solidjs/testing-library"

test("component with atoms", () => {
  const testRegistry = Registry.make()
  
  render(() => (
    <RegistryProvider registry={testRegistry}>
      <MyComponent />
    </RegistryProvider>
  ))
  
  // Test assertions...
})
```
