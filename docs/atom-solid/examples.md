---
title: "Examples"
parent: "@effect-atom/atom-solid"
nav_order: 3
---

# Examples

Complete examples demonstrating various use cases with `@effect-atom/atom-solid`.

## Table of Contents

- [Todo App](#todo-app)
- [Shopping Cart](#shopping-cart)
- [Real-time Chat](#real-time-chat)
- [Data Dashboard](#data-dashboard)

## Todo App

A complete todo application demonstrating CRUD operations, filtering, and persistence.

### Atoms

```tsx
// atoms/todos.ts
import { Atom } from '@effect-atom/atom-solid'
import { Effect } from 'effect'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: Date
}

export type Filter = 'all' | 'active' | 'completed'

// Base atoms
export const todosAtom = Atom.make<Todo[]>([])
export const filterAtom = Atom.make<Filter>('all')

// Computed atoms
export const filteredTodosAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  const filter = get(filterAtom)
  
  switch (filter) {
    case 'active':
      return todos.filter(todo => !todo.completed)
    case 'completed':
      return todos.filter(todo => todo.completed)
    default:
      return todos
  }
})

export const todoStatsAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  const completed = todos.filter(todo => todo.completed).length
  const active = todos.length - completed
  
  return { total: todos.length, completed, active }
})

// Actions
export const addTodoAtom = Atom.fn((get, text: string) =>
  Effect.gen(function* () {
    const currentTodos = get(todosAtom)
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    }
    
    const updatedTodos = [...currentTodos, newTodo]
    yield* Effect.sync(() => todosAtom.set(updatedTodos))
    
    // Persist to localStorage
    yield* Effect.sync(() => 
      localStorage.setItem('todos', JSON.stringify(updatedTodos))
    )
    
    return newTodo
  })
)

export const toggleTodoAtom = Atom.fn((get, id: string) =>
  Effect.gen(function* () {
    const currentTodos = get(todosAtom)
    const updatedTodos = currentTodos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    
    yield* Effect.sync(() => todosAtom.set(updatedTodos))
    yield* Effect.sync(() => 
      localStorage.setItem('todos', JSON.stringify(updatedTodos))
    )
  })
)

export const deleteTodoAtom = Atom.fn((get, id: string) =>
  Effect.gen(function* () {
    const currentTodos = get(todosAtom)
    const updatedTodos = currentTodos.filter(todo => todo.id !== id)
    
    yield* Effect.sync(() => todosAtom.set(updatedTodos))
    yield* Effect.sync(() => 
      localStorage.setItem('todos', JSON.stringify(updatedTodos))
    )
  })
)
```

### Components

```tsx
// components/TodoApp.tsx
import { useAtomValue, useAtom, useAtomSet } from '@effect-atom/atom-solid'
import { createSignal, For } from 'solid-js'
import { 
  todosAtom, 
  filteredTodosAtom, 
  todoStatsAtom, 
  filterAtom,
  addTodoAtom,
  toggleTodoAtom,
  deleteTodoAtom,
  type Filter 
} from '../atoms/todos'

function TodoInput() {
  const [newTodo, setNewTodo] = createSignal('')
  const addTodo = useAtomSet(() => addTodoAtom)
  
  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const text = newTodo().trim()
    if (text) {
      addTodo(text)
      setNewTodo('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} class="todo-input">
      <input
        type="text"
        value={newTodo()}
        onInput={(e) => setNewTodo(e.currentTarget.value)}
        placeholder="What needs to be done?"
        class="new-todo"
      />
      <button type="submit" disabled={!newTodo().trim()}>
        Add Todo
      </button>
    </form>
  )
}

function TodoItem(props: { todo: Todo }) {
  const toggleTodo = useAtomSet(() => toggleTodoAtom)
  const deleteTodo = useAtomSet(() => deleteTodoAtom)
  
  return (
    <li class={`todo-item ${props.todo.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={props.todo.completed}
        onChange={() => toggleTodo(props.todo.id)}
      />
      <span class="todo-text">{props.todo.text}</span>
      <button 
        onClick={() => deleteTodo(props.todo.id)}
        class="delete-btn"
      >
        ×
      </button>
    </li>
  )
}

function TodoList() {
  const filteredTodos = useAtomValue(() => filteredTodosAtom)
  
  return (
    <ul class="todo-list">
      <For each={filteredTodos()}>
        {(todo) => <TodoItem todo={todo} />}
      </For>
      {filteredTodos().length === 0 && (
        <li class="empty-state">No todos found</li>
      )}
    </ul>
  )
}

function TodoFilters() {
  const [filter, setFilter] = useAtom(() => filterAtom)
  
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' }
  ]
  
  return (
    <div class="todo-filters">
      <For each={filters}>
        {(filterOption) => (
          <button
            class={`filter-btn ${filter() === filterOption.key ? 'active' : ''}`}
            onClick={() => setFilter(filterOption.key)}
          >
            {filterOption.label}
          </button>
        )}
      </For>
    </div>
  )
}

function TodoStats() {
  const stats = useAtomValue(() => todoStatsAtom)
  
  return (
    <div class="todo-stats">
      <span>Total: {stats().total}</span>
      <span>Active: {stats().active}</span>
      <span>Completed: {stats().completed}</span>
    </div>
  )
}

export function TodoApp() {
  return (
    <div class="todo-app">
      <h1>Todo App</h1>
      <TodoInput />
      <TodoFilters />
      <TodoList />
      <TodoStats />
    </div>
  )
}
```

## Shopping Cart

A shopping cart with product catalog, cart management, and checkout.

### Atoms

```tsx
// atoms/shopping.ts
import { Atom } from '@effect-atom/atom-solid'
import { Effect } from 'effect'

export interface Product {
  id: string
  name: string
  price: number
  image: string
  description: string
}

export interface CartItem {
  product: Product
  quantity: number
}

// Base atoms
export const productsAtom = Atom.make<Product[]>([])
export const cartAtom = Atom.make<CartItem[]>([])

// Computed atoms
export const cartTotalAtom = Atom.make((get) => {
  const cart = get(cartAtom)
  return cart.reduce((total, item) => 
    total + (item.product.price * item.quantity), 0
  )
})

export const cartItemCountAtom = Atom.make((get) => {
  const cart = get(cartAtom)
  return cart.reduce((count, item) => count + item.quantity, 0)
})

// Actions
export const addToCartAtom = Atom.fn((get, product: Product, quantity = 1) =>
  Effect.gen(function* () {
    const currentCart = get(cartAtom)
    const existingItem = currentCart.find(item => item.product.id === product.id)
    
    let updatedCart: CartItem[]
    if (existingItem) {
      updatedCart = currentCart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      updatedCart = [...currentCart, { product, quantity }]
    }
    
    yield* Effect.sync(() => cartAtom.set(updatedCart))
  })
)

export const removeFromCartAtom = Atom.fn((get, productId: string) =>
  Effect.gen(function* () {
    const currentCart = get(cartAtom)
    const updatedCart = currentCart.filter(item => item.product.id !== productId)
    yield* Effect.sync(() => cartAtom.set(updatedCart))
  })
)

export const updateQuantityAtom = Atom.fn((get, productId: string, quantity: number) =>
  Effect.gen(function* () {
    const currentCart = get(cartAtom)
    
    if (quantity <= 0) {
      const updatedCart = currentCart.filter(item => item.product.id !== productId)
      yield* Effect.sync(() => cartAtom.set(updatedCart))
    } else {
      const updatedCart = currentCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
      yield* Effect.sync(() => cartAtom.set(updatedCart))
    }
  })
)
```

### Components

```tsx
// components/ShoppingApp.tsx
import { useAtomValue, useAtomSet } from '@effect-atom/atom-solid'
import { For } from 'solid-js'
import { 
  productsAtom,
  cartAtom,
  cartTotalAtom,
  cartItemCountAtom,
  addToCartAtom,
  removeFromCartAtom,
  updateQuantityAtom,
  type Product 
} from '../atoms/shopping'

function ProductCard(props: { product: Product }) {
  const addToCart = useAtomSet(() => addToCartAtom)
  
  return (
    <div class="product-card">
      <img src={props.product.image} alt={props.product.name} />
      <h3>{props.product.name}</h3>
      <p class="description">{props.product.description}</p>
      <p class="price">${props.product.price.toFixed(2)}</p>
      <button 
        onClick={() => addToCart(props.product)}
        class="add-to-cart-btn"
      >
        Add to Cart
      </button>
    </div>
  )
}

function ProductCatalog() {
  const products = useAtomValue(() => productsAtom)
  
  return (
    <div class="product-catalog">
      <h2>Products</h2>
      <div class="product-grid">
        <For each={products()}>
          {(product) => <ProductCard product={product} />}
        </For>
      </div>
    </div>
  )
}

function CartItem(props: { item: CartItem }) {
  const updateQuantity = useAtomSet(() => updateQuantityAtom)
  const removeFromCart = useAtomSet(() => removeFromCartAtom)
  
  return (
    <div class="cart-item">
      <img src={props.item.product.image} alt={props.item.product.name} />
      <div class="item-details">
        <h4>{props.item.product.name}</h4>
        <p>${props.item.product.price.toFixed(2)}</p>
      </div>
      <div class="quantity-controls">
        <button 
          onClick={() => updateQuantity(props.item.product.id, props.item.quantity - 1)}
        >
          -
        </button>
        <span>{props.item.quantity}</span>
        <button 
          onClick={() => updateQuantity(props.item.product.id, props.item.quantity + 1)}
        >
          +
        </button>
      </div>
      <button 
        onClick={() => removeFromCart(props.item.product.id)}
        class="remove-btn"
      >
        Remove
      </button>
    </div>
  )
}

function ShoppingCart() {
  const cart = useAtomValue(() => cartAtom)
  const total = useAtomValue(() => cartTotalAtom)
  
  return (
    <div class="shopping-cart">
      <h2>Shopping Cart</h2>
      {cart().length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          <For each={cart()}>
            {(item) => <CartItem item={item} />}
          </For>
          <div class="cart-total">
            <h3>Total: ${total().toFixed(2)}</h3>
            <button class="checkout-btn">Checkout</button>
          </div>
        </>
      )}
    </div>
  )
}

function CartBadge() {
  const itemCount = useAtomValue(() => cartItemCountAtom)
  
  return (
    <div class="cart-badge">
      🛒 {itemCount() > 0 && <span class="badge">{itemCount()}</span>}
    </div>
  )
}

export function ShoppingApp() {
  return (
    <div class="shopping-app">
      <header>
        <h1>Shopping App</h1>
        <CartBadge />
      </header>
      <main>
        <ProductCatalog />
        <ShoppingCart />
      </main>
    </div>
  )
}
```
