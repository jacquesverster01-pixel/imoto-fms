import { useState, useEffect } from 'react'
import { BASE } from '../../hooks/useApi'
import BomLibraryPanel from './bom/BomLibraryPanel'
import BomViewer from './bom/BomViewer'

export default function InventoryImportedBOMs() {
  const [boms, setBoms]                   = useState([])
  const [selectedBomId, setSelectedBomId] = useState(null)
  const [bomItems, setBomItems]           = useState([])
  const [selectedBom, setSelectedBom]     = useState(null)
  const [search, setSearch]               = useState('')
  const [deptFilter, setDeptFilter]       = useState('')
  const [hideLabour, setHideLabour]       = useState(true)
  const [viewMode, setViewMode]           = useState('tree')
  const [importError, setImportError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [bomLoading, setBomLoading]       = useState(false)

  async function fetchBoms() {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/boms`)
      if (!res.ok) throw new Error(`Failed to load BOMs (${res.status})`)
      const data = await res.json()
      setBoms(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[fetchBoms]', err)
      setImportError(err.message)
      setBoms([])
    } finally {
      setLoading(false)
    }
  }

  async function selectBom(id) {
    setSelectedBomId(id)
    setDeleteConfirm(false)
    setBomLoading(true)
    try {
      const res = await fetch(`${BASE}/boms/${id}`)
      if (!res.ok) throw new Error(`Failed to load BOM (${res.status})`)
      const data = await res.json()
      setSelectedBom(data)
      setBomItems(data.items || [])
    } catch (err) {
      console.error('[selectBom]', err)
      setImportError(err.message)
      setSelectedBom(null)
      setBomItems([])
    } finally {
      setBomLoading(false)
    }
  }

  async function handleImport(file) {
    setImportError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${BASE}/boms/import`, { method: 'POST', body: form })
      const data = await res.json()
      if (!data.ok) {
        setImportError(data.error || 'Import failed.')
        return
      }
      await fetchBoms()
      selectBom(data.id)
    } catch (err) {
      setImportError(err.message)
    }
  }

  async function handleDelete() {
    if (!selectedBomId) return
    try {
      const res = await fetch(`${BASE}/boms/${selectedBomId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setSelectedBomId(null)
      setSelectedBom(null)
      setBomItems([])
      setDeleteConfirm(false)
      fetchBoms()
    } catch (err) {
      console.error('[handleDelete]', err)
      setImportError(err.message)
    }
  }

  useEffect(() => { fetchBoms() }, [])

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)', minHeight: 400 }}>
      <BomLibraryPanel
        boms={boms}
        selectedBomId={selectedBomId}
        onSelect={selectBom}
        onImport={handleImport}
        importError={importError}
      />

      {!selectedBomId ? (
        <div style={{
          flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>
            {boms.length === 0 && !loading ? 'No BOMs imported yet' : 'Select a BOM from the left panel'}
          </div>
          <div style={{ fontSize: 13, color: '#b0b5cc' }}>
            Use "+ Import CSV" to upload a BOM export
          </div>
        </div>
      ) : bomLoading ? (
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9298c4', fontSize: 13 }}>
          Loading BOM...
        </div>
      ) : (
        <BomViewer
          bom={selectedBom}
          items={bomItems}
          search={search} setSearch={setSearch}
          deptFilter={deptFilter} setDeptFilter={setDeptFilter}
          hideLabour={hideLabour} setHideLabour={setHideLabour}
          viewMode={viewMode} setViewMode={setViewMode}
          deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
