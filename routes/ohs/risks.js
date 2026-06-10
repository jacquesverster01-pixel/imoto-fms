import { Router } from 'express'

function riskRatingFromScore(score) {
  if (score >= 13) return 'Critical'
  if (score >= 7)  return 'High'
  if (score >= 4)  return 'Medium'
  return 'Low'
}

function calcRiskFields(body) {
  const rec = { ...body }
  rec.riskScore      = (rec.likelihood || 1) * (rec.severity || 1)
  rec.riskRating     = riskRatingFromScore(rec.riskScore)
  rec.residualScore  = (rec.residualLikelihood || 1) * (rec.residualSeverity || 1)
  rec.residualRating = riskRatingFromScore(rec.residualScore)
  return rec
}

// OHS risk register + reviews (ohs_risks.json)
export default function risksRouter(readData, writeData) {
  const router = Router()

  router.get('/ohs-risks', (req, res) => {
    try { res.json(readData('ohs_risks.json')) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.post('/ohs-risks', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const record = { ...calcRiskFields(req.body), id: `RSK${Date.now()}`, createdAt: new Date().toISOString() }
      records.push(record)
      writeData('ohs_risks.json', records)
      res.json(record)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-risks/:id', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Risk not found' })
      records[idx] = { ...records[idx], ...calcRiskFields(req.body) }
      writeData('ohs_risks.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.delete('/ohs-risks/:id', (req, res) => {
    try {
      let records = readData('ohs_risks.json')
      records = records.filter(r => r.id !== req.params.id)
      writeData('ohs_risks.json', records)
      res.json({ ok: true })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.get('/ohs-risks/review-status', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const today = new Date().toISOString().slice(0, 10)
      const result = records.map(r => {
        let status = r.reviewStatus || 'due'
        if (r.nextReviewDate && r.nextReviewDate < today) status = 'overdue'
        return { id: r.id, title: r.title, reviewStatus: status, lastReviewDate: r.lastReviewDate || null, nextReviewDate: r.nextReviewDate || null, reviewIntervalDays: r.reviewIntervalDays || 90 }
      })
      res.json(result)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  router.put('/ohs-risks/:id/review', (req, res) => {
    try {
      const records = readData('ohs_risks.json')
      const { author, note, reviewedItems = [] } = req.body
      const today = new Date().toISOString().slice(0, 10)

      reviewedItems.forEach(item => {
        const idx = records.findIndex(r => r.id === item.id)
        if (idx !== -1) {
          const r = records[idx]
          const likelihood = Number(item.newLikelihood) || r.likelihood
          const severity   = Number(item.newSeverity)   || r.severity
          records[idx] = { ...r, likelihood, severity, riskScore: likelihood * severity, riskRating: riskRatingFromScore(likelihood * severity) }
        }
      })

      const idx = records.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Risk not found' })

      const risk = records[idx]
      const interval = risk.reviewIntervalDays || 90
      const nextD = new Date(today + 'T00:00:00Z')
      nextD.setUTCDate(nextD.getUTCDate() + interval)
      const nextReviewDate = nextD.toISOString().slice(0, 10)

      records[idx] = {
        ...records[idx], lastReviewDate: today, nextReviewDate, reviewStatus: 'ok',
        reviewNotes: [...(risk.reviewNotes || []), { id: `RN${Date.now()}`, date: today, author: author || '', note: note || '' }],
      }
      writeData('ohs_risks.json', records)
      res.json(records[idx])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return router
}
