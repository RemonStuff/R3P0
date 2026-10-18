# 24: Model catalog and model picker

**Iteration:** 3 (The chat experience)

## Description
Each tab has a model picker. `lmModelCatalog` lists models through `vscode.lm.selectChatModels()` (metadata only, **never** `sendRequest` or `countTokens`) and re-lists on `lm.onDidChangeChatModels`. `chooseModel` in core picks a tab's model: the one remembered for that tab → the last one used in any tab → the first model in the list. If the remembered model disappears, it falls back and shows a note. The choice is stored per tab in `r3p0.ui.v1`. Requests carry only a `ModelRef { vendor, id }`. With no models at all, the input is disabled with "No chat models available".

## Tests to write first
*(unit: `test/unit/models/chooseModel.test.ts`)*
- `uses the model remembered for the tab`
- `falls back to the last used model when the tab has none`
- `falls back to the first model when nothing is remembered`
- `a remembered model that disappeared falls back and flags a note`
- `returns none when the catalog is empty`
- `options are sorted by vendor then name and labelled with the name`

*(unit: controller)*
- `pickModel stores the choice for that tab and the next send uses its ModelRef`
- `catalog changes post a models message`

*(architecture test)*
- `src/ contains no sendRequest( or countTokens( outside core/budget/q0t4Budget.ts`

*(DOM)*
- `the picker lists the options and marks the selected one`
- `changing the picker posts pickModel`

*(integration)*
- `the catalog lists the r3p0-test models from the fake provider`

## Implementation tasks
- [ ] `src/core/models/chooseModel.ts`, `src/adapters/lmModelCatalog.ts`
- [ ] Protocol: `pickModel`, `models` (with parser tests)
- [ ] `src/webview/view/modelPicker.ts`
- [ ] The architecture grep test

## Acceptance criteria
- [ ] The listed tests pass, core coverage is ≥ 90%, and CI is green

## Depends on
#18, #19

## Labels
`feature`

## Estimate
M
