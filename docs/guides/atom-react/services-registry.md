---
title: "Services, Registries, and Testability"
parent: "Using Atom with React"
grand_parent: "Guides"
permalink: /guides/atom-react/services-registry
nav_order: 4
---

# Understanding Services and Layers in Effect-Atom 

In [Basic Types](/atom/BasicTypes.ts), we introduced you to the core building block
of Effect-Atom, but intentionally left out how to provide Services. 

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
    // ...error handing,
    // ...etc.
)

export const MessagesAtom = Atom.make(fetchMessages);
```

Your first instinct may be to create a service, and provide it directly to each atom's generator.

```typescript
import { Atom } from "@effect-atom/atom-react";
import { Effect, Context } from "effect"
import type { Messages } from "..."

export class APIService extends Context.Tag("deno-web-application.services.APIService")<
    APIService, {
        readonly getMessages: () => Effect.Effect<Messages, never, ...>
    }
>() {}

export const APIServiceLive = APIService.of({
    readonly getMessages: () => Effect.Effect<Messages, never, ...> = () => Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() => fetch("...."));
        const data = yield* Effect.tryPromise(() => response.json());
        return data.messages;
    })
});

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    const res = yield* api.getMessages();
    return data.messages;
}).pipe(
    Effect.provideService(APIService, APIServiceLive);
)

export const MessagesAtom = Atom.make(fetchMessages);
```

This is a valid way to provide services to atoms, and does create a service that any other atoms can use,
but it tightly couples the live implementation of services to the atoms. If for example, you wanted
to mock this component in a development environment, it is hard linked to the live service.

This generally will not scale well, since you have to register each service at the atom
layer. Luckily, effect-atom provides a way to register entire layers into a Provider context,
so you can register them once at the root of your application, as well as swap them out.

### Registry Providers and Layers

One way to think of the [RegistryProvider] is as a per-subtree container for atom state. Atoms built
from it's constructor with a registered layer, reference runtime's layer in that registry
just like derived atoms reference other atoms in the context.


```typescript
"use client";

import { RegistryProvider } from "@effect-atom/atom-react";

export default function Layout({
    children
}: {
    children: React.ReactNode
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

Next, you can register a single Layer with all your services and register them into the provider
your atoms need, using [Atom.runtime](/atom/Atom.ts#runtime).

```typescript
import { APILayerLive } from "./APILayer.ts";
.... more layers
import { Layer } from "effect";
import { Atom } from "@effect-atom/atom-react";

export const ApplicationLayerLive = Layer.merge(
    ... merge and compose all the layers here
);

export const AppRuntime = Atom.runtime(ApplicationLayerLive);
```

This runtime when used, will look for the closest parent Registry Provider, and store the layers
there.

### Using the Runtime with Registered Services

Because we used a specific Registry, atoms need to be linked to the same runtime atom. This is done
using Atom constructors directly on this runtime. The instantiated value, exposes all the general
constructors for atoms. If we take the code above, refactor out the services into their on layer
files, you end up with a registered atom like this:

```typescript
import { AppRuntime } from "./...(the application layer file)"
import { Effect } from "effect"

export const fetchMessages = Effect.gen(function* () {
    const api = yield* APIService;
    const res = yield* api.getMessages();
    return data.messages;
})

export const MessagesAtom = AppRuntime.atom(fetchMessages);
```

Now Atom.make is replaced with the runtime alias, [someRuntime.atom](/atom/Atom.ts#atomruntime-interfaceatom).
The signatures are generally identical to every Atom constructor, and there
are others to make other flavors of Atoms.

Components that consume the MessagesAtom will now just need to use the Atom,
and you don't have to worry about providing layers to new Atoms.

### Mocking Atoms in Tests with `initialValues`

For testing a component that consumes `MessagesAtom`, the simplest approach is
to skip the service plumbing entirely and seed the registry with the value you
want the atom to have. `RegistryProvider`'s `initialValues` accepts any
`[atom, value]` pair and sets the registry's cached value for that atom before
any component reads it.

Because effect-backed atoms hold a [Result](/guides/atom-react/result-types),
you seed them with one of [Result.success](/atom/Result.ts.html#success),
[Result.fail](/atom/Result.ts.html#fail), or
[Result.initial](/atom/Result.ts.html#initial).

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
never run — no API call is made and no service is required. The component
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

You don't need to mock `UserAtom`, `APIService`, or the layer — because
`UserMessagesAtom` already has its value cached, none of its dependencies are
read.

### When You Need the Effect to Actually Run

Sometimes you want to exercise the atom's effect itself — to verify it calls
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

[Scoped Atoms](/atom-react/ScopedAtom.ts) take a different approach: they
swap the atom *identity itself* per `Provider` boundary. Reach for them when:

- You need different *atoms* (not just different values) in different parts
  of the same tree — for example, two independent panels each with their
  own state.
- You want to parameterize an atom by tree position (URL params, a user id
  passed from a route).
- You want to wholesale replace a derived atom in a test without seeding
  every dependency it would otherwise read.

For service mocking and most component tests, prefer `RegistryProvider` with
`initialValues`. Reach for `ScopedAtom` when atom identity itself needs to
vary across the tree.

