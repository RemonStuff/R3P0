# 27: New conversation, and restoring after hide or reload

**Iteration:** 3 (The chat experience)

## Description
**New conversation** (a button in the tab header, plus the command `r3p0.newConversation` for the active tab) stops any stream on that tab, clears its conversation, and saves the empty conversation. If the tab has turns, the user confirms first. **Restore:** on activation, sessions load their history, so a reload shows the previous conversations. When the webview is hidden and shown again, it posts `ready` and gets a full `snapshot`, including the partial text of a stream that's still running in the host.

## Tests to write first
*(unit: controller / sessionManager)*
- `newConversation clears the tab's turns and saves an empty conversation`
- `newConversation while streaming stops the stream first`
- `newConversation on tab A leaves tab B untouched`
- `sessions load their saved history on start`
- `a snapshot after ready includes saved turns and a running stream's partial text`
- `the active tab and model choices are restored from r3p0.ui.v1`

*(DOM)*
- `New conversation asks for confirmation when the tab has turns and posts newConversation on confirm`
- `New conversation on an empty tab posts without asking`

*(integration)*
- `history survives deactivating and re-activating the extension` (through the test API)

## Implementation tasks
- [ ] Protocol: `newConversation` (with parser tests)
- [ ] Command `r3p0.newConversation`
- [ ] Load on start in `SessionManager`

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#18, #25

## Labels
`feature`

## Estimate
S
