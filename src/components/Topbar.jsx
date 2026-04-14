const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function todaySAST() {
  // Africa/Johannesburg = UTC+2, no DST — hardcode +2 offset
  const now = new Date(Date.now() + 2 * 3600 * 1000)
  const dow   = DOW[now.getUTCDay()]
  const day   = String(now.getUTCDate()).padStart(2, '0')
  const month = MONTHS[now.getUTCMonth()]
  const year  = now.getUTCFullYear()
  return `${dow}, ${day} ${month} ${year}`
}

export default function Topbar({ title }) {
  const today = todaySAST()
  return (
    <div className="flex items-center gap-3 px-5 h-12 bg-white border-b flex-shrink-0" style={{ borderColor: '#e4e6ea' }}>
      <span className="font-semibold text-sm" style={{ color: '#1a1d3b' }}>{title}</span>
      <span className="text-xs" style={{ color: '#b0b5cc' }}>{today}</span>
    </div>
  )
}
