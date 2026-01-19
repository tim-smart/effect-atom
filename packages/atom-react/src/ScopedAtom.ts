/**
 * @since 1.0.0
 */
"use client"
import type * as Atom from "@effect-atom/atom/Atom"
import * as React from "react"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export type TypeId = "~@effect-atom/atom-react/ScopedAtom"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export const TypeId: TypeId = "~@effect-atom/atom-react/ScopedAtom"

/**
 * @since 1.0.0
 * @category models
 */
export interface ScopedAtom<A extends Atom.Atom<any>, Input = never> {
  readonly [TypeId]: TypeId
  use(): A
  Provider: Input extends never ? React.FC<{ readonly children?: React.ReactNode | undefined }>
    : React.FC<{ readonly children?: React.ReactNode | undefined; readonly value: Input }>
  Context: React.Context<A>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <A extends Atom.Atom<any>, Input = never>(
  f: (() => A) | ((input: Input) => A)
): ScopedAtom<A, Input> => {
  const Context = React.createContext<A>(undefined as unknown as A)

  const use = (): A => {
    const atom = React.useContext(Context)
    if (atom === undefined) {
      throw new Error("ScopedAtom used outside of its Provider")
    }
    return atom
  }

  const Provider: React.FC<{ readonly children?: React.ReactNode | undefined; readonly value: Input }> = ({
    children,
    value
  }) => {
    const atom = React.useRef<A | null>(null)
    if (atom.current === null) {
      atom.current = f(value)
    }
    return React.createElement(Context.Provider, { value: atom.current }, children)
  }

  return {
    [TypeId]: TypeId,
    use,
    Provider: Provider as any,
    Context
  }
}
