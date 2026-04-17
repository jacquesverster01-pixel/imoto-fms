import React, { useState, useMemo } from 'react'
import { useGet } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_TABS = ['All', 'Planned', 'InProgress', 'Completed']

const STATUS_STYLE = {
  Planned:    { color: '#555',    bg: '#f0f2f5' },
  InProgress: { color: '#1d4ed8', bg: '#dbeafe' },
  Completed:  { color: '#15803d', bg: '#dcfce7' },
}

function parseDate(val) {
  if (!val) return null
  if (typeof val === 'string' && val.startsWith('/Date(')) {
    const ms = parseInt(val.match(/\d+/)?.[0] || '0')
    return ms ? new Date(ms) : null
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function fmtDate(val) {
  const d = parseDate(val)
  if (!d) return '—'
  const s = new Date(d.getTime() + 2 * 3600 * 1000)
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`
}

function isOverdue(val) {
  const d = parseDate(val)
  return d ? d < new Date() : false
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

export default function InventoryAssemblies() {
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch]             = useState('')
  const [expandedId, setExpandedId]     = useState(null)

  const { data, loading, error: hookError, refetch } = useGet('/unleashed/assemblies')

  const fetchError = hookError || (data?.ok === false ? data.error : null)
  const rawItems   = data?.ok ? data.items : []

  const items = useMemo(() => {
    const q = search.toLowerCase()
    return rawItems.filter(a => {
      const matchStatus = statusFilter === 'All' || a.AssemblyStatus === statusFilter
      const matchSearch = !q ||
        (a.AssemblyNumber || '').toLowerCase().includes(q) ||
        (a.Product?.ProductCode || '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [rawItems, statusFilter, search])

  return (
    <div>
      {fetchError && <ErrorBanner msg={fetchError} />}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden' }}>
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: statusFilter === s ? '#6c63ff' : '#fff',
                color: statusFilter === s ? '#fff' : '#555',
              }}
            >
              {s === 'InProgress' ? 'In Progress' : s}
            </button>
          ))}
        </div>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 220 }}
          placeholder="Search number or product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
              <th style={styles.th}>Assembly #</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Assemble By</th>
              <th style={styles.th}>Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f2f5' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={styles.td}>
                      <div style={{ background: '#f0f2f5', borderRadius: 4, height: 14, width: j === 1 ? 140 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                  {fetchError ? 'Could not load data.' : 'No assemblies found.'}
                </td>
              </tr>
            ) : (
              items.map((a, i) => {
                const st         = STATUS_STYLE[a.AssemblyStatus] || STATUS_STYLE.Planned
                const overdue    = isOverdue(a.AssembleBy) && a.AssemblyStatus !== 'Completed'
                const isExpanded = expandedId === a.AssemblyNumber
                const lines      = a.AssemblyLines || []
                return (
                  <React.Fragment key={a.AssemblyNumber || i}>
                    <tr
                      onClick={() => setExpandedId(prev => prev === a.AssemblyNumber ? null : a.AssemblyNumber)}
                      style={{ borderBottom: '1px solid #f0f2f5', cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{a.AssemblyNumber}</td>
                      <td style={styles.td}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6c63ff' }}>{a.Product?.ProductCode}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>{a.Product?.ProductDescription}</div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{a.Quantity}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.pill, background: st.bg, color: st.color }}>
                          {a.AssemblyStatus === 'InProgress' ? 'In Progress' : a.AssemblyStatus}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: overdue ? '#dc2626' : '#444', fontWeight: overdue ? 600 : 400 }}>
                        {fmtDate(a.AssembleBy)}{overdue && ' ⚠'}
                      </td>
                      <td style={{ ...styles.td, fontSize: 11, color: '#9298c4' }}>{a.WarehouseCode}</td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#f8f7ff' }}>
                        <td colSpan={6} style={{ padding: '12px 16px' }}>
                          {lines.length === 0 ? (
                            <span style={{ fontSize: 12, color: '#888' }}>No assembly lines available.</span>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th style={{ ...styles.th, fontSize: 10 }}>Component</th>
                                  <th style={{ ...styles.th, fontSize: 10 }}>Qty</th>
                                  <th style={{ ...styles.th, fontSize: 10 }}>Qty On Hand</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lines.map((l, li) => (
                                  <tr key={li} style={{ borderBottom: '1px solid #ececec' }}>
                                    <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>
                                      {l.Product?.ProductCode || l.ComponentCode}
                                    </td>
                                    <td style={{ padding: '6px 12px', fontWeight: 600 }}>{l.Quantity}</td>
                                    <td style={{ padding: '6px 12px', color: '#888' }}>{l.QtyOnHand ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
          {items.length} assembl{items.length !== 1 ? 'ies' : 'y'}
          {rawItems.length !== items.length ? ` (filtered from ${rawItems.length})` : ''}
        </div>
      )}
    </div>
  )
}
