import { formatZAR } from '../../utils/costToComplete'

export default function CostJobDetail({ jobCost }) {
  const { components } = jobCost

  if (components.length === 0) {
    return (
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #f3f4f6', color: '#9298c4', fontSize: 13 }}>
        No outstanding components.
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 20px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4d5080', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Component Breakdown — outstanding items only
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px 6px 0', fontWeight: 600 }}>Item Code</th>
              <th style={{ textAlign: 'left', padding: '4px 8px 6px', fontWeight: 600 }}>Description</th>
              <th style={{ textAlign: 'right', padding: '4px 8px 6px', fontWeight: 600 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '4px 8px 6px', fontWeight: 600 }}>Unit Cost</th>
              <th style={{ textAlign: 'right', padding: '4px 8px 6px', fontWeight: 600 }}>Total Cost</th>
              <th style={{ textAlign: 'left', padding: '4px 0 6px 8px', fontWeight: 600 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {components.map(c => (
              <tr key={c.itemCode} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '5px 8px 5px 0', color: '#374151', fontFamily: 'monospace', fontSize: 11 }}>{c.itemCode}</td>
                <td style={{ padding: '5px 8px', color: '#374151' }}>{c.description}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>
                  {c.totalQty % 1 === 0 ? c.totalQty : c.totalQty.toFixed(2)} {c.unit}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{formatZAR(c.unitCost)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#1e1f3b', fontWeight: 500 }}>{formatZAR(c.totalCost)}</td>
                <td style={{ padding: '5px 0 5px 8px', color: '#9ca3af', fontStyle: 'italic', fontSize: 11 }}>
                  {c.status === 'no-cost' ? '⚠ No cost data' : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e5e7eb' }}>
              <td colSpan={4} style={{ padding: '8px 8px 4px 0', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: 12 }}>
                Materials total:
              </td>
              <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontWeight: 700, color: '#1e1f3b', fontSize: 13 }}>
                {formatZAR(jobCost.materialCost)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
