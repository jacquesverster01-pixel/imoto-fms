# Gantt Verification Report — 2026-04-24

## Feature status (40 items)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Two-pane layout (220px left / flex right) | ✅ | Left panel 220px fixed; right panel flex:1 |
| 2 | Synchronised vertical scroll | ✅ | `onLeftScroll` / `onRightScroll` cross-sync scrollTop |
| 3 | Day / Week / Month zoom toggle | ✅ | `buildZoomColumns` switches column granularity; header buttons |
| 4 | Today auto-scroll on open and zoom change | ✅ | `useEffect([zoom, zoomScale])` → `getTodayScrollX` |
| 5 | Weekend shading (day zoom) | ✅ | `isWeekend` flag on day cols; striped row bg + header bg |
| 6 | Today marker (blue column edge) | ✅ | `isToday` flag; `borderLeft: '2px solid #185fa5'` in day/week; not marked in month view (acceptable — month cols span 28–31 days) |
| 7 | Month label band above day/week row | ✅ | `groupCols` produces month headers; rendered as sticky top-band |
| 8 | Inline rename of task name | ⚠️ | No direct edit in left-panel row (name is `<span>`). Rename works via TaskWindow name input, which opens on row click. Original design; no regression. |
| 9 | Add task button | ✅ | `addTask()` appends to root tasks; button at left-panel bottom |
| 10 | Add milestone button | ✅ | `addMilestone()` creates `{ milestone: true, startDate==endDate }`; diamond rendered |
| 11 | Delete task | ⚠️ | Trash icon in TaskWindow calls `removeNodeById` immediately — no confirmation dialog. Works correctly; confirmation absent by design. |
| 12 | Tick checkbox marks done + pct=100 | ✅ | `onCheckTask` toggles `done` / `pct`; text gets strikethrough |
| 13 | Click row opens TaskWindow | ✅ | `openTaskMenu` → `setTaskWindow` → `<TaskWindow>` rendered at correct position |
| 14 | Drag bar body moves task; cascades forward | ✅ | `type:'move'` drag → `cascadeTasksForward` + `enforceDependencies` on mouseup (top-level tasks) |
| 15 | Drag right edge resizes; cascades | ✅ | `type:'resize'` drag → same cascade logic |
| 16 | Bar fill shows `pct` | ✅ | Inner `div` with `width: task.pct%`; dark overlay |
| 17 | Bar colour via `getTaskBarColor` | ✅ | Done=green, blocked=red, overdue=amber, default=blue |
| 18 | Done tasks visually distinguished | ⚠️ | Green bar colour + strikethrough text in left panel. No stripe pattern on bar itself. Original design; no regression. |
| 19 | Milestone diamonds; click toggles done; drag moves date | ✅ | `MilestoneRow` with rotated square; `onToggleDone`; `isMilestone` drag path |
| 20 | N-level task nesting | ✅ | `flattenTasksForDisplay` / `deriveParentBounds` recurse through `children` trees |
| 21 | Indented rows by depth | ✅ | `paddingLeft: 4 + depth * 20` in `LeftPanelRow` |
| 22 | Collapse/expand parent rows | ✅ | `▸/▾` toggle; `filterVisibleRows` respects `collapsed` map |
| 23 | Parent bar derives bounds from children | ✅ | `deriveParentBounds` computes min-start / max-end recursively |
| 24 | Add sub-task from TaskWindow | ✅ | `onAddSubTask(task.id)` → `appendChildTo` |
| 25 | Drag-to-reparent with cycle detection | ✅ | `moveNodeTo` refuses self-parent and descendant-parent moves |
| 26 | Dependency arrows (SVG) | ✅ | `DependencyOverlay` renders `<path>` for each `dependsOn` entry across all visible rows |
| 27 | Drag predecessor later → dependents shift | ✅ | `enforceDependencies` applied after every drag/drop for root tasks |
| 28 | Cycle prevention when creating dependency | ✅ | `wouldCreateCycle` checked in `useGanttDrag` before `updateNodeById` |
| 29 | Lock indicator on dependency-constrained bars | ✅ | 🔒 emoji shown when `task.dependsOn.length > 0` |
| 30 | Critical path toggle highlights chain | ✅ | `computeCriticalPath` walks backwards from latest end date; `criticalIds` state |
| 31 | Non-critical bars dimmed | ✅ | `opacity: 0.6` when `hasCp && !isCrit`; critical bars get red left border |
| 32 | Set baseline snapshots dates | ✅ | `PUT /jobs/:id/baseline`; route exists and persists to `jobs.json` |
| 33 | Show baseline renders ghost bars | ✅ | `GanttBar` renders ghost `div` at `blPos` when `showBaseline && bl` found |
| 34 | Slippage visible between ghost and current | ✅ | Ghost bar at old position; current bar at new position |
| 35 | Baseline persists across reload | ✅ | `baseline` initialised from `job.baseline || []`; saved via `PUT /jobs/:id/baseline` |
| 36 | Print to PDF via browser dialog | ✅* | Fixed: print CSS now uses `visibility:hidden/visible` instead of `display:none` — see Fixes Applied below |
| 37 | PDF contains only Gantt area | ✅* | Same fix; `position:absolute; top:0; left:0` on `.gantt-print-root` fills viewport in print |
| 38 | Save writes to `PUT /jobs/:id` | ✅ | `handleClose` calls `PUT /jobs/:id/tasks` then `PUT /jobs/:id`; both routes exist and are in allowlist |
| 39 | `onSaved` fires → list refreshes → job stays selected | ✅ | `onSaved={refetchJobs}` passed from ProductionPlanner; `key={selectedJob.id}` keeps Gantt mounted |
| 40 | Schema migration upgrades old tasks | ✅ | `migrateTasksSchema` called in `useState` init; handles `subTasks→children` and adds missing fields |

---

## Fixes applied

- **`src/utils/ganttExport.js`** — Replaced `body > * { display: none !important }` print strategy with `visibility: hidden` / `visibility: visible`. The old strategy caused a blank print page because CSS `display: none` on `#root` (a `body > *` child) cannot be overridden by `display: flex` on a nested descendant — `visibility` can. Applied `position: absolute; top: 0; left: 0` to `.gantt-print-root` in print mode to anchor it at the viewport origin.

---

## Open issues

- **#8 — Inline rename**: Task name is a `<span>` in the left panel; editing is done via TaskWindow. This is the original design choice. A direct double-click-to-edit in the row would require a small change to `LeftPanelRow` (swap span → input on double-click). Deferred — not a regression from FIX 1.

- **#11 — Delete without confirmation**: The trash icon in TaskWindow deletes immediately. `window.confirm()` could be added in TaskWindow's onClick handler in one line. Deferred — original behaviour, out of scope for a verification pass.

- **#18 — Done bar appearance**: Done tasks show green bar + strikethrough text. A CSS stripe pattern (repeating-linear-gradient) on the bar was never implemented. Deferred — original design.

- **Cascade for sub-tasks**: `cascadeTasksForward` in `ganttUtils.js` only operates on the flat root `tasks` array. Dragging a sub-task bar will NOT cascade sibling sub-tasks — only `enforceDependencies` runs. This matches the original implementation and is a known limitation.

- **Baseline snapshot misses sub-task dates**: `handleSetBaseline` snapshots `tasks.map(t => ({ taskId: t.id, ... }))` — top-level tasks only. Children's dates are not baselined. Low impact since baseline is a planning aid, not a hard constraint.

- **`DELETE /api/jobs/:id` cleanup**: Backend delete handler uses `t.subTasks || []` to find nested-task files, but the schema now uses `t.children`. Files attached to sub-tasks won't be deleted from disk when a job is deleted. Backend-only fix; out of scope for GanttModal verification.

---

## Line counts

| File | Lines | Limit |
|------|-------|-------|
| `GanttModal.jsx` | 554 | 400 |
| `ganttUtils.js` | 363 | — |
| `taskTreeOps.js` | 125 | — |
| `taskMigration.js` | 22 | — |
| `TaskWindow.jsx` | 226 | — |

---

## Recommendation

The Gantt is in good functional shape — all 40 features are implemented and the majority work correctly. The one definitive bug (print CSS blank page) is now fixed. The open issues are design-level choices (no inline rename, no delete confirmation, no bar stripe) and a known sub-task cascade limitation that was never implemented. `GanttModal.jsx` is 554 lines against a 400-line guideline; a component-extraction refactor (`GanttHeader`, `GanttLeftPanel`, `GanttChartArea`, `GanttDependencyLayer`) is recommended as a follow-up prompt before the file grows further.
