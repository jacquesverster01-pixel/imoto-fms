import { exportToCsv } from './bomUtils'
import { styles } from '../../../utils/hrStyles'

export default function BomToolbar({
  bom, filteredItems, search, setSearch, deptFilter, setDeptFilter,
  hideLabour, setHideLabour, viewMode, setViewMode, deleteConfirm, setDeleteConfirm, onDelete,
}) {
  const depts = [...new Set(bom ? (bom.items || []).map(i => i.department).filter(Boolean) : [])].sort()

  return (
    <div style={{
      padding: '10px 16px', borderBottom: '1px solid #f0f2f5',
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <input
        style={{ ...styles.input, marginBottom: 0, width: 180, flex: '0 0 180px' }}
        placeholder="Search items..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <select
        value={deptFilter}
        onChange={e => setDeptFilter(e.target.value)}
        style={{
          ...styles.input, marginBottom: 0, width: 120, flex: '0 0 120px', cursor: 'pointer',
        }}
      >
        <option value="">All Depts</option>
        {depts.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={hideLabour}
          onChange={e => setHideLabour(e.target.checked)}
        />
        Hide labour
      </label>

      <div style={{
        display: 'flex', border: '1px solid #e4e6ea', borderRadius: 8, overflow: 'hidden', flexShrink: 0,
      }}>
        {['tree', 'table'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: viewMode === mode ? '#6c63ff' : '#fff',
              color: viewMode === mode ? '#fff' : '#888',
            }}
          >
            {mode === 'tree' ? 'Tree' : 'Table'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => exportToCsv(filteredItems, bom?.productCode || 'BOM')}
        style={{ ...styles.btnSecondary, fontSize: 12, padding: '6px 14px' }}
      >
        Export CSV
      </button>

      {!deleteConfirm ? (
        <button
          onClick={() => setDeleteConfirm(true)}
          style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626' }}
        >
          Delete BOM
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            Delete {bom?.productCode}?
          </span>
          <button onClick={onDelete} style={{ ...styles.btnSmall, background: '#dc2626', color: '#fff' }}>
            Confirm
          </button>
          <button onClick={() => setDeleteConfirm(false)} style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
