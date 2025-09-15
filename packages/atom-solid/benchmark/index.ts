/**
 * Performance benchmarks for @effect-atom/atom-solid
 *
 * Run with: pnpm benchmark
 */

import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { Effect } from "effect"
// Use the global performance API available in Node.js 16+ and browsers

// Benchmark utilities
function benchmark(name: string, fn: () => void, iterations = 1000) {
  // Warmup
  for (let i = 0; i < 100; i++) {
    fn()
  }

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()

  const totalTime = end - start
  const avgTime = totalTime / iterations

  console.log(`${name}:`)
  console.log(`  Total: ${totalTime.toFixed(2)}ms`)
  console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`)
  console.log(`  Ops/sec: ${(1000 / avgTime).toFixed(0)}`)
  console.log()
}

function memoryUsage() {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage()
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    }
  }
  return null
}

// Benchmark tests
function runBenchmarks() {
  console.log("🚀 atom-solid Performance Benchmarks")
  console.log("=====================================\n")

  const initialMemory = memoryUsage()
  if (initialMemory) {
    console.log(`Initial Memory: ${initialMemory.heapUsed}MB heap, ${initialMemory.external}MB external\n`)
  }

  // 1. Atom creation benchmark
  benchmark("Atom Creation", () => {
    const atom = Atom.make(Math.random())
    // Prevent optimization
    atom.toString()
  })

  // 2. Registry operations
  const registry = Registry.make()
  const testAtom = Atom.make(42)

  benchmark("Registry Get", () => {
    registry.get(testAtom)
  })

  benchmark("Registry Set", () => {
    registry.set(testAtom, Math.random())
  })

  // 3. Computed atoms
  const baseAtom = Atom.make(0)
  const computedAtom = Atom.make((get) => get(baseAtom) * 2)

  benchmark("Computed Atom Evaluation", () => {
    registry.set(baseAtom, Math.random())
    registry.get(computedAtom)
  })

  // 4. Subscription performance
  let subscriptionCount = 0
  benchmark("Atom Subscription", () => {
    const unsubscribe = registry.subscribe(testAtom, () => {
      subscriptionCount++
    })
    registry.set(testAtom, Math.random())
    unsubscribe()
  })

  // 5. Async atoms
  const asyncAtom = Atom.fn(() => Effect.succeed(Math.random()))

  benchmark("Async Atom Creation", () => {
    registry.get(asyncAtom)
  })

  // 6. Memory stress test
  console.log("Memory Stress Test (1000 atoms):")
  const atoms: Array<Atom.Atom<number>> = []
  const startMemory = memoryUsage()

  for (let i = 0; i < 1000; i++) {
    atoms.push(Atom.make(i))
  }

  const midMemory = memoryUsage()

  // Use all atoms
  atoms.forEach((atom) => registry.get(atom))

  const endMemory = memoryUsage()

  if (startMemory && midMemory && endMemory) {
    console.log(`  Before: ${startMemory.heapUsed}MB`)
    console.log(
      `  After creation: ${midMemory.heapUsed}MB (+${(midMemory.heapUsed - startMemory.heapUsed).toFixed(2)}MB)`
    )
    console.log(
      `  After usage: ${endMemory.heapUsed}MB (+${(endMemory.heapUsed - startMemory.heapUsed).toFixed(2)}MB total)`
    )
    console.log(`  Memory per atom: ${((endMemory.heapUsed - startMemory.heapUsed) * 1024 / 1000).toFixed(2)}KB`)
  }

  console.log(`\n✅ Benchmarks completed. Subscription count: ${subscriptionCount}`)
}

// Run benchmarks
runBenchmarks()
