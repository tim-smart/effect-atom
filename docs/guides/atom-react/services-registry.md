---
title: "Services, Registries, and Testability"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/services-registry
nav_order: 4
---

# Services, Registries, and Testability

In [Basic Types](/guides/atom-react/basic-types), we introduced the core building
block of effect-atom but intentionally left out how to provide Services.

```typescript
import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect"

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    const res = yield* api.getMessages();    
    const data = yield* Effect.tryPromise(() => res.json());
    return data.messages;
}).pipe(
    // ...providers,
    // ...retry logic,
    // ...error handling,
    // ...etc.
)

export const MessagesAtom = Atom.make(fetchMessages);
```

Your first instinct may be to create a service and provide it directly to
each atom's effect.

```typescript
import { Atom } from "@effect-atom/atom-react";
import { Effect, Context, Layer } from "effect";

export class APIService extends Context.Tag("MyApp/APIService")<
    APIService,
    {
        readonly getMessages: () => Effect.Effect<ReadonlyArray<Message>>;
    }
>() {}

export const APIServiceLive = Layer.succeed(APIService, {
    getMessages: () =>
        Effect.tryPromise(() =>
            fetch("/api/messages").then((res) => res.json() as Promise<ReadonlyArray<Message>>)
        ).pipe(Effect.orDie),
});

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    return yield* api.getMessages();
}).pipe(
    Effect.provide(APIServiceLive),
);

export const MessagesAtom = Atom.make(fetchMessages);
```

This is a valid way to provide services to atoms, and it makes a service that
other atoms can also use. The downside is that it tightly couples the live
implementation of each service to the atom. If you wanted to mock this
component in a development or test environment, the atom is hard-linked to
the live service.

This generally will not scale well, since you have to register each service
at the atom layer. Luckily, effect-atom provides a way to register an entire
layer once at the root of your application, and lets you swap it out per
React subtree.

### Registry Providers and Layers

A [Registry](/atom/Registry.ts) is a per-subtree container for atom state. It
holds the cached value, subscriptions, and lifetime of every atom that has
been read inside it. The [RegistryProvider](/atom-react/RegistryContext.ts)
component provides a fresh `Registry` instance via React Context, so every
subtree can have its own independent state graph.

Mount one at the root of your application:

```typescript
"use client";

import { RegistryProvider } from "@effect-atom/atom-react";

export default function Layout({
    children
}: {
    children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <RegistryProvider>
          {children}
        </RegistryProvider>
      </body>
    </html>
  );
}
```

Next, define a single `Layer` that composes all your services, and turn it
into a runtime atom using [Atom.runtime](/atom/Atom.ts#runtime):

```typescript
import { Layer } from "effect";
import { Atom } from "@effect-atom/atom-react";
import { APILayerLive } from "./APILayer";
// ...other layer imports

export const ApplicationLayerLive = Layer.mergeAll(
    APILayerLive,
    // ...other layers
);

export const AppRuntime = Atom.runtime(ApplicationLayerLive);
```

`Atom.runtime(layer)` produces an *atom-runtime* that is itself an atom whose value
is the built `Runtime<R>` for that layer, plus factory methods (`.atom`,
`.fn`, `.pull`, `.subscriptionRef`, ...) for creating atoms that consume the
layer's services. The first time the runtime atom is read inside a registry,
the layer is built into a scope tied to that registry's lifetime. When the
`RegistryProvider` unmounts, the scope is closed and the layer's resources
are released.

### Using the Runtime with Registered Services

Atoms that depend on the layer's services are created with the runtime's
constructor methods rather than `Atom.make`. The signatures are nearly
identical, but the runtime methods automatically thread the runtime through
so the effect can access any service in the layer:

```typescript
import { Effect } from "effect";
import { AppRuntime } from "./runtime";
import { APIService } from "./services/APIService";

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    return yield* api.getMessages();
});

export const MessagesAtom = AppRuntime.atom(fetchMessages);
```

`Atom.make` is replaced with the runtime's
[atom method](/atom/Atom.ts#atomruntime-interfaceatom); the runtime also
exposes `.fn`, `.pull`, `.subscriptionRef`, and `.subscribable` for other
flavors of atom.

Components that consume `MessagesAtom` use the same hooks as any other atom. 
You don't have to thread layers or runtimes through your component tree at
all. The runtime is part of the dependency graph (see
[Advanced Topics](/guides/atom-react/advanced-topics)).

### Mocking Atoms in Tests with `initialValues`

For testing a component that consumes `MessagesAtom`, the simplest approach is
to skip the service plumbing entirely and seed the registry with the value you
want the atom to have. `RegistryProvider`'s `initialValues` accepts any
`[atom, value]` pair and sets the registry's cached value for that atom before
any component reads it.

Because effect-backed atoms hold a [Result](/guides/atom-react/result-types),
you seed them with one of [Result.success](/atom/Result.ts#success),
[Result.fail](/atom/Result.ts#fail), or
[Result.initial](/atom/Result.ts#initial).

```typescript
import { Result } from "@effect-atom/atom";
import { RegistryProvider } from "@effect-atom/atom-react";
import ComponentThatUsesMessages from "...";
import { MessagesAtom } from "...";

const mockMessages = [
  { id: "1", text: "Hello" },
  { id: "2", text: "World" },
];

const withMockMessages = () => (
  <RegistryProvider initialValues={[
    [MessagesAtom, Result.success(mockMessages)]
  ]}>
    <ComponentThatUsesMessages />
  </RegistryProvider>
);
```

Because the atom's value is already in the registry, its underlying effect is
never run so no API call is made and no service is required. The component
renders with `Result.Success(mockMessages)` immediately on first render.

The same pattern covers the other states an async atom can be in:

```typescript
// Loading state
[MessagesAtom, Result.initial(true)]

// Error state
[MessagesAtom, Result.fail(new Error("network failed"))]
```

#### Derived Atoms

If you have derived atoms that combine state from other atoms with services,
the cleanest test still preloads the atom under test directly. Consider:

```typescript
export const UserMessagesAtom = AppRuntime.atom((get) =>
  Effect.gen(function* () {
    const userResult = get(UserAtom);
    if (!Result.isSuccess(userResult)) return [];
    const api = yield* APIService;
    return yield* api.getUserMessages(userResult.value.id);
  })
)
```

This atom is slightly different than the one above, because we need the user's
ID from `UserAtom` to make a request to the API. Note the `atom` method
provides both the `get` context (to read from other atoms) and a generator (to
abstract service calls).

To test a component that uses `UserMessagesAtom`, you can still just preload it
directly:

```typescript
<RegistryProvider initialValues={[
  [UserMessagesAtom, Result.success([ /* ...messages */ ])]
]}>
  <ComponentUnderTest />
</RegistryProvider>
```

You don't need to mock `UserAtom`, `APIService`, or the layer because
`UserMessagesAtom` already has its value cached, none of its dependencies are
read.

### When You Need the Effect to Actually Run

Sometimes you want to exercise the atom's effect itself to verify it calls
the service correctly, to test retry or error behavior end to end, or to
integration-test multiple atoms together. In that case, mock the layer.

You seed `AppRuntime.layer` with a test layer, but remember to merge
[`Reactivity.layer`](https://github.com/Effect-TS/effect/blob/main/packages/experimental/src/Reactivity.ts)
back in — the runtime relies on it internally for `withReactivity` and
`reactivityKeys`:

```typescript
import { Layer, Effect } from "effect";
import * as Reactivity from "@effect/experimental/Reactivity";
import { RegistryProvider } from "@effect-atom/atom-react";
import { AppRuntime } from "...";
import { APIService } from "...";

const MockApplicationLayer = Layer.mergeAll(
  Layer.succeed(APIService, {
    getMessages: () => Effect.succeed([ /* ...messages */ ]),
    // ...other methods
  }),
  // ...other mocked layers
);

const TestLayer = Layer.provideMerge(MockApplicationLayer, Reactivity.layer);

const withMockLayer = () => (
  <RegistryProvider initialValues={[[AppRuntime.layer, TestLayer]]}>
    <ComponentUnderTest />
  </RegistryProvider>
);
```

When any `AppRuntime.atom(...)` is read inside this provider, it builds the
runtime from your test layer instead of the production one. The layer is
built lazily into a scope tied to the registry's lifetime, so resources are
released automatically when the `RegistryProvider` unmounts.

### Choosing Between `RegistryProvider` and `ScopedAtom`

The patterns above use `RegistryProvider` to swap *values* in the registry
while keeping atom identities the same. For most isolated component tests
this is the right tool — it requires no changes to your atoms and the
existing helper APIs all keep working.

[Scoped Atoms](/guides/atom-react/scoped-atoms) take a different approach:
they swap the atom *identity itself* per `Provider` boundary. Reach for them
when:

- You need different *atoms* (not just different values) in different parts
  of the same tree, for example for two independent panels each with their
  own state.
- You want to parameterize an atom by tree position (URL params, a user id
  passed from a route).
- You want to wholesale replace a derived atom in a test without seeding
  every dependency it would otherwise read.

For service mocking and most component tests, prefer `RegistryProvider` with
`initialValues`. Reach for `ScopedAtom` when atom identity itself needs to
vary across the tree — see the
[Scoped Atoms guide](/guides/atom-react/scoped-atoms) for the full story.
