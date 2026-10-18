# 43: Attachments in the chat

**Iteration:** 6 (Repo-scoped context) 🎯 **Install and try**

## Description
An **Attach** button (📎) in the composer posts `attach { tabKey }`. The host runs the picker for **that tab's repo**, and the attachments appear as removable chips (`path · 3.2 kB`). On send, `buildMessages` adds one block per attachment before the prompt (`File: <relPath>` + a fenced block with the language from the extension), and the history stores only `{ path, bytes }`. Attachments go only with the turn they're attached to (decision 6 in PLAN §7). A file that changed or disappeared between attaching and sending is read at send time. A missing file is reported and skipped.

## Tests to write first
*(unit)*
- `buildMessages adds attachment blocks before the prompt with the relative path and a fenced block`
- `the fence is longer than any backtick run inside the file`
- `attachments are not repeated in later turns`
- `a file deleted before send is skipped with a note in the turn`
- `the history stores path and bytes only`
- `attach for tab A never offers files from tab B's repo` (controller with FakeRepoFiles per repo)

*(DOM)*
- `chips show path and size, and the remove button posts removeAttachment`
- `the attach button posts attach for the active tab`
- `chips clear after send`

*(integration)*
- `an attached file's content reaches the fake Q0T4 in the messages`

## Implementation tasks
- [ ] Protocol: `attach`, `removeAttachment`, `attachments` (with parser tests)
- [ ] `src/webview/view/attachments.ts`
- [ ] Extend `buildMessages`
- [ ] Update `docs/manual-testing.md` for iteration 6

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green
- [ ] Manual: in a multi-root workspace, Attach in tab A lists only A's files, the model can answer about an attached file, and attaching a 1 MB file is refused

## Depends on
#26, #28, #42

## Labels
`feature`

## Estimate
M
