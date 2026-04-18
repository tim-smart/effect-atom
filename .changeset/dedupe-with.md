---
"@effect-atom/atom": minor
---

Add `Atom.dedupeWith` combinator for customizing write equivalence.

By default every atom deduplicates writes using `Equal.equals`, which falls back
to reference equality (`===`) for plain objects and arrays. `dedupeWith` lets
you attach a custom `Equivalence` so that structurally-equal writes become
no-ops — useful for atoms holding API payloads, derived arrays, or any value
type that does not implement `Equal`.

```ts
import { Atom } from "@effect-atom/atom"

const user = Atom.make({ id: "u1", name: "Alice" }).pipe(
  Atom.dedupeWith((a, b) => a.id === b.id && a.name === b.name)
)
```
