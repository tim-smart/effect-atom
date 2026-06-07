---
title: "Basic Types and Effect Patterns"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/basic-types
nav_order: 1
---

# Basic Types and Effect Patterns

## Atoms

An [Atom](/atom/Atom.ts) is a core type in Effect Atom. These are general stateful containers shared across all components.

```typescript
import { Atom } from "@effect-atom/atom";

// Creating a general atom
export const localCounter= Atom.make<number>(0);

```

Note these are application singletons, so any component using an atom will be using the same shared state.

### Generated Atoms

Atoms make method allows for an Effect to be used as a value, allowing for full integration with
the [Effect](https://effect.website/).

In general, supplying a Generated Effect covers the ability to construct Atoms that are asynchronous,
use provided Services, handle Errors, and more. In this example, we can construct a generator that
has an async action being provided by a service.

```typescript
import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect"

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    const res = yield* api.getMessages();    
    const data = yield* Effect.tryPromise(() => res.json());
    // For brevity, we omit code to validate the response and
    // lift the json result to a known type but in a real app
    // you'd want to do that.
    return data.messages;
}).pipe(
    // ...providers,
    // ...retry logic,
    // ...error handing,
    // ...etc.
)

export const MessagesAtom = Atom.make(fetchMessages);

```

### Derived Atoms

Each Atom is stored in a context map, where it can be referenced by other Atoms. It is common to take state, do some
computation like counting, and return a new Atom that can be consumed by components. This allows you to share the
derived state across components without reusing logic.

To access the context, another call is available for [Atom.make](/atom/Atom.ts#make) which allows a function who's first argument is `get`, which can be used to access the Result of an atom.

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

A Result is returned and not the actual value from get. So we must use Result's refinement method `isSuccess` to 
access the value in a type safe manner. Access in the value without guards will result in the code not passing 
typecheck.

See [Result Types & Consuming Atom State](/guides/atom-react/result-types) and the reference for [Result refinement methods](/atom/Result.ts#refinements)
for more information on how to work with Results.

### Refreshing Atoms

To refresh an atom and force it to recompute it's effect, especially in asynchronous atoms,
you can use the [refresh](/atom/Atom.ts#refresh) function.

```typescript
import { Atom, Result } from "@effect-atom/atom-react";
import { MessagesAtom } from "../";

const triggerRefresh = () => Atom.refresh(MessagesAtom);

export default function MessagesComponent() {
    return <div>
        <button onClick={triggerRefresh}>Refresh Messages</button>
    </div>
}
```

Since atoms are generally application singletons, this button will update the atom (and run it's
effect making an async call), for every component linked to it's value. This will also kick-off
a waiting state for the atom's result.

See [Result Types](/guides/atom-react/result-types) to learn more about Result's and how to
render components based on the Atom's computation state.
