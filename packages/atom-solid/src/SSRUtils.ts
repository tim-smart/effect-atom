/**
 * @since 1.0.0
 */
import * as Atom from "@effect-atom/atom/Atom"
import * as Hydration from "@effect-atom/atom/Hydration"
import * as Registry from "@effect-atom/atom/Registry"
import * as Effect from "effect/Effect"

// Extend the Window interface to include our hydration flag
declare global {
  interface Window {
    __ATOM_SOLID_HYDRATED__?: boolean
  }
}

/**
 * Helper function to get a key from an atom for debugging/logging purposes
 */
const getAtomKey = (atom: Atom.Atom<any>): string => {
  if (Atom.isSerializable(atom)) {
    return atom[Atom.SerializableTypeId].key
  }
  return atom.toString()
}

/**
 * @since 1.0.0
 * @category SSR
 */
export interface SSROptions {
  /**
   * Timeout for async atom resolution during SSR
   * @default 5000
   */
  timeout?: number

  /**
   * Whether to include error states in dehydrated data
   * @default false
   */
  includeErrors?: boolean

  /**
   * Custom scheduler for SSR context
   */
  scheduler?: (f: () => void) => void
}

/**
 * @since 1.0.0
 * @category SSR
 */
export interface SSRResult {
  /**
   * Dehydrated atom state for client hydration
   */
  dehydratedState: Array<Hydration.DehydratedAtom>

  /**
   * Any errors that occurred during SSR
   */
  errors: Array<{ atomKey: string; error: unknown }>

  /**
   * Atoms that timed out during SSR
   */
  timeouts: Array<string>
}

/**
 * Create a registry optimized for SSR
 *
 * @since 1.0.0
 * @category SSR
 */
export const createSSRRegistry = (options: SSROptions = {}): Registry.Registry => {
  const { scheduler = (f) => f() } = options

  return Registry.make({
    scheduleTask: scheduler,
    defaultIdleTTL: Infinity // Don't cleanup during SSR
  })
}

/**
 * Preload atoms during SSR
 *
 * @since 1.0.0
 * @category SSR
 */
export const preloadAtoms = (
  registry: Registry.Registry,
  atoms: Array<Atom.Atom<any>>,
  options: SSROptions = {}
): Effect.Effect<SSRResult, never> =>
  Effect.gen(function*() {
    const { includeErrors = false, timeout = 5000 } = options
    const errors: Array<{ atomKey: string; error: unknown }> = []
    const timeouts: Array<string> = []

    // Preload all atoms with timeout
    const preloadEffects = atoms.map((atom) =>
      Effect.gen(function*() {
        try {
          yield* Effect.sync(() => registry.get(atom))
        } catch (error) {
          const atomKey = getAtomKey(atom)
          errors.push({ atomKey, error })
        }
      }).pipe(
        Effect.timeout(`${timeout} millis`),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            const atomKey = getAtomKey(atom)
            if (error._tag === "TimeoutException") {
              timeouts.push(atomKey)
            } else {
              errors.push({ atomKey, error })
            }
          })
        )
      )
    )

    // Wait for all preloads to complete or timeout
    yield* Effect.all(preloadEffects, { concurrency: "unbounded" })

    // Dehydrate the registry state
    const dehydratedState = Array.from(Hydration.dehydrate(registry))

    // Filter out errors if not including them
    const finalDehydratedState = includeErrors
      ? dehydratedState
      : dehydratedState.filter((atom) => !errors.some((error) => error.atomKey === atom.key))

    return {
      dehydratedState: finalDehydratedState,
      errors,
      timeouts
    }
  })

/**
 * Render atoms to static values for SSR
 *
 * @since 1.0.0
 * @category SSR
 */
export const renderAtomsStatic = (
  registry: Registry.Registry,
  atoms: Array<Atom.Atom<any>>
): Record<string, any> => {
  const staticValues: Record<string, any> = {}

  for (const atom of atoms) {
    try {
      const nodes = registry.getNodes()
      const node = nodes.get(atom)
      if (node) {
        staticValues[getAtomKey(atom)] = registry.get(atom)
      }
    } catch {
      // Ignore errors for static rendering
    }
  }

  return staticValues
}

/**
 * Create a server-side registry with initial data
 *
 * @since 1.0.0
 * @category SSR
 */
export const createServerRegistry = (
  initialData?: Record<string, any>,
  options: SSROptions = {}
): Registry.Registry => {
  const registry = createSSRRegistry(options)

  if (initialData) {
    // Hydrate with initial data
    const dehydratedAtoms = Object.entries(initialData).map(([key, value]) => ({
      key,
      value,
      dehydratedAt: Date.now()
    }))

    Hydration.hydrate(registry, dehydratedAtoms)
  }

  return registry
}

/**
 * Extract critical atoms that should be preloaded for SSR
 *
 * @since 1.0.0
 * @category SSR
 */
export const extractCriticalAtoms = (
  registry: Registry.Registry,
  criticalKeys: Array<string>
): Array<Atom.Atom<any>> => {
  const nodes = registry.getNodes()
  const criticalAtoms: Array<Atom.Atom<any>> = []

  for (const [atomOrKey, _node] of nodes.entries()) {
    // atomOrKey can be either an Atom or a string (serializable key)
    if (typeof atomOrKey === "string") {
      // If it's already a string key, check directly
      if (criticalKeys.includes(atomOrKey)) {
        // We need to get the actual atom from the node
        criticalAtoms.push(_node.atom)
      }
    } else {
      // If it's an atom, get its key and check
      if (criticalKeys.includes(getAtomKey(atomOrKey))) {
        criticalAtoms.push(atomOrKey)
      }
    }
  }

  return criticalAtoms
}

/**
 * Serialize dehydrated state for client
 *
 * @since 1.0.0
 * @category SSR
 */
export const serializeState = (
  dehydratedState: Array<Hydration.DehydratedAtom>
): string => {
  try {
    return JSON.stringify(dehydratedState)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to serialize atom state:", error)
    return "[]"
  }
}

/**
 * Deserialize state on client
 *
 * @since 1.0.0
 * @category SSR
 */
export const deserializeState = (
  serializedState: string
): Array<Hydration.DehydratedAtom> => {
  try {
    return JSON.parse(serializedState)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to deserialize atom state:", error)
    return []
  }
}

/**
 * Create a SSR-safe atom that provides fallback values
 *
 * @since 1.0.0
 * @category SSR
 */
export const createSSRAtom = <T>(
  serverValue: T,
  clientAtom: Atom.Atom<T>
): Atom.Atom<T> => {
  return Atom.make((get) => {
    // During SSR, return server value
    if (typeof window === "undefined") {
      return serverValue
    }

    // On client, use the actual atom
    return get(clientAtom)
  })
}

/**
 * Check if we're in SSR context
 *
 * @since 1.0.0
 * @category SSR
 */
export const isSSR = (): boolean => {
  return typeof window === "undefined"
}

/**
 * Check if we're in hydration phase
 *
 * @since 1.0.0
 * @category SSR
 */
export const isHydrating = (): boolean => {
  return typeof window !== "undefined" && !window.__ATOM_SOLID_HYDRATED__
}

/**
 * Mark hydration as complete
 *
 * @since 1.0.0
 * @category SSR
 */
export const markHydrationComplete = (): void => {
  if (typeof window !== "undefined") {
    ;(window as any).__ATOM_SOLID_HYDRATED__ = true
  }
}

/**
 * SSR-safe effect that only runs on client
 *
 * @since 1.0.0
 * @category SSR
 */
export const clientOnlyEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A | null, E, R> => {
  return Effect.gen(function*() {
    if (isSSR()) {
      return null
    }
    return yield* effect
  })
}

/**
 * Create an atom that behaves differently on server vs client
 *
 * @since 1.0.0
 * @category SSR
 */
export const createIsomorphicAtom = <TServer, TClient>(
  serverFactory: () => Atom.Atom<TServer>,
  clientFactory: () => Atom.Atom<TClient>
): Atom.Atom<TServer | TClient> => {
  return Atom.make((get) => {
    if (isSSR()) {
      return get(serverFactory())
    } else {
      return get(clientFactory())
    }
  })
}
