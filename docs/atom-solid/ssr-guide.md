---
title: "SSR Guide"
parent: "@effect-atom/atom-solid"
nav_order: 4
---

# Server-Side Rendering (SSR) Guide

Complete guide for using `@effect-atom/atom-solid` with Server-Side Rendering, including SolidStart integration.

## Table of Contents

- [Overview](#overview)
- [Basic SSR Setup](#basic-ssr-setup)
- [SolidStart Integration](#solidstart-integration)
- [Hydration Strategies](#hydration-strategies)
- [Best Practices](#best-practices)

## Overview

`@effect-atom/atom-solid` provides comprehensive SSR support through:

- **HydrationBoundary**: Component for managing client-side hydration
- **SSR Utilities**: Helper functions for server-side atom preloading
- **Isomorphic Atoms**: Atoms that behave differently on server vs client
- **State Serialization**: Safe serialization/deserialization of atom state

## Basic SSR Setup

### 1. Server-Side Rendering

```tsx
// server.tsx
import { renderToString } from 'solid-js/web'
import { RegistryProvider, createSSRRegistry, preloadAtoms, serializeState } from '@effect-atom/atom-solid'
import { App } from './App'
import { criticalAtoms } from './atoms'

export async function renderApp(url: string) {
  // Create SSR-optimized registry
  const registry = createSSRRegistry({
    timeout: 5000,
    includeErrors: false
  })
  
  // Preload critical atoms
  const ssrResult = await preloadAtoms(registry, criticalAtoms, {
    timeout: 3000
  })
  
  // Render app to string
  const html = renderToString(() => (
    <RegistryProvider registry={registry}>
      <App />
    </RegistryProvider>
  ))
  
  // Serialize state for client hydration
  const serializedState = serializeState(ssrResult.dehydratedState)
  
  return {
    html,
    state: serializedState,
    errors: ssrResult.errors,
    timeouts: ssrResult.timeouts
  }
}
```

### 2. Client-Side Hydration

```tsx
// client.tsx
import { hydrate } from 'solid-js/web'
import { 
  RegistryProvider, 
  HydrationBoundary, 
  deserializeState,
  markHydrationComplete 
} from '@effect-atom/atom-solid'
import { App } from './App'

// Get serialized state from server
const serializedState = document.getElementById('atom-state')?.textContent || '[]'
const dehydratedState = deserializeState(serializedState)

hydrate(() => (
  <RegistryProvider>
    <HydrationBoundary state={dehydratedState}>
      <App />
    </HydrationBoundary>
  </RegistryProvider>
), document.getElementById('root')!)

// Mark hydration as complete
markHydrationComplete()
```

### 3. HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSR App</title>
</head>
<body>
  <div id="root">{{HTML}}</div>
  <script id="atom-state" type="application/json">{{STATE}}</script>
  <script src="/client.js"></script>
</body>
</html>
```

## SolidStart Integration

### 1. Root Component Setup

```tsx
// src/root.tsx
import { Suspense } from 'solid-js'
import { 
  Body, 
  ErrorBoundary, 
  FileRoutes, 
  Head, 
  Html, 
  Meta, 
  Routes, 
  Scripts, 
  Title 
} from 'solid-start'
import { 
  RegistryProvider, 
  HydrationBoundary, 
  deserializeState 
} from '@effect-atom/atom-solid'

export default function Root() {
  // Get hydration state from server
  const getHydrationState = () => {
    if (typeof window !== 'undefined') {
      const stateElement = document.getElementById('atom-state')
      if (stateElement) {
        return deserializeState(stateElement.textContent || '[]')
      }
    }
    return []
  }
  
  return (
    <Html lang="en">
      <Head>
        <Title>SolidStart + Effect Atom</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <RegistryProvider>
              <HydrationBoundary state={getHydrationState()}>
                <Routes>
                  <FileRoutes />
                </Routes>
              </HydrationBoundary>
            </RegistryProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
```

### 2. Route-Level Data Loading

```tsx
// src/routes/users/[id].tsx
import { useParams, createRouteData } from 'solid-start'
import { 
  useAtomValue, 
  preloadAtoms, 
  createSSRRegistry,
  isSSR 
} from '@effect-atom/atom-solid'
import { userAtom, createUserAtom } from '~/atoms/user'

// Server-side data loading
export function routeData() {
  return createRouteData(async (key) => {
    const userId = key.params.id
    
    if (isSSR()) {
      // Preload user data on server
      const registry = createSSRRegistry()
      const userAtomInstance = createUserAtom(userId)
      
      const result = await preloadAtoms(registry, [userAtomInstance])
      return {
        userId,
        ssrState: result.dehydratedState
      }
    }
    
    return { userId, ssrState: [] }
  })
}

export default function UserPage() {
  const params = useParams()
  const data = useRouteData<typeof routeData>()
  
  // Create user atom for this specific user
  const userAtomInstance = () => createUserAtom(params.id)
  const user = useAtomValue(userAtomInstance)
  
  return (
    <div>
      <h1>User Profile</h1>
      {(() => {
        const userData = user()
        if (!userData) return <p>Loading...</p>
        
        return (
          <div>
            <h2>{userData.name}</h2>
            <p>{userData.email}</p>
          </div>
        )
      })()}
    </div>
  )
}
```

### 3. API Routes for Data

```tsx
// src/routes/api/users/[id].ts
import { json } from 'solid-start/api'
import type { APIEvent } from 'solid-start/api'

export async function GET({ params }: APIEvent) {
  const userId = params.id
  
  // Fetch user data from database
  const user = await fetchUserFromDB(userId)
  
  if (!user) {
    return new Response('User not found', { status: 404 })
  }
  
  return json(user)
}

async function fetchUserFromDB(id: string) {
  // Your database logic here
  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`
  }
}
```

## Hydration Strategies

### 1. Progressive Hydration

```tsx
// atoms/progressive.ts
import { Atom, createSSRAtom, isHydrating } from '@effect-atom/atom-solid'
import { Effect } from 'effect'

// Critical data that should be SSR'd
export const criticalDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise(() =>
      fetch('/api/critical-data').then(r => r.json())
    )
    return data
  })
)

// Non-critical data that can load after hydration
export const nonCriticalDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    // Only load after hydration is complete
    if (isHydrating()) {
      return null
    }
    
    const data = yield* Effect.tryPromise(() =>
      fetch('/api/non-critical-data').then(r => r.json())
    )
    return data
  })
)

// Fallback atom for SSR
export const userPreferencesAtom = createSSRAtom(
  // Server fallback
  { theme: 'light', language: 'en' },
  // Client atom
  Atom.fn(() =>
    Effect.gen(function* () {
      const prefs = localStorage.getItem('user-preferences')
      return prefs ? JSON.parse(prefs) : { theme: 'light', language: 'en' }
    })
  )
)
```

### 2. Selective Hydration

```tsx
// components/SelectiveHydration.tsx
import { createSignal, onMount } from 'solid-js'
import { useAtomValue, isSSR } from '@effect-atom/atom-solid'
import { heavyDataAtom } from '../atoms'

export function HeavyComponent() {
  const [shouldHydrate, setShouldHydrate] = createSignal(false)
  
  // Only hydrate when component becomes visible
  onMount(() => {
    if (!isSSR()) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setShouldHydrate(true)
          observer.disconnect()
        }
      })
      
      const element = document.getElementById('heavy-component')
      if (element) observer.observe(element)
    }
  })
  
  return (
    <div id="heavy-component">
      {shouldHydrate() ? (
        <HydratedContent />
      ) : (
        <div>Loading heavy content...</div>
      )}
    </div>
  )
}

function HydratedContent() {
  const data = useAtomValue(() => heavyDataAtom)
  
  return (
    <div>
      {/* Heavy content here */}
      <pre>{JSON.stringify(data(), null, 2)}</pre>
    </div>
  )
}
```

### 3. Error Boundaries for SSR

```tsx
// components/SSRErrorBoundary.tsx
import { ErrorBoundary } from 'solid-js'
import { isSSR } from '@effect-atom/atom-solid'

export function SSRErrorBoundary(props: { children: any }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        // Different error handling for SSR vs client
        if (isSSR()) {
          console.error('SSR Error:', error)
          return <div>Server error occurred</div>
        }
        
        return (
          <div class="error-boundary">
            <h2>Something went wrong</h2>
            <p>{error.message}</p>
            <button onClick={reset}>Try again</button>
          </div>
        )
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
```

## Best Practices

### 1. Critical vs Non-Critical Data

```tsx
// Identify critical atoms that should be SSR'd
const criticalAtoms = [
  userAtom,
  navigationAtom,
  themeAtom
]

// Non-critical atoms can load after hydration
const nonCriticalAtoms = [
  analyticsAtom,
  recommendationsAtom,
  adsAtom
]
```

### 2. Timeout Handling

```tsx
// Configure appropriate timeouts for different data types
const ssrConfig = {
  critical: { timeout: 2000 },
  normal: { timeout: 5000 },
  optional: { timeout: 1000 }
}
```

### 3. Error Recovery

```tsx
// Graceful degradation for SSR failures
export const resilientDataAtom = Atom.fn(() =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise(() =>
      fetch('/api/data').then(r => r.json())
    ).pipe(
      Effect.timeout('3000ms'),
      Effect.catchAll(() => 
        Effect.succeed({ fallback: true, message: 'Using fallback data' })
      )
    )
    return data
  })
)
```

### 4. Performance Monitoring

```tsx
// Monitor SSR performance
export async function renderWithMetrics(url: string) {
  const startTime = Date.now()
  
  const result = await renderApp(url)
  
  const metrics = {
    renderTime: Date.now() - startTime,
    atomsPreloaded: result.state.length,
    errors: result.errors.length,
    timeouts: result.timeouts.length
  }
  
  console.log('SSR Metrics:', metrics)
  
  return { ...result, metrics }
}
```

## Troubleshooting

### Common Issues

1. **Hydration Mismatches**: Ensure server and client render the same content
2. **Memory Leaks**: Use appropriate timeouts and cleanup in SSR context
3. **Performance**: Don't preload too many atoms on the server
4. **Error Handling**: Always provide fallbacks for failed atom loads

### Debug Tools

```tsx
// Debug SSR state
export function debugSSRState(registry: Registry) {
  const nodes = registry.getNodes()
  console.log('SSR Registry State:', {
    atomCount: nodes.size,
    atoms: Array.from(nodes.entries()).map(([atom, node]) => ({
      key: node.key,
      hasValue: registry.has(atom)
    }))
  })
}
```

This completes the comprehensive SSR guide for `@effect-atom/atom-solid`!
