import type { SendFailure } from "../types";

/** What `BudgetPort.send` rejects with before the first chunk. */
export class SendError extends Error {
  override readonly name = "SendError";

  constructor(readonly failure: SendFailure) {
    super(failure.message);
  }
}

export function isSendError(value: unknown): value is SendError {
  return value instanceof SendError;
}
