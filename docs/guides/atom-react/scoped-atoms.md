---
title: "Scoped Atoms"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/scoped-atoms
nav_order: 5
---

# Scoped Atoms

By default, atoms are application singletons — every component that reads
`messagesAtom` is reading the same node in the registry. That's the right
default for most cases, but sometimes you need the *atom* itself to vary
across the React tree: each panel having its own filter, each route having
its own user-scoped atom, or a test wanting to substitute a stubbed atom.

[ScopedAtom](/atom-react/ScopedAtom.ts) is the tool for that. It wraps an
atom factory in a React Context so each `<Provider>` boundary resolves to
its own atom.

## When to Reach for a Scoped Atom

Use a Scoped Atom when atom *identity* needs to vary per subtree. The most
common cases:

- **Per-subtree state** — two instances of the same component each need
  their own independent piece of state (selection, form, filter, pagination).
- **Input-parameterized atoms** — the atom depends on tree-local data
  (a route param, a user id, an entity id) that the component shouldn't
  have to thread through every helper.
- **Atom-level test substitution** — you want to wholesale replace a
  particular atom with a stub in tests, without changing the production
  code that reads it.

If instead you only need to swap services or seed a known value into the
registry, prefer
[RegistryProvider with `initialValues`](/guides/atom-react/services-registry).
Use the comparison table in
[Advanced Topics](/guides/atom-react/advanced-topics#where-scopedatom-fits)
to decide.

## The API

A Scoped Atom has four pieces:

```typescript
interface ScopedAtom<A extends Atom<any>, Input = never> {
  use(): A;
  Provider: React.FC<{ children?: React.ReactNode; value: Input }>;
  Context: React.Context<A>;
}
```

You create one with [ScopedAtom.make](/atom-react/ScopedAtom.ts#make),
passing a factory that produces the underlying atom:

```typescript
import { Atom } from "@effect-atom/atom";
import { ScopedAtom } from "@effect-atom/atom-react";

// No-input factory
const ScopedFilter = ScopedAtom.make(() => Atom.make(""));

// Input-parameterized factory
const ScopedUserMessages = ScopedAtom.make((userId: string) =>
    AppRuntime.atom(Effect.gen(function*() {
        const api = yield* APIService;
        return yield* api.getUserMessages(userId);
    }))
);
```

The factory runs **once per Provider instance**, the first time the Provider
renders. The resulting atom is cached in a ref and reused on subsequent
renders of that same Provider boundary.

Components inside the Provider call `.use()` to get the atom from React
Context:

```typescript
function MyComponent() {
    const filterAtom = ScopedFilter.use();
    const [filter, setFilter] = useAtom(filterAtom);
    // ...
}
```

`.use()` is a hook and follows the rules of hooks. It throws an error if
called outside a matching Provider.

## Use Case 1: Independent State per Subtree

Suppose you have a `Panel` component that owns its own filter input, and the
parent renders multiple panels. With a regular atom, all panels would share
one filter. With a Scoped Atom, each panel gets its own:

```typescript
import { Atom } from "@effect-atom/atom";
import { ScopedAtom, useAtom } from "@effect-atom/atom-react";

const ScopedFilter = ScopedAtom.make(() => Atom.make(""));

function Panel({ title }: { title: string }) {
    const filterAtom = ScopedFilter.use();
    const [filter, setFilter] = useAtom(filterAtom);

    return (
        <section>
            <h2>{title}</h2>
            <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter..."
            />
        </section>
    );
}

export function Dashboard() {
    return (
        <>
            <ScopedFilter.Provider>
                <Panel title="Messages" />
            </ScopedFilter.Provider>
            <ScopedFilter.Provider>
                <Panel title="Tasks" />
            </ScopedFilter.Provider>
        </>
    );
}
```

Each `<ScopedFilter.Provider>` runs the factory once and stores its own
`Atom.make("")`. The two panels read *different* atoms via `useAtom`, so
they have independent filter state — and yet the consumer code is identical.

## Use Case 2: Input-Parameterized Atoms

A factory can take an input from the Provider. This is the standard pattern
when an atom's identity depends on data only available at runtime — for
example, a user id from a route:

```typescript
import { Effect } from "effect";
import { Atom, Result } from "@effect-atom/atom";
import { ScopedAtom, useAtomValue } from "@effect-atom/atom-react";
import { AppRuntime, APIService } from "...";

const ScopedUserMessages = ScopedAtom.make((userId: string) =>
    AppRuntime.atom(Effect.gen(function*() {
        const api = yield* APIService;
        return yield* api.getUserMessages(userId);
    }))
);

function UserMessagesView() {
    const messagesAtom = ScopedUserMessages.use();
    const result = useAtomValue(messagesAtom);

    return Result.builder(result)
        .onInitial(() => <p>Loading...</p>)
        .onFailure(() => <p>Failed to load</p>)
        .onSuccess((messages) => (
            <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
        ))
        .render();
}

export function UserRoute({ userId }: { userId: string }) {
    return (
        <ScopedUserMessages.Provider value={userId} key={userId}>
            <UserMessagesView />
        </ScopedUserMessages.Provider>
    );
}
```

### Gotcha: the factory only runs once per Provider instance

`ScopedAtom.Provider` caches the resulting atom in a ref. **Changing the
`value` prop on an already-mounted Provider will not produce a new atom** —
the factory only runs the first time. If you need the atom to change when
the input changes, **pass the input as `key` as well**, like above
(`<ScopedUserMessages.Provider value={userId} key={userId}>`). React will
unmount and remount the Provider when the key changes, which causes the
factory to run again with the new value.

If you forget the `key`, navigating from user `A` to user `B` will continue
to render messages for user `A` — a subtle bug to watch for.

## Use Case 3: Substituting Atoms in Tests

`RegistryProvider`'s `initialValues` handles most test mocking by seeding a
result for a known atom. When that isn't enough — for example, you want to
swap a stream-backed atom for one that emits scripted values, or you want
the same component code to read a completely different atom in tests — a
Scoped Atom lets the consumer code stay unchanged while the Provider varies.

Define the atom behind a Scoped wrapper:

```typescript
// production code
export const ScopedMessagesAtom = ScopedAtom.make(() =>
    AppRuntime.atom(fetchMessages)
);

// app root
<ScopedMessagesAtom.Provider>
    <App />
</ScopedMessagesAtom.Provider>
```

Components use `ScopedMessagesAtom.use()` everywhere instead of importing a
fixed atom. In tests, supply a different factory through a test-only
Provider:

```typescript
// test setup
const TestMessagesAtom = ScopedAtom.make(() =>
    Atom.make(Effect.succeed(["mock", "messages"]))
);

// Wrap the component using the test Scoped Atom...
// Note: components must use TestMessagesAtom.use() in this scenario.
```

A cleaner pattern is to pass the atom itself as the input:

```typescript
type MessagesAtom = Atom.Atom<Result.Result<ReadonlyArray<string>>>;

export const ScopedMessagesAtom = ScopedAtom.make<MessagesAtom, MessagesAtom>(
    (atom) => atom
);

// production
<ScopedMessagesAtom.Provider value={productionMessagesAtom}>
    <App />
</ScopedMessagesAtom.Provider>

// test
<ScopedMessagesAtom.Provider value={mockMessagesAtom}>
    <ComponentUnderTest />
</ScopedMessagesAtom.Provider>
```

The factory is just `(atom) => atom`, and the Provider's `value` prop carries
the actual atom — production passes the real one, tests pass a stub.

## Working with Scoped Atoms

A `ScopedAtom<A>` is **not** itself an `Atom<A>`, so helpers that take an
`Atom` (`Atom.map`, `useAtomValue`, `useAtomRefresh`, `Atom.refresh`, ...)
can't take a `ScopedAtom` directly. You always go through `.use()` first.

### Pattern: resolve once at the top of a component

The cleanest approach is to resolve the underlying atom at the top of the
component and pass it around as a normal `Atom`:

```typescript
function UserProfile() {
    const userAtom = ScopedUser.use();
    const user     = useAtomValue(userAtom);
    const refresh  = useAtomRefresh(userAtom);
    const setUser  = useAtomSet(userAtom);
    // ...
}
```

### Pattern: custom hooks

If many components consume the same Scoped Atom, hide the indirection behind
a custom hook:

```typescript
const useUser        = () => useAtomValue(ScopedUser.use());
const useUserSet     = () => useAtomSet(ScopedUser.use());
const useUserRefresh = () => useAtomRefresh(ScopedUser.use());
```

Consumers then just call `useUser()`, and won't even know there's a Scoped
Atom underneath.

### Pattern: composing inside the factory

If you find yourself doing `Atom.map(scoped.use(), fn)` repeatedly, push the
derivation inside the factory so it happens once per Provider:

```typescript
const ScopedUser     = ScopedAtom.make((id: string) => makeUserAtom(id));
const ScopedUserName = ScopedAtom.make((id: string) =>
    Atom.map(makeUserAtom(id), (u) => u.name)
);
```

### Pattern: using `Context` directly

In non-component code that has access to a React fiber (for example a
custom hook), you can read the Context directly:

```typescript
const userAtom = React.useContext(ScopedUser.Context);
```

This is what `.use()` does internally, with the addition of a clearer error
message when the value is missing.

## How Scoped Atoms Interact with the Registry

A Scoped Atom doesn't have its own state container — the atom returned by
the factory is registered in whatever `Registry` is currently in scope
(typically the one provided by `RegistryProvider`). That means:

- Each Provider instance produces a unique atom *identity* — but all of
  those atoms still live in the same `Registry` (with its own node, cache,
  and subscriptions for each).
- When the Provider unmounts, the atom becomes unreferenced from the React
  side. If the atom has `keepAlive: false` and no other subscribers or
  children, its node becomes eligible for removal from the registry. If
  there are subscribers in other subtrees, it stays alive.
- `RegistryProvider` and `ScopedAtom` compose freely. You can have a single
  app-wide `RegistryProvider` and many Scoped Atom boundaries inside it, or
  nested `RegistryProvider`s each with their own Scoped Atom usage.

See [Advanced Topics: Where ScopedAtom Fits](/guides/atom-react/advanced-topics#where-scopedatom-fits)
for the underlying mechanics.

## See Also

- [Services, Registries, and Testability](/guides/atom-react/services-registry) — most service-mocking and per-subtree isolation is handled there.
- [Advanced Topics: The Dependency Graph](/guides/atom-react/advanced-topics) — how Scoped Atoms relate to the underlying graph.
- [ScopedAtom](/atom-react/ScopedAtom.ts) — the API reference.
