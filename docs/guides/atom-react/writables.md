---
title: "Writables & Modifying State"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/writable-types
nav_order: 3
---

# Writables & Modifying State

Writable atoms are atoms that can be modified. They extend the general `Atom`
type with a write function. Writable atoms are typically created from
primitive values via `Atom.make(initialValue)`, or explicitly via
`Atom.writable(read, write)` for derived state. Effect-backed atoms aren't
writable by default since they're produced asynchronously by an effect, but
you can compose them into writable derivations when needed.

Use [useAtom](/atom-react/Hooks.ts#useatom) when you need both the current
value and a setter, or [useAtomSet](/atom-react/Hooks.ts#useatomset) when you
only need a setter (the complement to `useAtomValue`).

```typescript
import { Atom, useAtom } from "@effect-atom/atom-react";

export const nameAtom = Atom.make("John");

export function NameComponent() {
    const [name, setName] = useAtom(nameAtom);
    return <div>
        <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
        />
    </div>;
}
```

Calling `setName` updates the atom and triggers a re-render for every
component subscribed to it.

The setter also accepts a function form, which receives the current value —
useful for derived updates:

```typescript
const [count, setCount] = useAtom(counterAtom);
// ...
setCount((current) => current + 1);
```

### Derived Writable Atoms

Atoms created with `Atom.make((get) => ...)` are read-only by default. To
make a derived atom writable, use [Atom.writable](/atom/Atom.ts#writable),
which takes a read function and a write function:

```typescript
import { Atom } from "@effect-atom/atom";

export const CountAtom = Atom.make(1);

export const DoubleCountAtom = Atom.writable(
  (get) => get(CountAtom) * 2,
  (ctx, value: number) => ctx.set(CountAtom, value / 2)
);
```

`DoubleCountAtom` derives its value from `CountAtom`, and its write function
updates `CountAtom` so the derived value reflects the new state. This is the
recommended pattern — usually you want a write to propagate *upstream* to the
source of truth, not overwrite the derived state directly.

It is possible to override the cached value of the derived atom itself via
[ctx.setSelf](/atom/Atom.ts#writecontext-interface), but this should be
avoided in almost all cases: if the parent atom later updates, the derived
atom will be recomputed from the read function, erasing the forced set.
