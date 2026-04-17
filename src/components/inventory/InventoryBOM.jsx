import { useState, useMemo } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function InventoryBOM() {
  const [search, setSearch]               = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [bom, setBom]                     = useState(null)
  const [bomLoading, setBomLoading]       = useState(false)
  const [bomError, setBomError]           = useState(null)

  const { data, loading, error: hookError } = useGet('/unleashed/products?obsolete=false')

  const fetchError = hookError || (data?.ok === false ? data.error : null)
  const products   = data?.ok ? data.items : []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return products
    return products.filter(p =>
      (p.ProductCode || '').toLowerCase().includes(q) ||
      (p.ProductDescription || '').toLowerCase().includes(q)
    )
  }, [products, search])

  async function selectProduct(p) {
    setSelectedProduct(p)
    setBom(null)
    setBomError(null)
    setBomLoading(true)
    try {
      const res = await apiFetch(`/unleashed/bom?productGuid=${p.ProductGuid}`)
      if (res.ok) {
        setBom(res.items)
      } else {
        setBomError(res.error || 'Failed to load BOM.')
      }
    } catch (err) {
      setBomError(err.message)
    } finally {
      setBomLoading(false)
    }
  }

  const bomHeader = bom?.[0] || null
  const bomLines  = bomHeader?.BillOfMaterialsLines || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 220px)', minHeight: 400 }}>

      {/* Left: product list */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #f0f2f5' }}>
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {fetchError && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#dc2626' }}>{fetchError}</div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f2f5' }}>
                <div style={{ background: '#f0f2f5', borderRadius: 4, height: 12, width: '60%', marginBottom: 4 }} />
                <div style={{ background: '#f0f2f5', borderRadius: 4, height: 10, width: '80%' }} />
              </div>
            ))
          ) : filtered.map(p => {
            const isSelected = selectedProduct?.ProductCode === p.ProductCode
            return (
              <button
                key={p.ProductCode}
                onClick={() => selectProduct(p)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderBottom: '1px solid #f0f2f5', border: 'none',
                  background: isSelected ? '#f5f3ff' : 'transparent',
                  cursor: 'pointer',
                  display: 'block',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6c63ff' }}>{p.ProductCode}</div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>{p.ProductDescription}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: BOM detail */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!selectedProduct ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b5cc', fontSize: 13 }}>
            Select a product to view its Bill of Materials
          </div>
        ) : bomLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9298c4', fontSize: 13 }}>
            Loading BOM...
          </div>
        ) : bomError ? (
          <div style={{ padding: 20 }}>
            <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {bomError}
            </div>
          </div>
        ) : !bomHeader ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>{selectedProduct.ProductCode}</div>
            <div style={{ fontSize: 13, color: '#b0b5cc' }}>No Bill of Materials found for this product.</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: '#f8f7ff' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b', marginBottom: 8 }}>
                {selectedProduct.ProductCode} — {selectedProduct.ProductDescription}
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#555', flexWrap: 'wrap' }}>
                <span><span style={{ color: '#888' }}>BOM #: </span>{bomHeader.BillNumber || '—'}</span>
                <span><span style={{ color: '#888' }}>Duration: </span>{bomHeader.ExpectedDuration ?? '—'} hrs</span>
                <span><span style={{ color: '#888' }}>Auto-assemble: </span>{bomHeader.CanAutoAssemble ? 'Yes' : 'No'}</span>
                <span><span style={{ color: '#888' }}>Auto-disassemble: </span>{bomHeader.CanAutoDisassemble ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  <th style={styles.th}>Component Code</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>UOM</th>
                </tr>
              </thead>
              <tbody>
                {bomLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
                      No components listed.
                    </td>
                  </tr>
                ) : (
                  bomLines.map((line, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>
                        {line.Product?.ProductCode || line.ProductCode}
                      </td>
                      <td style={styles.td}>
                        {line.Product?.ProductDescription || line.LineDescription || '—'}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{line.Quantity}</td>
                      <td style={{ ...styles.td, color: '#888' }}>{line.Product?.UnitOfMeasure || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
