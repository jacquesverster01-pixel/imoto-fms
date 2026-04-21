# BOM Import & Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Imported BOMs" 5th tab to the Inventory page that lets users upload SVD-format CSV BOMs, browse a library of imported BOMs, and view each BOM as a collapsible tree or flat table with search, department filter, hide-labour toggle, cost summary, CSV export, and delete.

**Architecture:** New `routes/boms.js` handles CRUD + CSV parsing (server-side via `csv-parse`). All BOM data persists in `data/boms.json`. Frontend is a split-panel component tree rooted at `InventoryImportedBOMs.jsx` with pure helper functions in `bomUtils.js` (no React imports — tested in Node/Jest).

**Tech Stack:** Express + multer (memory storage) + csv-parse for backend; React 18 inline styles matching existing inventory patterns for frontend; Jest (ESM) for backend/util tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `routes/boms.js` | 4 Express routes + exported `parseBomCsv` |
| Create | `src/components/inventory/bom/bomUtils.js` | Pure helpers: buildChildrenMap, buildParentMap, getVisibleAncestors, applyFilters, computeCosts, exportToCsv |
| Create | `src/components/inventory/InventoryImportedBOMs.jsx` | Root component — all state, API calls |
| Create | `src/components/inventory/bom/BomLibraryPanel.jsx` | Left panel: BOM list cards + import button |
| Create | `src/components/inventory/bom/BomViewer.jsx` | Right panel: assembles CostSummary + Toolbar + view |
| Create | `src/components/inventory/bom/BomCostSummary.jsx` | Total cost + dept pills header |
| Create | `src/components/inventory/bom/BomToolbar.jsx` | Search, filter, toggles, export, delete |
| Create | `src/components/inventory/bom/BomTreeView.jsx` | Collapsible tree renderer |
| Create | `src/components/inventory/bom/BomTableView.jsx` | Flat indented table renderer |
| Create | `tests/boms.test.js` | Jest tests for parseBomCsv + bomUtils |
| Modify | `server.js` | Add boms.json to DATA_INITS, import + mount bomsRouter |
| Modify | `src/pages/Inventory.jsx` | Add 5th tab entry + conditional render |
| Modify | `.gitignore` | Add `.superpowers/` |

---

## Task 1: Install csv-parse and update .gitignore

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.gitignore`

- [ ] **Step 1: Install csv-parse**

```bash
cd c:/Users/jacqu/Desktop/imoto-fms
npm install csv-parse
```

Expected output: `added 1 package` (or similar — no errors)

- [ ] **Step 2: Verify install**

```bash
node -e "import('csv-parse/sync').then(m => console.log('ok', Object.keys(m)))"
```

Expected: `ok [ 'parse' ]`

- [ ] **Step 3: Add .superpowers/ to .gitignore**

Open `.gitignore` and add this line at the end:

```
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: install csv-parse, ignore .superpowers/"
```

---

## Task 2: Create routes/boms.js

**Files:**
- Create: `routes/boms.js`

- [ ] **Step 1: Create the file**

Create `routes/boms.js` with this exact content:

```js
import { Router } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'

const REQUIRED_COLUMNS = [
  'BOM_Reference', 'Product_Code', 'Product_Description', 'Level',
  'Item_Code', 'Item_Description', 'Parent_Code', 'Department',
  'Item_Type', 'Unit', 'Quantity', 'Wastage_Qty', 'Unit_Cost', 'Total_Cost',
]

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

export function parseBomCsv(buffer) {
  let records
  try {
    records = parse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true })
  } catch (_) {
    throw new Error('CSV file is empty or malformed')
  }
  if (records.length === 0) throw new Error('CSV file is empty')
  const cols = Object.keys(records[0])
  const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c))
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`)
  return records.map(r => ({
    BOM_Reference: r.BOM_Reference,
    Product_Code: r.Product_Code,
    Product_Description: r.Product_Description,
    Level: parseInt(r.Level, 10),
    Item_Code: r.Item_Code,
    Item_Description: r.Item_Description,
    Parent_Code: r.Parent_Code || '',
    Department: r.Department,
    Item_Type: r.Item_Type,
    Unit: r.Unit,
    Quantity: parseFloat(r.Quantity) || 0,
    Wastage_Qty: parseFloat(r.Wastage_Qty) || 0,
    Unit_Cost: parseFloat(r.Unit_Cost) || 0,
    Total_Cost: parseFloat(r.Total_Cost) || 0,
  }))
}

export default function bomsRouter(readData, writeData) {
  const router = Router()

  // GET /boms — metadata list (no items array)
  router.get('/boms', (req, res) => {
    try {
      const { boms } = readData('boms.json')
      res.json(boms.map(({ items: _, ...rest }) => rest))
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // GET /boms/:id — full BOM with items
  router.get('/boms/:id', (req, res) => {
    try {
      const { boms } = readData('boms.json')
      const bom = boms.find(b => b.id === req.params.id)
      if (!bom) return res.status(404).json({ error: 'BOM not found' })
      res.json(bom)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // POST /boms/import — multipart CSV upload, upsert by productCode
  router.post('/boms/import', csvUpload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
      let items
      try {
        items = parseBomCsv(req.file.buffer)
      } catch (parseErr) {
        return res.status(400).json({ error: parseErr.message })
      }
      const first = items[0]
      const data = readData('boms.json')
      const existingIdx = data.boms.findIndex(b => b.productCode === first.Product_Code)
      const id = existingIdx !== -1 ? data.boms[existingIdx].id : crypto.randomUUID()
      const newBom = {
        id,
        productCode: first.Product_Code,
        productDescription: first.Product_Description,
        bomReference: first.BOM_Reference,
        importedAt: new Date().toISOString(),
        rowCount: items.length,
        items,
      }
      if (existingIdx !== -1) {
        data.boms[existingIdx] = newBom
      } else {
        data.boms.push(newBom)
      }
      writeData('boms.json', data)
      const { items: _, ...meta } = newBom
      res.json(meta)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // DELETE /boms/:id
  router.delete('/boms/:id', (req, res) => {
    try {
      const data = readData('boms.json')
      const idx = data.boms.findIndex(b => b.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'BOM not found' })
      data.boms.splice(idx, 1)
      writeData('boms.json', data)
      res.json({ success: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
```

- [ ] **Step 2: Commit**

```bash
git add routes/boms.js
git commit -m "feat: add boms routes (GET list, GET by id, POST import, DELETE)"
```

---

## Task 3: Wire routes/boms.js into server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add boms.json to DATA_INITS**

In `server.js`, find the `DATA_INITS` object (around line 47). Add `'boms.json'` entry before the closing `}`:

Old block ends with:
```js
  'settings.json':               {},
}
```

Change to:
```js
  'settings.json':               {},
  'boms.json':                   { boms: [] },
}
```

- [ ] **Step 2: Add import at top of server.js**

Find the last `import` line in the router imports block (around line 20, currently `import dashboardRouter from './routes/dashboard.js'`). Add after it:

```js
import bomsRouter        from './routes/boms.js'
```

- [ ] **Step 3: Mount the router**

Find the line `app.use('/api/unleashed', unleashedRouter)` (near line 175). Add before it:

```js
app.use('/api', bomsRouter(readData, writeData))
```

- [ ] **Step 4: Restart server and smoke-test**

```bash
# Stop any running server (Ctrl+C), then:
node server.js &
curl http://localhost:3001/api/boms
```

Expected: `[]`

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: wire bomsRouter into server, initialize boms.json"
```

---

## Task 4: Create bomUtils.js

**Files:**
- Create: `src/components/inventory/bom/bomUtils.js`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "c:/Users/jacqu/Desktop/imoto-fms/src/components/inventory/bom"
```

Create `src/components/inventory/bom/bomUtils.js`:

```js
export function buildChildrenMap(items) {
  const map = new Map()
  for (const item of items) {
    const parent = item.Parent_Code || ''
    if (!map.has(parent)) map.set(parent, [])
    map.get(parent).push(item)
  }
  return map
}

export function buildParentMap(items) {
  const map = new Map()
  for (const item of items) {
    map.set(item.Item_Code, item.Parent_Code || '')
  }
  return map
}

export function getVisibleAncestors(matchingCodes, parentMap) {
  const ancestors = new Set()
  for (const code of matchingCodes) {
    let current = parentMap.get(code)
    while (current) {
      ancestors.add(current)
      current = parentMap.get(current)
    }
  }
  return ancestors
}

export function applyFilters(items, { search, deptFilter, hideLabour }) {
  return items.filter(item => {
    if (hideLabour && item.Item_Code.startsWith('TEAM-')) return false
    if (deptFilter && item.Department !== deptFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !item.Item_Code.toLowerCase().includes(q) &&
        !item.Item_Description.toLowerCase().includes(q)
      ) return false
    }
    return true
  })
}

export function computeCosts(items) {
  const parts = items.filter(i => i.Item_Type === 'Part')
  const total = parts.reduce((sum, i) => sum + (parseFloat(i.Total_Cost) || 0), 0)
  const deptMap = {}
  for (const item of parts) {
    const dept = item.Department || 'Unknown'
    deptMap[dept] = (deptMap[dept] || 0) + (parseFloat(item.Total_Cost) || 0)
  }
  const byDept = Object.entries(deptMap)
    .map(([dept, total]) => ({ dept, total }))
    .sort((a, b) => b.total - a.total)
  return { total, byDept }
}

const CSV_HEADERS = [
  'BOM_Reference', 'Product_Code', 'Product_Description', 'Level', 'Item_Code',
  'Item_Description', 'Parent_Code', 'Department', 'Item_Type', 'Unit',
  'Quantity', 'Wastage_Qty', 'Unit_Cost', 'Total_Cost',
]

export function exportToCsv(items, productCode) {
  const rows = items.map(item =>
    CSV_HEADERS.map(h => {
      const val = String(item[h] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(',')
  )
  const csv = [CSV_HEADERS.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `BOM_${productCode}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/bomUtils.js
git commit -m "feat: add bomUtils pure helpers (filters, tree, costs, export)"
```

---

## Task 5: Write and run tests

**Files:**
- Create: `tests/boms.test.js`

- [ ] **Step 1: Create the test file**

Create `tests/boms.test.js`:

```js
import { describe, test, expect } from '@jest/globals'
import { parseBomCsv } from '../routes/boms.js'
import {
  applyFilters,
  computeCosts,
  buildParentMap,
  getVisibleAncestors,
} from '../src/components/inventory/bom/bomUtils.js'

const VALID_CSV = `BOM_Reference,Product_Code,Product_Description,Level,Item_Code,Item_Description,Parent_Code,Department,Item_Type,Unit,Quantity,Wastage_Qty,Unit_Cost,Total_Cost
BOM-001,FINA00031,Test Product,0,SUBA00001,Top Assembly,,SUB,Assembly,EA,1,0,0,0
BOM-001,FINA00031,Test Product,1,RAWP00001,Steel Tube,SUBA00001,RAW,Part,M,10,0,50,500
BOM-001,FINA00031,Test Product,1,TEAM-WLDA00001,Welding Labour,SUBA00001,TEAM-WLD,Assembly,Hour,2,0,0,0`

describe('parseBomCsv', () => {
  test('parses valid CSV into items array with correct types', () => {
    const items = parseBomCsv(Buffer.from(VALID_CSV))
    expect(items).toHaveLength(3)
    expect(items[0].Item_Code).toBe('SUBA00001')
    expect(items[0].Level).toBe(0)
    expect(items[1].Quantity).toBe(10)
    expect(items[1].Total_Cost).toBe(500)
    expect(items[1].Parent_Code).toBe('SUBA00001')
    expect(items[0].Parent_Code).toBe('')
  })

  test('throws on empty buffer', () => {
    expect(() => parseBomCsv(Buffer.from(''))).toThrow()
  })

  test('throws when required columns are missing', () => {
    const bad = 'Code,Description\nABC,Test'
    expect(() => parseBomCsv(Buffer.from(bad))).toThrow('Missing columns')
  })
})

describe('applyFilters', () => {
  const items = [
    { Item_Code: 'SUBA00001', Item_Description: 'Top Assembly', Department: 'SUB', Item_Type: 'Assembly' },
    { Item_Code: 'RAWP00001', Item_Description: 'Steel Tube', Department: 'RAW', Item_Type: 'Part' },
    { Item_Code: 'TEAM-WLDA00001', Item_Description: 'Welding Labour', Department: 'TEAM-WLD', Item_Type: 'Assembly' },
  ]

  test('no filter returns all items', () => {
    expect(applyFilters(items, { search: '', deptFilter: '', hideLabour: false })).toHaveLength(3)
  })

  test('search filters by Item_Code', () => {
    const result = applyFilters(items, { search: 'RAWP', deptFilter: '', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].Item_Code).toBe('RAWP00001')
  })

  test('search filters by Item_Description (case-insensitive)', () => {
    const result = applyFilters(items, { search: 'steel', deptFilter: '', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].Item_Code).toBe('RAWP00001')
  })

  test('deptFilter keeps only matching department', () => {
    const result = applyFilters(items, { search: '', deptFilter: 'RAW', hideLabour: false })
    expect(result).toHaveLength(1)
    expect(result[0].Department).toBe('RAW')
  })

  test('hideLabour removes TEAM- items', () => {
    const result = applyFilters(items, { search: '', deptFilter: '', hideLabour: true })
    expect(result.every(i => !i.Item_Code.startsWith('TEAM-'))).toBe(true)
    expect(result).toHaveLength(2)
  })
})

describe('computeCosts', () => {
  const items = [
    { Item_Type: 'Assembly', Department: 'SUB', Total_Cost: 0 },
    { Item_Type: 'Part', Department: 'ELE', Total_Cost: 500 },
    { Item_Type: 'Part', Department: 'ELE', Total_Cost: 200 },
    { Item_Type: 'Part', Department: 'PLU', Total_Cost: 100 },
  ]

  test('total sums only Part items, excludes Assembly', () => {
    expect(computeCosts(items).total).toBe(800)
  })

  test('byDept groups and sorts descending by total', () => {
    const { byDept } = computeCosts(items)
    expect(byDept[0]).toEqual({ dept: 'ELE', total: 700 })
    expect(byDept[1]).toEqual({ dept: 'PLU', total: 100 })
  })
})

describe('getVisibleAncestors', () => {
  test('returns all ancestors up to root', () => {
    const parentMap = new Map([
      ['CHILD', 'PARENT'],
      ['PARENT', 'ROOT'],
      ['ROOT', ''],
    ])
    const ancestors = getVisibleAncestors(new Set(['CHILD']), parentMap)
    expect(ancestors.has('PARENT')).toBe(true)
    expect(ancestors.has('ROOT')).toBe(true)
    expect(ancestors.has('CHILD')).toBe(false)
  })

  test('returns empty set when matchingCodes is empty', () => {
    const parentMap = new Map([['A', 'B']])
    expect(getVisibleAncestors(new Set(), parentMap).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- tests/boms.test.js
```

Expected: all 11 tests pass. If `csv-parse` import fails, verify `npm install csv-parse` ran successfully.

- [ ] **Step 3: Commit**

```bash
git add tests/boms.test.js
git commit -m "test: add boms route and bomUtils tests"
```

---

## Task 6: Create InventoryImportedBOMs.jsx

**Files:**
- Create: `src/components/inventory/InventoryImportedBOMs.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useEffect, useMemo } from 'react'
import { BASE } from '../../hooks/useApi'
import BomLibraryPanel from './bom/BomLibraryPanel'
import BomViewer from './bom/BomViewer'

export default function InventoryImportedBOMs() {
  const [boms, setBoms] = useState([])
  const [selectedBomId, setSelectedBomId] = useState(null)
  const [bomItems, setBomItems] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [hideLabour, setHideLabour] = useState(true)
  const [viewMode, setViewMode] = useState('tree')
  const [importError, setImportError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bomLoading, setBomLoading] = useState(false)

  useEffect(() => { fetchBoms() }, [])

  async function fetchBoms() {
    setLoading(true)
    try {
      const data = await fetch(`${BASE}/boms`).then(r => r.json())
      setBoms(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[InventoryImportedBOMs] fetchBoms', err)
    } finally {
      setLoading(false)
    }
  }

  async function selectBom(id) {
    setSelectedBomId(id)
    setBomItems([])
    setSearch('')
    setDeptFilter('')
    setBomLoading(true)
    try {
      const data = await fetch(`${BASE}/boms/${id}`).then(r => r.json())
      setBomItems(data.items || [])
    } catch (err) {
      console.error('[InventoryImportedBOMs] selectBom', err)
    } finally {
      setBomLoading(false)
    }
  }

  async function handleImport(file) {
    setImportError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${BASE}/boms/import`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setImportError(json.error || 'Import failed'); return }
      await fetchBoms()
      selectBom(json.id)
    } catch (err) {
      setImportError(err.message)
    }
  }

  async function handleDelete() {
    if (!selectedBomId) return
    try {
      await fetch(`${BASE}/boms/${selectedBomId}`, { method: 'DELETE' })
      setBoms(prev => prev.filter(b => b.id !== selectedBomId))
      setSelectedBomId(null)
      setBomItems([])
    } catch (err) {
      console.error('[InventoryImportedBOMs] handleDelete', err)
    } finally {
      setDeleteConfirm(false)
    }
  }

  const selectedBom = boms.find(b => b.id === selectedBomId) || null
  const departments = useMemo(
    () => [...new Set(bomItems.map(i => i.Department).filter(Boolean))].sort(),
    [bomItems]
  )

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 220px)', minHeight: 400,
      background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden',
    }}>
      <BomLibraryPanel
        boms={boms}
        loading={loading}
        selectedBomId={selectedBomId}
        onSelect={selectBom}
        onImport={handleImport}
        importError={importError}
      />
      <BomViewer
        bom={selectedBom}
        items={bomItems}
        loading={bomLoading}
        search={search}
        onSearch={setSearch}
        deptFilter={deptFilter}
        onDeptFilter={setDeptFilter}
        departments={departments}
        hideLabour={hideLabour}
        onHideLabour={setHideLabour}
        viewMode={viewMode}
        onViewMode={setViewMode}
        deleteConfirm={deleteConfirm}
        onDeleteRequest={() => setDeleteConfirm(true)}
        onDeleteCancel={() => setDeleteConfirm(false)}
        onDeleteConfirm={handleDelete}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/InventoryImportedBOMs.jsx
git commit -m "feat: add InventoryImportedBOMs root component"
```

---

## Task 7: Create BomLibraryPanel.jsx

**Files:**
- Create: `src/components/inventory/bom/BomLibraryPanel.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useRef } from 'react'

export default function BomLibraryPanel({ boms, loading, selectedBomId, onSelect, onImport, importError }) {
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) { onImport(file); e.target.value = '' }
  }

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #e4e6ea', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e4e6ea' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', padding: '7px 0', background: '#6c63ff', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Import CSV
        </button>
        {importError && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, lineHeight: 1.4 }}>{importError}</div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', paddingTop: 20 }}>Loading…</div>
        ) : boms.length === 0 ? (
          <div style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', paddingTop: 20, lineHeight: 1.6 }}>
            No BOMs imported yet.<br />Click "+ Import CSV" to start.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {boms.length} BOM{boms.length !== 1 ? 's' : ''}
            </div>
            {boms.map(bom => {
              const isSelected = bom.id === selectedBomId
              return (
                <button
                  key={bom.id}
                  onClick={() => onSelect(bom.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: isSelected ? '#f5f3ff' : 'transparent',
                    border: 'none', borderLeft: `3px solid ${isSelected ? '#6c63ff' : 'transparent'}`,
                    borderRadius: 6, padding: '8px 10px', marginBottom: 4, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#6c63ff' : '#1a1d3b', fontFamily: 'monospace' }}>
                    {bom.productCode}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bom.productDescription}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#9298c4' }}>{bom.bomReference}</span>
                    <span style={{ fontSize: 10, color: '#9298c4' }}>{bom.rowCount} rows</span>
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomLibraryPanel.jsx
git commit -m "feat: add BomLibraryPanel left panel component"
```

---

## Task 8: Create BomCostSummary.jsx

**Files:**
- Create: `src/components/inventory/bom/BomCostSummary.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useMemo } from 'react'
import { computeCosts } from './bomUtils'

function fmtAmt(val) {
  if (val >= 1000000) return `R ${(val / 1000000).toFixed(1)}m`
  if (val >= 1000) return `R ${(val / 1000).toFixed(0)}k`
  return `R ${val.toFixed(0)}`
}

export default function BomCostSummary({ bom, items }) {
  const { total, byDept } = useMemo(() => computeCosts(items), [items])
  const topDepts = byDept.slice(0, 5)
  const remaining = byDept.length - 5

  const importDate = new Date(bom.importedAt).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e6ea', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d3b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bom.productCode} — {bom.productDescription}
          </div>
          <div style={{ fontSize: 11, color: '#9298c4', marginTop: 2 }}>
            {bom.bomReference} · Imported {importDate} · {bom.rowCount} items
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>
            R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: '#9298c4' }}>Total BOM cost</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {topDepts.map(({ dept, total: dt }) => (
          <span key={dept} style={{ padding: '2px 8px', background: '#f0f2f5', borderRadius: 12, fontSize: 11, color: '#555' }}>
            {dept} {fmtAmt(dt)}
          </span>
        ))}
        {remaining > 0 && (
          <span style={{ padding: '2px 8px', background: '#f0f2f5', borderRadius: 12, fontSize: 11, color: '#9298c4' }}>
            +{remaining} more
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomCostSummary.jsx
git commit -m "feat: add BomCostSummary header with dept cost pills"
```

---

## Task 9: Create BomToolbar.jsx

**Files:**
- Create: `src/components/inventory/bom/BomToolbar.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { exportToCsv } from './bomUtils'

export default function BomToolbar({
  bom, filteredItems, search, onSearch, deptFilter, onDeptFilter, departments,
  hideLabour, onHideLabour, viewMode, onViewMode,
  deleteConfirm, onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}) {
  return (
    <div style={{
      padding: '8px 12px', borderBottom: '1px solid #e4e6ea',
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      background: '#fff',
    }}>
      <input
        style={{
          padding: '5px 10px', border: '1px solid #e4e6ea', borderRadius: 6,
          fontSize: 12, width: 190, outline: 'none', fontFamily: 'inherit',
        }}
        placeholder="Search code or description…"
        value={search}
        onChange={e => onSearch(e.target.value)}
      />

      <select
        style={{
          padding: '5px 8px', border: '1px solid #e4e6ea', borderRadius: 6,
          fontSize: 12, background: '#fff', color: deptFilter ? '#1a1d3b' : '#9298c4',
        }}
        value={deptFilter}
        onChange={e => onDeptFilter(e.target.value)}
      >
        <option value="">All departments</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={hideLabour}
          onChange={e => onHideLabour(e.target.checked)}
          style={{ accentColor: '#6c63ff', cursor: 'pointer' }}
        />
        Hide labour
      </label>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', border: '1px solid #e4e6ea', borderRadius: 6, overflow: 'hidden' }}>
        {['tree', 'table'].map(mode => (
          <button
            key={mode}
            onClick={() => onViewMode(mode)}
            style={{
              padding: '5px 12px', border: 'none', fontSize: 12, cursor: 'pointer',
              background: viewMode === mode ? '#6c63ff' : '#fff',
              color: viewMode === mode ? '#fff' : '#888',
              textTransform: 'capitalize',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <button
        onClick={() => exportToCsv(filteredItems, bom.productCode)}
        style={{ padding: '5px 10px', background: '#fff', border: '1px solid #e4e6ea', borderRadius: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}
      >
        ↓ Export CSV
      </button>

      {deleteConfirm ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Delete {bom.productCode}?</span>
          <button
            onClick={onDeleteConfirm}
            style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Confirm
          </button>
          <button
            onClick={onDeleteCancel}
            style={{ padding: '4px 10px', background: '#fff', border: '1px solid #e4e6ea', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={onDeleteRequest}
          style={{ padding: '5px 10px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#dc2626', cursor: 'pointer' }}
        >
          Delete BOM
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomToolbar.jsx
git commit -m "feat: add BomToolbar with search, filter, toggles, export, delete"
```

---

## Task 10: Create BomTreeView.jsx

**Files:**
- Create: `src/components/inventory/bom/BomTreeView.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useMemo } from 'react'
import { buildChildrenMap, buildParentMap, getVisibleAncestors, applyFilters } from './bomUtils'

function TreeNode({ item, childrenMap, matchingCodes, visibleAncestors, expandedCodes, onToggle }) {
  const children = childrenMap.get(item.Item_Code) || []
  const hasChildren = children.length > 0
  const isFiltered = matchingCodes.size > 0
  const isMatch = matchingCodes.has(item.Item_Code)
  const isAncestor = visibleAncestors.has(item.Item_Code)

  if (isFiltered && !isMatch && !isAncestor) return null

  const isExpanded = (isFiltered && isAncestor) || expandedCodes.has(item.Item_Code)
  const isRoot = item.Level === 0
  const isDimmed = isFiltered && isAncestor && !isMatch

  return (
    <div>
      <div
        onClick={hasChildren ? () => onToggle(item.Item_Code) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 0', paddingLeft: item.Level * 20,
          cursor: hasChildren ? 'pointer' : 'default',
          opacity: isDimmed ? 0.4 : 1,
        }}
      >
        <span style={{ color: '#b0b5cc', width: 14, flexShrink: 0, fontSize: 10 }}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: 12, flexShrink: 0,
          color: isRoot ? '#6c63ff' : '#555',
          fontWeight: isRoot ? 700 : 400,
        }}>
          {item.Item_Code}
        </span>
        <span style={{ fontSize: 12, color: '#777', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.Item_Description}
        </span>
        {item.Item_Type === 'Part' && (
          <>
            <span style={{ fontSize: 11, color: '#9298c4', whiteSpace: 'nowrap', marginLeft: 4 }}>
              {item.Quantity} {item.Unit}
            </span>
            <span style={{ fontSize: 11, color: '#b0b5cc', whiteSpace: 'nowrap', minWidth: 72, textAlign: 'right' }}>
              R {parseFloat(item.Unit_Cost || 0).toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: '#1a1d3b', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
              R {parseFloat(item.Total_Cost || 0).toFixed(2)}
            </span>
          </>
        )}
      </div>
      {isExpanded && children.map(child => (
        <TreeNode
          key={child.Item_Code}
          item={child}
          childrenMap={childrenMap}
          matchingCodes={matchingCodes}
          visibleAncestors={visibleAncestors}
          expandedCodes={expandedCodes}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

export default function BomTreeView({ items, search, deptFilter, hideLabour }) {
  const [expandedCodes, setExpandedCodes] = useState(new Set())

  const childrenMap = useMemo(() => buildChildrenMap(items), [items])
  const parentMap = useMemo(() => buildParentMap(items), [items])
  const roots = useMemo(() => items.filter(i => !i.Parent_Code), [items])

  const filteredItems = useMemo(
    () => applyFilters(items, { search, deptFilter, hideLabour }),
    [items, search, deptFilter, hideLabour]
  )
  const matchingCodes = useMemo(() => new Set(filteredItems.map(i => i.Item_Code)), [filteredItems])
  const visibleAncestors = useMemo(() => getVisibleAncestors(matchingCodes, parentMap), [matchingCodes, parentMap])

  function onToggle(code) {
    setExpandedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (filteredItems.length === 0 && items.length > 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b5cc', fontSize: 13 }}>
        No items match your filter
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
      {roots.map(root => (
        <div key={root.Item_Code} style={{ borderBottom: '1px solid #f0f2f5', paddingBottom: 4, marginBottom: 4 }}>
          <TreeNode
            item={root}
            childrenMap={childrenMap}
            matchingCodes={matchingCodes}
            visibleAncestors={visibleAncestors}
            expandedCodes={expandedCodes}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomTreeView.jsx
git commit -m "feat: add BomTreeView collapsible tree with filter + ancestor expansion"
```

---

## Task 11: Create BomTableView.jsx

**Files:**
- Create: `src/components/inventory/bom/BomTableView.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useMemo } from 'react'
import { applyFilters } from './bomUtils'
import { styles } from '../../../utils/hrStyles'

const INDENT_PX = [0, 20, 40, 60]

export default function BomTableView({ items, search, deptFilter, hideLabour }) {
  const filtered = useMemo(
    () => applyFilters(items, { search, deptFilter, hideLabour }),
    [items, search, deptFilter, hideLabour]
  )

  if (filtered.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b5cc', fontSize: 13 }}>
        No items match your filter
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, background: '#f8f9fb', zIndex: 1 }}>
          <tr>
            <th style={styles.th}>Code</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Dept</th>
            <th style={styles.th}>Type</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Qty</th>
            <th style={styles.th}>Unit</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Unit Cost</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr key={`${item.Item_Code}-${i}`} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{
                ...styles.td,
                paddingLeft: (INDENT_PX[item.Level] || 0) + 12,
                fontFamily: 'monospace', fontSize: 11,
                color: item.Level === 0 ? '#6c63ff' : '#444',
                fontWeight: item.Level === 0 ? 700 : 400,
              }}>
                {item.Item_Code}
              </td>
              <td style={{ ...styles.td, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.Item_Description}
              </td>
              <td style={{ ...styles.td, color: '#666', fontSize: 11 }}>{item.Department}</td>
              <td style={styles.td}>
                <span style={{
                  padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: item.Item_Type === 'Assembly' ? '#ede9fe' : '#dcfce7',
                  color: item.Item_Type === 'Assembly' ? '#7c3aed' : '#16a34a',
                }}>
                  {item.Item_Type}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{item.Quantity}</td>
              <td style={{ ...styles.td, color: '#888', fontSize: 11 }}>{item.Unit}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#888' }}>
                R {parseFloat(item.Unit_Cost || 0).toFixed(2)}
              </td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                R {parseFloat(item.Total_Cost || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomTableView.jsx
git commit -m "feat: add BomTableView flat indented table"
```

---

## Task 12: Create BomViewer.jsx

**Files:**
- Create: `src/components/inventory/bom/BomViewer.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useMemo } from 'react'
import { applyFilters } from './bomUtils'
import BomCostSummary from './BomCostSummary'
import BomToolbar from './BomToolbar'
import BomTreeView from './BomTreeView'
import BomTableView from './BomTableView'

export default function BomViewer({
  bom, items, loading,
  search, onSearch, deptFilter, onDeptFilter, departments,
  hideLabour, onHideLabour, viewMode, onViewMode,
  deleteConfirm, onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}) {
  const filteredItems = useMemo(
    () => applyFilters(items, { search, deptFilter, hideLabour }),
    [items, search, deptFilter, hideLabour]
  )

  if (!bom) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#b0b5cc' }}>
        <div style={{ fontSize: 36 }}>📄</div>
        <div style={{ fontSize: 13 }}>Select a BOM from the list, or import a CSV file</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9298c4', fontSize: 13 }}>
        Loading BOM…
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <BomCostSummary bom={bom} items={items} />
      <BomToolbar
        bom={bom}
        filteredItems={filteredItems}
        search={search}
        onSearch={onSearch}
        deptFilter={deptFilter}
        onDeptFilter={onDeptFilter}
        departments={departments}
        hideLabour={hideLabour}
        onHideLabour={onHideLabour}
        viewMode={viewMode}
        onViewMode={onViewMode}
        deleteConfirm={deleteConfirm}
        onDeleteRequest={onDeleteRequest}
        onDeleteCancel={onDeleteCancel}
        onDeleteConfirm={onDeleteConfirm}
      />
      {viewMode === 'tree'
        ? <BomTreeView items={items} search={search} deptFilter={deptFilter} hideLabour={hideLabour} />
        : <BomTableView items={items} search={search} deptFilter={deptFilter} hideLabour={hideLabour} />
      }
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/bom/BomViewer.jsx
git commit -m "feat: add BomViewer right panel assembler"
```

---

## Task 13: Wire into Inventory.jsx and final checks

**Files:**
- Modify: `src/pages/Inventory.jsx`

- [ ] **Step 1: Add import to Inventory.jsx**

Open `src/pages/Inventory.jsx`. After the existing imports, add:

```js
import InventoryImportedBOMs from '../components/inventory/InventoryImportedBOMs'
```

- [ ] **Step 2: Add the 5th tab to the TABS array**

Find the `TABS` array:

```js
const TABS = [
  { id: 'stock',      label: 'Stock On Hand' },
  { id: 'products',   label: 'Products' },
  { id: 'bom',        label: 'Bill of Materials' },
  { id: 'assemblies', label: 'Assemblies' },
]
```

Change to:

```js
const TABS = [
  { id: 'stock',       label: 'Stock On Hand' },
  { id: 'products',    label: 'Products' },
  { id: 'bom',         label: 'Bill of Materials' },
  { id: 'assemblies',  label: 'Assemblies' },
  { id: 'importedboms', label: 'Imported BOMs' },
]
```

- [ ] **Step 3: Add the render line**

Find the four render lines at the bottom of the component:

```jsx
{activeTab === 'stock'      && <InventoryStockOnHand />}
{activeTab === 'products'   && <InventoryProducts />}
{activeTab === 'bom'        && <InventoryBOM />}
{activeTab === 'assemblies' && <InventoryAssemblies />}
```

Add after them:

```jsx
{activeTab === 'importedboms' && <InventoryImportedBOMs />}
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (including the new boms.test.js).

- [ ] **Step 5: Start the dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`, navigate to Inventory → "Imported BOMs" tab. Verify:
- Left panel shows "No BOMs imported yet"
- Right panel shows empty state with document icon
- Click "+ Import CSV", select your `BOM_FINA00031_stock_import.csv`
- BOM appears in left panel with product code, description, row count
- Right panel shows cost summary header with total and dept pills
- Tree view shows Level-0 assemblies collapsed, click ▶ to expand
- Switch to Table view — all rows visible with indentation
- Search "steel" — tree auto-expands to matching rows; table filters inline
- Toggle "Hide labour" — TEAM-* rows disappear
- Filter by department from dropdown — only that dept visible
- Click "↓ Export CSV" — CSV downloads with current filter applied
- Click "Delete BOM" → "Confirm" → BOM removed, left panel empties

- [ ] **Step 6: Final commit**

```bash
git add src/pages/Inventory.jsx
git commit -m "feat: wire InventoryImportedBOMs into Inventory tab"
```
