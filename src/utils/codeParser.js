const CODE_REGEX = /^([A-Z]{3})([A-Z])(\d{4,6})$/

export function parseProductCode(code) {
  if (typeof code !== 'string') return { valid: false, raw: code }
  const m = code.match(CODE_REGEX)
  if (!m) return { valid: false, raw: code }
  return { prefix: m[1], type: m[2], number: m[3], valid: true }
}

export function getDepartmentForCode(code, prefixMappings) {
  const parsed = parseProductCode(code)
  if (!parsed.valid) return null
  const match = (prefixMappings || []).find(p => p.prefix === parsed.prefix)
  return match ? { department: match.department, colour: match.colour } : null
}

export function getPhaseForCode(code, assemblyPhases) {
  const match = (assemblyPhases || []).find(a => a.code === code)
  return match ? match.phase : 'unphased'
}

export function isUnallocated(task, prefixMappings) {
  if (!task?.assemblyCode) return true
  return getDepartmentForCode(task.assemblyCode, prefixMappings) === null
}

export function extractPrefixesFromBoms(boms) {
  if (!Array.isArray(boms)) return []
  const set = new Set()
  for (const bom of boms) {
    const items = Array.isArray(bom?.items) ? bom.items : []
    for (const item of items) {
      const parsed = parseProductCode(item?.itemCode)
      if (parsed.valid) set.add(parsed.prefix)
    }
  }
  return Array.from(set).sort()
}
