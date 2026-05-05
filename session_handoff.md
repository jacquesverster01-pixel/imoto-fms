
## May 5 2026 — Bump

This section supersedes the April 21 handoff for current state. The
April 21 handoff remains accurate as historical context.

### Changes since April 21

**April 21–22 — Phase 1–4 schema refactor (committed).**
Recursive task schema: `subTasks` → `children` across the entire
codebase. Migration helper at src/pages/production/taskMigration.js
upgrades old jobs on load. New helpers in taskTreeOps.js
(updateNodeById, removeNodeById, appendChildTo, moveNodeTo,
findNodeById, filterVisibleRows). ganttUtils.js gained recursive
deriveParentBounds, flattenTasksForDisplay, enforceDependencies.
NewJobModal.jsx "From BOM" mode wires through correctly.

**April 24 — routes/deptCodes.js added (committed).**
Auto-extracts 3-letter department prefixes from imported BOM item
codes (regex `^([A-Z]{3})([A-Z])\d{4,6}$`, e.g. FINA00031 → FIN).
Persists to data/dept_codes.json. Endpoint:
GET /api/deptcodes/discovered-prefixes.

**April 24+ — src/components/production/ Kanban work started
(committed).**
New components: CompactKanbanCard, DeptKanbanBoard, KanbanCard,
ProductionKanbanWall, UnallocatedPanel, kanbanUtils.js. This is
Layer 2 of the production planning framework (department screens
consuming Gantt task data). Not yet feature-complete.

**April 29 — GANTT_VERIFICATION_REPORT.md (committed).**
40-feature audit table covering every Gantt behaviour. 38 green, 3
warnings (all design choices, not regressions), 1 fix applied
(print-to-PDF blank page CSS strategy switched from display:none to
visibility:hidden). Recommended GanttModal extraction refactor.

**May 4–5 — GanttModal extraction refactor (committed).**
GanttModal.jsx 631 → 424 lines (33% reduction). Seven new files
under src/pages/production/gantt/. Full report in
GANTT_REFACTOR_REPORT.md.

### Current production module structure
# Session Handoff

## Last updated: 2026-04-24 (FIX 5 — Two-Line Task Rows + Resizable Left Panel)

## Current state

### FIX 5 complete — Two-Line Task Rows + Resizable Left Panel (`GanttModal.jsx` only)

- Left-panel task rows now show task name on the top line (clamped to 2 lines) and `itemCode` / `assemblyCode` in 10px muted monospace below — rows with no code render single-line at the usual 32px minimum
- **Option B** implemented: right-panel bar rows match left-panel heights per-row via `useLayoutEffect` + `getBoundingClientRect` (`rowElsRef` map → `rowHeights` state). `DependencyOverlay` SVG height and arrow Y positions updated accordingly. No flash of misalignment — layout effect runs before paint.
- Left panel is now user-resizable: drag the 4px divider between panels (160–480 px range). Resize uses direct DOM mutation during drag, commits to state on mouseup (same ref-based pattern as bar drag).
- Panel width persists across page reloads via `localStorage` key `gantt-left-panel-width`.
- Scroll-sync between left and right panels unchanged.

`npm run build` passes with no errors.

---

### FIX 4 complete — Restore Parent/Child Relationships on BOM Import

- BOM import now preserves the full parent/child Assembly hierarchy
- `NewJobModal` uses `buildTasksFromBom` from `inventory/bom/bomUtils.js` (correct recursive builder)
- Broken `buildTasksFromBomAssemblies` flat builder removed from `plannerUtils.js`
- Tasks created from BOM include `components: [...]` (Parts) on each Assembly and `children: [...]` for sub-assemblies
- `taskMigration.js` now defaults `kanbanStatus: 'todo'` and `dependsOnAssembly: null` (moved from the old broken builder)

`npm run build` passes with no errors.

---

### FIX 3 complete — Delete job from Production Planner

- Job deletion now available from `JobListPanel` via inline two-click confirm (✕ → Delete?)
- Reuses existing `DELETE /api/jobs/:id` route (already returned `{ ok: true }`, no backend changes needed)
- Confirm state auto-resets after 4 seconds; hovering off card hides the button
- Deleted job clears selection if it was active; toast confirms deletion

`npm run build` passes with no errors.

---

### FIX 2 complete — Gantt verification pass

**Verification report:** `GANTT_VERIFICATION_REPORT.md` (project root)

**One bug fixed:**
- `src/utils/ganttExport.js` — Print CSS rewritten from `display:none` strategy to `visibility:hidden/visible`. Old CSS produced a blank print page because `display:none` on `#root` (a `body > *` child) cannot be overridden by `display:flex` on a nested descendant; `visibility` can. Also added `position: absolute; top: 0; left: 0` to anchor the Gantt at viewport origin during print.

**Open issues (non-blocking, deferred):**
- Inline rename in left panel: works via TaskWindow, not direct row edit
- Delete has no confirmation dialog
- Done tasks shown by green colour, not stripe pattern
- `cascadeTasksForward` only applies to root-level tasks, not sub-tasks
- Baseline snapshot misses sub-task dates
- `DELETE /api/jobs/:id` cleanup uses `t.subTasks` (old schema) instead of `t.children`

**GanttModal.jsx is 554 lines** — over the 400-line guideline. A component-extraction refactor (`GanttHeader`, `GanttLeftPanel`, `GanttChartArea`, `GanttDependencyLayer`) is needed as a follow-up prompt.

`npm run build` passes with no errors.

---

### FIX 1 complete — Restored Instagantt-style Gantt in Production Planner

**What changed:**
- `src/pages/ProductionPlanner.jsx` — rewritten: imports `GanttModal` instead of stub Gantt; left panel is `JobListPanel` (280 px), right panel renders `<GanttModal key={selectedJob.id} job={selectedJob} embedded onSaved={refetchJobs} />` when a job is selected; empty-state message when none selected; `NewJobModal` stays for job creation
- `src/pages/production/GanttModal.jsx` — added `embedded` prop (replaces old `inline`); when embedded: no fixed overlay/backdrop, `panelStyle` uses `height: 100% / width: 100%`, header shows a "Save" button instead of ×, `onClose`/`onSaved` are guarded (optional)

**Files deleted:**
- `src/components/planner/EditableJobGantt.jsx` — stub Gantt replaced by real GanttModal
- `src/components/planner/TaskEditModal.jsx` — replaced by TaskWindow (opened by GanttModal itself)

**Files kept:**
- `src/components/planner/JobListPanel.jsx` — still the left panel
- `src/components/planner/NewJobModal.jsx` — still used for job creation
- `src/components/planner/plannerUtils.js` — still used by NewJobModal

**All Phase 4 Gantt features accessible from Production Planner:** recursive sub-tasks, dependency arrows, milestones (diamonds), day/week/month zoom + scale, critical path toggle, baseline ghost bars, print-to-PDF, TaskWindow side panel.

**Production Overview TV mode (`/production`) unchanged.**
**Phase 3 Kanban / Dept Codes unchanged.**

`npm run build` passes with no errors.

---

### Phase 3D complete — Production Planner (Editable Gantt + Import from BOM)

**New files created:**
- `src/pages/ProductionPlanner.jsx` — page shell; 280px left job-list panel + flex-1 right Gantt; orchestrates all planner modals and task-delete handler
- `src/components/planner/plannerUtils.js` — pure functions: `buildTasksFromBomAssemblies`, `generateJobId`, `splitCode`, `deptForPrefix`
- `src/components/planner/JobListPanel.jsx` — scrollable job list with `[JOB-ID]`, title, due date, task count; blue left-border active state
- `src/components/planner/NewJobModal.jsx` — two-tab modal: "From Scratch" (name + due date) and "From BOM" (BOM dropdown → auto-populates name, imports Assembly-type rows as tasks)
- `src/components/planner/EditableJobGantt.jsx` — **fresh build** (not a wrapper around ProductionGantt, which is job-level and static); task-level table with proportional bars, dept resolution, double-click-to-confirm inline delete; decision: wrapping was not viable since ProductionGantt renders jobs not tasks
- `src/components/planner/TaskEditModal.jsx` — add/edit modal: prefix `<select>` + rest input with live `Full code → Department` preview and phase lookup; depends-on-assembly dropdown; save uses PUT (add) or PATCH (edit); delete uses PUT with filtered task array

**Files modified:**
- `routes/jobs.js` — expanded `PUT /jobs/:id` allowlist to include `tasks`, `sourceBomId`, `sourceProductCode`; expanded `PATCH /jobs/:id/task/:taskId` allowlist to include `name`, `assemblyCode`, `startDate`, `endDate`, `dependsOn`, `assignedTo`, `notes`
- `src/components/Sidebar.jsx` — added `production-planner` nav item between "Production overview" and "Department boards"; added `gantt` icon
- `src/App.jsx` — added `production-planner` case to page switcher + pageTitles; imported `ProductionPlanner`

**Data note:** `dept_codes.json` uses `prefixMappings` key (array of `{ prefix, department }`). All planner and production components read `codesData?.prefixMappings || []`.

**All four Phase 3 sub-prompts (3A_v2, 3B, 3C, 3D) are now complete.**

---

### Phase 3C complete — Production Overview TV Mode

**New files created:**
- `src/components/production/ProductionKanbanWall.jsx` — read-only swim-lane view per department (4 cols: To Do / In Progress / QC / Done); uses `groupTasks` + `checkDependency` from `kanbanUtils.js`
- `src/components/production/CompactKanbanCard.jsx` — compact read-only card: task name (truncated) + job ref + ⚠ dep warning icon

**Files modified:**
- `src/pages/Production.jsx` — rewritten as TV-mode page shell: Gantt|Kanban Wall toggle, live clock (1s), 30s auto-refresh, fullscreen API button, `lastRefresh` timestamp
- `src/pages/production/ProductionGantt.jsx` — added `readOnly` prop (default `false`); added `|| []` guard on `job.flags`; falls back to `job.title` for display
- `src/utils/time.js` — added `fmtHHMMSS(date)` — formats a Date as HH:MM:SS in SAST (UTC+2, same offset pattern as rest of file)

**Schema fix applied (post-3A_v2):**
- `ProductionKanbanWall` now accepts `prefixMappings` (renamed from `prefixes`), `settingsData` (for dept colours from `settings.departments`), and `assemblyPhases`
- Dept colours now resolved via `getDeptColour(dept, settingsData)` → `colourForDepartment(dept)` fallback (no `prefix.colour` in schema)
- Swim-lanes use `listMappedDepartments(prefixMappings)` for unique departments (deduplicates multiple prefixes per dept)
- `Production.jsx` now fetches `useGet('/settings')` and passes `settingsData` to wall

**Production module Phase 3 fully complete.** All sub-prompts (3A_v2, 3B, 3C, 3D) done.

Remaining deferred items (require login/roles or further input):
- QC role gating
- Configurable parsing regex
- Hard dependency blocking
- BOM rows as Kanban cards

### Phase 3B complete — Department Boards (Interactive Kanban)

**New files created:**
- `src/components/production/kanbanUtils.js` — pure functions: `flattenTasks`, `getKanbanStatus`, `groupTasks`, `checkDependency`, `countUnallocated`
- `src/components/production/KanbanCard.jsx` — draggable task card with dept colour border, phase pill (PRE/INST), ⚠ dependency badge
- `src/components/production/UnallocatedPanel.jsx` — 4-column view for unmapped tasks; red borders, link to Settings
- `src/components/production/DeptKanbanBoard.jsx` — 4-column Kanban board for a single department; HTML5 drag-and-drop
- `src/pages/DepartmentBoards.jsx` — page shell: tab bar per dept + Unallocated tab, toast, empty state

**Files modified:**
- `routes/jobs.js` — added `PATCH /jobs/:id/task/:taskId` route (allows: `kanbanStatus`, `done`, `dependsOnAssembly`, `assignee`, `note`)
- `src/components/Sidebar.jsx` — added `department-boards` nav item under Production section; added `columns` icon
- `src/App.jsx` — added `department-boards` case to page switcher; imported `DepartmentBoards`

**Colour resolution:** Option A — pulls `color` from `settings.departments` by name match; falls back to Option B deterministic palette (`colourForDepartment`) if not found.

**Deviations from spec:**
- `UnallocatedPanel` drag state is local-only (visual only, no PATCH call since unallocated tasks have no dept context to move within — status column drag is cosmetic until a prefix is mapped)
- `DepartmentBoards.jsx` handles both `Array` and `{ jobs: [] }` shapes from `/api/jobs` defensively

**2026-04-24 correction:** Tab bar was iterating `prefixMappings` directly (one tab per prefix), creating duplicate tabs when multiple prefixes share a department. Fixed: `kanbanUtils.js` now exports `listMappedDepartments` (deduplicates by department name) and `colourForDepartment` (Option B palette). `DepartmentBoards.jsx` updated to use `listMappedDepartments` for tabs and `getDeptColour` (Option A with Option B fallback) for border/dot colours. Also added `useGet('/settings')` to resolve colours from `settings.departments`.

### Phase 3A_v2 complete — Department Codes Foundation (Discovered Prefixes)

**New files created:**
- `src/utils/codeParser.js` — pure functions: `parseProductCode`, `getDepartmentForCode`, `getPhaseForCode`, `isUnallocated`, `extractPrefixesFromBoms`
- `routes/deptCodes.js` — GET/PUT `/api/dept-codes` + GET `/api/dept-codes/discovered-prefixes` (factory function pattern)
- `src/pages/settings/DeptCodesSettings.jsx` — Settings section: prefix mappings auto-discovered from BOMs with department dropdown (from settings.departments), assembly phase tags table with search, single Save button, inline validation

**Files modified:**
- `server.js` — DATA_INITS uses `{ prefixMappings: [], assemblyPhases: [] }` for `dept_codes.json`
- `src/pages/DepartmentBoards.jsx`, `Production.jsx`, `ProductionPlanner.jsx` — updated `codesData?.prefixes` → `codesData?.prefixMappings`

**Data file:**
- `data/dept_codes.json` — uses `prefixMappings` key (array of `{ prefix, department }`)

**API routes:**
- `GET /api/dept-codes` → `{ prefixMappings: [], assemblyPhases: [] }`
- `GET /api/dept-codes/discovered-prefixes` → `{ discovered: [], mapped: [], unmapped: [] }` (scans boms.json)
- `PUT /api/dept-codes` → saves full object, returns saved

**Code regex:** `^([A-Z]{3})([A-Z])(\d{4,6})$` — relaxed from strict 6-digit spec to handle real Unleashed data (5-digit codes like `MECP00051`)

## Previous work (HR + Settings)

- HR nav split into 3 items: Employees, Time & Attendance, Leave
- Settings got 4 new sections: Shift editor, Auto clock-out, Overtime, WhatsApp bot
