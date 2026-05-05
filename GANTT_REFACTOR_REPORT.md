# Gantt Refactor Report — 2026-05-05

Companion to GANTT_VERIFICATION_REPORT.md (2026-04-29). The verification
report flagged GanttModal.jsx at 554 lines against a 400-line guideline
and recommended a component-extraction refactor (GanttHeader,
GanttLeftPanel, GanttChartArea, GanttDependencyLayer) before the file
grew further. This report documents the execution of that refactor.

## Trigger

By the time the refactor began (2026-05-04), GanttModal.jsx had grown
from 554 → 631 lines in five days. ~80 lines of growth in one week,
exactly the trajectory the verification report warned about.

## Approach

Seven-step extraction, one commit per step, behaviour preserved. State
remained centralised in GanttModal.jsx — children are presentational,
receive props and callbacks. Plan derived from a full read of the file
and lives in GANTT_MODAL_REFACTOR_PLAN.md (also in repo root).

## File-by-file outcome

| File | Lines | Role |
|---|---|---|
| GanttModal.jsx | 424 (was 631) | State, effects, handlers, composition |
| gantt/GanttHeader.jsx | 34 | Toolbar (zoom, status, export, etc.) |
| gantt/MilestoneRow.jsx | 13 | Milestone diamond row |
| gantt/DependencyOverlay.jsx | 29 | SVG arrow paths between dependent rows |
| gantt/GanttBar.jsx | 45 | Task bar with drag/resize/link handles |
| gantt/LeftPanelRow.jsx | 61 | Left-panel row (collapse, check, milestone, menu) |
| gantt/GanttLeftPanel.jsx | 29 | Wrapper: scroll container + row map + footer |
| gantt/GanttChartArea.jsx | 55 | Wrapper: header bands + row chart cells |

Total extracted: 266 lines distributed across 7 files. Net reduction in
GanttModal.jsx: 207 lines (33%). The 59-line gap between extracted-out
and removed-from is the cost of orchestration — imports, prop-passing
JSX, and small adapter shims. Those lines are now readable as a
contract rather than buried inside a 600-line component.

## Step-by-step execution

| Step | Action | Risk | Status |
|---|---|---|---|
| 1 | Extract inline GanttHeader + MilestoneRow → gantt/ | Low | Verified ✓ |
| 2 | Extract DependencyOverlay → gantt/ | Low | Verified ✓ |
| 3 | Extract GanttBar → gantt/ | Low | Verified ✓ |
| 4 | Extract LeftPanelRow → gantt/ | Low | Verified ✓ |
| 5 | Extract GanttLeftPanel wrapper | Medium | Verified ✓ |
| 6 | Extract GanttChartArea wrapper | High | Verified ✓ |
| 7 | Final cleanup + verification pass | — | Verified ✓ |

## Plan-vs-reality deviations

- The original plan stated GanttHeader and MilestoneRow were already
  separate files. They were not — both were inline definitions in
  GanttModal.jsx (lines 93–131). Step 1 became "extract inline
  definitions into new files" rather than "move existing files,"
  which made the refactor more uniform: every step is the same shape
  of work. Risk profile unchanged.
- ROW_H = 32 and HDR_H = 48 were re-declared as module-level
  constants in each new file that needs them, rather than centralised
  in ganttUtils.js. Rationale: values are stable, locality preferred
  over a five-file import chain change. A breadcrumb comment was
  added to ganttUtils.js for future reference.
- Final GanttModal.jsx landed at 424 lines, not the plan's target of
  ~180–200. The shortfall reflects honest accounting: 17 useState
  slots, 9 useRef slots, useGanttDrag hook, ~10 handler functions,
  multiple useEffect blocks for global listeners, and dual return
  paths. 200 was unrealistic for that surface area; 424 is the real
  floor without merging refs or moving handlers into hooks.

## Verification against GANTT_VERIFICATION_REPORT.md (40 features)

Features verified through manual click-through after Step 7:

- Two-pane layout, sync scroll: ✓
- Day/Week/Month zoom toggle: ✓ (header callback fires through to state)
- Today auto-scroll on open + zoom change: ✓
- Weekend shading (day zoom): ✓
- Today marker: ✓
- Add task / Add milestone footer buttons: ✓
- Tick checkbox marks done: ✓
- Click row opens TaskWindow: ✓ (verified — TaskWindow opens cleanly,
  closes via × button without leaking listeners)
- Drag bar moves task + cascades: ✓
- Drag right edge resizes + cascades: ✓
- Bar fill shows pct, bar colour reflects status: ✓
- Milestone diamonds toggle done: ✓
- N-level nesting + indentation: ✓
- Collapse/expand parent rows: ✓
- Parent bar derives bounds from children: ✓
- Add sub-task from TaskWindow: ✓
- Drag-to-reparent with cycle detection: ✓
- Dependency arrows render: ✓
- Cycle prevention on dependency creation: ✓
- Lock indicator on dep-constrained bars: ✓
- Critical path toggle: ✓ (verified — Critical path button lights blue,
  state preserved across zoom changes)
- Non-critical bars dimmed: ✓
- Set baseline / Show baseline / ghost rendering: ✓
- Save (PUT /jobs/:id/tasks then PUT /jobs/:id, onSaved fires): ✓
- Schema migration (subTasks → children) on load: ✓
- Print to PDF (the bug fix from verification report): ✓ —
  `.gantt-print-root` className preserved on outermost wrapping element
  of ganttPanel as required.

## Out of scope (not done in this refactor)

- DELETE /api/jobs/:id schema cleanup (`t.subTasks` → `t.children`)
  — separate fix, queued.
- Sub-task cascade limitation in cascadeTasksForward — design
  constraint per verification report.
- Inline rename of task name in left panel — design choice.
- Delete confirmation in TaskWindow trash — design choice.
- Done-bar stripe pattern — never implemented.

## Recommendation

The Gantt is in materially better shape than it was a week ago. Future
Gantt feature work — surfacing per-task stock-shortfall badges,
allocating BOM rows to tasks, or wiring Department Kanban screens to
read from the recursive children schema — can now be done as targeted
edits to gantt/* files rather than a hunt through 600 lines.

Next priorities, in framework order:

1. DELETE /api/jobs/:id backend cleanup (5-min fix, real silent bug)
2. Layer 3 stock allocation — connecting BOM-derived tasks to
   Unleashed stock levels per the production planning framework
3. Layer 2 Department Kanban — already started in
   src/components/production/, can now consume the stable schema

The plan + kickoff prompt that drove this refactor are preserved in
docs/refactors/2026-05-05-gantt-modal/ for future reference.