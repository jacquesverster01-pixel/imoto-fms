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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ position: 'sticky', top: 0, background: '#f8f9fb', zIndex: 1 }}>
          <tr>
            <th style={styles.th}>Item Code</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Dept</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Qty</th>
            <th style={styles.th}>Unit</th>
            <th style={styles.th}>Unit Cost</th>
            <th style={styles.th}>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...styles.td, paddingLeft: (INDENT_PX[item.level] || 0) + 12, fontFamily: 'monospace', fontSize: 12, color: '#6c63ff' }}>
                {item.itemCode}
              </td>
              <td style={styles.td}>{item.itemDescription}</td>
              <td style={{ ...styles.td, fontSize: 12, color: '#888' }}>{item.department}</td>
              <td style={styles.td}>
                <span style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: item.itemType === 'Assembly' ? '#eff6ff' : '#f0fdf4',
                  color: item.itemType === 'Assembly' ? '#3b82f6' : '#16a34a',
                }}>
                  {item.itemType}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ ...styles.td, color: '#888' }}>{item.unit}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                {item.unitCost > 0 ? `R${item.unitCost.toFixed(2)}` : '—'}
              </td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                {item.totalCost > 0 ? `R${item.totalCost.toFixed(2)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
