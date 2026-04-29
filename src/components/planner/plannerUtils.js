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
