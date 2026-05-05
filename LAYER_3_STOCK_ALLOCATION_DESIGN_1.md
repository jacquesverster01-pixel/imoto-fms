# Layer 3 — Stock Allocation v1
**Date:** 2026-05-05
**Scope:** Per-task stock indicators in the Gantt + per-component availability column in TaskWindow.
**Out of scope for v1:** Per-job badges in the Planner sidebar, the Stock Pressure cross-job view, lead-time estimation, anything Cost-to-Completion related.

---

## What we're building

When a Gantt task has a `components` array (which every BOM-derived task does), each component has a required `quantity` of an `itemCode`. We compare that to the live Unleashed stock for that item code, minus what's already allocated to other in-flight jobs, and surface the answer:

- **In the Gantt:** a small status dot on each task bar — green (all components available), red (one or more shortfalls), grey (data unknown / cache cold)
- **In TaskWindow:** the existing Components table gets a new "Available" column showing on-hand stock for each item, with shortfalls highlighted

That's it. No allocation editing, no purchase suggestions, no historical view. Just: "can this task start today?"

## Data flow

```
Unleashed API ──fetchAllPages──▶ data/stock_cache.json ──read──▶ /api/stock/allocation
                                  (1hr TTL, refreshed on demand)        │
                                                                        ▼
                                                            stockAllocation.js helpers
                                                                        │
                                                                        ▼
                                                       GanttBar dot + TaskWindow column
```

## The cache

**File:** `data/stock_cache.json`

**Shape:**
```json
{
  "updatedAt": "2026-05-05T08:14:23.000Z",
  "byCode": {
    "ELEP00071": { "onHand": 1240, "lastUpdated": "2026-05-05T08:14:23.000Z" },
    "RAWP00033": { "onHand": 380, "lastUpdated": "2026-05-05T08:14:23.000Z" },
    ...
  }
}
```

`onHand` is the AvailableQty from Unleashed's StockOnHand response (the number that's actually free, not committed to other systems). We store one row per item code globally — Unleashed already aggregates across warehouses unless filtered.

**Initial state on server startup:** `{ "updatedAt": null, "byCode": {} }`. Server must initialise this file alongside the other JSON data files (same pattern as `boms.json` etc).

## The refresh endpoint

**`POST /api/stock/refresh`**

Calls Unleashed's `/StockOnHand` with no `productCode` filter, paginates all pages (200/page), maps to the `byCode` shape, writes to `data/stock_cache.json`, returns `{ ok: true, count, updatedAt }`.

Handles the case where Unleashed is unreachable: returns `{ ok: false, error }` with status 502, leaves the cache file untouched. Existing stale data continues to be served.

A simple `setInterval` in `server.js` triggers a refresh every 60 minutes. Failed refreshes log to console but don't crash the server. First refresh fires 10s after server start (gives the rest of the system time to settle).

## The lookup endpoint

**`GET /api/stock/allocation?jobId=XXX&taskId=YYY`** (taskId optional)

If `taskId` is provided, returns allocation status for one task:
```json
{
  "ok": true,
  "cacheUpdatedAt": "2026-05-05T08:14:23.000Z",
  "cacheStale": false,
  "components": [
    {
      "itemCode": "ELEP00071",
      "required": 90,
      "onHand": 1240,
      "totalAllocatedAcrossJobs": 410,
      "available": 830,
      "status": "ok"
    },
    {
      "itemCode": "CONP00031",
      "required": 50,
      "onHand": 12,
      "totalAllocatedAcrossJobs": 50,
      "available": -38,
      "status": "short"
    }
  ],
  "summary": { "ok": 5, "short": 1, "unknown": 0 }
}
```

If `taskId` is omitted, returns same shape but for every task in the job, keyed by taskId.

`cacheStale` is true when `updatedAt` is older than 1 hour. UI uses this to show a "data is X old" warning without blocking the read.

`status` per component:
- `'ok'` — `available >= required`
- `'short'` — `available < required`
- `'unknown'` — itemCode not in cache (e.g. brand new BOM imported, never refreshed)

## Allocation math

A component's `available` quantity is calculated as:

```
available = onHand - totalAllocatedAcrossJobs

where totalAllocatedAcrossJobs = sum of `quantity` for every component
  in every task across every job where:
    - job.status !== 'done'
    - the task itself is not done (task.done !== true)
    - the component's itemCode matches
```

Why this matters: stock is global. If two open jobs both want 50 units of ELEP00071 and we have 60 on hand, the first task to claim it shows green and the second shows red. Without subtracting cross-job allocation, both would falsely show green.

Implementation: in `src/utils/stockAllocation.js`, a pure helper:

```javascript
// Returns Map<itemCode, totalQty>
function computeGlobalAllocations(allOpenJobs) { ... }

// Returns the per-component status array shown above
function checkTaskAllocation(task, stockCache, globalAllocations) { ... }
```

This means the lookup endpoint reads `data/jobs.json`, walks every non-done task in every non-done job, and tallies. For 3-4 vehicles with ~30 tasks each, that's ~100 tasks — fast in memory, no caching needed. If ever it gets slow, we cache the result with the same 1hr TTL.

## Quantity formula

`required = component.quantity` (per the v1 decision).

Wastage is intentionally NOT included in the v1 calculation. It remains tracked in the BOM data; we just don't enforce against it. This can be flipped to `quantity + wastageQty` in a single line change if real-world use shows departments running short mid-build.

## The Gantt dot

In `gantt/GanttBar.jsx`, add a small absolute-positioned dot at the right edge of the bar:
- 8x8px circle
- Position: `right: 6px, top: 50%, transform: translateY(-50%)`
- Colour: green `#22c55e` for ok, red `#ef4444` for short, grey `#9ca3af` for unknown
- Only render when `task.components?.length > 0`
- Tooltip on hover: "All components available" / "3 components short" / "Stock data unavailable"

The dot data comes from a new state in GanttModal: `stockByTaskId` (a Map). On Gantt open, we call `GET /api/stock/allocation?jobId=XXX` once for all tasks, store the per-task summaries in state, pass `stockByTaskId.get(task.id)` to each GanttBar via the existing chart-area prop chain.

If the call fails or returns `cacheStale: true`, GanttBar dots show grey and a single "Stock data X old" banner appears in the Gantt header (added to GanttHeader.jsx). The banner has a "Refresh" button that calls `POST /api/stock/refresh` then re-fetches the allocation.

## TaskWindow Components column

In `TaskWindow.jsx`, the existing Components table:
```
| Code | Description | Qty | Unit cost |
```

Becomes:
```
| Code | Description | Qty | Available | Unit cost |
```

The Available column shows `available` from the lookup. Cells where `status === 'short'` get a red background. Cells where `status === 'unknown'` show a dash with a tooltip "Not in stock cache."

The data is already in the same `stockByTaskId` map fetched at Gantt open — pass through to TaskWindow as a prop.

## Files touched

| File | Change |
|---|---|
| `server.js` | initialise `data/stock_cache.json`, mount new `/api/stock/*` routes, set up 60min refresh interval |
| `routes/stock.js` | NEW — refresh + allocation endpoints (replaces the existing thin CRUD if any; check what's there first) |
| `src/utils/stockAllocation.js` | NEW — pure helpers: `computeGlobalAllocations`, `checkTaskAllocation` |
| `src/pages/production/GanttModal.jsx` | new useState `stockByTaskId`, useEffect to fetch allocation on mount, pass through to GanttHeader + GanttChartArea + TaskWindow |
| `src/pages/production/gantt/GanttHeader.jsx` | add stale-banner + refresh button |
| `src/pages/production/gantt/GanttChartArea.jsx` | accept `stockByTaskId`, pass through to GanttBar via the per-row map |
| `src/pages/production/gantt/GanttBar.jsx` | render the dot |
| `src/pages/production/TaskWindow.jsx` | add Available column to Components table |
| `data/stock_cache.json` | NEW data file, initialised empty |

Total: 1 new endpoint file, 1 new utility, 1 new data file, 5 modified frontend files.

## Order of work

1. **Backend first.** `routes/stock.js` (refresh + allocation), server.js initialisation, 60min interval. Hit the refresh endpoint manually (curl or browser) to populate the cache. Hit the allocation endpoint manually to confirm the shape is right.
2. **Pure helper.** `src/utils/stockAllocation.js`. Easy to unit test in isolation. Can be tested by hand with sample data before any UI exists.
3. **TaskWindow column.** Smallest UI change, most testable. Open a task with components, see if Available column shows real numbers.
4. **GanttModal state + fetch.** Wire the API call into the modal, store in `stockByTaskId`, pass down through the prop chain. Don't render the dot yet.
5. **GanttBar dot.** Final visible piece. Can verify against the data already loaded in step 4.
6. **Stale-data banner in GanttHeader.** The smallest cosmetic thing, last.

Each step leaves a working app. Steps 4 and 5 should be one commit (they only make sense together). Steps 1-3 and 6 can each be their own commit.

## Verification

After all steps:
- Open the FINA00031 Gantt
- All tasks with components should show a dot (green or red)
- Tasks without components (the manual ones, or labour `TEAM-` rows) should NOT show a dot
- Click any task → TaskWindow → Components table has the new "Available" column
- Click a task with a known short component (or fake one by dropping the cache `onHand` value) → red dot, red row in TaskWindow
- Click "Refresh" in the GanttHeader stale banner → cache updates, banner clears

## Edge cases to handle

- **Cache cold** (first run, never refreshed): `byCode` is empty → all components show `status: 'unknown'`, dots are grey, banner says "Stock data not yet loaded — click refresh"
- **Item code in BOM but not in Unleashed** (typo, deleted product, etc.): same as cache cold — `unknown` status, grey
- **Task with empty components**: no dot rendered, no row added to allocation summary
- **Job marked done while modal open**: stale, but harmless. Reopening the Gantt re-fetches.
- **Manual refresh during 60min auto cycle**: both write to the same file. Last-write-wins is fine; refresh is idempotent.

## Out of scope (do NOT do in v1)

- Per-job summary badges in JobListPanel
- Stock Pressure cross-job view
- Lead time estimation (Unleashed's `OnPurchaseOrder` field is available but ignored for now)
- Cost-to-Completion dashboard
- Any allocation editing UI (tasks get their components from the BOM at creation; manual editing is a future thing)
- Webhook-based real-time updates
- Multi-warehouse split (we use total available across all warehouses)

## What this unlocks

Once Layer 3 v1 is in place, the next pieces become small additions on top:
- **Job badges:** read the same allocation data, sum per-job, show a badge in JobListPanel
- **Stock Pressure view:** invert the data — list every short itemCode, sum required across jobs, sort by total value
- **Cost-to-Completion:** add `unitCost` to the allocation response (already in the BOM data), sum `required × unitCost` for not-done components per job, that's literally the cost-to-completion number

The data model and helper functions are designed so all three of these are < 100 lines of new code each.
