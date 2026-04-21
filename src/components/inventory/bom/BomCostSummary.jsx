import { useMemo } from 'react'
import { computeCosts } from './bomUtils'

const DEPT_COLORS = {
  ELE: '#3b82f6', CAB: '#8b5cf6', MEC: '#10b981',
  CLM: '#f59e0b', PLU: '#ef4444', TRM: '#06b6d4',
}

function deptColor(dept) {
  return DEPT_COLORS[dept] || '#9298c4'
}

export default function BomCostSummary({ bom, items }) {
  const { total, byDept } = useMemo(() => computeCosts(items), [items])
  const top5 = byDept.slice(0, 5)
  const rest = byDept.length - 5

  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid #f0f2f5',
      background: '#f8f7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b' }}>
          {bom.productCode} — {bom.productDescription}
        </div>
        <div style={{ fontSize: 12, color: '#9298c4', marginTop: 4 }}>
          {bom.bomReference} · Imported {new Date(bom.importedAt).toLocaleDateString()} · {bom.rowCount} rows
        </div>
        {byDept.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {top5.map(({ dept, total: dt }) => (
              <span key={dept} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: deptColor(dept) + '20', color: deptColor(dept),
              }}>
                {dept} R{dt.toFixed(0)}
              </span>
            ))}
            {rest > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: '#f0f2f5', color: '#888',
              }}>
                +{rest} more
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Total (Parts)</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1d3b' }}>
          R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}
