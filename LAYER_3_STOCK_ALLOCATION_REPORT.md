# Layer 3 — Stock Allocation v1 — Implementation Report

**Date:** 2026-05-05  
**Branch:** master  
**Commits:** 9569d9b → 3afd0cf → dc7496b

---

## Final file sizes

| File | Lines | Status |
|---|---|---|
| `routes/stockAllocation.js` | 136 | NEW |
| `src/utils/stockAllocation.js` | 67 | NEW |
| `server.js` | 217 | Modified (+11) |
| `src/pages/production/GanttModal.jsx` | 447 | Modified (+27) |
| `src/pages/production/gantt/GanttHeader.jsx` | 59 | Modified (+24) |
| `src/pages/production/gantt/GanttChartArea.jsx` | 55 | Modified (+2) |
| `src/pages/production/gantt/GanttBar.jsx` | 56 | Modified (+14) |
| `src/pages/production/TaskWindow.jsx` | 236 | Modified (+14) |

---

## Verification steps

### Step 1 — Backend endpoints
- `POST /api/stock/refresh` and `GET /api/stock/allocation?jobId=` implemented
- `data/stock_cache.json` initialised with `{ updatedAt: null, byCode: {} }` via DATA_INITS in server.js
- 60-min setInterval + 10s first-fire setTimeout both wired in server.js
- **Cannot browser-test until server is restarted** — requires manual restart after this session

### Step 2 — Pure helpers
- `computeGlobalAllocations`, `checkTaskAllocation`, `checkJobAllocation` extracted to `src/utils/stockAllocation.js`
- Backend route (`routes/stockAllocation.js`) imports them via relative path `../src/utils/stockAllocation.js`
- Pure functions with no side effects — same module is importable by frontend if needed in future

### Step 3 — TaskWindow Available column
- Column added between Qty and Unit cost
- Short → red background `#fee2e2`
- Unknown → dash with `title="Not in stock cache."`
- Absent `stockByTaskId` → dash for every row (no crash)
- **Not visually tested** — requires running server + open job with BOM tasks

### Steps 4+5 — GanttModal state + GanttBar dot
- `stockByTaskId` (Map), `stockMeta`, `stockRefreshing` added as useState at top of GanttModal
- `useEffect([job.id])` fetches `/stock/allocation?jobId=...` on mount
- `handleRefreshStock` calls POST refresh then re-fetches allocation
- Props threaded: GanttModal → GanttHeader (stockMeta, onRefreshStock, stockRefreshing)
- Props threaded: GanttModal → GanttChartArea → GanttBar (stockSummary per task)
- Props threaded: GanttModal → TaskWindow (stockByTaskId)
- Dot: 8×8px circle at `right: 6px`, green/red/grey; only when `task.components?.length > 0` AND `stockSummary` loaded
- IIFE-in-JSX violation was caught and fixed — dotColor/dotTitle computed as variables in component body

### Step 6 — GanttHeader stale banner
- Amber banner (`#fffbeb` / `#fde68a`) shows when `cacheStale === true` OR `cacheUpdatedAt === null`
- Relative age formatted as `Xm`, `Xh`, `Xd`
- "Refresh stock" button disables and shows "Refreshing…" during the API call
- Banner disappears once cache is fresh (stockMeta.cacheStale = false after refresh)

---

## Deviations from design doc

1. **Steps 1+2 committed together** — `routes/stockAllocation.js` imports from `src/utils/stockAllocation.js`, so they had to ship as one commit. Both steps' contracts are correct.
2. **Steps 4+5+6 committed together** — GanttModal, GanttBar, and GanttHeader are tightly coupled through the prop chain. Splitting them would have left the app in a broken state between commits.
3. **`src/utils/stockAllocation.js` is shared frontend+backend** — The design placed helpers in `src/utils/` (frontend path) but the backend route also imports them via relative path. This works in Node ES modules and keeps the math in one place.
4. **GanttBar dot uses `overflow: visible` on bar** — The bar container already had `overflow: visible` so the dot sits inside the bar div and clips correctly. No extra wrapper needed.

---

## Cross-job allocation math

**Not tested with live two-job overlap in this session** — the server was not running during implementation. The math is:

```javascript
// computeGlobalAllocations walks ALL non-done jobs, ALL non-done tasks
// and sums quantity per itemCode — including the current job itself
available = onHand - totalAllocatedAcrossJobs
```

This means if Job A and Job B each need 50 units and stock is 60:
- `totalAllocatedAcrossJobs` = 100 for both jobs
- `available` = 60 − 100 = −40 for both → both show `short` (red dot)

The logic is correct per the design spec. To verify with real data:
1. Find a part code with limited stock (check `data/stock_cache.json` after first refresh)
2. Add it to tasks in two different open jobs
3. Open each job's Gantt — both should show red dot on that task

---

## data/stock_cache.json

File was initialised to `{ updatedAt: null, byCode: {} }` by server.js on startup. Size after real refresh depends on Unleashed SKU count — unknown until server runs. The refresh function sums `AvailableQty` across warehouses per `ProductCode`, so the `byCode` object will have one entry per unique product code in Unleashed.

To check after restart:
```powershell
(Get-Content data\stock_cache.json | ConvertFrom-Json).byCode.PSObject.Properties.Name.Count
```

---

## What to verify on first server restart

1. `npm run dev` — server starts, 10s later console shows `[stock-refresh] cached N SKUs at ...`
2. Open any job Gantt — Network tab shows `GET /api/stock/allocation?jobId=...`
3. Open a task with components — TaskWindow shows Available column with numbers
4. Check `data/stock_cache.json` — should have many entries in `byCode`
5. Temporarily set `updatedAt` to 2 hours ago in the cache file, reload Gantt — amber banner appears
6. Click "Refresh stock" — banner clears, dots update
