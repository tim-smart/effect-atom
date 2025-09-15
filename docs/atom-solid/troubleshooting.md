---
title: "Troubleshooting"
parent: "@effect-atom/atom-solid"
nav_order: 6
---

# Troubleshooting

Common problems and solutions when using `@effect-atom/atom-solid`.

## Table of Contents

- [Installation Issues](#installation-issues)
- [TypeScript Errors](#typescript-errors)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [SolidJS Specific Issues](#solidjs-specific-issues)

## Installation Issues

### Peer Dependency Warnings

**Problem**: Warnings about peer dependencies during installation.

```bash
npm WARN peer dep missing: solid-js@^1.8.0, required by @effect-atom/atom-solid
```

**Solution**: Install the required peer dependencies:

```bash
pnpm add solid-js effect
# or
npm install solid-js effect
```

### Version Conflicts

**Problem**: Conflicting versions of Effect or SolidJS.

**Solution**: Check your package.json and ensure compatible versions:

```json
{
  "dependencies": {
    "solid-js": "^1.8.0",
    "effect": "^3.0.0",
    "@effect-atom/atom-solid": "^0.1.0"
  }
}
```

## TypeScript Errors

### Generic Type Inference Issues

**Problem**: TypeScript can't infer atom types correctly.

```tsx
// ❌ Error: Type 'unknown' is not assignable to type 'string'
const atom = Atom.make()
const [value, setValue] = useAtom(() => atom)
setValue("hello") // Error here
```

**Solution**: Provide explicit types:

```tsx
// ✅ Explicit type annotation
const atom = Atom.make<string>("initial")
const [value, setValue] = useAtom(() => atom)
setValue("hello") // Works!

// ✅ Or use type assertion
const atom = Atom.make("initial") // Inferred as Atom<string>
```

### Effect Type Errors

**Problem**: Complex Effect types causing TypeScript errors.

```tsx
// ❌ Complex Effect type
const complexAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const a = yield* Effect.succeed(1)
    const b = yield* Effect.fail("error")
    return a + b
  })
)
```

**Solution**: Simplify or add explicit types:

```tsx
// ✅ Explicit return type
const complexAtom = Atom.fn((): Effect.Effect<number, string> =>
  Effect.gen(function* () {
    const a = yield* Effect.succeed(1)
    const b = yield* Effect.fail("error")
    return a + b
  })
)
```

### Module Resolution Issues

**Problem**: TypeScript can't find module declarations.

```tsx
// ❌ Cannot find module '@effect-atom/atom-solid'
import { Atom } from '@effect-atom/atom-solid'
```

**Solution**: Check your tsconfig.json:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "jsxImportSource": "solid-js"
  }
}
```

## Runtime Errors

### "Atom is not defined" Error

**Problem**: Atom is undefined at runtime.

```tsx
// ❌ Atom created inside component
function MyComponent() {
  const atom = Atom.make(0) // Creates new atom on every render
  // ...
}
```

**Solution**: Create atoms outside components:

```tsx
// ✅ Atom created outside component
const counterAtom = Atom.make(0)

function MyComponent() {
  const [count, setCount] = useAtom(() => counterAtom)
  // ...
}
```

### Registry Not Found Error

**Problem**: Using hooks outside of RegistryProvider.

```tsx
// ❌ No RegistryProvider
function App() {
  const value = useAtomValue(() => myAtom) // Error!
  return <div>{value()}</div>
}
```

**Solution**: Wrap your app with RegistryProvider:

```tsx
// ✅ With RegistryProvider
function App() {
  return (
    <RegistryProvider>
      <MyComponent />
    </RegistryProvider>
  )
}

function MyComponent() {
  const value = useAtomValue(() => myAtom) // Works!
  return <div>{value()}</div>
}
```

### Circular Dependency Error

**Problem**: Atoms depend on each other circularly.

```tsx
// ❌ Circular dependency
const atomA = Atom.make((get) => get(atomB) + 1)
const atomB = Atom.make((get) => get(atomA) + 1) // Error!
```

**Solution**: Restructure dependencies:

```tsx
// ✅ Use a base atom
const baseAtom = Atom.make(0)
const atomA = Atom.make((get) => get(baseAtom) + 1)
const atomB = Atom.make((get) => get(baseAtom) + 2)

// ✅ Or use a derived pattern
const configAtom = Atom.make({ a: 1, b: 2 })
const atomA = Atom.make((get) => get(configAtom).a)
const atomB = Atom.make((get) => get(configAtom).b)
```

## Performance Issues

### Slow Rendering

**Problem**: UI updates are slow or janky.

**Diagnosis**: Check for expensive computations in atoms:

```tsx
// ❌ Expensive computation on every access
const expensiveAtom = Atom.make((get) => {
  const data = get(dataAtom)
  return data.map(item => heavyComputation(item)) // Slow!
})
```

**Solution**: Optimize computations:

```tsx
// ✅ Memoize expensive computations
const expensiveAtom = Atom.make((get) => {
  const data = get(dataAtom)
  return data.map(item => memoizedHeavyComputation(item))
})

// ✅ Or split into smaller atoms
const processedDataAtom = Atom.make((get) => {
  const data = get(dataAtom)
  return data.map(processItem)
})
```

### Memory Leaks

**Problem**: Memory usage keeps growing.

**Diagnosis**: Check for atoms that aren't being cleaned up:

```tsx
// ❌ keepAlive atoms without cleanup
const persistentAtom = Atom.make(data).pipe(Atom.keepAlive)
```

**Solution**: Proper cleanup:

```tsx
// ✅ Auto-dispose atoms (default behavior)
const autoAtom = Atom.make(data) // Cleaned up when not used

// ✅ Manual cleanup for keepAlive atoms
onCleanup(() => {
  registry.dispose()
})
```

### Too Many Re-renders

**Problem**: Components re-render too frequently.

**Diagnosis**: Check atom dependencies:

```tsx
// ❌ Atom depends on frequently changing data
const derivedAtom = Atom.make((get) => {
  const timestamp = get(timestampAtom) // Updates every second
  const data = get(dataAtom)
  return { data, timestamp }
})
```

**Solution**: Split dependencies:

```tsx
// ✅ Separate concerns
const dataAtom = Atom.make(initialData)
const timestampAtom = Atom.make(Date.now())

// Only subscribe to what you need
function MyComponent() {
  const data = useAtomValue(() => dataAtom) // Only updates when data changes
  return <div>{JSON.stringify(data())}</div>
}
```

## SolidJS Specific Issues

### Signal vs Atom Confusion

**Problem**: Mixing SolidJS signals with atoms incorrectly.

```tsx
// ❌ Don't mix signals and atoms directly
const [signal, setSignal] = createSignal(0)
const atom = Atom.make((get) => signal()) // Won't react to signal changes
```

**Solution**: Use atoms consistently:

```tsx
// ✅ Use atoms for shared state
const atom = Atom.make(0)
const [value, setValue] = useAtom(() => atom)

// ✅ Or convert signals to atoms if needed
const signalAtom = Atom.make(() => signal())
```

### SSR Hydration Issues

**Problem**: Hydration mismatches between server and client.

```tsx
// ❌ Different values on server vs client
const timeAtom = Atom.make(new Date().toISOString())
```

**Solution**: Use SSR-safe patterns:

```tsx
// ✅ SSR-safe atom
const timeAtom = Atom.make(() => {
  if (typeof window === 'undefined') {
    return 'SSR' // Server value
  }
  return new Date().toISOString() // Client value
})

// ✅ Or use SSR utilities
const ssrTimeAtom = createSSRAtom('SSR', clientTimeAtom)
```

### Suspense Boundary Issues

**Problem**: Suspense boundaries not working with async atoms.

```tsx
// ❌ Using regular useAtomValue with async atom
function MyComponent() {
  const data = useAtomValue(() => asyncAtom) // May not suspend properly
  return <div>{data()}</div>
}
```

**Solution**: Use proper suspense hooks:

```tsx
// ✅ Use useAtomSuspense for async atoms
function MyComponent() {
  const data = useAtomSuspense(() => asyncAtom)
  return <div>{data}</div>
}

// ✅ Or handle loading states manually
function MyComponent() {
  const result = useAtomValue(() => asyncAtom)
  
  return (
    <div>
      {result()._tag === 'Success' && <div>{result().value}</div>}
      {result()._tag === 'Initial' && <div>Loading...</div>}
      {result()._tag === 'Failure' && <div>Error occurred</div>}
    </div>
  )
}
```

## Getting Help

If you're still experiencing issues:

1. **Check the documentation**: Review the [guides](./guides.md) and [examples](./examples.md)
2. **Search existing issues**: Look through [GitHub issues](https://github.com/effect-ts/atom/issues)
3. **Create a minimal reproduction**: Use [StackBlitz](https://stackblitz.com) or [CodeSandbox](https://codesandbox.io)
4. **Ask for help**: Open a new issue with your reproduction case

## Common Patterns

### Debugging Checklist

When something isn't working:

- [ ] Is the atom created outside the component?
- [ ] Is the component wrapped in RegistryProvider?
- [ ] Are you using the correct hook for your use case?
- [ ] Are there any circular dependencies?
- [ ] Is TypeScript configured correctly?
- [ ] Are peer dependencies installed?

### Performance Checklist

When performance is poor:

- [ ] Are expensive computations memoized?
- [ ] Are atoms split appropriately?
- [ ] Are you avoiding unnecessary re-renders?
- [ ] Are keepAlive atoms cleaned up properly?
- [ ] Is the bundle size reasonable?
