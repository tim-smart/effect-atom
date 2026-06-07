---
title: "Result Types & Consuming Atom State"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/result-types
nav_order: 2
---

## Result Types & Consuming Atom State

To use data from an atom in React, the hooks return a [Result](/atom/Result.ts).
A `Result` is a tagged union that can be in one of three states: `Initial`,
`Success`, or `Failure`. The `Initial` state is important for asynchronous
atoms: it represents the "loading" phase before the async work has resolved.

```typescript
import { useAtomValue, Result } from "@effect-atom/atom-react";
import { MessagesCountAtom } from "./...";

export const MyComponent = () => {
  const messagesCountResult = useAtomValue(MessagesCountAtom);

  return <div>
    {Result.isInitial(messagesCountResult) && <p>Loading...</p>}
    {Result.isFailure(messagesCountResult) && <p>Something went wrong</p>}
    {Result.isSuccess(messagesCountResult) && <p>{messagesCountResult.value}</p>}
  </div>;
};
```

Note you cannot access a Result's `value` without the `Result.isSuccess`
refinement, because the value is not guaranteed to be present in the other
states.


### Using Result.builder to Render

The above pattern is common when working with async atoms. To make the code
more concise, use [Result.builder](/atom/Result.ts#builder), a fluent
API that maps each state to a React node:

```typescript
import { useAtomValue, Result } from "@effect-atom/atom-react";
import { MessagesCountAtom } from "./...";

export const MyComponent = () => {
  const messagesCountResult = useAtomValue(MessagesCountAtom);

  return <div>
    {
      Result.builder(messagesCountResult)
        .onInitial(() => <p>Loading...</p>)
        .onWaiting(() => <p>Refreshing...</p>)
        .onFailure(() => <p>Something went wrong</p>)
        .onSuccess((messagesCount) => <p>{messagesCount}</p>)
        .render()
    }
  </div>;
};
```

The builder is checked at the type level. Once you've handled `onSuccess`,
the result type narrows so that the next branch can no longer be a success,
and so on. The terminal `.render()` returns the React node produced by the
first matching branch.

Useful branches include:

- `onInitial(f)`: atom hasn't produced its first value yet.
- `onWaiting(f)`: a value is present but a refresh is in flight.
- `onSuccess((value) => ...)`: success, with the value passed directly.
- `onFailure((cause) => ...)`: any failure (typed errors *and* defects).
- `onError((error) => ...)`: only typed errors (the `E` channel).
- `onDefect((defect) => ...)`: only unexpected errors (`Effect.die`, exceptions, etc.).

See [Result.builder](/atom/Result.ts#builder) for the full set of
branches.
