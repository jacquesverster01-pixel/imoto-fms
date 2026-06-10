import { useState, useMemo, useEffect, useCallback } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { fmtLocaleDate } from '../../utils/time.js'
import { styles } from '../../utils/hrStyles'
import NewJobModal from '../planner/NewJobModal'
import AssemblyJobModal from './AssemblyJobModal'

const COLS = [
  { key: 'ProductCode',        label: 'Code' },
  { key: 'ProductDescription', label: 'Description' },
  { key: 'UnitOfMeasure',      label: 'UOM' },
  { key: 'QtyOnHand',          label: 'On Hand' },
  { key: 'QtyAvailable',       label: 'Available' },
  { key: 'QtyAllocated',       label: 'Allocated' },
  { key: 'QtyOnOrder',         label: 'On Order' },
  { key: 'WarehouseCode',      label: 'Warehouse' },
]

function n(v) { return v ?? 0 }
function fmtQ(v) { return v == null ? '—' : Number(v).toFixed(0) }

function isAssemblyCode(code) {
  return typeof code === 'string' && code.length >= 4 && code[3].toUpperCase() === 'A'
}

function findMatchingBom(boms, itemCode) {
  if (!itemCode || !boms?.length) return null
  return boms.find(b => b.productCode === itemCode) || null
}

function localItemToRow(item) {
  return {
    ProductCode: item.code || item.id,
    ProductDescription: item.name,
    UOM: item.unit || 'EA',
    QtyOnHand: item.qty ?? 0,
    QtyAvailable: item.qty ?? 0,
    QtyAllocated: 0,
    QtyOnOrder: item.onOrder ?? 0,
    WarehouseCode: item.location || 'Local',
    _isLocal: true,
  }
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
      <span style={{ color: '#dc2626', fontWeight: 600 }}>Error: </span>
      <span style={{ color: '#b91c1c' }}>{msg}</span>
    </div>
  )
}

function InfoBanner({ msg }) {
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
      <span style={{ color: '#1d4ed8' }}>{msg}</span>
    </div>
  )
}

export default function InventoryStockOnHand({ onSubtitleChange }) {
  const [search, setSearch]           = useState('')
  const [warehouse, setWarehouse]     = useState('')
  const [sortDir, setSortDir]         = useState('desc')
  const [boms, setBoms]               = useState([])
  const [jobModalItem, setJobModalItem] = useState(null)
  const [dataSource, setDataSource]   = useState('unleashed')
  const [loading, setLoading]         = useState(true)
  const [rawItems, setRawItems]       = useState([])
  const [warehouses, setWarehouses]   = useState([])
  const [fetchError, setFetchError]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [assemblyJob, setAssemblyJob] = useState(null)
  const [loadingJob, setLoadingJob]   = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const unData = await apiFetch('/unleashed/stock-on-hand')
      if (unData.ok) {
        setRawItems(unData.items || [])
        setDataSource('unleashed')
        setLastUpdated(null)
        try {
          const wData = await apiFetch('/unleashed/warehouses')
          setWarehouses(wData.ok ? wData.items : [])
        } catch { setWarehouses([]) }
      } else {
        const sData = await apiFetch('/stock')
        const stockArr = Array.isArray(sData) ? sData : []
        const latest = stockArr.reduce((acc, item) => {
          if (!item.updatedAt) return acc
          return !acc || item.updatedAt > acc ? item.updatedAt : acc
        }, null)
        setLastUpdated(latest)
        setRawItems(stockArr.map(localItemToRow))
        setDataSource('local')
        setWarehouses([])
      }
      try {
        const bomsData = await apiFetch('/boms')
        setBoms(Array.isArray(bomsData) ? bomsData : [])
      } catch { setBoms([]) }
    } catch (err) {
      setFetchError(err.message)
      setRawItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!onSubtitleChange) return
    if (dataSource === 'local') {
      const dateStr = lastUpdated ? fmtLocaleDate(lastUpdated) : '—'
      onSubtitleChange(`Local stock · ${rawItems.length} items · Last updated ${dateStr}`)
    } else {
      onSubtitleChange('Live stock positions via Unleashed')
    }
  }, [dataSource, rawItems.length, lastUpdated]) // eslint-disable-line react-hooks/exhaustive-deps

  const warehouseOptions = useMemo(() => {
    if (dataSource === 'local') {
      const seen = new Set()
      return rawItems.reduce((acc, item) => {
        if (item.WarehouseCode && !seen.has(item.WarehouseCode)) {
          seen.add(item.WarehouseCode)
          acc.push({ WarehouseCode: item.WarehouseCode, WarehouseName: item.WarehouseCode })
        }
        return acc
      }, [])
    }
    return warehouses
  }, [dataSource, rawItems, warehouses])

  const items = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = rawItems.filter(item => {
      const matchSearch = !q ||
        (item.ProductCode || '').toLowerCase().includes(q) ||
        (item.ProductDescription || '').toLowerCase().includes(q)
      const matchWH = !warehouse || item.WarehouseCode === warehouse
      return matchSearch && matchWH
    })
    return filtered.sort((a, b) =>
      sortDir === 'asc' ? n(a.QtyOnHand) - n(b.QtyOnHand) : n(b.QtyOnHand) - n(a.QtyOnHand)
    )
  }, [rawItems, search, warehouse, sortDir])

  async function handleJobClick(item) {
    setLoadingJob(item.ProductCode)
    try {
      const data = await apiFetch(`/bom-flat/${item.ProductCode}`)
      setAssemblyJob({ item, components: data.components })
    } catch {
      setJobModalItem({ code: item.ProductCode, name: item.ProductDescription, matchedBom: findMatchingBom(boms, item.ProductCode) })
    } finally {
      setLoadingJob(null)
    }
  }

  return (
    <div>
      {assemblyJob && (
        <AssemblyJobModal
          item={assemblyJob.item}
          components={assemblyJob.components}
          onClose={() => setAssemblyJob(null)}
          onCreated={() => setAssemblyJob(null)}
        />
      )}
      {jobModalItem && (
        <NewJobModal
          boms={boms}
          initialMode="bom"
          initialBomId={jobModalItem.matchedBom?.id || ''}
          onClose={() => setJobModalItem(null)}
          onCreated={() => setJobModalItem(null)}
        />
      )}
      {fetchError && <ErrorBanner msg={fetchError} />}
      {dataSource === 'local' && !fetchError && !loading && (
        <InfoBanner msg="Showing local stock data. Connect Unleashed to see live ERP stock levels." />
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 220 }}
          placeholder="Search code or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...styles.input, marginBottom: 0, width: 160 }}
          value={warehouse}
          onChange={e => setWarehouse(e.target.value)}
        >
          <option value=''>All warehouses</option>
          {warehouseOptions.map(w => (
            <option key={w.WarehouseCode} value={w.WarehouseCode}>
              {w.WarehouseName || w.WarehouseCode}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          style={{ ...styles.btnSecondary, padding: '6px 12px', fontSize: 12 }}
        >
          Qty On Hand {sortDir === 'asc' ? '↑' : '↓'}
        </button>
        <button
          style={{ ...styles.btnSecondary, padding: '6px 12px', fontSize: 12, marginLeft: 'auto' }}
          onClick={loadData}
        >
          Refresh
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              {COLS.map(c => <th key={c.key} style={styles.th}>{c.label}</th>)}
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f2f5' }}>
                  {COLS.map(c => (
                    <td key={c.key} style={styles.td}>
                      <div style={{ background: '#f0f2f5', borderRadius: 4, height: 14, width: c.key === 'ProductDescription' ? 180 : 60 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                  {fetchError ? 'Could not load data.' : 'No items found.'}
                </td>
              </tr>
            ) : (
              items.map((item, i) => {
                const avail    = n(item.QtyAvailable)
                const minLevel = item.MinimumLevel
                const isLow    = avail <= 0 || (minLevel != null && avail <= minLevel)
                return (
                  <tr
                    key={item.ProductCode || i}
                    style={{
                      borderBottom: '1px solid #f0f2f5',
                      background: isLow ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{item.ProductCode}</td>
                    <td style={styles.td}>{item.ProductDescription}</td>
                    <td style={{ ...styles.td, color: '#888' }}>{item.UnitOfMeasure || item.UOM}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{fmtQ(item.QtyOnHand)}</td>
                    <td style={{ ...styles.td, color: isLow ? '#b45309' : '#16a34a', fontWeight: 600 }}>
                      {fmtQ(item.QtyAvailable)}
                    </td>
                    <td style={styles.td}>{fmtQ(item.QtyAllocated)}</td>
                    <td style={styles.td}>{fmtQ(item.QtyOnOrder)}</td>
                    <td style={{ ...styles.td, fontSize: 11, color: '#9298c4' }}>{item.WarehouseCode}</td>
                    <td style={styles.td}>
                      {isAssemblyCode(item.ProductCode) && (
                        <button
                          onClick={() => handleJobClick(item)}
                          disabled={loadingJob === item.ProductCode}
                          style={{
                            ...styles.btnSmall,
                            background: '#f5f3ff',
                            color: '#6c63ff',
                            border: '1px solid #e0deff',
                            fontSize: 11,
                            cursor: loadingJob === item.ProductCode ? 'not-allowed' : 'pointer',
                            opacity: loadingJob === item.ProductCode ? 0.4 : 1,
                          }}
                        >
                          {loadingJob === item.ProductCode ? '…' : '+ Job'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && !fetchError && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#9298c4' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
          {rawItems.length !== items.length ? ` (filtered from ${rawItems.length})` : ''}
        </div>
      )}
    </div>
  )
}
