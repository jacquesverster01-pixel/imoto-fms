# Session Handoff

## Last updated: 2026-04-24 (Phase 3B corrected — tab deduplication + colour resolution)

## Current state

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
