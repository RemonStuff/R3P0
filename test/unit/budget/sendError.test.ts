import { describe, expect, it } from "vitest";
import { SendError, isSendError } from "../../../src/core/budget/sendError";

describe("SendError", () => {
  it("carries the failure and uses its message", () => {
    const error = new SendError({ kind: "refused", code: "over-budget", message: "Spent." });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Spent.");
    expect(error.failure).toEqual({ kind: "refused", code: "over-budget", message: "Spent." });
    expect(error.name).toBe("SendError");
  });

  it("isSendError recognises a SendError and nothing else", () => {
    expect(isSendError(new SendError({ kind: "model", code: "blocked", message: "x" }))).toBe(true);
    expect(isSendError(new Error("x"))).toBe(false);
    expect(isSendError({ failure: { kind: "refused" } })).toBe(false);
    expect(isSendError(undefined)).toBe(false);
  });
});
