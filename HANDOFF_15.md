# iMoto FMS — Handoff 15
**Date:** 2026-04-10
**Session:** Dashboard v2 — KPI cards + Mini Gantt + Employee Status List
**Project path:** `C:\Users\jacqu\Desktop\imoto-fms`
**Frontend:** React 18 + Vite 6, port 5173
**Backend:** Express, port 3001
**Storage:** JSON flat files in `/data/`
**Start command:** `npm run dev`

---

## What Was Done This Session

### Dashboard v2 — Full Rewrite

**Modified files**

| File | Change |
|------|--------|
| `server.js` | Rewrote `GET /api/dashboard` — replaced `activity` with `employeeStatus` |
| `src/pages/Dashboard.jsx` | Full rewrite — new Row 1 layout, Row 3 is now employee status list |

---

### GET /api/dashboard — Updated Response Shape

```json
{
  "hr": {
    "clockedInCount": 0,
    "lateArrivalCount": 0,
    "onLeaveToday": 0,
    "totalEmployees": 20
  },
  "production": {
    "activeJobs": 0,
    "overdueJobs": 0,
    "completedThisMonth": 0,
    "jobs": []
  },
  "ohs": {
    "openIncidents": 0,
    "overdueInspections": 0,
    "overdueReviews": 0,
    "equipmentServiceDue": 0
  },
  "stock": {
    "lowStockCount": 0,
    "lowStockItems": [{ "id", "name", "quantity", "reorderLevel" }]
  },
  "tools": {
    "overdueCount": 0,
    "missingCount": 0
  },
  "employeeStatus": []
}
```

**employeeStatus entry shape**
```json
{
  "id": "E001",
  "name": "Lorenzo August",
  "department": "Branding",
  "status": "in | out | late | leave",
  "clockInTime": "08:45",
  "clockOutTime": "17:00",
  "leaveType": "Annual | Sick | null"
}
```

**Status computation (evaluated in order)**
1. Approved leave covering today → `leave`, set `leaveType`
2. First `type='in'` today after 08:00 SAST AND no clock-out after last clock-in → `late`
3. Last event today is `type='in'` (clocked in, not out yet) → `in`
4. Last event today is `type='out'` (clocked in and out) → `out` with times
5. No timelog events today → `out`, both times null (greyed on frontend)

**clockInTime / clockOutTime** — HH:MM in SAST, computed from UTC timestamps with +2h offset

**`activity` field removed** — replaced by `employeeStatus`. No other API changes.

---

### Dashboard.jsx — Layout v2

**Row 1 — KPI cards (centred, max-width 1100px)**
- 5 cards: HR | Production | OHS | Stock | Tools
- Each card: generous padding (24px/28px), 32px bold stat numbers
- Stat number colours: problem > 0 → red (`#dc2626`); zero → muted grey; healthy → purple (`#6c63ff`)
- Clickable → `onNavigate(pageId)`

| Card | Stats | Navigates to |
|------|-------|-------------|
| HR | Clocked in / On leave / Late today | `employees` |
| Production | Active jobs / Overdue / Done this month | `production` |
| OHS | Open incidents / Overdue insp. / Reviews due / Service due | `health-safety` |
| Stock | Low / out of stock | `stock` |
| Tools | Overdue / Missing | `tools` |

**Row 2 — Mini Gantt (left) + OHS Snapshot (right)**
- Same as v1 — active jobs sorted by due date, max 8, progress bars
- "View all →" → `onNavigate('jobs')` / "View OHS →" → `onNavigate('health-safety')`

**Row 3 — Employee Status List (full width)**
- Header: "Factory Floor — Today" + today's date + refresh button
- Summary line: `X in · X late · X on leave · X not in`
- One row per employee, sorted: late → in → leave → out (with activity) → out (no activity)
- Row columns: [Status badge] [Name] [Department] [Clock-in time] [Clock-out time]
- Status badges: IN (green) | LATE (amber) | LEAVE (blue, + leave type) | OUT (grey)
- Greyed rows: `status === 'out' && !clockInTime` → `opacity: 0.4`, italic name
- Read-only — no buttons, no modals

---

### module-level helpers in Dashboard.jsx

```js
jobStatusStyle(status)   // returns { bg, text } for Gantt progress bars
STATUS_CFG               // object — badge bg/text/label per status
sortKey(emp)             // returns 0-4 sort weight for employee row ordering
```

---

## Current File Structure

```
C:\Users\jacqu\Desktop\imoto-fms\
├── server.js
├── package.json
├── vite.config.js
├── data/
│   ├── employees.json
│   ├── timelog.json
│   ├── leave.json
│   ├── excused.json
│   ├── disciplinary.json
│   ├── jobs.json
│   ├── tools.json
│   ├── stock.json
│   ├── ohs.json
│   ├── ohs_equipment.json
│   ├── ohs_risks.json
│   ├── ohs_zones.json
│   ├── ohs_appointments.json
│   ├── ohs_appointment_types.json
│   ├── ohs_inspection_templates.json
│   ├── ohs_inspections_active.json
│   ├── ohs_files.json
│   ├── ohs_law_reference.json        pre-seeded
│   └── uploads/
└── src/
    ├── App.jsx                       default page = dashboard
    ├── utils/
    │   ├── time.js                   +relativeTime, +daysAgoStr, +todaySAST
    │   └── ohs.js
    ├── hooks/
    │   └── useApi.js
    └── pages/
        ├── Dashboard.jsx             ~230 lines  (v2 — employee status list)
        ├── HR.jsx
        ├── Production.jsx
        ├── Settings.jsx
        ├── InspectionPage.jsx
        ├── settings/
        └── hr/
            ├── OHSTab.jsx
            ├── OHSDashboard.jsx
            ├── ClockInTab.jsx
            ├── LeaveTab.jsx
            ├── DisciplinaryTab.jsx
            ├── TimeLogTab.jsx
            ├── BiometricTab.jsx
            ├── AddLeaveModal.jsx     ~255 lines ⚠
            ├── EmployeeEditModal.jsx ~205 lines ⚠
            ├── EmployeeCalendarModal.jsx ~245 lines ⚠
            ├── LeaveCalendarPicker.jsx
            ├── EmployeeCalendarGrid.jsx
            ├── EmployeeDocSlots.jsx
            ├── EditShiftModal.jsx
            ├── disciplinary/
            └── ohs/
                ├── OHSFilePanel.jsx
                ├── OHSLibraryTab.jsx
                ├── OHSLawTab.jsx
                ├── ComplianceCalendarTab.jsx
                ├── EquipmentTab.jsx
                ├── AddEquipmentModal.jsx
                ├── LogServiceModal.jsx
                ├── RiskRegisterTab.jsx
                ├── AddRiskModal.jsx
                ├── RiskReviewModal.jsx
                ├── FactoryMapTab.jsx
                ├── AppointmentsTab.jsx
                ├── AddAppointmentModal.jsx
                ├── AddIncidentModal.jsx
                ├── InspectionTemplatesTab.jsx
                ├── InspectionPreviewModal.jsx
                ├── ScheduleInspectionModal.jsx
                ├── InspectionRunsTab.jsx
                ├── InspectionRunnerModal.jsx
                └── InspectionQuestionItem.jsx
```

---

## API Routes — Full Reference

### Dashboard
- `GET /api/dashboard`                             aggregation — 6 sections including employeeStatus

### Employees
- `GET/POST /api/employees`
- `PUT/DELETE /api/employees/:id`

### Time Log
- `GET/POST /api/timelog`
- `PUT/DELETE /api/timelog/:id`

### Leave
- `GET/POST /api/leave`
- `PUT/DELETE /api/leave/:id`

### Disciplinary
- `GET/POST /api/disciplinary`
- `PUT/DELETE /api/disciplinary/:id`

### Jobs
- `GET/POST /api/jobs`
- `PUT/DELETE /api/jobs/:id`

### Tools
- `GET/POST /api/tools`
- `PUT/DELETE /api/tools/:id`

### Stock
- `GET/POST /api/stock`
- `PUT/DELETE /api/stock/:id`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

### OHS — Incidents
- `GET/POST /api/ohs`
- `PUT/DELETE /api/ohs/:id`
- `PUT /api/ohs/:id/action/:actionId`
- `DELETE /api/ohs/:id/action/:actionId`

### OHS — Equipment
- `GET/POST /api/ohs-equipment`
- `PUT/DELETE /api/ohs-equipment/:id`
- `GET/POST /api/ohs-equipment/:id/service-history`

### OHS — Risks
- `GET/POST /api/ohs-risks`
- `PUT/DELETE /api/ohs-risks/:id`
- `GET /api/ohs-risks/review-status`
- `PUT /api/ohs-risks/:id/review`

### OHS — Zones
- `GET /api/ohs-zones`
- `PUT /api/ohs-zones`

### OHS — Files
- `POST /api/ohs-files/upload`
- `GET /api/ohs-files?context=&contextId=`
- `DELETE /api/ohs-files/:id`

### OHS — Law Reference
- `GET /api/ohs-law-reference`

### OHS — Appointments
- `GET/POST /api/ohs-appointments`
- `PUT/DELETE /api/ohs-appointments/:id`

### OHS — Appointment Types
- `GET/POST /api/ohs-appointment-types`
- `PUT/DELETE /api/ohs-appointment-types/:id`

### OHS — Inspection Templates
- `GET/POST /api/ohs-inspection-templates`
- `PUT/DELETE /api/ohs-inspection-templates/:id`

### OHS — Inspections Active
- `GET/POST /api/ohs-inspections-active`
- `GET/PUT/DELETE /api/ohs-inspections-active/:id`
- `PUT /api/ohs-inspections-active/:id/answers`
- `GET /api/ohs-inspections-active/:id/whatsapp-link`

### Biometric / ZKTeco
- `GET /api/zk/status`
- `POST /api/zk/connect` / `/disconnect`
- `GET /api/zk/users`
- `POST /api/zk/import`
- `GET /api/zk/logs`

### Static
- `GET /uploads/:filename`
- `GET /inspection/:id` → serves index.html

---

## Utility Files Reference

### `src/utils/time.js`
```js
nowSAST()            // current Date at UTC+2
todayStr()           // "YYYY-MM-DD" today in SAST
todaySAST()          // alias for todayStr()
monthStr()           // "YYYY-MM" current month in SAST
fmtTime(isoStr)      // "HH:MM" from ISO string
fmtDateShort(isoStr) // "YYYY-MM-DD" from ISO string
isLate(timestamp)    // true if clock-in after 08:00 SAST
daysAgoStr(n)        // "YYYY-MM-DD" n days ago in SAST
relativeTime(isoStr) // "just now" / "X minutes ago" / "X hours ago" / "X days ago"
```

### `src/utils/ohs.js` — see HANDOFF_14 for full list

---

## Data Schemas — Key Fields

### Jobs (`jobs.json`)
Fields: `id, name, client, trades, start, due, pct, status, priority, assignedTo, description, flags, completedDate?`
Status values: `on-track | at-risk | blocked | planned | complete`

### Stock (`stock.json`)
Fields: `id, name, category, unit, qty, min, onOrder, orderDate, usedBy, status`
Low stock: `qty <= min`. Status: `low | out`

### Tools (`tools.json`)
Fields: `id, name, category, serial, dept, assignedTo, checkedOut, due, status, condition`
Status: `out | overdue | missing | available`

### Employees (`employees.json`)
Department field: **`dept`** (not `department`)

---

## Permanent Rules

- **Page shell:** max 150 lines
- **Tab/section component:** max 400 lines
- **Modal component:** max 200 lines
- **Utility file:** pure functions only — no JSX, no hooks
- `apiFetch()` paths **never** include `/api` prefix
- `UPLOADS_URL = 'http://localhost:3001/uploads'`
- All `useState` at component top
- All pure helpers at module level — no IIFEs in JSX
- All POST/PUT include `headers: { 'Content-Type': 'application/json' }`
- All save handlers: `async` + `try/catch/finally`
- `useGet` null guards: bare arrays → `Array.isArray(raw) ? raw : []`
- Time: always `src/utils/time.js` — never `Intl`, `toLocaleDateString`
- PowerShell for all terminal commands
- Vite cache clear: `Remove-Item -Recurse -Force node_modules\.vite`
- After adding Express routes: always restart server
- `vite.config.js` must have `server: { watch: { ignored: ['**/data/**'] } }`
- App uses `activePage` state (no React Router) — navigation is `onNavigate(pageId)` passed as prop

---

## Backlog / Known Gaps

| Item | Priority | Notes |
|------|----------|-------|
| `printWarningLetter.js` ~355 lines | Low | Stable overage — defer |
| `AddLeaveModal.jsx` ~255 lines | Low | Stable overage — defer |
| `EmployeeCalendarModal.jsx` ~245 lines | Low | Stable overage — defer |
| `EmployeeEditModal.jsx` ~205 lines | Low | Stable overage — defer |
| Dashboard sidebar badge counts | Low | Sidebar tool/stock badges hardcoded — wire to /api/dashboard |
| Wire `settings.leaveLimits` → HR.jsx | Medium | Leave editor saves but HR.jsx uses hardcoded constant |
| Wire auto clock-out cron | Medium | Stored in settings but not executed |
| Overtime pay multiplier in payroll | Medium | Stored but not consumed |
| Compliance calendar — inspection due dates | Medium | Currently only equipment service dates |
| Compliance calendar — appointment expiry dates | Medium | Design supports it |
| Bulk risk review | Low | Currently one risk at a time |
| Factory map print / export | Low | Not built |
| Tools screen — live data + check-in/out | Backlog | |
| Stock screen — live data + qty updates | Backlog | |
| Jobs screen — live data + status updates | Backlog | |
| Phase 3 intelligence — alerts, payroll, login, WhatsApp, AI | Future | |

---

## How to Resume

```powershell
cd C:\Users\jacqu\Desktop\imoto-fms
npm run dev
```

Cache clear if stale:
```powershell
Remove-Item -Recurse -Force node_modules\.vite
```

Paste this file at the top of the next Claude Code session as context.
