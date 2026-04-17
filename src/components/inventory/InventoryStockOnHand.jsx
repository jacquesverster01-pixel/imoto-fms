import { useState, useMemo } from 'react'
import { useGet } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import JobCreateModal from '../jobs/JobCreateModal'

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

function ErrorBanner({ msg }) {
  return (
    <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
      <span style={{ color: '#dc2626', fontWeight: 600 }}>Error: </span>
      <span style={{ color: '#b91c1c' }}>{msg}</span>
      {msg.includes('not configured') && (
        <div style={{ marginTop: 4, color: '#b91c1c' }}>
          Add UNLEASHED_API_ID and UNLEASHED_API_SECRET to .env and restart the server.
        </div>
      )}
    </div>
  )
}

export default function InventoryStockOnHand() {
  const [search, setSearch]       = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [sortDir, setSortDir]     = useState('desc')
  const [pushProduct, setPushProduct] = useState(null)

  const { data, loading, error: hookError, refetch } = useGet('/unleashed/stock-on-hand')
  const { data: wData } = useGet('/unleashed/warehouses')

  const fetchError = hookError || (data?.ok === false ? data.error : null)
  const rawItems   = data?.ok ? data.items : []
  const warehouses = wData?.ok ? wData.items : []

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

  return (
    <div>
      {pushProduct && (
        <JobCreateModal
          product={pushProduct}
          onClose={() => setPushProduct(null)}
          onCreated={() => setPushProduct(null)}
        />
      )}
      {fetchError && <ErrorBanner msg={fetchError} />}

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
          {warehouses.map(w => (
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
          onClick={refetch}
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
                    key={i}
                    style={{
                      borderBottom: '1px solid #f0f2f5',
                      background: isLow ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{item.ProductCode}</td>
                    <td style={styles.td}>{item.ProductDescription}</td>
                    <td style={{ ...styles.td, color: '#888' }}>{item.UnitOfMeasure}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{fmtQ(item.QtyOnHand)}</td>
                    <td style={{ ...styles.td, color: isLow ? '#b45309' : '#16a34a', fontWeight: 600 }}>
                      {fmtQ(item.QtyAvailable)}
                    </td>
                    <td style={styles.td}>{fmtQ(item.QtyAllocated)}</td>
                    <td style={styles.td}>{fmtQ(item.QtyOnOrder)}</td>
                    <td style={{ ...styles.td, fontSize: 11, color: '#9298c4' }}>{item.WarehouseCode}</td>
                    <td style={styles.td}>
                      <button
                        disabled={n(item.QtyAvailable) <= 0}
                        onClick={() => setPushProduct({
                          productCode: item.ProductCode,
                          productDescription: item.ProductDescription,
                          guid: item.ProductGuid,
                          qtyAvailable: item.QtyAvailable,
                        })}
                        style={{
                          ...styles.btnSmall,
                          background: n(item.QtyAvailable) > 0 ? '#f5f3ff' : '#f0f2f5',
                          color: n(item.QtyAvailable) > 0 ? '#6c63ff' : '#bbb',
                          border: `1px solid ${n(item.QtyAvailable) > 0 ? '#e0deff' : '#e4e6ea'}`,
                          fontSize: 11,
                          cursor: n(item.QtyAvailable) > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        + Job
                      </button>
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
