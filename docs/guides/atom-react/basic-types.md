---
title: "Basic Types and Effect Patterns"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/basic-types
nav_order: 1
---

# Basic Types and Effect Patterns

## Atoms

An [Atom](/atom/Atom.ts) is the core type in effect-atom. Atoms are reactive
state containers that are shared across all components that subscribe to them.

```typescript
import { Atom } from "@effect-atom/atom-react";

export const counterAtom = Atom.make(0);
```

These are application singletons by default — any component reading
`counterAtom` will share the same underlying state.

### Effect-backed Atoms

`Atom.make` also accepts an `Effect`, which lets you express asynchronous
work, dependency injection via services, error handling, and more — anything
the [Effect](https://effect.website/) ecosystem supports. The resulting atom
holds a [Result](/guides/atom-react/result-types) that tracks whether the
effect is loading, succeeded, or failed.

```typescript
import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    const res = yield* api.getMessages();
    const data = yield* Effect.tryPromise(() => res.json());
    // For brevity we omit response validation here; in a real app you'd
    // use Schema or similar to decode the JSON into a known shape.
    return data.messages;
}).pipe(
    // ...providers,
    // ...retry logic,
    // ...error handling,
    // ...etc.
);

export const MessagesAtom = Atom.make(fetchMessages);
```

> See [Services, Registries, and Testability](/guides/atom-react/services-registry)
> for how to provide service implementations to effect-backed atoms.

### Derived Atoms

Atoms can reference other atoms, building a graph of derived state. It's
common to take state from one atom, compute something from it, and return a
new atom that components can subscribe to — this lets you share derived
state across components without duplicating logic.

To read from other atoms, pass a function to [Atom.make](/atom/Atom.ts#make).
Its first argument is `get`, which can be called with another atom to read
its current value.

```typescript
import { Atom, Result } from "@effect-atom/atom-react";
import { MessagesAtom } from "../";

export const MessagesCountAtom = Atom.make((get) => {
    const messagesResult = get(MessagesAtom);
    if (!Result.isSuccess(messagesResult)) {
        return 0;
    }
    return messagesResult.value.length;
});
```

Because `MessagesAtom` is effect-backed, `get(MessagesAtom)` returns a
`Result`, not the raw messages. We use `Result.isSuccess` to narrow the type
and access `.value` safely. Reading `.value` without the guard would fail
typecheck, because the value isn't guaranteed to be present.

See [Result Types & Consuming Atom State](/guides/atom-react/result-types) and
the reference for [Result refinement methods](/atom/Result.ts#refinements)
for more information on how to work with Results.

### Refreshing Atoms

To refresh an atom and force it to recompute its effect (especially useful for
asynchronous atoms), use the [useAtomRefresh](/atom-react/Hooks.ts#useatomrefresh)
hook. It returns a callback that, when called, invalidates the atom's cached
value and re-runs its effect.

```typescript
import { useAtomRefresh } from "@effect-atom/atom-react";
import { MessagesAtom } from "../";

export default function MessagesComponent() {
    const refreshMessages = useAtomRefresh(MessagesAtom);

    return <div>
        <button onClick={refreshMessages}>Refresh Messages</button>
    </div>;
}
```

Since atoms are application singletons, refreshing an atom updates every
component subscribed to it. For asynchronous atoms, the refresh kicks off a
waiting state on the atom's `Result` while the new effect runs.

> If you're working *outside* of React (e.g. in a script, test, or effect
> pipeline), the [Atom.refresh](/atom/Atom.ts#refresh) function returns an
> `Effect<void, never, AtomRegistry>` you can run against a registry directly.
> Inside a component, always prefer the hook since it wires up the registry
> automatically.

See [Result Types](/guides/atom-react/result-types) to learn more about
Results and how to render components based on the atom's computation state.
