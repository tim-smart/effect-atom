---
title: "Debugging Guide"
parent: "@effect-atom/atom-solid"
nav_order: 5
---

# Debugging Guide

Advanced debugging techniques and troubleshooting for `@effect-atom/atom-solid`.

## Table of Contents

- [Common Issues](#common-issues)
- [Debugging Tools](#debugging-tools)
- [Performance Debugging](#performance-debugging)
- [SSR Debugging](#ssr-debugging)
- [Error Handling](#error-handling)

## Common Issues

### 1. Atom Not Updating

**Problem**: Atom value changes but UI doesn't update.

```tsx
// ❌ Problem: Creating atom inside component
function MyComponent() {
  const atom = Atom.make(0) // New atom on every render!
  const [value, setValue] = useAtom(() => atom)
  // ...
}

// ✅ Solution: Create atom outside component
const counterAtom = Atom.make(0)

function MyComponent() {
  const [value, setValue] = useAtom(() => counterAtom)
  // ...
}
```

**Debugging Steps**:
1. Check if atom is created outside component
2. Verify atom factory function is stable
3. Use browser DevTools to inspect atom state

### 2. Memory Leaks

**Problem**: Atoms not being garbage collected.

```tsx
// ❌ Problem: keepAlive atoms without cleanup
const persistentAtom = Atom.make(data).pipe(Atom.keepAlive)

// ✅ Solution: Proper cleanup
const dataAtom = Atom.make(data) // Auto-dispose when not used

// Or manual cleanup for keepAlive atoms
onCleanup(() => {
  registry.dispose()
})
```

### 3. Infinite Loops

**Problem**: Circular dependencies between atoms.

```tsx
// ❌ Problem: Circular dependency
const atomA = Atom.make((get) => get(atomB) + 1)
const atomB = Atom.make((get) => get(atomA) + 1)

// ✅ Solution: Break the cycle
const baseAtom = Atom.make(0)
const atomA = Atom.make((get) => get(baseAtom) + 1)
const atomB = Atom.make((get) => get(baseAtom) + 2)
```

## Debugging Tools

### 1. Browser DevTools

Enable detailed logging in development:

```tsx
// Add to your main.tsx in development
if (import.meta.env.DEV) {
  // Log atom state changes
  const originalSet = registry.set
  registry.set = function(atom, value) {
    console.log('Atom updated:', { atom: atom.toString(), value })
    return originalSet.call(this, atom, value)
  }
}
```

### 2. Atom Inspector

Create a debugging component to inspect atom state:

```tsx
function AtomInspector({ atom, name }: { atom: Atom.Atom<any>, name: string }) {
  const value = useAtomValue(() => atom)
  
  return (
    <div style="position: fixed; top: 10px; right: 10px; background: white; padding: 10px; border: 1px solid #ccc;">
      <h4>{name}</h4>
      <pre>{JSON.stringify(value(), null, 2)}</pre>
    </div>
  )
}

// Usage
<AtomInspector atom={myAtom} name="My Atom" />
```

### 3. Performance Profiler

Track atom computation performance:

```tsx
function createProfiledAtom<T>(computation: () => T, name: string) {
  return Atom.make(() => {
    const start = performance.now()
    const result = computation()
    const end = performance.now()
    
    if (end - start > 10) { // Log slow computations
      console.warn(`Slow atom computation: ${name} took ${end - start}ms`)
    }
    
    return result
  })
}
```

## Performance Debugging

### 1. Identifying Slow Atoms

```tsx
// Wrap expensive computations
const expensiveAtom = Atom.make((get) => {
  console.time('expensive-computation')
  const result = heavyComputation(get(dataAtom))
  console.timeEnd('expensive-computation')
  return result
})
```

### 2. Subscription Tracking

```tsx
// Track subscription count
let subscriptionCount = 0

const trackedAtom = Atom.make((get) => {
  subscriptionCount++
  console.log(`Atom subscriptions: ${subscriptionCount}`)
  return get(baseAtom) * 2
})
```

### 3. Bundle Size Analysis

Check what's being imported:

```bash
# Analyze bundle size
pnpm add -D @rollup/plugin-analyzer
```

```tsx
// Check imports
import { Atom } from '@effect-atom/atom-solid' // ✅ Tree-shakeable
import * as AtomSolid from '@effect-atom/atom-solid' // ❌ Imports everything
```

## SSR Debugging

### 1. Hydration Mismatches

```tsx
// Debug hydration state
function DebugHydration() {
  const [isHydrated, setIsHydrated] = createSignal(false)
  
  onMount(() => {
    setIsHydrated(true)
  })
  
  return (
    <div>
      <p>Hydration status: {isHydrated() ? 'Hydrated' : 'SSR'}</p>
      {/* Your components */}
    </div>
  )
}
```

### 2. SSR State Inspection

```tsx
// Server-side debugging
export async function renderApp() {
  const registry = createSSRRegistry()
  
  // Debug preloaded atoms
  const result = await preloadAtoms(registry, criticalAtoms)
  console.log('SSR State:', {
    atoms: result.dehydratedState.length,
    errors: result.errors,
    timeouts: result.timeouts
  })
  
  return { html, state: result.dehydratedState }
}
```

## Error Handling

### 1. Atom Error Boundaries

```tsx
function AtomErrorBoundary(props: { children: JSX.Element }) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div>
          <h2>Atom Error</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{err.stack}</pre>
          </details>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      {props.children}
    </ErrorBoundary>
  )
}
```

### 2. Effect Error Handling

```tsx
const resilientAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise(() => 
      fetch('/api/data').then(r => r.json())
    ).pipe(
      Effect.timeout('5000ms'),
      Effect.retry({ times: 3 }),
      Effect.catchAll((error) => {
        console.error('Atom error:', error)
        return Effect.succeed({ error: true, message: error.message })
      })
    )
    return data
  })
)
```

### 3. Development Warnings

```tsx
// Add development-only warnings
if (import.meta.env.DEV) {
  const warnSlowAtoms = (atom: Atom.Atom<any>, time: number) => {
    if (time > 100) {
      console.warn(`Slow atom detected: ${atom.toString()} took ${time}ms`)
    }
  }
  
  // Patch atom creation to add timing
  const originalMake = Atom.make
  Atom.make = function(...args) {
    const atom = originalMake.apply(this, args)
    // Add timing wrapper
    return atom
  }
}
```

## Best Practices

### 1. Naming Conventions

```tsx
// Use descriptive names
const userProfileAtom = Atom.make(null) // ✅
const atom1 = Atom.make(null) // ❌

// Add labels for debugging
const debugAtom = Atom.make(0).pipe(
  Atom.withLabel('counter-debug')
)
```

### 2. Error Reporting

```tsx
// Centralized error reporting
const errorReportingAtom = Atom.fn((get, error: Error) =>
  Effect.gen(function* () {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Atom error:', error)
    }
    
    // Report to service in production
    if (import.meta.env.PROD) {
      yield* Effect.tryPromise(() =>
        fetch('/api/errors', {
          method: 'POST',
          body: JSON.stringify({ error: error.message, stack: error.stack })
        })
      )
    }
  })
)
```

### 3. Testing Helpers

```tsx
// Test utilities
export function createTestRegistry() {
  const registry = Registry.make()
  
  // Add debugging helpers
  registry.debug = {
    getAtomCount: () => registry.getNodes().size,
    logState: () => console.log(Array.from(registry.getNodes().entries()))
  }
  
  return registry
}
```

This debugging guide provides comprehensive tools and techniques for troubleshooting `@effect-atom/atom-solid` applications in development and production environments.
