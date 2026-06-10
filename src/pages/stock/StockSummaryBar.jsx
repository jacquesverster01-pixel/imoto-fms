export default function StockSummaryBar({ total, lowCount, outCount, categoryCount }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {[
        { label: 'Total Items',   value: total },
        { label: 'Low Stock',     value: lowCount, color: lowCount > 0 ? '#b45309' : '#1a1d3b' },
        { label: 'Out of Stock',  value: outCount, color: outCount > 0 ? '#dc2626' : '#1a1d3b' },
        { label: 'Categories',    value: categoryCount },
      ].map(m => (
        <div key={m.label} className="bg-white rounded-xl p-3 border" style={{ borderColor: '#e4e6ea' }}>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9298c4' }}>{m.label}</div>
          <div className="text-2xl font-bold" style={{ color: m.color || '#1a1d3b', lineHeight: 1 }}>{m.value}</div>
        </div>
      ))}
    </div>
  )
}
