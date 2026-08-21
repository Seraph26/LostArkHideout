# LostArkHideout Save State — 2026-08-21

## Project checkpoint
Approximately 2/3 complete.

## Validated working state
- Raid Specific hovers are confirmed correct and frozen.
- General Optimization hovers are confirmed correct and frozen.
- General hover values remain distinct from Raid Specific values.
- General hovers omit raid/gate identification and encounter compatibility text.
- General Optimize → manual swap → Optimize workflow was stress-tested for approximately 7 additional cycles and remained functional.
- General optimization baseline is restored on subsequent Optimize operations.

## HARD FREEZE — requires explicit user permission before modification
Do not modify, refactor, replace, indirectly alter, or work around any of the following without explicitly asking the user and receiving a yes:

- Raid Specific hover logic
- General Optimization hover logic
- Canonical hover renderer
- Hover calculations or displayed hover values
- Hover formatting, text, ordering, spacing, or contents
- Top arrows
- Bottom metric arrows
- Metric hover contents
- Any displayed text associated with the frozen hover/arrow systems
- Raid Specific scoring/encounter logic
- General Optimization scoring/assignment logic, unless specifically necessary for a newly requested task and explicitly approved by the user

If a future task appears to require changing a frozen component, STOP and ask for explicit permission before touching it.

## Current known-good commit
`7d9d70426967deec96ffcad7db023bd9cab22905`

## Save-state branch
`save-state-2026-08-21-2-3-complete`

This branch is a rollback/reference point for the current validated project state.

## Next work
Continue from this checkpoint only after the user specifies the next project area. Do not proactively modify frozen systems.
