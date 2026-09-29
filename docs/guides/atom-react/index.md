---
title: "Using Atom with React"
parent: "Guides"
permalink: /guides/atom-react
nav_order: 1
has_children: true
---

# Using Atom with React

The core concept of Atom is to create reactive state containers that are easy to use in your application. For
those familiar with [Jotai](https://jotai.dev/react), many concepts will be similar.

To understand the basics of using Effect, start with these core sections to familiarize yourself with the system.
It is assumed you have some familiarity with Effect, but if you need to brush up, take a look at the [Effect Documentation](https://effect.website/docs/).

# Why Effect-Atom?

A quick and dirty explanation for using effect-atom if you're completely new to the ecosystem is:

1. Effectful computations are generally good at abstracting a lot of dependencies, and allows for a flexible
way to drop in implementations of Services.
2. React Query is generally great, for handling async data your code depends on, but if you're already using Effect
on the server side, you can reuse most of your code logic client side, specifically adding Schemas and shapes
for client side validation of data (if you're into that kind of thing).
3. Effect-Atom is heavily inspired by Jotai, allowing you to model state graphs, updates, and derivations in a nice way, with the added benefit of lifting State into the Effect typesystem.
