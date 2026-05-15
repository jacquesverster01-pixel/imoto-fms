import { useState } from 'react'
import { useGet, apiFetch } from '../hooks/useApi'
import { computeJobCost, formatZAR } from '../utils/costToComplete'
import CostJobCard from './costdashboard/CostJobCard'

function cacheAge(updatedAt) {
  if (!updatedAt) return 'Cache not loaded'
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Updated just now'
  if (mins === 1) return 'Updated 1 min ago'
  if (mins < 60) return `Updated ${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return `Updated ${hrs}h ago`
}

export default function CostDashboard() {
  const { data: jobsData, refetch } = useGet('/jobs')
  const { data: cacheData } = useGet('/stock-cache/data')
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [savingLabour, setSavingLabour] = useState(false)

  const allJobs = jobsData?.jobs || []
  const stockCache = cacheData || { byCode: {} }

  const activeJobs = allJobs.filter(j => j.status === 'in-production')
  const jobCosts = activeJobs
    .map(job => computeJobCost(job, stockCache))
    .sort((a, b) => b.totalCost - a.totalCost)

  const grandMaterial = jobCosts.reduce((s, j) => s + j.materialCost, 0)
  const grandLabour = jobCosts.reduce((s, j) => s + j.labourCost, 0)
  const grandTotal = grandMaterial + grandLabour

  async function handleLabourSave(jobId, value) {
    setSavingLabour(true)
    try {
      await apiFetch(`/jobs/${jobId}/labour`, {
        method: 'PATCH',
        body: JSON.stringify({ labourEstimate: value }),
      })
      refetch()
    } finally {
      setSavingLabour(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e1f3b', margin: 0 }}>Cost to Completion</h1>
        <span style={{ fontSize: 11, color: '#9298c4' }}>{cacheAge(cacheData?.updatedAt)}</span>
      </div>

      {/* Summary bar */}
      <div style={{ background: '#1e1f3b', borderRadius: 10, padding: '16px 24px', marginBottom: 20, color: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Total outstanding: {formatZAR(grandTotal)}
        </div>
        <div style={{ fontSize: 13, color: '#9298c4', display: 'flex', gap: 20 }}>
          <span>Materials: <span style={{ color: '#c5c8e8' }}>{formatZAR(grandMaterial)}</span></span>
          <span>Labour: <span style={{ color: '#c5c8e8' }}>{formatZAR(grandLabour)}</span></span>
          <span style={{ color: '#6b6f9e' }}>|</span>
          <span>{activeJobs.length} vehicle{activeJobs.length !== 1 ? 's' : ''} in production</span>
        </div>
      </div>

      {/* Job cards or empty state */}
      {activeJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9298c4', fontSize: 14, lineHeight: 1.6 }}>
          No jobs are currently marked &apos;In Production&apos;.<br />
          Set a job&apos;s status to <strong>In Production</strong> in the Production Planner to see it here.
        </div>
      ) : (
        jobCosts.map(jobCost => (
          <CostJobCard
            key={jobCost.jobId}
            jobCost={jobCost}
            isExpanded={expandedJobId === jobCost.jobId}
            onExpand={setExpandedJobId}
            onLabourSave={handleLabourSave}
            savingLabour={savingLabour}
          />
        ))
      )}
    </div>
  )
}
