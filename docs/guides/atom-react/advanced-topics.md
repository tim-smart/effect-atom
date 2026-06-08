---
title: "Advanced Topics: The Dependency Graph"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/advanced-topics
nav_order: 6
---

# Advanced Topics: The Dependency Graph

The earlier guides treat atoms as a high-level reactive primitive. To use
effect-atom well in larger applications and to confidently choose between
`RegistryProvider`, runtimes, and `ScopedAtom`, it helps to understand the
machinery underneath. This page explains the dependency graph that effect-atom
maintains at runtime, how runtimes plug into it, and how `ScopedAtom` fits
alongside it.

## Atoms vs Nodes

An [Atom](/atom/Atom.ts) is a *descriptor*. It's a plain immutable object
with a `read` function (and optionally `write`, `refresh`, etc.). Defining an
atom does not run anything or allocate any state. It just describes how the
value would be produced if it were ever needed.

State lives in a [Registry](/atom/Registry.ts). When something asks the
registry for an atom's value (via a hook, `registry.get(...)`, or a `get`
call from another atom's read function), the registry creates a *node* for
that atom and caches the result there. Subsequent reads return the cached
value, and subscriptions and lifetimes are attached to the node.

```
  Atom (descriptor)              Node (state in a Registry)
  ─────────────────              ─────────────────────────
   read: ...                      value
   refresh?: ...                  parents, children
   keepAlive: false               listeners
   idleTTL?: 30_000               lifetime / scope
                                  state: uninitialized | stale | valid
```

The same `Atom` referenced in two different registries lives as two
*different nodes*, with independent caches, subscriptions, and lifetimes.
This is why [RegistryProvider](/atom-react/RegistryContext.ts) gives you
isolation per subtree.

## How the Graph is Built

When an atom's `read` function calls `get(otherAtom)`, the registry records
a **parent → child** relationship between their nodes:

- `otherAtom` becomes a *parent* of the calling atom.
- The calling atom becomes a *child* of `otherAtom`.

Children are notified when a parent's value changes; parents are kept alive
as long as they have at least one child (or listener) holding them.

Consider:

```typescript
const A = Atom.make(1);
const B = Atom.make((get) => get(A) + 1);
const C = Atom.make((get) => get(B) * 10);
```

After mounting `C`, the graph looks like:

```
   A (1) ── child ──► B (2) ── child ──► C (20)
         ◄── parent ──     ◄── parent ──
```

When `A` is updated to `2`:

1. `A`'s node calls `setValue(2)`.
2. Because the value changed, `A` invalidates its children and `B` is marked stale.
3. Any listeners on `B` (or active children of `B`) cause `B` to recompute,
   which produces `3`. `B` then invalidates `C`.
4. `C` recomputes to `30` and notifies its listeners (React components).

Two important details:

- **Equality short-circuits**. `setValue` uses `Equal.equals` from
  `effect/Equal` to skip propagation when the new value is structurally equal
  to the old. Atoms that produce `Data`-shaped values or `Schema`-decoded
  classes benefit automatically.
- **Lazy propagation**. If a stale node has no listeners and no active
  children, it doesn't recompute eagerly, it stays stale and only recomputes
  when next read. This is what makes the graph cheap; idle parts of the tree
  don't do work.

## Node Lifetimes and Cleanup

When a node is created, the registry checks whether its atom is `keepAlive`.
If not, a removal is scheduled but only takes effect when the node has
**no listeners and no children**.

This means an atom is automatically retained as long as:

1. A component is mounted that uses it (listener), **or**
2. Another atom is using it as a dependency (child), **or**
3. The atom is explicitly marked `Atom.keepAlive`.

If all of those drop to zero, the node is eligible for removal. The
[idleTTL](/atom/Atom.ts#setidlettl) option lets you keep nodes around for a
grace period after they become idle, useful for avoiding refetch flicker
when a user navigates away and back.

When a node *is* removed, the registry:

1. Sets its state to `removed`, clears all listeners.
2. Disposes its **lifetime** which runs any finalizers added during the
   read function (closing scopes, cancelling effects, unsubscribing streams).
3. Removes itself as a child from each of its parents. Parents that become
   eligible for removal in turn are scheduled.

The lifetime is the key abstraction: anything an atom does that needs cleanup
(`Effect.scoped`, stream subscriptions, manual `addFinalizer` calls, the
runtime atom's layer scope) is tied to it.

## Runtimes Are Part of the Graph

[`Atom.runtime(layer)`](/atom/Atom.ts#runtime) doesn't create a separate
mechanism for managing layers it produces an atom whose value is a built
`Runtime<R>`. That runtime atom participates in the same dependency graph as
any other atom.

Specifically, the factory creates two atoms:

- **`AppRuntime.layer`**: an atom that returns the composed Layer (with the
  framework's `Reactivity.layer` merged in). This is held in the graph and
  read by the runtime atom below.
- **`AppRuntime`** itself: the runtime atom. Its `read` function:
  1. Calls `get(AppRuntime.layer)` to fetch the layer, establishing a
     parent → child link.
  2. Builds the layer with the framework's shared
     [`Layer.MemoMap`](https://effect.website/docs/requirements-management/layer-memoization/),
     into a `Scope` provided by the node's lifetime.
  3. Returns a `Result.Success(runtime)`.

When you write `AppRuntime.atom(effect)`, you get a `readable` atom whose
`read` function does `get(AppRuntime)`, takes the runtime out of the
`Result`, and runs your effect through it. That call also establishes a
parent → child relationship, so:

```
   AppRuntime.layer ── child ──► AppRuntime ── child ──► MessagesAtom
                    ◄── parent ──            ◄── parent ──
```

Several consequences fall out of this:

- **Layer-building is lazy.** The layer is not built until some atom reads
  the runtime atom. If you never use it in a given registry, the layer
  scope never opens.
- **Layer-building is per-registry.** Each `Registry` builds its own scope
  off the layer, which is why a `RegistryProvider` gives you genuine
  isolation in tests. Your test registry has a completely separate runtime
  from production.
- **The `MemoMap` is shared.** If two `Atom.runtime` instances reference the
  same sub-layer, Effect's `Layer.MemoMap` deduplicates it. Use this when
  several runtimes share common services.
- **Refreshing the runtime rebuilds the layer.** Calling
  `registry.refresh(AppRuntime)` invalidates the runtime atom, which
  disposes its lifetime, closing the layer's scope and releasing all of
  the layer's resources. The next read rebuilds it.
- **Refreshing an atom built from the runtime does *not* rebuild the layer.**
  Refreshing `MessagesAtom` invalidates only its own node. When it
  recomputes, `get(AppRuntime)` returns the cached, still-valid runtime, and
  only your effect re-runs. This is the right semantics for "refresh this
  data."

This is also why test-mocking via `RegistryProvider`'s `initialValues` works:
seeding a value for `AppRuntime` or `AppRuntime.layer` replaces what the
graph sees at that node, and every downstream atom transparently uses the
substituted value.

## SSR and the Module-Scoped Default Registry

[RegistryContext](/atom-react/RegistryContext.ts) is created with a real
`Registry` as its *default value*:

```typescript
export const RegistryContext = React.createContext<Registry>(Registry.make({
  scheduleTask,
  defaultIdleTTL: 400
}));
```

Because that `Registry.make(...)` call runs at module load, the resulting
instance is **module-scoped**. There's one per Node process / browser tab,
and it persists for the lifetime of that process. Every component that
doesn't have a closer `RegistryProvider` above it shares it.

For a client-only SPA this is fine: there's exactly one user, one tab, and
one registry that lives for the lifetime of the page. For SSR it's
actively dangerous.

### Why the default registry breaks under SSR

A Node server typically reuses the same module across concurrent requests.
If every request reads atoms through the module-scoped default registry,
you get a single graph shared by all of them:

```
                  ┌─────────────────────────┐
                  │  default singleton      │
                  │  Registry (module-      │
                  │  scoped)                │
Request A ──read──┤   userAtom → {id:1}     ├──read── Request B
Request B ──write─┤   userAtom → {id:2}     │
                  │   ...                   │
                  └─────────────────────────┘
```

Three concrete failure modes follow:

- **State leakage between users.** Request A's render writes
  `userAtom = Result.Success({id:1})` to the registry. Request B reads
  the same atom moments later and sees user 1's data, because the cache
  is shared. This is a real correctness and privacy bug, not a
  theoretical one.
- **Races during concurrent rendering.** Two requests that touch the same
  atom both call `setValue` — they race; one wins; both renders end up
  with the wrong data.
- **Cache growth across requests.** The registry's idle TTL gives nodes a
  grace period before removal. Under load, the cache accumulates faster
  than it evicts.

Per-request registries (via `RegistryProvider` or a manual
`RegistryContext.Provider` wrapping the SSR render) eliminate all three,
because each request has its own graph.

### What's actually shared vs per-request

There are two distinct things to keep straight:

1. **Atom descriptors**: `const messagesAtom = Atom.make(...)`. These are
   module-level constants. They're imported once per Node process and stay
   around for its entire lifetime. They're shared across every request on
   that server instance, which is fine. That's just how JS modules work.
2. **Atom values**: the cached results stored in a `Registry`. *This* is
   what needs to be isolated per request.

The module-scoped singleton in `RegistryContext` shares (2) across
requests, which is the source of the trouble. Sharing (1) is unavoidable
and harmless.

### "Wouldn't I want some things shared across requests?"

Yes, but at a different level. You don't want to rebuild a database
connection pool, an HTTP client, or any other expensive layer service for
every single request. Effect-atom already handles this for you, through
the [`Layer.MemoMap`](/atom/Atom.ts#defaultmemomap):

```typescript
export const defaultMemoMap: Layer.MemoMap = globalValue(
  "@effect-atom/atom/Atom/defaultMemoMap",
  () => Effect.runSync(Layer.makeMemoMap)
);

export const runtime: RuntimeFactory = globalValue(
  "@effect-atom/atom/Atom/defaultContext",
  () => context({ memoMap: defaultMemoMap })
);
```

`defaultMemoMap` is a process-global `globalValue`. There is exactly one for the
lifetime of the process, and every runtime atom passes it to
`Layer.buildWithMemoMap` when building its layer. When Request A's
registry builds the runtime, the layer is built into the MemoMap. When
Request B's registry builds the same runtime, the MemoMap returns the
already-built services rather than rebuilding them.

So the SSR picture looks like this:

```
   Process-wide                                Per-request
   ─────────────                               ────────────
   module-level Atom descriptors               Request A's Registry
   default Layer.MemoMap          ◄──build──── Request B's Registry
   (DB pool, HTTP client, ...)                 Request C's Registry
```

You get the best of both worlds: cheap setup (no rebuilding services per
request) and correct isolation (no atom state leakage).

### When you really do want cross-request value caching

The rare case where you genuinely want an atom's *cached value* to survive
across requests is almost always better expressed differently:

1. **Just a constant.** If it's truly static, declare it as data, not as
   an atom.
2. **A layer service with internal caching.** Write a `CacheService` that
   lives in your layer; it'll be shared via the MemoMap. The atom that
   reads from it gets fresh values per request, but the cache itself is
   process-wide.
3. **Framework-level caching.** Next.js's `fetch` cache, ISR, the edge
   cache, or a CDN. These tools are purpose-built for cross-request
   caching and handle invalidation properly.
4. **A dedicated cache layer.** Redis, an in-memory LRU service, etc.,
   wrapped as a Layer like any other service.

What you almost never want is to lean on registry state for cross-request
caching. It'll bite you the moment one of those "atoms" turns out to be
user-scoped or has any per-request derivation in its dependency graph.

### The recommended SSR pattern

For Next.js App Router (and any other framework that calls your root
component fresh per request), mount the provider in the root layout:

```typescript
"use client";
import { RegistryProvider } from "@effect-atom/atom-react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <RegistryProvider>{children}</RegistryProvider>
      </body>
    </html>
  );
}
```

Each render call gets its own `RegistryProvider`, which `useRef`s a
freshly-made `Registry`. The first read of the runtime atom builds the
layer through `defaultMemoMap`, so the underlying services are reused
across requests, but the atom values (caches, subscriptions, lifetimes)
are per-request.

When the request finishes and the React tree is discarded,
`RegistryProvider`'s 500ms-delayed cleanup eventually disposes the
registry's scope. That releases the request's claim on its MemoMap
entries; the underlying layer stays alive as long as some other request
references it.

## Where `ScopedAtom` Fits

This section covers the mechanics of how `ScopedAtom` interacts with the
graph. For the practical guide on when to reach for one, common patterns,
and gotchas, see [Scoped Atoms](/guides/atom-react/scoped-atoms).

`ScopedAtom` lives one level *above* the dependency graph. It is a React
Context wrapper, not a registry primitive.

A `ScopedAtom` wraps a factory `() => Atom<A>` (or `(input) => Atom<A>`) so
that each `<Provider>` boundary calls the factory once and stores the
resulting atom in a ref. Components inside that boundary call `.use()` to
read the atom from React Context. The returned atom is then used with the
normal hooks and lives in whatever `Registry` the subtree is using.

So:

| Concern | `RegistryProvider` | `ScopedAtom` |
|---|---|---|
| What gets swapped | The `Registry` instance (all node state) | One `Atom` identity per Provider boundary |
| Where it lives | Inside the dependency graph | One level above — produces atoms that go *into* the graph |
| Affects | All atoms in the subtree share fresh state | Only the specific atoms wrapped in `ScopedAtom` |
| Atom references | Same atom object app-wide | Different atom object per Provider boundary |

A useful way to picture it:

```
   <RegistryProvider>                     // swaps the Registry (graph) 
     <ScopedFoo.Provider value={x}>       // chooses which Foo Atom is "Foo" here
       <Component />                       // .use() returns the Foo Atom
     </ScopedFoo.Provider>                 //   that gets stored as a node
   </RegistryProvider>                     //   in the current Registry
```

### When to reach for `ScopedAtom`

The dependency graph already supports the common "swap a service" case
through `Atom.runtime` and `initialValues`. `ScopedAtom` is useful when atom
*identity* itself needs to vary per subtree, situations the graph alone
cannot express:

- **Per-subtree state**. Two panels need their own independent count, form,
  or selection. Each rendered under a different `ScopedAtom.Provider`
  resolves to a different atom object, with its own node in the registry.
- **Input-parameterized atoms**. A factory like `(userId) => Atom.make(...)`
  produces a different atom for each user id. Wrap it in a `ScopedAtom` and
  pass the user id via `<Provider value={userId}>`.
- **Test substitution at the atom level**. When seeding a `Result` via
  `initialValues` isn't enough (for example, you want to replace a stream
  atom with one that emits scripted values), provide a `ScopedAtom` whose
  factory returns the substitute atom in tests.

### A worked example

Suppose you have a configurable dashboard panel and want each panel to have
its own independent filter state without forcing callers to construct an
atom per panel:

```typescript
import { Atom } from "@effect-atom/atom";
import { ScopedAtom } from "@effect-atom/atom-react";

const ScopedFilter = ScopedAtom.make(() => Atom.make(""));

function Panel() {
    const filterAtom = ScopedFilter.use();
    const [filter, setFilter] = useAtom(filterAtom);
    return <input value={filter} onChange={(e) => setFilter(e.target.value)} />;
}

export function Dashboard() {
    return <>
        <ScopedFilter.Provider><Panel /></ScopedFilter.Provider>
        <ScopedFilter.Provider><Panel /></ScopedFilter.Provider>
    </>;
}
```

Each `<ScopedFilter.Provider>` calls the factory once and remembers the
returned atom. The two panels read *different* atoms from `useAtom`, so they
have independent state, but they share the same `Registry` (and therefore
the same runtime, services, and surrounding graph).

### Ergonomics: ScopedAtoms are not Atoms

A `ScopedAtom` is not itself an `Atom`, so helpers that expect `Atom<A>`
(`Atom.map`, `useAtomValue`, `useAtomRefresh`, ...) can't take it directly.
You'll typically resolve once at the top of a component:

```typescript
function UserProfile() {
    const userAtom = ScopedUser.use();
    const user = useAtomValue(userAtom);
    const refresh = useAtomRefresh(userAtom);
    // ...
}
```

Or wrap into a custom hook for ergonomic reuse:

```typescript
const useUser = () => useAtomValue(ScopedUser.use());
const useUserRefresh = () => useAtomRefresh(ScopedUser.use());
```

The atom resolved from `.use()` is otherwise identical to any other atom in
your graph.

## Putting It Together

A mental checklist for choosing where in this stack to operate:

1. **Need to swap a service for a subtree?** Use `RegistryProvider` with
   `initialValues` seeded against `AppRuntime.layer` (or `AppRuntime`
   itself). The graph absorbs the change with no other code modifications.
2. **Need to swap an atom's value for a subtree?** Use `RegistryProvider`
   with `initialValues` for the leaf atom. Its effect is bypassed entirely.
3. **Need to swap an atom's *identity* for a subtree?** Use `ScopedAtom`.
   Reach for it when the same atom descriptor isn't right everywhere,
   either because each subtree needs its own copy, or because the atom's
   construction depends on tree-local input.
4. **Need genuine isolation between subtrees** (e.g. test isolation, two
   independent app instances embedded in one page)? Use `RegistryProvider`
   per subtree.

All four cases compose; you can nest `ScopedAtom` providers inside a single
`RegistryProvider`, or use separate `RegistryProvider`s for entirely
independent state graphs.

## See Also

- [Services, Registries, and Testability](/guides/atom-react/services-registry): the practical guide for swapping services.
- [Scoped Atoms](/guides/atom-react/scoped-atoms): the practical guide for per-subtree atom identity.
- [Atom](/atom/Atom.ts): the descriptor type and combinators.
- [Registry](/atom/Registry.ts): the state container.
- [ScopedAtom](/atom-react/ScopedAtom.ts): API reference for `ScopedAtom`.
