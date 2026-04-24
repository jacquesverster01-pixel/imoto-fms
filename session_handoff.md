# Session Handoff

## Last updated: 2026-04-24

## Current state

### Phase 3C complete — Production Overview TV Mode

**New files created:**
- `src/components/production/ProductionKanbanWall.jsx` — read-only swim-lane view per department (4 cols: To Do / In Progress / QC / Done); uses `groupTasks` + `checkDependency` from `kanbanUtils.js`
- `src/components/production/CompactKanbanCard.jsx` — compact read-only card: task name (truncated) + job ref + ⚠ dep warning icon

**Files modified:**
- `src/pages/Production.jsx` — rewritten as TV-mode page shell: Gantt|Kanban Wall toggle, live clock (1s), 30s auto-refresh, fullscreen API button, `lastRefresh` timestamp
- `src/pages/production/ProductionGantt.jsx` — added `readOnly` prop (default `false`); added `|| []` guard on `job.flags`; falls back to `job.title` for display
- `src/utils/time.js` — added `fmtHHMMSS(date)` — formats a Date as HH:MM:SS in SAST (UTC+2, same offset pattern as rest of file)

**Deviations from spec:**
- `ProductionKanbanWall` accepts a third prop `assemblyPhases = []` (not in spec) so `checkDependency` can evaluate installation phase warnings; `Production.jsx` passes `codesData?.assemblyPhases || []`
- `ProductionGantt.jsx` received two defensive fixes (flags guard + title fallback) required to prevent crashes with real job data — minimal changes only, structure unchanged

**Production module Phase 3 fully complete.** All three sub-prompts (3A, 3B, 3C) done.

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

**Deviations from spec:**
- `UnallocatedPanel` drag state is local-only (visual only, no PATCH call since unallocated tasks have no dept context to move within — status column drag is cosmetic until a prefix is mapped)
- `DepartmentBoards.jsx` handles both `Array` and `{ jobs: [] }` shapes from `/api/jobs` defensively

### Phase 3A complete — Department Codes Foundation

**New files created:**
- `src/utils/codeParser.js` — pure functions: `parseProductCode`, `getDepartmentForCode`, `getPhaseForCode`, `isUnallocated`
- `routes/deptCodes.js` — GET/PUT `/api/dept-codes` (factory function pattern, receives `readData`/`writeData`)
- `src/pages/settings/DeptCodesSettings.jsx` — Settings section with prefix mappings table, assembly phase mappings table with search, single Save button, inline validation

**Files modified:**
- `server.js` — added `dept_codes.json` to DATA_INITS, imported and mounted `deptCodesRouter` at `/api/dept-codes`
- `src/pages/Settings.jsx` — added "Department Codes" section between "Departments" and "Users & roles", imported `DeptCodesSettings`

**New data file:**
- `data/dept_codes.json` — auto-created by server on first start with `{ "prefixes": [], "assemblyPhases": [] }`

**API routes:**
- `GET /api/dept-codes` → `{ prefixes: [], assemblyPhases: [] }`
- `PUT /api/dept-codes` → saves full object, returns saved

## Previous work (HR + Settings)

- HR nav split into 3 items: Employees, Time & Attendance, Leave
- Settings got 4 new sections: Shift editor, Auto clock-out, Overtime, WhatsApp bot
