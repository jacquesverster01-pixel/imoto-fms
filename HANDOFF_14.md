# iMoto FMS — Handoff 14
**Date:** 2026-04-09
**Session:** Dashboard — full home screen with KPI cards, mini Gantt, OHS snapshot, activity feed
**Project path:** `C:\Users\jacqu\Desktop\imoto-fms`
**Frontend:** React 18 + Vite 6, port 5173
**Backend:** Express, port 3001
**Storage:** JSON flat files in `/data/`
**Start command:** `npm run dev`

---

## What Was Done This Session

### Dashboard — New Home Screen

**New files**

| File | Lines |
|------|-------|
| `src/pages/Dashboard.jsx` | ~200 |

**Modified files**

| File | Change |
|------|--------|
| `server.js` | +`GET /api/dashboard` aggregation route |
| `src/utils/time.js` | +`relativeTime(isoStr)`, +`daysAgoStr(n)`, +`todaySAST()` |
| `src/App.jsx` | +Dashboard import; +`dashboard` case in PageContent; default page → `'dashboard'`; `onNavigate` passed as prop; +pageTitles.dashboard |
| `src/components/Sidebar.jsx` | +`home` SVG icon; +"Overview" section with Dashboard as first nav item |

**Also completed (prior session cleanup)**

| Route | Change |
|-------|--------|
| `DELETE /api/jobs/:id` | Added 2026-04-09 |
| `DELETE /api/stock/:id` | Added 2026-04-09 |

---

### GET /api/dashboard — Aggregation Route

Reads 11 data files server-side and returns a single payload. All date math uses SAST (UTC+2 offset), no Intl.

**Response shape**
```json
{
  "hr": {
    "clockedInCount": 0,
    "lateArrivalCount": 0,
    "onLeaveToday": 0,
    "totalEmployees": 0
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
  "activity": []
}
```

**Computation notes**
- `clockedInCount` — employees whose last timelog event today has `type === 'in'`
- `lateArrivalCount` — today's `type='in'` entries where SAST hour > 08:00
- `onLeaveToday` — leave records where `status === 'approved'` and `startDate <= today <= endDate`
- `activeJobs` — jobs where `status !== 'complete'` and `!== 'cancelled'`
- `overdueJobs` — active jobs where `due < today`
- `overdueInspections` — active inspections where `status !== 'completed'` and `(dueDate || scheduledDate) < today`
- `overdueReviews` — risks where `reviewStatus === 'overdue'` or `nextReviewDate < today`
- `equipmentServiceDue` — equipment where `nextServiceDate <= today+14`
- `lowStockItems` — stock where `(qty ?? quantity ?? 0) <= (min ?? reorderLevel ?? 5)`
- `tools.overdueCount` — tools where `status === 'overdue'` or `nextServiceDate < today`
- `activity` — last 7 days of events across timelog/leave/ohs/inspections/disciplinary/jobs, sorted newest first, max 50

---

### Dashboard.jsx — Layout

**Row 1 — KPI strip (horizontal scroll on overflow)**
- 5 clickable cards: HR | Production | OHS | Stock | Tools
- Each card navigates to the module via `onNavigate(nav)` prop
- Chip values: problem metrics (overdue, missing, low) in red when > 0; healthy metrics in purple

**Row 2 — Two panels side by side**
- Left: Mini Gantt — active jobs sorted by due date, max 8, progress bar + status badge + due date
  - "View all →" navigates to `jobs`
  - Empty state: "No active jobs"
- Right: OHS Snapshot — 4 stat rows with coloured dot indicator
  - "View OHS →" navigates to `health-safety`

**Row 3 — Activity Feed (full width)**
- Header + refresh icon (re-fetches `/api/dashboard`)
- Coloured type badges: clock-in (blue) | leave (green) | ohs-incident (red) | inspection (teal) | disciplinary (amber) | job-complete (purple)
- Relative time via `relativeTime()` from `src/utils/time.js`
- Shows 20 items, "Show N more" button reveals rest
- Empty state: "No activity in the last 7 days"

---

### src/utils/time.js — New Exports

```js
daysAgoStr(n)        // "YYYY-MM-DD" n days ago in SAST
todaySAST()          // alias for todayStr()
relativeTime(isoStr) // "just now" / "X minutes ago" / "X hours ago" / "X days ago"
                     // pure arithmetic, no Intl, uses nowSAST()
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
│   ├── ohs_inspections.json          (legacy — superseded)
│   ├── ohs_notifications.json
│   ├── ohs_equipment.json
│   ├── ohs_risks.json
│   ├── ohs_zones.json                width/height schema (Phase 6)
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
    │   └── ohs.js                    ~235 lines
    ├── hooks/
    │   └── useApi.js
    └── pages/
        ├── Dashboard.jsx             ~200 lines  NEW
        ├── HR.jsx
        ├── Production.jsx
        ├── Settings.jsx
        ├── InspectionPage.jsx
        ├── settings/
        └── hr/
            ├── OHSTab.jsx            ~115 lines
            ├── OHSDashboard.jsx      ~260 lines
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
- `GET /api/dashboard`                             aggregation endpoint

### Employees
- `GET/POST /api/employees`
- `PUT/DELETE /api/employees/:id`

### Time Log
- `GET/POST /api/timelog`
- `PUT /api/timelog/:id`
- `DELETE /api/timelog/:id`

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
- `POST /api/ohs-files/upload`             multipart
- `GET /api/ohs-files?context=&contextId=`
- `DELETE /api/ohs-files/:id`

### OHS — Law Reference
- `GET /api/ohs-law-reference`             read-only

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

### Static + Public
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

### `src/utils/ohs.js`
```js
// Phase 1-2
ohsRiskColour(score)
ohsSeverityLabel(v)
ohsLikelihoodLabel(v)
countOhsActions(incident)
inspectionScorePercent(inspection)
inspectionScoreColour(pct)
// Phase 3
ohsStatusStyle(status)
ohsActionStatusStyle(status)
ohsInspectionStatusStyle(status)
riskRatingFromScore(score)
riskRatingColour(rating)
heatmapFill(count)
incidentsForZone(zone, ohsData)
equipRiskLabel(level)
equipRiskColour(level)
daysAgoStr(daysBack)
// Phase 4
appointmentStatusColour(expiryDate)
appointmentExpiryLabel(expiryDate)
serviceStatusColour(nextServiceDate)
serviceStatusLabel(nextServiceDate)
calcNextServiceDate(lastServiceDate, intervalDays)
// Phase 5
assembleChecklist(templates, cadence)
inspectionProgress(inspection)
inspectionStatusColour(status)
// Phase 6
reviewStatusColour(status)
reviewStatusLabel(status)
calcNextReviewDate(lastDate, intervalDays)
isReviewOverdue(nextReviewDate)
zoneIncidentCount(zoneId, incidents)
equipmentForZone(zoneId, equipment)
```

---

## Data Schemas — Key Fields

### Jobs (`jobs.json`)
```json
{ "id", "name", "client", "trades", "start", "due", "pct", "status", "priority", "assignedTo", "description", "flags", "completedDate?" }
```
Status values: `on-track` | `at-risk` | `blocked` | `planned` | `complete`

### Stock (`stock.json`)
```json
{ "id", "name", "category", "unit", "qty", "min", "onOrder", "orderDate", "usedBy", "status" }
```
Low stock: `qty <= min`. Status values: `low` | `out`

### Tools (`tools.json`)
```json
{ "id", "name", "category", "serial", "dept", "assignedTo", "checkedOut", "due", "status", "condition" }
```
Status values: `out` | `overdue` | `missing` | `available`

---

## Permanent Rules

- **Page shell:** max 150 lines
- **Tab/section component:** max 400 lines
- **Modal component:** max 200 lines
- **Utility file:** pure functions only — no JSX, no hooks
- `apiFetch()` paths **never** include `/api` prefix
- `UPLOADS_URL = 'http://localhost:3001/uploads'` — never use `${BASE}` for uploads
- All `useState` at component top
- All pure helpers at module level — no IIFEs in JSX
- All POST/PUT JSON calls include `headers: { 'Content-Type': 'application/json' }`
- All save handlers: `async` + `try/catch/finally`
- All `useGet` null guards:
  - bare arrays → `Array.isArray(raw) ? raw : []`
  - `ohs-zones` → `zonesData?.zones || []`
- Time: always `src/utils/time.js` — never `Intl`, `toLocaleDateString`, or locale methods
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
| `DELETE /api/jobs/:id` | Done | Added 2026-04-09 |
| `DELETE /api/stock/:id` | Done | Added 2026-04-09 |
| Dashboard — live badge counts in Sidebar | Low | Sidebar badges currently hardcoded (badge: 4 on tools, badge: 2 on stock) |
| Wire `settings.leaveLimits` → HR.jsx `LEAVE_LIMITS` | Medium | Leave editor saves but HR.jsx still uses hardcoded constant |
| Wire auto clock-out: Express cron at `settings.autoClockOut.time` | Medium | Stored but not executed |
| Overtime pay multiplier in payroll output | Medium | Stored but not consumed |
| Compliance calendar — add inspection due dates as items | Medium | Currently only equipment service dates |
| Compliance calendar — add appointment expiry dates as items | Medium | Extensible design supports this |
| Bulk risk review (multiple risks in one form) | Low | Currently one risk at a time |
| Factory map print / export | Low | Not built |
| Tools screen — live data + check-in/out | Backlog | |
| Stock screen — live data + qty updates | Backlog | |
| Jobs screen — live data + status updates | Backlog | |
| Phase 3 intelligence — alert strip, payroll, login, WhatsApp, AI | Future | |

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
