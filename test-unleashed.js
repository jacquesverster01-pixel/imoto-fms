// One-off connectivity test for Unleashed API
// Run with: node test-unleashed.js

import { createHmac } from 'crypto'

// Load .env without dotenv — Node 20.12+ built-in
process.loadEnvFile('.env')

const API_ID  = process.env.UNLEASHED_API_ID    || ''
const API_KEY = process.env.UNLEASHED_API_SECRET || ''

if (!API_ID || !API_KEY) {
  console.error('FAIL — UNLEASHED_API_ID or UNLEASHED_API_SECRET missing from .env')
  process.exit(1)
}

console.log('API_ID loaded :', API_ID)
console.log('API_KEY loaded :', API_KEY.slice(0, 8) + '...')

// ── Method A: current code — sign the query string ──────────────────────────
function signQS(qs) {
  return createHmac('sha256', API_KEY).update(qs).digest('base64')
}

// ── Method B: spec described by user — sign API_ID + timestamp ───────────────
function signTimestamp(apiId, ts) {
  return createHmac('sha256', API_KEY).update(apiId + ts).digest('base64')
}

function isoTimestamp() {
  // "YYYY-MM-DDTHH:MM:SS" — no milliseconds, no Z
  return new Date().toISOString().replace(/\.\d{3}Z$/, '')
}

async function testMethod(label, url, headers) {
  console.log(`\n── ${label} ─────────────────────────────────`)
  console.log('URL    :', url)
  console.log('Headers:', JSON.stringify(headers, null, 2))
  try {
    const res  = await fetch(url, { headers })
    const text = await res.text()
    console.log('Status :', res.status, res.statusText)
    console.log('Body   :', text.slice(0, 200))
    if (res.ok) {
      console.log(`\nPASS — ${label} returned HTTP ${res.status}`)
      return true
    } else {
      console.log(`\nFAIL — ${label} returned HTTP ${res.status}: ${text.slice(0, 120)}`)
      return false
    }
  } catch (err) {
    console.log(`\nFAIL — ${label} threw: ${err.message}`)
    return false
  }
}

const BASE = 'https://api.unleashedsoftware.com'
const ENDPOINT = 'Warehouses'

// Method A — sign empty query string (matches current routes/unleashed.js)
const qsA  = ''   // no query params for /Warehouses
const sigA = signQS(qsA)
const passA = await testMethod(
  'Method A: sign query-string (current code)',
  `${BASE}/${ENDPOINT}`,
  {
    'Content-Type':       'application/json',
    'Accept':             'application/json',
    'api-auth-id':        API_ID,
    'api-auth-signature': sigA,
    'client-type':        'imoto/fms',
  }
)

// Method B — sign API_ID + timestamp (user-described spec)
const ts   = isoTimestamp()
const sigB = signTimestamp(API_ID, ts)
const passB = await testMethod(
  'Method B: sign API_ID+timestamp (user spec)',
  `${BASE}/${ENDPOINT}`,
  {
    'Content-Type':        'application/json',
    'Accept':              'application/json',
    'api-auth-id':         API_ID,
    'api-auth-signature':  sigB,
    'api-auth-timestamp':  ts,
    'client-type':         'imoto/fms',
  }
)

console.log('\n══════════════════════════════════════════')
console.log('Method A (sign QS)        :', passA ? 'PASS' : 'FAIL')
console.log('Method B (sign ID+ts)     :', passB ? 'PASS' : 'FAIL')

if (!passA && !passB) {
  console.log('\nBoth methods failed — check credentials or network.')
} else if (passA && !passB) {
  console.log('\nCurrent code (Method A) is correct. No change needed.')
} else if (!passA && passB) {
  console.log('\nMethod B is correct — routes/unleashed.js needs updating.')
} else {
  console.log('\nBoth methods accepted — API may be permissive.')
}
