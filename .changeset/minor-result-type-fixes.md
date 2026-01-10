---
"@effect-atom/atom": patch
---

Minor type fixes to Result type:
- Fix `flatMap` overload signature to correctly return `Result<B, E2>` instead of `Result<A, E2>`
- Add explicit type parameters to `initial` call in `waitingFrom` to preserve type information
- Remove duplicate `when` method overload in `BuilderImpl`
