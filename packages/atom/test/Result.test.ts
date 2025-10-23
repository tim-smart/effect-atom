import * as _ from "@effect-atom/atom/Result"
import { Cause, Equal } from "effect"
import { describe, expect, it } from "vitest"

describe("Result", () => {
  it("match", () => {
    const matcher = _.match({
      onInitial: () => "init",
      onFailure: () => "fail",
      onSuccess: (s) => s.value
    })

    expect(matcher(_.initial(false))).toEqual("init")
    expect(matcher(_.failure(Cause.empty))).toEqual("fail")
    expect(matcher(_.success(1))).toEqual(1)
  })

  it("considers waiting flag in equality", () => {
    const success = _.success("value")
    const waiting = _.waiting(success)

    expect(Equal.isEqual(success)).toBe(true)
    expect(Equal.isEqual(waiting)).toBe(true)
    expect(Equal.equals(success, waiting)).toBe(false)
    expect((success as any)[Equal.symbol](waiting)).toBe(false)
  })
})
