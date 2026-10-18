# 44: Error paths

**Iteration:** 7 (Hardening and release)

## Description
Make every failure visible, recoverable and honest. Every error is mapped to a friendly message in `core/format`, nothing is ever thrown into VS Code, and a failure in one tab never breaks another. This covers the Q0T4 error codes (`model-not-found` → "The model ‹name› is no longer available. Pick another one.", `no-permissions` → a consent hint with Retry, `blocked`, `unknown`), Q0T4 throwing synchronously, a `text` iterator that throws, `result` never settling (with a 120 s watchdog after the last chunk), history write failures, git API failures, `postMessage` failures, and the extension host restarting mid-stream (`interrupted`).

## Tests to write first
*(unit)*
- `model-not-found shows the model name and suggests picking another one`
- `no-permissions shows a consent hint and a Retry action that resends the same request`
- `sendRequest throwing synchronously ends the turn as failed`
- `the text iterator throwing mid-stream keeps the partial text and fails the turn`
- `result never settling: the watchdog fails the turn 120 s after the last chunk` (FixedClock)
- `an error in tab A's session leaves tab B streaming`
- `history write failure shows a one-time warning and the chat continues`
- `postMessage returning false never throws and the next ready resyncs`
- `the controller catches and logs any exception from a message handler`

*(integration)*
- `with the fake Q0T4 scripted to throw, the extension stays active and the tab shows the error`

## Implementation tasks
- [ ] `src/core/format/errors.ts`, the watchdog in `ChatSession`
- [ ] An `R3P0` output channel for logs (through `UiPort.log`)
- [ ] Protocol: `retry` (with parser tests)

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#36

## Labels
`feature`

## Estimate
M
