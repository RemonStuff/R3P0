# 22: Smooth streaming render

**Iteration:** 3 (The chat experience)

## Description
Re-rendering markdown on every chunk with 7 tabs open is wasteful. The webview coalesces chunk messages and re-renders the streaming turn **once per animation frame**, only for the **active** tab (hidden tabs just store text). Completed turns are rendered once and cached. The transcript auto-scrolls only while the user is at the bottom.

## Tests to write first
*(DOM, happy-dom with a fake `requestAnimationFrame`)*
- `ten chunks within one frame cause one markdown render`
- `chunks for an inactive tab do not render until that tab is selected`
- `completed turns are not re-rendered when a new chunk arrives` (spy on the renderer)
- `auto-scrolls to the bottom while the user is at the bottom`
- `does not auto-scroll after the user scrolled up`
- `the final turnEnded renders the full text even if no frame fired`

## Implementation tasks
- [ ] `src/webview/view/renderScheduler.ts`
- [ ] A per-turn render cache keyed by turn id and text length

## Acceptance criteria
- [ ] The listed tests pass, and CI is green
- [ ] Manual: a long SIMULATED reply streams without visible jank

## Depends on
#21

## Labels
`feature`

## Estimate
S
