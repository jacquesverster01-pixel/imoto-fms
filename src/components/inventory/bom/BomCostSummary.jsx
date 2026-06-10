import { useMemo, useState } from 'react'
import { computeCosts } from './bomUtils'
import { fmtLocaleDate } from '../../../utils/time.js'

const DEPT_COLORS = {
  ELE: '#3b82f6', CAB: '#8b5cf6', MEC: '#10b981',
  CLM: '#f59e0b', PLU: '#ef4444', TRM: '#06b6d4',
}

function deptColor(dept) {
  return DEPT_COLORS[dept] || '#9298c4'
}

export default function BomCostSummary({ bom, items }) {
  const { total, byDept } = useMemo(() => computeCosts(items), [items])
  const [showAll, setShowAll] = useState(false)

  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid #f0f2f5',
      background: '#f8f7ff',
    }}>
      {/* Row 1: Product name (left) + Total cost (right) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
        <div style={{
          fontWeight: 700, fontSize: 16, color: '#1a1d3b',
          minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {bom.productCode} — {bom.productDescription}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1d3b', flexShrink: 0 }}>
          R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Row 2: BOM reference + import date + row count */}
      <div style={{ fontSize: 12, color: '#9298c4', marginTop: 4 }}>
        {bom.bomReference} · Imported {fmtLocaleDate(bom.importedAt)} · {bom.rowCount} rows
      </div>

      {/* Row 3: Department cost pills */}
      {byDept.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            maxHeight: showAll ? undefined : 60,
            overflow: showAll ? 'visible' : 'hidden',
          }}>
            {byDept.map(({ dept, total: dt }) => (
              <span key={dept} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: deptColor(dept) + '20', color: deptColor(dept),
              }}>
                {dept} R{dt.toFixed(0)}
              </span>
            ))}
          </div>
          {byDept.length > 4 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                fontSize: 11, color: '#6c63ff', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 0', marginTop: 2,
              }}
            >
              {showAll ? 'show less' : `show all ${byDept.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
