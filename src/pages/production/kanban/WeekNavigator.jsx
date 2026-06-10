const navBtn = {
  fontSize: 14, padding: '5px 13px', border: '1px solid #e4e6ea',
  borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#1a1d3b', lineHeight: 1,
}

export default function WeekNavigator({ weekLabel, onPrev, onNext, onFullscreen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b' }}>Production board</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={navBtn} onClick={onPrev}>←</button>
        <span style={{ fontSize: 13, color: '#1a1d3b', minWidth: 190, textAlign: 'center', fontWeight: 500 }}>
          {weekLabel}
        </span>
        <button style={navBtn} onClick={onNext}>→</button>
      </div>
      <button style={navBtn} onClick={onFullscreen} title="Fullscreen">⛶</button>
    </div>
  )
}
