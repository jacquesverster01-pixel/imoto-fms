export function getReorder(item) {
  return item.reorderLevel ?? item.min ?? 0
}

export function computeStatus(item) {
  const reorder = getReorder(item)
  if ((item.qty || 0) <= 0) return 'out'
  if (reorder > 0 && item.qty <= reorder) return 'low'
  return 'ok'
}

export function isLow(item) { return computeStatus(item) === 'low' }
export function isOut(item) { return (item.qty || 0) <= 0 }

export function lastImportDate(items) {
  const dates = items.map(i => i.importedAt).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1] : null
}
