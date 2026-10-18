# 26: Build messages and trim to the context window

**Iteration:** 3 (The chat experience)

## Description
`buildMessages({ repo, turns, prompt, attachments, maxInputTokens })` returns the plain-JSON `ChatMessage[]` sent through Q0T4: a leading **user preamble** ("You are helping in the repository `owner/repo` (workspace folder `x`). Only files from this repository are shared with you."), then the completed history turns (`complete` and `stopped-*` only, not `failed` or `interrupted`), then attachment blocks (added in #43), then the prompt. `trimToWindow` drops the oldest history pairs until `estimateTokens` (chars / 4 × 1.1) fits `maxInputTokens`, minus a 10% margin for the output. If the prompt alone doesn't fit, it refuses locally with a clear message. Q0T4 does the exact count.

## Tests to write first
*(`test/unit/messages/buildMessages.test.ts`)*
- `starts with the user preamble naming the subject and folder`
- `includes completed and stopped turns in order as user/assistant`
- `excludes failed and interrupted assistant turns and their user turns`
- `ends with the prompt as a user message`
- `trimToWindow drops the oldest pairs first`
- `trimToWindow never drops the preamble or the prompt`
- `returns too-long when the prompt alone exceeds the window`
- `estimateTokens is ceil(chars / 4 * 1.1)`
- `messages are plain JSON (structuredClone round-trips)`

## Implementation tasks
- [ ] `src/core/messages/buildMessages.ts`, `trimToWindow.ts`, `estimateTokens.ts`
- [ ] Preamble text in `core/format`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#25

## Labels
`feature`

## Estimate
S
