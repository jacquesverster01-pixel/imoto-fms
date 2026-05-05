# GanttModal.jsx — Refactor Plan
**Date:** 2026-05-04
**Source file:** `src/pages/production/GanttModal.jsx`
**Current size:** 631 lines / 38.5 KB
**Verification report cited:** 554 lines (5 days ago) — already grew ~80 lines

## Goal

Extract internal sub-components into their own files so `GanttModal.jsx` itself is ~150–200 lines of orchestration. Behaviour must be preserved against the existing 40-feature verification table (`GANTT_VERIFICATION_REPORT.md`).

## What's already extracted

These sub-components are already separate files (imports at top of GanttModal):
- `<TaskWindow>` — the right-side task editor
- `<GanttHeader>` — toolbar (zoom toggle, today, baseline, export, etc.) — **already a component**
- `<MilestoneRow>` — milestone diamond row in chart area — **already a component**

So the verification report's "Header / LeftPanel / ChartArea / DependencyLayer" framing is partly already done. The remaining inline definitions are:

| Inline name | Lines (approx) | Target file |
|---|---|---|
| `function LeftPanelRow(...)` | ~60 | `src/pages/production/gantt/LeftPanelRow.jsx` |
| `function GanttBar(...)` | ~50 | `src/pages/production/gantt/GanttBar.jsx` |
| `function DependencyOverlay(...)` | ~30 | `src/pages/production/gantt/DependencyOverlay.jsx` |

Plus the **chart-area JSX block** (the `visibleRows.map(...)` that renders weekend stripes + MilestoneRow/GanttBar + ghostBar) is ~80 lines of JSX inline inside `ganttPanel`. This block should also move into its own component:

| New component | Wraps | Target file |
|---|---|---|
| `<GanttChartArea>` | the right-panel scroll container including header bands, weekend cells, row map, GanttBar, ghostBar, DependencyOverlay | `src/pages/production/gantt/GanttChartArea.jsx` |
| `<GanttLeftPanel>` | the left-panel scroll container including LeftPanelRow map and Add task / Milestone buttons | `src/pages/production/gantt/GanttLeftPanel.jsx` |

## Final structure

```
src/pages/production/
├── GanttModal.jsx                 (~180 lines — state + effects + handlers + composition)
├── TaskWindow.jsx                 (existing, untouched)
├── ganttUtils.js                  (existing, untouched)
├── taskTreeOps.js                 (existing, untouched)
├── taskMigration.js               (existing, untouched)
└── gantt/                         (NEW subfolder)
    ├── GanttHeader.jsx            (move from current location, untouched)
    ├── MilestoneRow.jsx           (move from current location, untouched)
    ├── GanttLeftPanel.jsx         (NEW — wraps left panel + LeftPanelRow.map)
    ├── LeftPanelRow.jsx           (NEW — extracted from inline)
    ├── GanttChartArea.jsx         (NEW — wraps right panel + chart)
    ├── GanttBar.jsx               (NEW — extracted from inline)
    └── DependencyOverlay.jsx      (NEW — extracted from inline)
```

## State map — what stays in GanttModal

GanttModal owns ALL state. Children are presentational + receive callbacks.

```
useState:
  tasks, setTasks            ← root tree (after migrateTasksSchema)
  title, setTitle            ← job.title
  status, setStatus          ← job.status
  collapsed, setCollapsed    ← {[taskId]: true} for tree expand state
  ctxMenu, setCtxMenu        ← {x, y, taskId, parentId, depIds} or null
  taskWindow, setTaskWindow  ← {taskId, parentId, isParent, isMile, x, y} or null
  zoom, setZoom              ← 'day' | 'week' | 'month'
  zoomScale, setZoomScale    ← 0.4..3.0 (ctrl-wheel zoom factor)
  showCriticalPath           ← bool
  showBaseline               ← bool
  baseline                   ← snapshot array of {taskId, startDate, endDate}
  dateRange                  ← {minDate, maxDate}
  bomItems                   ← items array fetched from /boms/:bomId
  ghostBar                   ← {left, width, rowIndex} during click-drag-to-set-dates
  subtaskDropHighlight       ← taskId being hovered as drop target
  ghostCard                  ← {x, y, name} during drag tooltip
  leftPanelWidth             ← number (160-480), persisted to localStorage
  rowHeights                 ← {[taskId]: height} computed from layout
  resizeHandleHovered        ← bool

useRef:
  rightPanelRef, leftPanelRef   ← scroll containers
  dateDrawRef                   ← active click-drag-to-set-dates state
  colsWithLeftRef               ← snapshot for handleMouseUp closure
  subtaskDragRef, subtaskDropRef, lastSubtaskDragEndRef
  resizeRef                     ← panel resize drag state
  rowElsRef                     ← {[ri]: HTMLElement} for boundary calcs

useGanttDrag(setTasks, rightPanelRef) returns:
  dragRef, reorderRef, taskRowsRef, linkDragRef, zoomColsRef,
  linkLine, setLinkLine, startLinkDrag,
  handleDragHandleDown, handleRowOver,
  panRef, handlePanStart
```

**No state moves to children.** Children receive what they need via props.

## Derived values (computed every render in GanttModal)

```
flatRows         = flattenTasksForDisplay(tasks)
visibleRows      = filterVisibleRows(flatRows, collapsed)
zoomCols         = buildZoomColumns(minDate, maxDate, zoom, zoomScale)
chartWidth       = zoomCols.reduce((s,c) => s + c.widthPx, 0)
colGroups        = groupCols(zoomCols)
colsWithLeft     = zoomCols mapped with running .left offset
doneTasks        = flatRows.filter(!isParent && done).length
totalLeaf        = flatRows.filter(!isParent).length
criticalIds      = showCriticalPath ? computeCriticalPath(tasks) : []
allDescendants   = collectAllSubTasks(tasks)
taskWindowTask   = taskWindow ? findNodeById(tasks, taskWindow.taskId) : null
```

These all stay in GanttModal and are passed down to children via props.

## Component contracts

### `<GanttLeftPanel>` props

```
visibleRows           array — rows to render
tasks                 array — needed for rowIdx lookup (taskIdx)
collapsed             {[id]: bool}
setCollapsed          fn — for toggle handler
leftPanelWidth        number
leftPanelRef          ref — scroll container
onLeftScroll          fn — sync to right panel scroll
subtaskDropHighlight  string|null
subtaskDragRef        ref — passed to handleRowOver
rowElsRef             ref — left-row DOM map
HDR_H, ROW_H          consts (export from ganttUtils or pass)
// callbacks (all defined in GanttModal)
onCheckTask           fn(id, parentId)
onToggleMilestone     fn(id)
onOpenMenu            fn(taskId, parentId, isParent, isMile, e)  — wraps openTaskMenu
handleDragHandleDown  fn(rowIdx)  — from useGanttDrag
handleRowOver         fn(rowIdx)
startSubtaskDrag      fn(taskId, parentId, e, taskName)
addTask, addMilestone fn() — for footer buttons
```

### `<LeftPanelRow>` props (unchanged from current inline)
row, collapsed, onToggle, onCheck, rowIdx, onDragHandleDown, onRowOver, onToggleMilestone, onOpenMenu, onSubtaskDragStart, isSubtaskDragTarget, rowRef

### `<GanttChartArea>` props

```
visibleRows, tasks
zoomCols, colsWithLeft, colGroups, chartWidth, criticalIds
zoom
job
showBaseline, baseline
allDescendants
ghostBar, ghostCard
rowHeights, rightPanelRef, dragRef, taskRowsRef, dateDrawRef
onRightScroll, handlePanStart
onToggleMilestone, onBarRightClick, startLinkDrag
HDR_H, ROW_H
```

### `<GanttBar>` props (unchanged from current inline)
row, job, zoomCols, criticalIds, showBaseline, baseline, dragRef, taskRowsRef, onBarRightClick, barColor, onLinkStart

### `<DependencyOverlay>` props (unchanged from current inline)
rows, zoomCols, chartWidth, rowHeights

## Refactor sequence

The order matters. Each step must leave the file working.

**Step 0 — Sanity: read full file once more, run `npm run dev`, verify Gantt opens cleanly in production page.**

**Step 1 — Move existing extracted components into `gantt/` subfolder.**
- Move `GanttHeader.jsx` and `MilestoneRow.jsx` (current location TBD — find imports in GanttModal) into `src/pages/production/gantt/`.
- Update import paths in GanttModal.
- Restart dev server. Verify Gantt still works. **No behaviour change.**

**Step 2 — Extract `DependencyOverlay`.**
- Smallest, cleanest, no closures over GanttModal state — just takes 4 props.
- Cut function out, paste into `gantt/DependencyOverlay.jsx`, add `export default function`.
- Import in GanttModal.
- Verify: critical path arrows still render, dependency arrows still render.

**Step 3 — Extract `GanttBar`.**
- Pure function over its props — no closures over GanttModal state.
- Cut into `gantt/GanttBar.jsx`.
- Verify: drag/resize bar, baseline ghost, lock icon, hover state all still work.

**Step 4 — Extract `LeftPanelRow`.**
- Same pattern. Verify: collapse arrows, milestone diamond, checkbox, status colour all still work.

**Step 5 — Extract `<GanttLeftPanel>`.**
- This is the wrapper around the visibleRows.map for LeftPanelRow + Add task/Milestone footer.
- Cut the JSX block + the `<button onClick={addTask}>` and `<button onClick={addMilestone}>` footer.
- New file is purely presentational; receives all callbacks.
- Verify: scrolling, add task/milestone buttons, all row interactions.

**Step 6 — Extract `<GanttChartArea>`.**
- Cut the right-panel `<div ref={rightPanelRef} ...>` block including:
  - month/group header band
  - day/week header band
  - per-row visibleRows.map → MilestoneRow|GanttBar|ghostBar
  - DependencyOverlay
- Receives many props (see contract above). This is the largest extracted file.
- Verify: zoom toggles, today scroll, weekend stripes, drag-to-set-dates ghost, row click → TaskWindow, dependency arrows.

**Step 7 — Final cleanup.**
- GanttModal.jsx now contains: state, effects, handlers, panelStyle, composition (`ganttPanel = (<><GanttHeader/><div flex><GanttLeftPanel/><resizeHandle/><GanttChartArea/></div></>)`), `floatingOverlays`, embedded/non-embedded return.
- Verify the full 40-feature checklist from `GANTT_VERIFICATION_REPORT.md` once more.

## Risks to be vigilant about

1. **Closures.** Inline functions captured GanttModal scope freely — once extracted, every reference must become an explicit prop. Easy to miss one (e.g. `ROW_H`, `HDR_H` are module constants and need to be exported from ganttUtils OR passed as props).
2. **Refs.** `taskRowsRef`, `dragRef`, `dateDrawRef`, `rowElsRef` etc. need to flow through props. Forward-ref is NOT needed since they're just being read/written, not attached to a single DOM node.
3. **Mouse-event coordinates.** `onLinkStart`, `onBarRightClick`, `handleDragHandleDown` all read `e.clientX/Y`. Make sure events bubble correctly post-extraction.
4. **z-index stacking.** GanttBar, MilestoneRow, ghostBar, DependencyOverlay all use absolute positioning at known z-indexes. Wrapping in extra divs CAN break stacking. Match container styles exactly.
5. **Print mode.** `injectGanttPrintStyle()` adds CSS targeting `.gantt-print-root`, `.gantt-right-panel` — these classNames must remain on the same elements after refactor.
6. **The `embedded` mode.** The component has two return paths: embedded returns `<>{ganttPanel}{floatingOverlays}</>`, non-embedded wraps in print-root + dark overlay. Both must keep working.
7. **Schema migration.** `migrateTasksSchema` runs in useState init — runs once per modal open. If we move state to a child, this runs differently. We're NOT moving state — keep this in mind.

## Verification

Re-run the 40-point check from `GANTT_VERIFICATION_REPORT.md` against the refactored modal:
- Two-pane layout, sync scroll, zoom toggles, today auto-scroll
- Weekend shading, today marker, month band
- Add task/milestone buttons, delete via TaskWindow
- Tick checkbox marks done, click row opens TaskWindow
- Drag bar moves task + cascades, drag right edge resizes + cascades
- Bar fill shows pct, bar colour reflects status, done bars green + strikethrough
- Milestone diamonds toggle done + drag moves
- N-level nesting, indentation by depth, collapse/expand
- Parent bar derives bounds from children
- Add sub-task from TaskWindow
- Drag-to-reparent with cycle detection
- Dependency arrows SVG, drag predecessor → dependents shift
- Cycle prevention on dependency creation, lock indicator
- Critical path toggle, non-critical dimmed
- Baseline snapshot/render/persist/slippage visible
- Print to PDF (the one bug fix from verification)
- Save writes to PUT /jobs/:id/tasks then PUT /jobs/:id, onSaved fires
- Schema migration upgrades old tasks

## Out of scope (do not do in this refactor)

- The `DELETE /api/jobs/:id` backend bug (`t.subTasks` → `t.children`) — separate fix.
- The sub-task cascade limitation (cascadeTasksForward only operates on root array) — design constraint, not regression.
- Inline rename — design choice per verification report.
- Delete confirmation in TaskWindow — design choice.
- Done-bar stripe pattern — never implemented.

## Estimated scope

- **Step 1 (move existing files):** trivial, 5 min.
- **Step 2 (DependencyOverlay):** 15 min, lowest risk.
- **Step 3 (GanttBar):** 20 min, low risk.
- **Step 4 (LeftPanelRow):** 20 min, low risk.
- **Step 5 (GanttLeftPanel wrapper):** 30 min, medium risk (props enumeration).
- **Step 6 (GanttChartArea wrapper):** 45 min, highest risk (most props, most z-index concerns).
- **Step 7 (verification):** 30 min, must be done thoroughly.

**Total: ~3 hours of careful work.** Single session viable for one human + careful AI pairing. Best done with the dev server running and clicking through each feature after each step.

## What GanttModal.jsx looks like after

```jsx
// Imports — same as today, plus the new gantt/* components
import GanttHeader from './gantt/GanttHeader'
import GanttLeftPanel from './gantt/GanttLeftPanel'
import GanttChartArea from './gantt/GanttChartArea'
import TaskWindow from './TaskWindow'
// ... migrateTasksSchema, hooks, utils

export default function GanttModal({ job, onClose, onSaved, embedded }) {
  // ALL useState — same as today
  const [tasks, setTasks] = useState(...)
  // ... all 17 useState calls

  // ALL useRef
  const rightPanelRef = useRef(null)
  // ... all refs
  const { dragRef, ..., handlePanStart } = useGanttDrag(setTasks, rightPanelRef)

  // Derived
  const flatRows = flattenTasksForDisplay(tasks)
  const visibleRows = filterVisibleRows(flatRows, collapsed)
  // ...

  // Effects — same as today
  useEffect(...)  // Esc handler
  useEffect(...)  // today scroll
  useEffect(...)  // print style
  useEffect(...)  // ctrl-wheel zoom
  useEffect(...)  // dateRange expand
  useEffect(...)  // BOM fetch
  useEffect(...)  // mouse drag-to-set-dates
  useEffect(...)  // subtask drag
  useLayoutEffect(...)  // measure rowHeights

  // Handlers
  async function handleClose() {...}
  function addTask() {...}
  function addMilestone() {...}
  function addSubTask(taskId, parentId) {...}
  function onChangeName(...) {...}
  function onCheckTask(...) {...}
  function onToggleMilestone(...) {...}
  function removeDep(...) {...}
  function onBarRightClick(...) {...}
  function deleteTask(...) {...}
  function updateNotes(...) {...}
  function updatePct(...) {...}
  function uploadTaskFile(...) {...}
  function deleteTaskFile(...) {...}
  function openTaskMenu(...) {...}
  function startSubtaskDrag(...) {...}
  async function handleSetBaseline() {...}
  function onLeftScroll(e) {...}
  function onRightScroll(e) {...}
  function handlePanelResizeStart(e) {...}

  const panelStyle = embedded ? {...} : {...}

  const ganttPanel = (
    <div className="gantt-print-root" style={panelStyle} onClick={e => e.stopPropagation()}>
      <GanttHeader {...headerProps} />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <GanttLeftPanel {...leftPanelProps} />
        <div style={panelResizeHandleStyle} ... />
        <GanttChartArea {...chartAreaProps} />
      </div>
    </div>
  )

  const floatingOverlays = (
    <>
      {ctxMenu && <CtxMenu .../>}
      {taskWindow && taskWindowTask && <TaskWindow .../>}
      {linkLine && <LinkLineSVG .../>}
      {ghostCard && <GhostCard .../>}
    </>
  )

  if (embedded) return <>{ganttPanel}{floatingOverlays}</>
  return (
    <div className="gantt-print-root" style={overlayStyle} onClick={...}>
      {ganttPanel}
      {floatingOverlays}
    </div>
  )
}
```

This is the target shape. Roughly 200 lines. Compared to today's 631.
