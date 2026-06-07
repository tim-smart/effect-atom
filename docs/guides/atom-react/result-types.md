---
title: "Result Types & Consuming Atom State"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/result-types
nav_order: 2
---

## Result Types & Consuming Atom State

To use data from an atom in react, you can use hooks to return a [Result](/atom/Result.ts.html). Results are tagged
types that can be in the state of "Initial", "Success", or "Failure". "Initial" is important for asynchronous
atoms that need a state representing that the atom is "loading" before its async job has been resolved.

```typescript
import { useAtomValue, isSuccess, isFailure, isInitial } from "@effect-atom/atom-react"
import { MessagesCountAtom } from "./..."

export const MyComponent = () => {

  const messagesCountResult = useAtomValue(MessagesCountAtom);
  
  return <div>
    {isInitial(messagesCountResult) && <p>Loading...</p>}
    {isFailure(messagesCountResult) && <p>Something went wrong</p>}
    {isSuccess(messagesCountResult) && <p>{messagesCountResult.value}</p>}
  </div>;
}
```

Note you cannot access a Result's value without the isSuccess refinement, because the value is not guaranteed to be present.


### Using Result.builder to Render

The above code is a very common pattern when working with async atoms. To make the code more concise,
you can use [Result.builder](/atom/Result.ts.html#builder-1) which will automatically handle the
rendering of the different states.

Builder's methods include a number of built in refinements, where you can return React nodes to render for each state.

```typescript
import { useAtomValue, Result } from "@effect-atom/atom-react"
import { MessagesCountAtom } from "./..."

export const MyComponent = () => {

  const messagesCountResult = useAtomValue(MessagesCountAtom);
  
  return <div>
      {
        Result.builder(messagesCountResult)
          .onSuccess((messagesCount) => <p>{messagesCount}</p>)
          .onInitial(() => <p>Loading...</p>)
          .onWaiting(() => <p>Loading...</p>)
          .onDefect(() => <p>Something went wrong</p>)
          .render()
      }
    </div>
}

```
