# iMoto FMS — Handoff 12
**Date:** 2026-04-09
**Session:** OHS Phase 6 — Risk Review Workflow + Factory Map Completion
**Project path:** `C:\Users\jacqu\Desktop\imoto-fms`
**Frontend:** React 18 + Vite 6, port 5173
**Backend:** Express, port 3001
**Storage:** JSON flat files in `/data/`
**Start command:** `npm run dev`

---

## What Was Done This Session

### OHS Phase 6 — Risk Review Workflow

**New files**

| File | Lines |
|------|-------|
| `src/pages/hr/ohs/RiskReviewModal.jsx` | ~130 |

**Modified files**

| File | Change |
|------|--------|
| `server.js` | +2 new OHS risk routes (review-status, review) |
| `src/utils/ohs.js` | +6 new exports — see below |
| `src/pages/hr/ohs/RiskRegisterTab.jsx` | Review button, status badge, overdue banner, last/nextReviewDate shown on rows |
| `src/pages/hr/ohs/AppointmentsTab.jsx` | Overdue risks banner at top (fetches `/ohs-risks/review-status`) |

**New API routes**
- `GET /api/ohs-risks/review-status` — lightweight array `{ id, title, reviewStatus, lastReviewDate, nextReviewDate, reviewIntervalDays }`. Auto-computes `overdue` if `nextReviewDate < today`.
- `PUT /api/ohs-risks/:id/review` — body: `{ author, note, reviewedItems: [{ id, newLikelihood, newSeverity }] }`. Updates `lastReviewDate`, `nextReviewDate` (today + `reviewIntervalDays`), sets `reviewStatus: "ok"`, appends to `reviewNotes[]`, recalculates scores for each item in `reviewedItems`.

**New ohs.js exports**
- `reviewStatusColour(status)` — ok→green, due→amber, overdue→red
- `reviewStatusLabel(status)` — ok→'Up to date', due→'Review due', overdue→'Overdue'
- `calcNextReviewDate(lastDate, intervalDays)`
- `isReviewOverdue(nextReviewDate)`

---

### OHS Phase 6 — Factory Map Completion

**New files**

*(none — FactoryMapTab.jsx was a full rewrite of an existing file)*

**Modified files**

| File | Change |
|------|--------|
| `data/ohs_zones.json` | Migrated `w`/`h` fields to `width`/`height` on all 10 zones |
| `src/pages/hr/ohs/FactoryMapTab.jsx` | Full rewrite ~290 lines — drag, resize, add, delete, equipment overlay, incident overlay, unassigned sidebar |
| `src/pages/hr/ohs/AddEquipmentModal.jsx` | Added `zoneId` dropdown (fetches `/ohs-zones` internally) |
| `src/pages/hr/ohs/AddIncidentModal.jsx` | Added `zoneId` dropdown (fetches `/ohs-zones` internally); `zoneId` included in POST/PUT body |

**New API routes**

*(none — uses existing `PUT /api/ohs-zones`)*

**New ohs.js exports**
- `zoneIncidentCount(zoneId, incidents)` — returns number
- `equipmentForZone(zoneId, equipment)` — returns filtered array

**FactoryMapTab feature summary**
- Drag zones: `onMouseDown` on zone body → `onMouseMove` updates live position → `onMouseUp` saves to `PUT /api/ohs-zones`
- Resize zones: `onMouseDown` on purple bottom-right corner handle → live `width`/`height` → saves on `onMouseUp`
- Add zone: "Add Zone" button → inline form (name + 6 colour swatches) → creates at x:20, y:20, 140×90
- Delete zone: ✕ button → confirm dialog → removes and saves
- Equipment overlay: 🔧 dots per zone, background = `serviceStatusColour(nextServiceDate)`, border = `equipRiskColour(riskLevel)`. Click shows tooltip card in sidebar.
- Unassigned equipment: right sidebar lists equipment without `zoneId`. Note to assign via Equipment tab.
- Incident overlay: `⚠️ N` badge on zones with tagged incidents. Click opens inline incident-title popover.
- `zoneId` on incidents: set via `AddIncidentModal` zone dropdown
- `zoneId` on equipment: set via `AddEquipmentModal` zone dropdown

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
│   ├── ohs_inspections.json          (legacy format — superseded)
│   ├── ohs_notifications.json
│   ├── ohs_equipment.json
│   ├── ohs_risks.json
│   ├── ohs_zones.json                width/height schema (Phase 6)
│   ├── ohs_appointments.json         Phase 4
│   ├── ohs_appointment_types.json    Phase 4
│   ├── ohs_inspection_templates.json Phase 5
│   ├── ohs_inspections_active.json   Phase 5
│   └── uploads/
└── src/
    ├── App.jsx
    ├── utils/
    │   ├── time.js
    │   └── ohs.js                    ~235 lines
    ├── hooks/
    │   └── useApi.js
    └── pages/
        ├── HR.jsx
        ├── Production.jsx
        ├── Settings.jsx
        ├── InspectionPage.jsx        114 lines  Phase 5
        ├── settings/
        └── hr/
            ├── ClockInTab.jsx
            ├── LeaveTab.jsx
            ├── DisciplinaryTab.jsx
            ├── OHSTab.jsx            121 lines
            ├── OHSDashboard.jsx      255 lines  Phase 4
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
            │   ├── AddDisciplinaryModal.jsx  ~115 lines
            │   ├── DiscTemplatePanel.jsx
            │   ├── discTemplateData.js
            │   └── printWarningLetter.js     ~355 lines ⚠
            └── ohs/
                ├── EquipmentTab.jsx          219 lines
                ├── AddEquipmentModal.jsx     ~210 lines (Phase 6 — zoneId)
                ├── LogServiceModal.jsx       79 lines
                ├── RiskRegisterTab.jsx       ~210 lines (Phase 6 — review badge + banner)
                ├── AddRiskModal.jsx          173 lines
                ├── RiskReviewModal.jsx       ~130 lines  Phase 6 NEW
                ├── FactoryMapTab.jsx         ~290 lines  Phase 6 rewrite
                ├── AppointmentsTab.jsx       ~185 lines (Phase 6 — overdue banner)
                ├── AddAppointmentModal.jsx   122 lines
                ├── AddIncidentModal.jsx      ~115 lines (Phase 6 — zoneId)
                ├── InspectionTemplatesTab.jsx
                ├── InspectionPreviewModal.jsx
                ├── ScheduleInspectionModal.jsx
                ├── InspectionRunsTab.jsx     208 lines
                ├── InspectionRunnerModal.jsx 96 lines
                └── InspectionQuestionItem.jsx 143 lines
```

---

## API Routes — Full Reference

### Employees
- `GET/POST /api/employees`
- `PUT/DELETE /api/employees/:id`

### Time Log
- `GET/POST /api/timelog`

### Leave
- `GET/POST /api/leave`
- `PUT/DELETE /api/leave/:id`

### Disciplinary
- `GET/POST /api/disciplinary`
- `PUT/DELETE /api/disciplinary/:id`

### Jobs
- `GET/POST /api/jobs`
- `PUT /api/jobs/:id`

### Tools
- `GET/POST /api/tools`
- `PUT/DELETE /api/tools/:id`

### Stock
- `GET/POST /api/stock`
- `PUT /api/stock/:id`

### Settings
- `GET /api/settings`
- `PUT /api/settings`

### OHS — Incidents
- `GET/POST /api/ohs`
- `PUT/DELETE /api/ohs/:id`

### OHS — Inspections (legacy)
- `GET/POST /api/ohs-inspections`
- `PUT/DELETE /api/ohs-inspections/:id`

### OHS — Notifications
- `GET/POST /api/ohs-notifications`
- `PUT /api/ohs-notifications/:id`

### OHS — Equipment
- `GET/POST /api/ohs-equipment`
- `PUT/DELETE /api/ohs-equipment/:id`
- `GET/POST /api/ohs-equipment/:id/service-history`

### OHS — Risks
- `GET/POST /api/ohs-risks`
- `PUT/DELETE /api/ohs-risks/:id`
- `GET /api/ohs-risks/review-status`      Phase 6
- `PUT /api/ohs-risks/:id/review`         Phase 6

### OHS — Zones
- `GET /api/ohs-zones`
- `PUT /api/ohs-zones`

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
- `POST /api/zk/connect`
- `POST /api/zk/disconnect`
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

## Data Schemas — Key Fields Added This Session

### `ohs_risks.json` — new optional fields (added by review workflow)
```json
{
  "lastReviewDate":    "YYYY-MM-DD or null",
  "nextReviewDate":    "YYYY-MM-DD or null",
  "reviewIntervalDays": 90,
  "reviewStatus":      "due | ok | overdue",
  "reviewNotes":       [{ "id": "RN…", "date": "YYYY-MM-DD", "author": "", "note": "" }]
}
```
Existing records without these fields default to `reviewStatus: 'due'` (treated as overdue-eligible by `GET /review-status`).

### `ohs_zones.json` — migrated schema
```json
{ "id": "Z001", "name": "…", "colour": "#…", "x": 20, "y": 20, "width": 200, "height": 150 }
```
Previously used `w`/`h` — all 10 existing zones updated to `width`/`height`.

### `ohs_equipment.json` — new optional field
```json
{ "zoneId": "Z001 or null" }
```

### `ohs.json` (incidents) — new optional field
```json
{ "zoneId": "Z001 or null" }
```

---

## Permanent Rules

- **Page shell:** max 150 lines
- **Tab/section component:** max 400 lines
- **Modal component:** max 200 lines
- **Utility file:** pure functions only — no JSX, no hooks
- `apiFetch()` paths **never** include `/api` prefix
- `${BASE}` **never** used for upload view URLs — use `UPLOADS_URL = 'http://localhost:3001/uploads'`
- All `useState` at component top
- All pure helpers at module level
- No IIFEs in JSX
- All POST/PUT JSON calls include `headers: { 'Content-Type': 'application/json' }`
- All save handlers: `async` + `try/catch/finally` + reset saving state in `finally`
- All `useGet` null guards:
  - `employees` → `empData?.employees || []`
  - bare arrays → `Array.isArray(raw) ? raw : []`
  - `settings` → `settingsData?.company || {}` / `settingsData?.departments || []`
  - `zk/users` → `zkData?.users || []`
  - `ohs-zones` → `zonesData?.zones || []`
- Time: always `src/utils/time.js` — never `Intl` or locale methods
- PowerShell for all terminal commands
- Vite cache clear: `Remove-Item -Recurse -Force node_modules\.vite`
- After adding Express routes: always restart server
- `vite.config.js` must have `server: { watch: { ignored: ['**/data/**'] } }`

---

## Backlog / Known Gaps

| Item | Priority | Notes |
|------|----------|-------|
| `printWarningLetter.js` ~355 lines | Low | Stable overage — defer |
| `AddLeaveModal.jsx` ~255 lines | Low | Stable overage — defer |
| `EmployeeCalendarModal.jsx` ~245 lines | Low | Stable overage — defer |
| `EmployeeEditModal.jsx` ~205 lines | Low | Stable overage — defer |
| `DELETE /api/jobs/:id` | Low | Not yet needed |
| `DELETE /api/stock/:id` | Low | Not yet needed |
| Wire `settings.leaveLimits` → HR.jsx `LEAVE_LIMITS` | Medium | Leave editor saves but HR.jsx still uses hardcoded constant |
| Wire auto clock-out: Express cron at `settings.autoClockOut.time` | Medium | Stored but not executed |
| Overtime pay multiplier used in payroll output | Medium | Stored but not consumed |
| Bulk risk review (multiple risks in one form) | Low | Currently one risk at a time |
| Factory map print / export | Low | Not built |
| OHS Phase 7 — Files, OHS Law Reference, Compliance Calendar | Next | |
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
