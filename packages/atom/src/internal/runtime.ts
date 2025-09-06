/**
 * @since 1.0.0
 */
import { NoSuchElementException } from "effect/Cause"
import type * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as Runtime from "effect/Runtime"
import { SyncScheduler } from "effect/Scheduler"

const fastPath = <R, E, A>(effect: Effect.Effect<A, E, R>): Exit.Exit<A, E> | undefined => {
  const op = effect as any
  switch (op._tag) {
    case "Failure":
    case "Success": {
      return op
    }
    case "Left": {
      return Exit.fail(op.left)
    }
    case "Right": {
      return Exit.succeed(op.right)
    }
    case "Some": {
      return Exit.succeed(op.value)
    }
    case "None": {
      // @ts-expect-error
      return Exit.fail(new NoSuchElementException())
    }
  }
}

/** @internal */
export const runCallbackSync = <R, ER = never>(runtime: Runtime.Runtime<R>) => {
  const runFork = Runtime.runFork(runtime)
  return <A, E>(
    effect: Effect.Effect<A, E, R>,
    onExit: (exit: Exit.Exit<A, E | ER>) => void,
    uninterruptible = false
  ): (() => void) | undefined => {
    const op = fastPath(effect)
    if (op) {
      onExit(op)
      return undefined
    }
    const scheduler = new SyncScheduler()
    const fiberRuntime = runFork(effect, { scheduler })
    scheduler.flush()
    const result = fiberRuntime.unsafePoll()
    if (result) {
      onExit(result)
      return undefined
    }
    fiberRuntime.addObserver(onExit)
    function cancel() {
      fiberRuntime.removeObserver(onExit)
      if (!uninterruptible) {
        fiberRuntime.unsafeInterruptAsFork(FiberId.none)
      }
    }
    return cancel
  }
}
