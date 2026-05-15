import { useRef, useState } from 'react'
import { styles } from '../../utils/hrStyles'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImportStockModal({ onClose, onImported }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file.')
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/stock/import-csv', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Import failed.')
        return
      }
      setResult(data)
      onImported()
    } catch {
      setError('Network error. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 480 }}>
        <h3 style={styles.modalTitle}>Import Stock from CSV</h3>

        {result ? (
          <div>
            <div style={{ background: '#e8f8f0', border: '1px solid #16a34a', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ color: '#15803d', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Import successful</div>
              <div style={{ color: '#166534', fontSize: 13 }}>
                {result.created} new item{result.created !== 1 ? 's' : ''} created,{' '}
                {result.updated} item{result.updated !== 1 ? 's' : ''} updated
                {' '}({result.total} total in stock)
              </div>
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.btnPrimary} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div
              style={{
                border: `2px dashed ${file ? '#6c63ff' : '#e4e6ea'}`,
                borderRadius: 10,
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 16,
                background: file ? '#f5f4ff' : '#fafbff',
              }}
              onClick={() => inputRef.current?.click()}
            >
              {file ? (
                <div>
                  <div style={{ color: '#6c63ff', fontWeight: 600, fontSize: 13 }}>{file.name}</div>
                  <div style={{ color: '#9298c4', fontSize: 12, marginTop: 4 }}>{formatBytes(file.size)}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                  <div style={{ color: '#4a4f7a', fontSize: 13, fontWeight: 500 }}>Click to choose a CSV file</div>
                  <div style={{ color: '#9298c4', fontSize: 12, marginTop: 4 }}>Supports Unleashed exports and custom formats</div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            <details style={{ marginBottom: 16, fontSize: 12, color: '#4a4f7a' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6c63ff', marginBottom: 6 }}>
                Accepted column names
              </summary>
              <div style={{ marginTop: 8, lineHeight: 1.8 }}>
                <div style={{ marginBottom: 6, color: '#16a34a', fontWeight: 500 }}>Unleashed Stock On Hand export is supported directly.</div>
                <div><strong>Code (required):</strong> Product Code / ProductCode / Code</div>
                <div><strong>Description:</strong> Product Description / ProductDescription / Description / Name</div>
                <div><strong>Qty:</strong> Qty On Hand / QtyOnHand / Quantity / OnHand / StockOnHand</div>
                <div><strong>Unit:</strong> UnitOfMeasure / Unit / UOM <span style={{ color: '#9298c4' }}>(defaults to EA)</span></div>
                <div><strong>Cost:</strong> Avg Cost / AverageLandedCost / UnitCost / Cost</div>
                <div><strong>Category:</strong> ProductGroup / Category / Group <span style={{ color: '#9298c4' }}>(defaults to Imported)</span></div>
                <div><strong>Location:</strong> Warehouse / WarehouseCode / Location</div>
                <div><strong>Reorder:</strong> MinimumLevel / ReorderLevel / MinStock</div>
              </div>
            </details>

            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={onClose} disabled={loading}>Cancel</button>
              <button
                style={{ ...styles.btnPrimary, opacity: !file || loading ? 0.6 : 1 }}
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
