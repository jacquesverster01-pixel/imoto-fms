import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import { fmtLocaleDate } from '../utils/time.js'
import { isLow, isOut, lastImportDate } from './stock/stockHelpers'
import StockSummaryBar from './stock/StockSummaryBar'
import StockTable from './stock/StockTable'
import AddEditStockModal from './stock/AddEditStockModal'
import AdjustQtyModal from './stock/AdjustQtyModal'
import ImportStockModal from './stock/ImportStockModal'

export default function Stock() {
  const { data: rawStock, loading, refetch } = useGet('/stock')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const items = rawStock || []
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort()

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(q) ||
      i.id?.toLowerCase().includes(q) ||
      i.code?.toLowerCase().includes(q)
    const matchCat = !catFilter || i.category === catFilter
    const matchLow = !lowOnly || isLow(i) || isOut(i)
    return matchSearch && matchCat && matchLow
  })

  const lowCount = items.filter(isLow).length
  const outCount = items.filter(isOut).length
  const lastImport = lastImportDate(items)

  async function handleDelete(id) {
    await apiFetch(`/stock/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1a1d3b' }}>Stock Tracker</h2>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-lg border font-medium"
            style={{ background: '#fff', color: '#6c63ff', borderColor: '#6c63ff' }}
            onClick={() => setShowImport(true)}
          >
            ↑ Import CSV
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ background: '#6c63ff' }}
            onClick={() => setShowAddModal(true)}
          >
            + Add Item
          </button>
        </div>
      </div>

      <StockSummaryBar total={items.length} lowCount={lowCount} outCount={outCount} categoryCount={categories.length} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="text-xs px-3 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: '#e4e6ea', width: 200 }}
          placeholder="Search name, ID or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="text-xs px-3 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: '#e4e6ea', color: '#4a4f7a' }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
          style={{ color: lowOnly ? '#b45309' : '#9298c4' }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Low / out of stock only{lowCount + outCount > 0 ? ` (${lowCount + outCount})` : ''}
        </label>
      </div>

      <StockTable
        loading={loading}
        items={items}
        filtered={filtered}
        deleteConfirm={deleteConfirm}
        onAdjust={setAdjustItem}
        onEdit={setEditItem}
        onDelete={handleDelete}
        onAskDelete={setDeleteConfirm}
        onImport={() => setShowImport(true)}
      />

      {items.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-xs" style={{ color: '#b0b5cc' }}>
          <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {lastImport && (
            <span>Last import: {fmtLocaleDate(lastImport)}</span>
          )}
        </div>
      )}

      {showImport && (
        <ImportStockModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch() }}
        />
      )}
      {showAddModal && (
        <AddEditStockModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); refetch() }}
        />
      )}
      {editItem && (
        <AddEditStockModal
          item={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSave={() => { setEditItem(null); refetch() }}
        />
      )}
      {adjustItem && (
        <AdjustQtyModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={() => { setAdjustItem(null); refetch() }}
        />
      )}
    </div>
  )
}
