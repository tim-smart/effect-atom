---
title: "Writables & Modifying State"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/writable-types
nav_order: 3
---

Writable atoms are atoms that can be modified and are an extension of the general Atom type. They
are typically generated only from primative objects that are not derived or created by Effects,
since it is ambiguous for complex atoms. Atoms that are writable can use the useAtom hook, as
well as a complementary useAtomSet (as opposed to useAtomValue) to modify an Atom.

```typescript
import { Atom, useAtom } from "@effect-atom/atom-react";

export const nameAtom = Atom.make("John");

export function NameComponent() {
    const [name, setName] = useAtom(nameAtom);
    return <div>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
    </div>
}
```

Keep in mind, components that call this will kick off a state change to any other components
subscribed to this atom.


### Derived Writable Atoms

Typically derived Atoms created from make will not be writable. In some cases, you may want to
create a derived Atom that allows for a setter to modify state. Let's go though this example.

```typescript
import { Atom } from "@effect-atom/atom";

export const CountAtom = Atom.make(1)

export const DoubleCountAtom = Atom.writable(
  (get) => get(CountAtom) * 2,
  (ctx, value: number) => ctx.set(CountAtom, value / 2)
)
```

Here we have a DoubleCountAtom that derives from CountAtom, using context values to read and modify
state. Note here in the write function, we set the value of CountAtom. This is a common pattern,
since DoubleCount will now logically be "half". The key point is most of the time, you want to update
the upstream data, and not overwrite the derived state.

It is possible to do this via [ctx.setSelf](/atom/Atom.ts#writecontext-interface), but it should be
avoided in almost all cases. This is because if the parent atom updates, the derived atom will
be recalculated based on the write function's call, erasing the forced set.
