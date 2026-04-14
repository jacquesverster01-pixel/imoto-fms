# iMoto FMS — Handoff 13
**Date:** 2026-04-09
**Session:** OHS Phase 7 — Files, OHS Law Reference, Compliance Calendar
**Project path:** `C:\Users\jacqu\Desktop\imoto-fms`
**Frontend:** React 18 + Vite 6, port 5173
**Backend:** Express, port 3001
**Storage:** JSON flat files in `/data/`
**Start command:** `npm run dev`

---

## What Was Done This Session

### OHS Phase 7 — File Uploads (multi-context)

**New files**

| File | Lines |
|------|-------|
| `data/ohs_files.json` | empty `[]` |
| `src/pages/hr/ohs/OHSFilePanel.jsx` | ~130 |
| `src/pages/hr/ohs/OHSLibraryTab.jsx` | ~175 |

**Modified files**

| File | Change |
|------|--------|
| `server.js` | +`import { randomUUID } from 'crypto'`; +`'ohs_files.json': []` in DATA_INITS; +3 OHS file routes |
| `src/pages/hr/ohs/EquipmentTab.jsx` | +`OHSFilePanel` import; `<OHSFilePanel context="equipment" contextId={item.id} />` appended to each item card |
| `src/pages/hr/ohs/RiskRegisterTab.jsx` | +`OHSFilePanel` import; `<OHSFilePanel context="risk" contextId={r.id} />` appended to each risk card |
| `src/pages/hr/ohs/OHSDashboard.jsx` | +`OHSFilePanel` import; `<OHSFilePanel context="incident" contextId={inc.id} />` appended to each incident card |

**New API routes**
- `POST /api/ohs-files/upload` — multipart/form-data fields: `file`, `context`, `contextId`, `uploadedBy`, `label`. Validates MIME type, renames file to UUID-prefixed name in `/data/uploads/`, saves record to `ohs_files.json`, returns saved record.
- `GET /api/ohs-files?context=&contextId=` — filters by `context` and `contextId`. Empty `contextId` matches null/empty records (used for library).
- `DELETE /api/ohs-files/:id` — deletes the record and the file from disk.

**OHSFilePanel behaviour**
- Rendered as `<details><summary>` — collapsed by default, shows file count badge when files exist
- Fetches files via `useGet('/ohs-files?context=...&contextId=...')` on mount
- Upload: label input + file picker + Upload button → `POST /api/ohs-files/upload`
- Delete: inline confirm (no modal) → `DELETE /api/ohs-files/:id`
- Download: `<a href="http://localhost:3001/uploads/{filename}" target="_blank">`
- Accepted types: `.pdf .jpg .jpeg .png .doc .docx`

**Allowed MIME types (server-side validation)**
```
application/pdf
image/jpeg
image/png
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

---

### OHS Phase 7 — OHS Law Reference

**New files**

| File | Lines |
|------|-------|
| `data/ohs_law_reference.json` | 6 chapters / ~35 sections |
| `src/pages/hr/ohs/OHSLawTab.jsx` | ~110 |

**Modified files**

| File | Change |
|------|--------|
| `server.js` | +`GET /api/ohs-law-reference` (read-only) |

**New API route**
- `GET /api/ohs-law-reference` — reads `data/ohs_law_reference.json`, returns array.

**Law reference content (6 chapters)**
- Chapter 1: Interpretation and Application (3 sections)
- Chapter 2: General Duties of Employers (6 sections — s8, s9, s10, s13, s14, s16)
- Chapter 3: Health and Safety Representatives and Committees (4 sections — s17, s18, s19, s20)
- Chapter 4: General Administrative Provisions (5 sections — s28, s29, s30, s31, s34)
- Chapter 5: Regulations and Penalties (3 sections — s35, s38, s40)
- General Safety Regulations: Key GSR Provisions (6 sections — GSR 3–8)

**OHSLawTab behaviour**
- Collapsible accordion per chapter using native `<details><summary>`
- Each section: section-number badge, title, description (1–3 sentences plain language)
- Search bar filters sections by title or description across all chapters
- Matching chapters auto-expand (`open` prop set when search is active)
- Header note: "Reference only — based on OHS Act 85 of 1993. Always consult the official gazette."

---

### OHS Phase 7 — Compliance Calendar

**New files**

| File | Lines |
|------|-------|
| `src/pages/hr/ohs/ComplianceCalendarTab.jsx` | ~200 |

**ComplianceCalendarTab behaviour**
- Data source: `GET /api/ohs-equipment` — items with `nextServiceDate` become compliance items of type "Equipment Service"
- **List view**: table — Type | Item Name | Due Date | Days Until Due | Status badge
  - Colour-coded "Days Until": overdue=red, ≤30 days=amber, upcoming=green
  - Filter buttons: All | Overdue | Due this month | Upcoming
- **Calendar grid view**:
  - Standard month grid, Mon–Sun columns
  - Prev/next month navigation
  - Each day cell shows coloured dot badges (one per due item)
  - Hover over dot shows item name in status bar below grid
  - Today's date highlighted in purple
- **Date helpers** (all at module level, no Intl, no locale):
  - `getDaysInMonth(year, month)`
  - `getFirstDayOfMonth(year, month)` — returns 0–6 (Sun=0)
  - `buildCalendarGrid(year, month, items)` — returns array of week arrays
  - `fmtMonthYear(year, month)` — uses `MONTH_NAMES` constant array
  - `daysUntil(dateStr, today)` — pure UTC math

---

### OHSTab.jsx — 11 sub-tabs

**Modified files**

| File | Change |
|------|--------|
| `src/pages/hr/OHSTab.jsx` | +3 imports; +3 entries in SUB_TABS; tab bar wrapped in `overflowX: auto` scrollable container |

**Updated sub-tab list**
```
Dashboard | Inspections | Templates | Notifications | Equipment | Risk Register |
Factory Map | Appointments | OHS Library | OHS Law | Calendar
```
Tab bar uses `overflowX: 'auto'` with `minWidth: 'max-content'` on the inner flex div — scrolls horizontally on narrow screens without label wrapping.

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
│   ├── ohs_appointments.json         Phase 4
│   ├── ohs_appointment_types.json    Phase 4
│   ├── ohs_inspection_templates.json Phase 5
│   ├── ohs_inspections_active.json   Phase 5
│   ├── ohs_files.json                Phase 7 NEW
│   ├── ohs_law_reference.json        Phase 7 NEW (pre-seeded)
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
        ├── InspectionPage.jsx        114 lines
        ├── settings/
        └── hr/
            ├── OHSTab.jsx            ~115 lines  (Phase 7 — 11 sub-tabs)
            ├── OHSDashboard.jsx      ~260 lines  (Phase 7 — OHSFilePanel per incident)
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
            │   ├── AddDisciplinaryModal.jsx  ~115 lines
            │   ├── DiscTemplatePanel.jsx
            │   ├── discTemplateData.js
            │   └── printWarningLetter.js     ~355 lines ⚠
            └── ohs/
                ├── OHSFilePanel.jsx          ~130 lines  Phase 7 NEW
                ├── OHSLibraryTab.jsx         ~175 lines  Phase 7 NEW
                ├── OHSLawTab.jsx             ~110 lines  Phase 7 NEW
                ├── ComplianceCalendarTab.jsx ~200 lines  Phase 7 NEW
                ├── EquipmentTab.jsx          ~225 lines  (Phase 7 — OHSFilePanel)
                ├── AddEquipmentModal.jsx     ~210 lines
                ├── LogServiceModal.jsx       79 lines
                ├── RiskRegisterTab.jsx       ~215 lines  (Phase 7 — OHSFilePanel)
                ├── AddRiskModal.jsx          173 lines
                ├── RiskReviewModal.jsx       ~130 lines
                ├── FactoryMapTab.jsx         ~290 lines
                ├── AppointmentsTab.jsx       ~185 lines
                ├── AddAppointmentModal.jsx   122 lines
                ├── AddIncidentModal.jsx      ~115 lines
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
- `GET /api/ohs-risks/review-status`
- `PUT /api/ohs-risks/:id/review`

### OHS — Zones
- `GET /api/ohs-zones`
- `PUT /api/ohs-zones`

### OHS — Files                            Phase 7
- `POST /api/ohs-files/upload`             multipart
- `GET /api/ohs-files?context=&contextId=`
- `DELETE /api/ohs-files/:id`

### OHS — Law Reference                    Phase 7
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

### `ohs_files.json` — record shape
```json
{
  "id": "OHF…",
  "context": "employee | equipment | risk | incident | library",
  "contextId": "linked record id or null",
  "filename": "uuid-prefixed stored filename",
  "originalName": "user's original filename",
  "mimeType": "application/pdf etc.",
  "size": 12345,
  "uploadedAt": "ISO date",
  "uploadedBy": "name string",
  "label": "user-provided label"
}
```

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
