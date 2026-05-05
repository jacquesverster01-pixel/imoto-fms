# Kickoff Prompt — GanttModal Refactor (paste into Claude Code)

You are working in the `imoto-fms` repo. Read these files first, in this order, before doing anything else:

1. `CLAUDE.md` — the project's hard coding rules
2. `GANTT_VERIFICATION_REPORT.md` — the 40-feature audit table that must still pass after the refactor
3. `GANTT_MODAL_REFACTOR_PLAN.md` — the full plan for this work (attached / in repo root)

Then read the file being refactored:

4. `src/pages/production/GanttModal.jsx` — currently 631 lines, target is ~180–200 lines

## Your task

Execute Steps 1 through 7 of the refactor plan. Do not deviate from the order. The order is chosen so each step leaves the app in a working state.

Between every step:
- Save all touched files
- Run `npm run dev` (it may already be running — if so, just confirm Vite reloaded without errors)
- Open the browser to the Production page, open a job's Gantt, and click through the affected features for that step. The plan lists which features to verify per step.
- Only proceed to the next step when the current step is verified working.

If the dev server isn't running, you can start it: `npm run dev` from the repo root. The frontend is on `:5173`, backend on `:3001`. If you add new files but Vite doesn't pick them up, clear the cache: `Remove-Item -Recurse -Force node_modules\.vite` (PowerShell) and restart.

## Hard rules (from CLAUDE.md, do not break)

- **All `useState` hooks at the top of the component** — before any conditionals or early returns
- **Helper functions at module level** — never inside component bodies
- **No IIFEs in JSX** — use `{cond && <JSX/>}` or ternary
- **`apiFetch` paths never start with `/api`** — `BASE` already includes it
- **No nested Express route handlers** (not relevant here, but worth knowing)

## Specific refactor constraints

- **State stays in `GanttModal.jsx`.** Do not move any `useState`, `useRef`, or the `useGanttDrag` hook into a child component. Children are presentational and receive props/callbacks only.
- **Preserve the `.gantt-print-root` className on the same DOM elements** — `injectGanttPrintStyle()` targets it and the print-to-PDF fix depends on it
- **Preserve the `.gantt-right-panel` className** for the same reason
- **Preserve the dual return paths** — `if (embedded) return <>{ganttPanel}{floatingOverlays}</>` versus the print-root + dark overlay path. Both must keep working.
- **Preserve z-index stacking** of GanttBar (varies), MilestoneRow, ghostBar (zIndex:1), DependencyOverlay (zIndex:1), linkLine SVG (zIndex:100), ghostCard (zIndex:300). Wrapping these in extra divs can silently break stacking context — match container styles exactly.

## Verification standard

After Step 7, the 40 features in `GANTT_VERIFICATION_REPORT.md` must all still work. Click through each one in the running dev server. Pay particular attention to:

- Synchronised vertical scroll between left panel and chart area (item #2)
- Today auto-scroll on open + zoom change (#4)
- Drag bar body cascades forward + enforces deps on mouseup (#14)
- Drag right edge cascades (#15)
- Drag-to-reparent with cycle detection (#25)
- Cycle prevention when creating dependency (#28)
- Critical path toggle dims non-critical bars (#30, #31)
- Baseline ghost bars render slippage (#33, #34)
- **Print-to-PDF (#36, #37)** — the bug fix from the verification report. The print CSS must still target `.gantt-print-root`, and that className must still be on the outermost wrapping element of `ganttPanel`.

If anything regresses, do not "fix it forward" — revert that step's changes and re-plan.

## What to commit

Each step is a separate commit. Use commit messages of the form:

- `refactor(gantt): step 1 — move GanttHeader and MilestoneRow into gantt/ subfolder`
- `refactor(gantt): step 2 — extract DependencyOverlay`
- `refactor(gantt): step 3 — extract GanttBar`
- `refactor(gantt): step 4 — extract LeftPanelRow`
- `refactor(gantt): step 5 — extract GanttLeftPanel wrapper`
- `refactor(gantt): step 6 — extract GanttChartArea wrapper`
- `refactor(gantt): step 7 — final cleanup + verification pass`

Commit at the end of each verified step, not in the middle of a step.

## What's out of scope

The plan lists these. Don't get tempted:
- The `DELETE /api/jobs/:id` backend bug (`t.subTasks` → `t.children`) — separate fix
- Sub-task cascade limitation — design constraint, not a regression
- Inline rename of task name — design choice
- Delete confirmation in TaskWindow — design choice
- Done-bar stripe pattern — never implemented

## Report back at the end

When all 7 steps are done and verified, write a `GANTT_REFACTOR_REPORT.md` in the repo root containing:

- Final line counts of each new file
- New line count of `GanttModal.jsx`
- Which of the 40 verification features you actually clicked through
- Any deviations from the plan (with reasons)
- Any new issues discovered during the work

Begin with Step 0: read the four files listed at the top, then summarise back to me what you understand the current state of `GanttModal.jsx` to be (current sub-functions, current imports, current state shape). Wait for me to confirm before starting Step 1.
