export function buildTasksFromBomAssemblies(bom) {
  if (!bom?.items) return []
  return bom.items
    .filter(i => i?.itemType === 'Assembly')
    .map((a, i) => ({
      id: `task-${Date.now()}-${i}`,
      name: a.itemDescription || a.itemCode,
      assemblyCode: a.itemCode,
      parentCode: a.parentCode,
      startDate: null,
      endDate: null,
      done: false,
      pct: 0,
      kanbanStatus: 'todo',
      dependsOn: [],
      dependsOnAssembly: null,
      assignedTo: '',
      notes: ''
    }))
}

export function generateJobId(existingJobs) {
  const used = new Set((existingJobs || []).map(j => j?.id))
  let n = 1
  while (true) {
    const candidate = `JOB-${String(n).padStart(4, '0')}`
    if (!used.has(candidate)) return candidate
    n++
  }
}

export function splitCode(code, prefixes) {
  if (!code) return { prefix: '', rest: '' }
  const match = (prefixes || []).find(p => code.startsWith(p.prefix))
  return match
    ? { prefix: match.prefix, rest: code.slice(match.prefix.length) }
    : { prefix: '', rest: code }
}

export function deptForPrefix(prefix, prefixes) {
  if (!prefix) return null
  return (prefixes || []).find(p => p.prefix === prefix)?.department || null
}
