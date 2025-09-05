---
"@effect-atom/atom-react": patch
"@effect-atom/atom": patch
---

Add opt-in `abortAsFailure` to Atom.fn: when enabled, aborting (Reset) yields an interruption failure instead of Initial. In React, useAtom/useAtomSet support AbortSignal for Atom.fn in promise modes; aborting fails with interruption.
