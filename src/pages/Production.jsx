import { useState, useEffect } from 'react'
import { useGet } from '../hooks/useApi'
import { fmtHHMMSS } from '../utils/time'
import ProductionGantt from './production/ProductionGantt.jsx'
import ProductionKanbanWall from '../components/production/ProductionKanbanWall.jsx'

const btnBase = {
  padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const activeBtn  = { ...btnBase, background: '#4f67e4', color: '#fff', border: 'none' }
const inactiveBtn = { ...btnBase, background: 'none', color: '#9298c4', border: '1px solid #e4e6ea' }

export default function Production() {
  const [viewMode,     setViewMode]     = useState('gantt')
  const [lastRefresh,  setLastRefresh]  = useState(new Date())
  const [now,          setNow]          = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { data: jobsData,  refetch: refetchJobs } = useGet('/jobs')
  const { data: codesData }                        = useGet('/dept-codes')

  const jobs           = Array.isArray(jobsData?.jobs)    ? jobsData.jobs           : []
  const prefixes       = codesData?.prefixes       || []
  const assemblyPhases = codesData?.assemblyPhases || []

  useEffect(() => {
    const id = setInterval(() => {
      refetchJobs()
      setLastRefresh(new Date())
    }, 30000)
    return () => clearInterval(id)
  }, [refetchJobs])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function handleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1d3b', flex: 1, minWidth: 160 }}>
          Production Overview
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode('gantt')}
            style={viewMode === 'gantt' ? activeBtn : inactiveBtn}
          >
            Gantt
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={viewMode === 'kanban' ? activeBtn : inactiveBtn}
          >
            Kanban Wall
          </button>
        </div>

        {/* Clock + refresh + fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9298c4', fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#1a1d3b', fontVariantNumeric: 'tabular-nums' }}>
            {fmtHHMMSS(now)}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            Last refresh: {fmtHHMMSS(lastRefresh)}
          </span>
          <button
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={{
              background: 'none', border: '1px solid #e4e6ea', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', color: '#9298c4', fontSize: 14, lineHeight: 1,
            }}
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        </div>
      </div>

      {/* Body */}
      {viewMode === 'gantt'
        ? <ProductionGantt jobs={jobs} readOnly />
        : <ProductionKanbanWall jobs={jobs} prefixes={prefixes} assemblyPhases={assemblyPhases} />
      }
    </div>
  )
}
