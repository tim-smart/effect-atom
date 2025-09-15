---
title: "Primitives.ts"
parent: "@effect-atom/atom-solid"
nav_order: 2
---

# Primitives

Core hooks for integrating Effect atoms with SolidJS components.

## useAtomValue

Read the current value of an atom and subscribe to changes.

### Signature

```typescript
export const useAtomValue: {
  <A>(atomFactory: () => Atom.Atom<A>): Accessor<A>
  <A, B>(atomFactory: () => Atom.Atom<A>, f: (_: A) => B): Accessor<B>
}
```

### Parameters

- `atomFactory`: A function that returns the atom to read from
- `f` (optional): Transform function to apply to the atom value

### Returns

A SolidJS `Accessor` that returns the current atom value.

### Examples

#### Basic Usage

```tsx
import { Atom } from "@effect-atom/atom"
import { useAtomValue } from "@effect-atom/atom-solid"

const nameAtom = Atom.make("John")

function DisplayName() {
  const name = useAtomValue(() => nameAtom)
  
  return <p>Hello, {name()}!</p>
}
```

#### With Transform Function

```tsx
const countAtom = Atom.make(5)

function DisplayDoubled() {
  const doubled = useAtomValue(() => countAtom, (count) => count * 2)
  
  return <p>Doubled: {doubled()}</p>
}
```

#### With Computed Atoms

```tsx
const firstNameAtom = Atom.make("John")
const lastNameAtom = Atom.make("Doe")
const fullNameAtom = Atom.make((get) => 
  `${get(firstNameAtom)} ${get(lastNameAtom)}`
)

function DisplayFullName() {
  const fullName = useAtomValue(() => fullNameAtom)
  
  return <p>Full name: {fullName()}</p>
}
```

---

## useAtom

Get both the current value and a setter function for an atom.

### Signature

```typescript
export const useAtom: <A>(
  atomFactory: () => Atom.Writable<A, A>
) => readonly [Accessor<A>, (value: A | ((prev: A) => A)) => void]
```

### Parameters

- `atomFactory`: A function that returns a writable atom

### Returns

A tuple containing:
1. `Accessor<A>`: The current atom value
2. `(value: A | ((prev: A) => A)) => void`: Setter function

### Examples

#### Basic Usage

```tsx
import { Atom } from "@effect-atom/atom"
import { useAtom } from "@effect-atom/atom-solid"

const countAtom = Atom.make(0)

function Counter() {
  const [count, setCount] = useAtom(() => countAtom)
  
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  )
}
```

#### With Function Updater

```tsx
function Counter() {
  const [count, setCount] = useAtom(() => countAtom)
  
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(prev => prev + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(prev => prev - 1)}>
        Decrement
      </button>
    </div>
  )
}
```

#### Form Input

```tsx
const nameAtom = Atom.make("")

function NameInput() {
  const [name, setName] = useAtom(() => nameAtom)
  
  return (
    <input
      type="text"
      value={name()}
      onInput={(e) => setName(e.currentTarget.value)}
      placeholder="Enter your name"
    />
  )
}
```

---

## useAtomSet

Get only the setter function for an atom. Useful when you only need to update an atom without reading its value.

### Signature

```typescript
export const useAtomSet: <A>(
  atomFactory: () => Atom.Writable<A, A>
) => (value: A | ((prev: A) => A)) => void
```

### Parameters

- `atomFactory`: A function that returns a writable atom

### Returns

A setter function that can accept either a new value or an updater function.

### Examples

#### Reset Button

```tsx
import { Atom } from "@effect-atom/atom"
import { useAtomSet } from "@effect-atom/atom-solid"

const countAtom = Atom.make(0)

function ResetButton() {
  const resetCount = useAtomSet(() => countAtom)
  
  return (
    <button onClick={() => resetCount(0)}>
      Reset Counter
    </button>
  )
}
```

#### Action Buttons

```tsx
const todoListAtom = Atom.make<string[]>([])

function TodoActions() {
  const setTodos = useAtomSet(() => todoListAtom)
  
  const addTodo = (text: string) => {
    setTodos(prev => [...prev, text])
  }
  
  const clearAll = () => {
    setTodos([])
  }
  
  return (
    <div>
      <button onClick={() => addTodo("New todo")}>
        Add Todo
      </button>
      <button onClick={clearAll}>
        Clear All
      </button>
    </div>
  )
}
```

---

## Performance Notes

### Fine-grained Reactivity

SolidJS's fine-grained reactivity system ensures that only the specific parts of your UI that depend on changed atoms are updated. This means:

- **No component re-renders**: Unlike React, SolidJS doesn't re-render entire components
- **Surgical updates**: Only the DOM nodes that need to change are updated
- **Consistent performance**: Performance remains consistent regardless of component complexity

### Best Practices

1. **Use atom factories**: Always pass a function that returns the atom, not the atom directly:
   ```tsx
   // ✅ Good
   const value = useAtomValue(() => myAtom)
   
   // ❌ Bad
   const value = useAtomValue(myAtom)
   ```

2. **Memoize expensive computations**: Use computed atoms for expensive calculations:
   ```tsx
   // ✅ Good - computed once, cached
   const expensiveAtom = Atom.make((get) => expensiveCalculation(get(dataAtom)))
   
   // ❌ Bad - recalculated on every render
   const value = useAtomValue(() => dataAtom, expensiveCalculation)
   ```

3. **Prefer useAtomSet for write-only operations**: When you only need to update an atom:
   ```tsx
   // ✅ Good - no unnecessary subscription
   const setCount = useAtomSet(() => countAtom)
   
   // ❌ Bad - creates unnecessary subscription
   const [, setCount] = useAtom(() => countAtom)
   ```
