import React, { useState, useMemo } from 'react'
import { useGet } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

function Badge({ label, color, bg }) {
  return (
    <span style={{ ...styles.pill, background: bg, color, marginRight: 4 }}>{label}</span>
  )
}

function fmtPrice(v) {
  if (v == null) return '—'
  return Number(v).toFixed(2)
}

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

export default function InventoryProducts() {
  const [search, setSearch]             = useState('')
  const [showObsolete, setShowObsolete] = useState(false)
  const [expandedId, setExpandedId]     = useState(null)

  const { data, loading, error: hookError, refetch } = useGet('/unleashed/products?obsolete=true')

  const fetchError = hookError || (data?.ok === false ? data.error : null)
  const rawItems   = data?.ok ? data.items : []

  const items = useMemo(() => {
    const q = search.toLowerCase()
    return rawItems.filter(p => {
      if (!showObsolete && p.IsObsolete) return false
      if (!q) return true
      return (p.ProductCode || '').toLowerCase().includes(q) ||
        (p.ProductDescription || '').toLowerCase().includes(q)
    })
  }, [rawItems, search, showObsolete])

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div>
      {fetchError && <ErrorBanner msg={fetchError} />}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 240 }}
          placeholder="Search code or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#555' }}>
          <input type="checkbox" checked={showObsolete} onChange={e => setShowObsolete(e.target.checked)} />
          Show obsolete
        </label>
        <button
          style={{ ...styles.btnSecondary, padding: '6px 12px', fontSize: 12, marginLeft: 'auto' }}
          onClick={refetch}
        >
          Refresh
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb' }}>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Group</th>
              <th style={styles.th}>UOM</th>
              <th style={styles.th}>Buy Price</th>
              <th style={styles.th}>Sell Price</th>
              <th style={styles.th}>Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f2f5' }}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={styles.td}>
                      <div style={{ background: '#f0f2f5', borderRadius: 4, height: 14, width: j === 1 ? 160 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                  {fetchError ? 'Could not load data.' : 'No products found.'}
                </td>
              </tr>
            ) : (
              items.map((p, i) => {
                const isExpanded = expandedId === p.ProductCode
                const isBoth     = p.IsAssembled && p.IsComponent
                return (
                  <React.Fragment key={p.ProductCode}>
                    <tr
                      onClick={() => toggleExpand(p.ProductCode)}
                      style={{
                        borderBottom: '1px solid #f0f2f5',
                        cursor: 'pointer',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        opacity: p.IsObsolete ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{p.ProductCode}</td>
                      <td style={styles.td}>{p.ProductDescription}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: '#888' }}>{p.ProductGroup?.GroupName || '—'}</td>
                      <td style={{ ...styles.td, color: '#888' }}>{p.UnitOfMeasure}</td>
                      <td style={styles.td}>{fmtPrice(p.DefaultPurchasePrice)}</td>
                      <td style={styles.td}>{fmtPrice(p.DefaultSellPrice)}</td>
                      <td style={styles.td}>
                        {isBoth ? (
                          <><Badge label="Assembled" color="#1d4ed8" bg="#dbeafe" /><Badge label="Component" color="#15803d" bg="#dcfce7" /></>
                        ) : p.IsAssembled ? (
                          <Badge label="Assembled" color="#1d4ed8" bg="#dbeafe" />
                        ) : p.IsComponent ? (
                          <Badge label="Component" color="#15803d" bg="#dcfce7" />
                        ) : null}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#f8f7ff' }}>
                        <td colSpan={7} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, fontSize: 12, marginBottom: p.SellPriceTiers?.length ? 10 : 0 }}>
                            <div><span style={{ color: '#888' }}>Min Stock: </span><strong>{p.MinimumLevel ?? '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Max Stock: </span><strong>{p.MaximumLevel ?? '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Reorder Point: </span><strong>{p.ReorderPoint ?? '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Reorder Qty: </span><strong>{p.ReorderQuantity ?? '—'}</strong></div>
                          </div>
                          {p.SellPriceTiers?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Sell Price Tiers
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {p.SellPriceTiers.map((t, ti) => (
                                  <span key={ti} style={{ fontSize: 12, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 6, padding: '2px 8px' }}>
                                    {t.Name}: {fmtPrice(t.Price)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && !fetchError && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#9298c4' }}>
          {items.length} product{items.length !== 1 ? 's' : ''}
          {rawItems.length !== items.length ? ` (filtered from ${rawItems.length})` : ''}
        </div>
      )}
    </div>
  )
}
