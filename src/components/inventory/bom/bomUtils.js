export function buildChildrenMap(items) {
  const map = new Map()
  for (const item of items) {
    const key = item.parentCode || '__root__'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

export function buildParentMap(items) {
  const map = new Map()
  for (const item of items) {
    if (item.parentCode) map.set(item.itemCode, item.parentCode)
  }
  return map
}

export function getVisibleAncestors(matchingCodes, parentMap) {
  const ancestors = new Set()
  for (const code of matchingCodes) {
    let cur = parentMap.get(code)
    while (cur) {
      ancestors.add(cur)
      cur = parentMap.get(cur)
    }
  }
  return ancestors
}

export function applyFilters(items, { search, deptFilter, hideLabour }) {
  return items.filter(item => {
    if (hideLabour && item.itemCode.startsWith('TEAM-')) return false
    if (deptFilter && item.department !== deptFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !item.itemCode.toLowerCase().includes(q) &&
        !item.itemDescription.toLowerCase().includes(q)
      ) return false
    }
    return true
  })
}

export function computeCosts(items) {
  const parts = items.filter(i => i.itemType === 'Part')
  const total = parts.reduce((s, i) => s + (i.totalCost || 0), 0)
  const deptMap = new Map()
  for (const i of parts) {
    deptMap.set(i.department, (deptMap.get(i.department) || 0) + (i.totalCost || 0))
  }
  const byDept = Array.from(deptMap.entries())
    .map(([dept, total]) => ({ dept, total }))
    .sort((a, b) => b.total - a.total)
  return { total, byDept }
}

export function buildTasksFromBom(bomItems) {
  const childrenMap = buildChildrenMap(bomItems)
  const counter = { n: 0 }
  const roots = (childrenMap.get('__root__') || []).filter(i => i.itemType === 'Assembly')
  return roots.map(asm => buildAsmTask(asm, childrenMap, counter))
}

function buildAsmTask(asm, childrenMap, counter) {
  const id = `t-bom-${counter.n++}`
  const direct = childrenMap.get(asm.itemCode) || []
  const parts = direct.filter(i => i.itemType === 'Part')
  const subAsms = direct.filter(i => i.itemType === 'Assembly')
  return {
    id,
    name: `${asm.itemCode} — ${asm.itemDescription}`,
    itemCode: asm.itemCode,
    department: asm.department,
    startDate: null,
    endDate: null,
    done: false,
    pct: 0,
    assignedTo: null,
    dependsOn: [],
    notes: '',
    components: parts.map(p => ({
      itemCode: p.itemCode,
      itemDescription: p.itemDescription,
      department: p.department,
      unit: p.unit,
      quantity: p.quantity,
      wastageQty: p.wastageQty,
      unitCost: p.unitCost,
      totalCost: p.totalCost,
    })),
    children: subAsms.map(child => buildAsmTask(child, childrenMap, counter)),
  }
}

export function exportToCsv(items, productCode) {
  const headers = [
    'BOM_Reference', 'Product_Code', 'Product_Description', 'Level',
    'Item_Code', 'Item_Description', 'Parent_Code', 'Department',
    'Item_Type', 'Unit', 'Quantity', 'Wastage_Qty', 'Unit_Cost', 'Total_Cost',
  ]
  const rows = items.map(i => [
    i.bomReference, i.productCode, i.productDescription, i.level,
    i.itemCode, i.itemDescription, i.parentCode, i.department,
    i.itemType, i.unit, i.quantity, i.wastageQty, i.unitCost, i.totalCost,
  ].map(v => (v == null ? '' : String(v).includes(',') ? `"${v}"` : v)).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `BOM_${productCode}_${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
