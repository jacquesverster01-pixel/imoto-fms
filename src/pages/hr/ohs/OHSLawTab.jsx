import { useState } from 'react'
import { useGet } from '../../../hooks/useApi'

export default function OHSLawTab() {
  const { data: raw, loading } = useGet('/ohs-law-reference')
  const chapters = Array.isArray(raw) ? raw : []

  const [search, setSearch] = useState('')

  const q = search.toLowerCase().trim()

  // Filter: for each chapter return only matching sections; keep chapter if any section matches
  const visible = chapters.map(ch => {
    if (!q) return { ...ch, _allSections: ch.sections, _match: false }
    const matched = ch.sections.filter(s =>
      (s.title       || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.section     || '').toLowerCase().includes(q)
    )
    return { ...ch, _allSections: matched, _match: matched.length > 0 }
  }).filter(ch => !q || ch._match)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header note */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#92400e' }}>
        Reference only — based on the Occupational Health and Safety Act 85 of 1993 (South Africa).
        Always consult the official Government Gazette for the latest version.
      </div>

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: '14px 20px' }}>
        <input
          style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid #e4e6ea', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          placeholder="Search sections by title or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {q && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {visible.reduce((n, ch) => n + ch._allSections.length, 0)} section{visible.reduce((n, ch) => n + ch._allSections.length, 0) !== 1 ? 's' : ''} matched
          </div>
        )}
      </div>

      {/* Chapters accordion */}
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>No sections match that search</div>
      )}

      {visible.map(ch => (
        <details key={ch.id} open={!!q} style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden' }}>
          <summary style={{
            cursor: 'pointer', padding: '14px 20px', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#f9fafb', listStyle: 'none',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', background: '#ede9fe', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {ch.chapter}
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{ch.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', flexShrink: 0 }}>
              {ch._allSections.length} section{ch._allSections.length !== 1 ? 's' : ''}
            </span>
          </summary>

          <div style={{ padding: '0 20px 16px' }}>
            {ch._allSections.map((s, i) => (
              <div
                key={s.id}
                style={{
                  paddingTop: 14, paddingBottom: 14,
                  borderBottom: i < ch._allSections.length - 1 ? '1px solid #f0f2f5' : 'none',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#374151',
                  background: '#f3f4f6', padding: '3px 8px', borderRadius: 6,
                  whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
                }}>
                  {s.section}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e1f3b', marginBottom: 4 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                    {s.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
