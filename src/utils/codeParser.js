export function getPhaseForCode(code, assemblyPhases) {
  const match = (assemblyPhases || []).find(a => a.code === code)
  return match ? match.phase : 'unphased'
}
