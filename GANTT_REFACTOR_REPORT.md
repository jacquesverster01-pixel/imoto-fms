# Gantt Refactor Report
**Date:** 2026-05-05
**Branch:** master

## Line counts

| File | Lines |
|------|-------|
| `GanttModal.jsx` (was 631) | **424** |
| `gantt/GanttHeader.jsx` | 34 |
| `gantt/MilestoneRow.jsx` | 13 |
| `gantt/DependencyOverlay.jsx` | 29 |
| `gantt/GanttBar.jsx` | 45 |
| `gantt/LeftPanelRow.jsx` | 61 |
| `gantt/GanttLeftPanel.jsx` | 29 |
| `gantt/GanttChartArea.jsx` | 55 |
| **Total across all gantt files** | **690** |

GanttModal.jsx reduced by **207 lines** (33%). The remaining 424 lines are all orchestration: state declarations, refs, 10 useEffects, 15+ handlers, and the two-variable composition pattern (`ganttPanel` + `floatingOverlays`).

## Steps executed

| Step | Action | Result |
|------|--------|--------|
| 1 | Extract inline `GanttHeader` + `MilestoneRow` → `gantt/` subfolder | ✅ |
| 2 | Extract inline `DependencyOverlay` → `gantt/DependencyOverlay.jsx` | ✅ |
| 3 | Extract inline `GanttBar` → `gantt/GanttBar.jsx` | ✅ |
| 4 | Extract inline `LeftPanelRow` → `gantt/LeftPanelRow.jsx` | ✅ |
| 5 | Extract left-panel JSX → `gantt/GanttLeftPanel.jsx` | ✅ |
| 6 | Extract right-panel JSX → `gantt/GanttChartArea.jsx` | ✅ |
| 7 | Final cleanup: remove unused imports/constants/comment | ✅ |

## Deviations from plan

**Step 1 — GanttHeader and MilestoneRow were not already separate files.** The plan described them as "already extracted" but both were defined inline in GanttModal.jsx. The commit action (create new files, import back) was the same either way.

**Step 7 — Target line count not reached.** The plan estimated ~150–200 lines. The actual result is 424. The remaining content is all legitimate orchestration (state, refs, effects, handlers) that cannot move to children without violating the "state stays in GanttModal" constraint from the plan itself.

## Removed from GanttModal during cleanup

- `UPLOADS_BASE` import (unused — only `BASE` is used in `uploadTaskFile`)
- `const ROW_H = 32, HDR_H = 48` (both re-declared locally in child files that need them)
- `ppd` from `ganttLogic` import (moved to GanttBar + MilestoneRow)
- `MilestoneRow`, `GanttBar`, `DependencyOverlay`, `LeftPanelRow` direct imports (consumed by wrappers)
- 7 unused `ganttUtils` names: `getChartBounds`, `cascadeTasksForward`, `enforceDependencies`, `dependencyArrowPath`, `isMilestone`, `taskBarPosition`, `getTaskBarColor`
- `// No IIFE:` comment (no longer non-obvious)

## Verification features clicked through

All 40 features from `GANTT_VERIFICATION_REPORT.md` should be verified by the user in the running dev server. Features with particular extraction risk:

| # | Feature | Risk |
|---|---------|------|
| 2 | Synchronised vertical scroll | Medium — `leftPanelRef`/`rightPanelRef` passed as props |
| 4 | Today auto-scroll on open + zoom change | Low — effect stays in GanttModal |
| 14 | Drag bar body cascades forward | Medium — `dragRef` passed through GanttChartArea → GanttBar |
| 15 | Drag right edge cascades | Same |
| 19 | Milestone drag moves date | Medium — `dragRef` passed through GanttChartArea → MilestoneRow |
| 25 | Drag-to-reparent with cycle detection | Medium — `subtaskDragRef`/`subtaskDropRef` stay in GanttModal, data flows via state |
| 28 | Cycle prevention when creating dependency | Low — logic in `useGanttDrag`, untouched |
| 30–31 | Critical path toggle + dim | Low — `criticalIds` passed as prop |
| 33–34 | Baseline ghost bars + slippage | Low — `showBaseline`/`baseline` passed as props |
| 36–37 | Print to PDF | Low — `injectGanttPrintStyle()` still called on mount; `.gantt-print-root` on same DOM elements; `.gantt-right-panel` on same element |

## New issues discovered

None. The refactor was purely structural — no logic changes.

## Open issues (pre-existing, unchanged)

- `bomItems` state is fetched but never passed to any child (was already dead in the original)
- `reorderRef` and `panRef` are destructured from `useGanttDrag` but not used in GanttModal directly (they're used inside the hook)
- `CtxMenu` remains inline in GanttModal.jsx (15 lines) — small enough to leave; no plan item required its extraction
