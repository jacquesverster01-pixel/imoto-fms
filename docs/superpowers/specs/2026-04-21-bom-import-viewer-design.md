# BOM Import & Viewer — Design Spec
**Date:** 2026-04-21
**Feature:** Imported BOMs tab in the Inventory page

---

## Overview

Add a new **"Imported BOMs"** 5th tab to the Inventory page. Users upload CSV files exported from the SVD BOM system. Each uploaded BOM is stored locally (JSON flat file) and displayed in a split-panel viewer with collapsible tree and flat table modes.

---

## Placement

- New 5th tab added to `src/pages/Inventory.jsx` tab bar: Stock On Hand | Products | Bill of Materials | Assemblies | **Imported BOMs**
- Rendered by a new component: `src/components/inventory/InventoryImportedBOMs.jsx`
- The existing "Bill of Materials" tab (Unleashed live data) is unchanged

---

## Layout

Two-panel layout:

**Left panel (220px fixed):**
- "+ Import CSV" button at top
- List of all imported BOMs, each card showing: Product Code (bold), Product Description, BOM Reference, row count
- Active BOM highlighted with blue left border
- Clicking a card loads that BOM into the right panel

**Right panel (flex 1):**
1. **Cost summary header** — product name, BOM reference, import date, item count; total BOM cost (ZAR) top-right; department cost pills (ELE, CAB, MEC, CLM, PLU, … + N more)
2. **Toolbar** — search input, department dropdown, hide-labour toggle, tree/table toggle, Export CSV button, Delete BOM button
3. **Viewer** — tree view (default) or table view depending on toggle

---

## Import Flow

- "+ Import CSV" opens a file picker (accepts `.csv` only)
- CSV is posted to `POST /api/boms/import` as `multipart/form-data`
- Server parses all rows, extracts metadata from first row (BOM_Reference, Product_Code, Product_Description)
- If a BOM with the same `Product_Code` already exists in the library, it is overwritten (replaced in-place)
- On success the new BOM appears selected in the left panel
- Validation errors (wrong columns, empty file) surface as an inline error message below the import button

---

## CSV Format

Expected columns (exactly as defined in the BOM structure reference):

| Column | Type |
|---|---|
| BOM_Reference | string |
| Product_Code | string |
| Product_Description | string |
| Level | integer (0–3) |
| Item_Code | string |
| Item_Description | string |
| Parent_Code | string (empty if Level 0) |
| Department | string |
| Item_Type | `Assembly` or `Part` |
| Unit | string (EA, M, M2, KG, L, Set, Hour) |
| Quantity | decimal |
| Wastage_Qty | decimal |
| Unit_Cost | decimal |
| Total_Cost | decimal |

---

## Tree View

- Default view after loading a BOM
- Level-0 items (top-level sub-assemblies) are roots — rendered with blue text
- Each node shows: expand/collapse arrow, Item_Code, Item_Description, and for leaf nodes (Parts): Qty + Unit, Unit Cost, Total Cost
- All Level-0 nodes start collapsed; clicking the arrow expands/collapses that branch
- Search: typing filters the tree, auto-expanding branches that contain matches, dimming non-matching nodes
- Department filter: hides entire branches that contain no items matching the selected department
- Hide labour toggle: removes all rows where Item_Code starts with `TEAM-`

## Table View

- Flat list of all rows in BOM order
- Indentation applied via `padding-left` based on `Level` (0 = 0px, 1 = 20px, 2 = 40px, 3 = 60px)
- Columns: Item_Code | Item_Description | Department | Item_Type | Qty | Unit | Unit_Cost | Total_Cost
- Same search, department filter, and hide-labour toggle apply as row visibility filters
- Rows are not clickable/expandable

---

## Cost Summary Header

Computed client-side from the loaded BOM items:

- **Total cost** = sum of `Total_Cost` for all `Item_Type = Part` rows (excludes Assembly zero-cost rollup headers)
- **Dept breakdown** = group Parts by `Department`, sum `Total_Cost`, render as pills sorted by value descending
- Pills show top 5 departments; remaining collapsed into "+ N more" pill

---

## Export CSV

- Exports the currently visible rows (after search / dept filter / hide-labour filter) in the same CSV column format as import
- Filename: `BOM_{Product_Code}_{YYYY-MM-DD}.csv`
- Triggered client-side (no server round-trip): build CSV string in JS, trigger download via blob URL

---

## Delete BOM

- "Delete BOM" button in toolbar opens an inline confirmation: "Delete FINA00031? This cannot be undone." with Confirm / Cancel
- On confirm: `DELETE /api/boms/:id` → server removes from `data/boms.json`
- Left panel updates; if no BOMs remain, right panel shows empty state with import prompt

---

## Backend

### Data file

`data/boms.json` — structure:

```json
{
  "boms": [
    {
      "id": "uuid-v4",
      "productCode": "FINA00031",
      "productDescription": "SIOC - FAW JK6 (10m) Dental Unit",
      "bomReference": "BOM-00000200",
      "importedAt": "2026-04-09T08:06:45.000Z",
      "rowCount": 624,
      "items": [ ...all CSV rows as objects... ]
    }
  ]
}
```

Initialized to `{ "boms": [] }` on server startup if missing.

### Routes — `routes/boms.js`

| Method | Path | Description |
|---|---|---|
| GET | `/api/boms` | Returns all BOMs with metadata only (no `items` array) — for left panel list |
| GET | `/api/boms/:id` | Returns single BOM with full `items` array — for viewer |
| POST | `/api/boms/import` | Multipart CSV upload → parse → upsert by productCode |
| DELETE | `/api/boms/:id` | Remove BOM from library |

CSV parsing uses the `csv-parse` npm package (sync mode, column headers from first row).

---

## Frontend Components

| File | Purpose |
|---|---|
| `src/components/inventory/InventoryImportedBOMs.jsx` | Root component — manages left panel list, selected BOM, import |
| `src/components/inventory/bom/BomLibraryPanel.jsx` | Left panel: list of BOM cards + import button |
| `src/components/inventory/bom/BomViewer.jsx` | Right panel: header + toolbar + view switcher |
| `src/components/inventory/bom/BomCostSummary.jsx` | Cost summary header with dept pills |
| `src/components/inventory/bom/BomToolbar.jsx` | Search, dept filter, toggles, export, delete |
| `src/components/inventory/bom/BomTreeView.jsx` | Collapsible tree renderer |
| `src/components/inventory/bom/BomTableView.jsx` | Flat indented table renderer |

All sub-components live under `src/components/inventory/bom/`.

---

## State Management

All state lives in `InventoryImportedBOMs.jsx`:

- `boms` — list metadata from `GET /api/boms`
- `selectedBomId` — which BOM is active
- `bomItems` — full items array for selected BOM (fetched on selection)
- `search` — string
- `deptFilter` — string (empty = all)
- `hideLabour` — boolean (default true)
- `viewMode` — `'tree'` | `'table'`
- `importError` — string | null
- `deleteConfirm` — boolean

Filtering (search + deptFilter + hideLabour) is computed as a derived value — no extra state.

---

## Empty States

- No BOMs imported yet: right panel shows centered message "No BOMs imported yet" + large import button
- BOM selected but no rows match current filter: "No items match your filter"

---

## Key Constraints (from CLAUDE.md)

- All `useState` at top of component, before any conditionals
- Helper functions (tree build, CSV export, cost rollup) at module level, not inside components
- `apiFetch` paths never prefixed with `/api`
- No IIFEs in JSX
- After adding `routes/boms.js`, server must be restarted

---

## Out of Scope

- Editing BOM rows in the UI
- Version history per BOM
- Linking BOM items to live Unleashed stock quantities
- PDF export
