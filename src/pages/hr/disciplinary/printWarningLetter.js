// Disciplinary helpers — pure functions, no JSX, no hooks
import { FIELD_PLACEHOLDER_MAP } from './discTemplateData'
export { DISC_TEMPLATES, DISC_GUIDANCE, TEMPLATE_FIELDS, FIELD_PLACEHOLDER_MAP } from './discTemplateData'

export const DISC_TYPES = ['Verbal warning', 'Written warning', 'Final written warning', 'Suspension', 'Dismissal']

export const DISC_COLORS = {
  'Verbal warning':        { bg: '#fef9c3', color: '#854d0e' },
  'Written warning':       { bg: '#fff7ed', color: '#c2410c' },
  'Final written warning': { bg: '#fee2e2', color: '#991b1b' },
  'Suspension':            { bg: '#fce7f3', color: '#9d174d' },
  'Dismissal':             { bg: '#1e1f3b', color: '#ffffff' },
}

export function getSeverityLevel(records) {
  const order = ['Verbal warning', 'Written warning', 'Final written warning', 'Suspension', 'Dismissal']
  let max = -1
  for (const r of records) {
    const idx = order.indexOf(r.type)
    if (idx > max) max = idx
  }
  return max
}

export function getSeverityColour(level) {
  const colours = ['#854d0e', '#c2410c', '#991b1b', '#9d174d', '#ffffff']
  const bgs = ['#fef9c3', '#fff7ed', '#fee2e2', '#fce7f3', '#1e1f3b']
  if (level < 0) return { color: '#64748b', bg: '#f1f5f9' }
  return { color: colours[level], bg: bgs[level] }
}


export function formatLetterDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
}

export function buildDiscRef(employeeId, dateStr) {
  const todayISO = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const d = dateStr ? dateStr.replace(/-/g, '') : todayISO.replace(/-/g, '')
  return 'DISC/' + employeeId + '/' + d
}

export function applyTemplateReplacements(text, employee) {
  const todayISO = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const formattedDate = formatLetterDate(todayISO)
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const hh = now.getUTCHours().toString().padStart(2, '0')
  const mm = now.getUTCMinutes().toString().padStart(2, '0')
  const currentTime = hh + ':' + mm
  return text
    .replace(/\[DATE\]/g, formattedDate)
    .replace(/\[Employee name\]/g, employee?.name || '—')
    .replace(/\[EMPLOYEE NAME\]/g, employee?.name || '—')
    .replace(/\[TIME\]/g, currentTime)
    .replace(/\[DATE OF BIRTH\]/g, '—')
}

export function applyFieldReplacements(baseText, fieldValues) {
  let result = baseText
  for (const [key, value] of Object.entries(fieldValues)) {
    const placeholder = FIELD_PLACEHOLDER_MAP[key]
    if (placeholder && value) {
      result = result.split(placeholder).join(value)
    }
  }
  return result
}

export function printWarningLetter(employee, record, bodyText, companySettings) {
  const ref = buildDiscRef(employee.id, record.date)
  const todayISO = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Warning Letter — ${ref}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      color: #000;
      background: #fff;
      line-height: 1.45;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 0;
      margin: 0;
    }
    .page-content {
      flex: 1;
      padding: 18px 48px 0 48px;
    }
    .signature-wrapper {
      padding: 0 48px 18px 48px;
      margin-top: auto;
    }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #000;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .company-name {
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .company-details {
      font-size: 8pt;
      color: #333;
      line-height: 1.4;
    }
    .confidential {
      font-size: 8pt;
      font-weight: bold;
      letter-spacing: 2px;
      text-align: right;
      color: #555;
    }
    .issued-by-block {
      font-size: 8.5pt;
      text-align: right;
      margin-top: 4px;
      color: #333;
      line-height: 1.4;
    }
    .ref-line {
      margin-bottom: 8px;
      font-size: 9pt;
      color: #555;
    }
    .addressee-block {
      margin-bottom: 12px;
      font-size: 10pt;
    }
    .subject-line {
      font-size: 11.5pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 12px 0 10px;
      text-transform: uppercase;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10pt;
    }
    .meta-table td {
      padding: 2px 6px 2px 0;
      vertical-align: top;
    }
    .meta-table td:first-child {
      font-weight: bold;
      width: 160px;
      white-space: nowrap;
    }
    .body-text {
      white-space: pre-wrap;
      font-size: 10.5pt;
      line-height: 1.55;
      margin-bottom: 14px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .rights-box {
      border: 1px solid #000;
      padding: 7px 12px;
      font-size: 9pt;
      margin-bottom: 14px;
      background: #f9f9f9;
      line-height: 1.4;
    }
    .rights-box strong {
      display: block;
      margin-bottom: 3px;
      font-size: 9.5pt;
    }
    .signature-section {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .sig-block {
      flex: 1;
    }
    .sig-line {
      border-bottom: 1px solid #000;
      height: 28px;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 8.5pt;
      color: #333;
      line-height: 1.5;
    }
    .footer-note {
      margin-top: 14px;
      border-top: 1px solid #ccc;
      padding-top: 5px;
      font-size: 8pt;
      color: #555;
      text-align: center;
      line-height: 1.4;
    }
    @media print {
      @page {
        size: A4;
        margin: 12mm 15mm 12mm 15mm;
      }
      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .page-content {
        flex: 1;
        padding: 0;
      }
      .signature-wrapper {
        padding: 0;
        margin-top: auto;
      }
    }
  </style>
</head>
<body>

  <div class="page-content">

    <div class="letterhead">
      <div>
        <div class="company-name">${companySettings?.company?.name || 'iMoto Manufacturing (Pty) Ltd'}</div>
        <div class="company-details">
          ${companySettings?.company?.address || 'Montague Gardens, Cape Town, 7441'}<br>
          Tel: ${companySettings?.company?.phone || '—'} &nbsp;|&nbsp; Email: ${companySettings?.company?.email || '—'}<br>
          Reg No: ${companySettings?.company?.reg || '—'}
        </div>
      </div>
      <div>
        <div class="confidential">PRIVATE &amp; CONFIDENTIAL</div>
        <div class="issued-by-block">
          Issued by: ${companySettings?.company?.name || 'iMoto Manufacturing (Pty) Ltd'}<br>
          Registration No: ${companySettings?.company?.reg || '—'}<br>
          Address: ${companySettings?.company?.address || '—'}<br>
          Tel: ${companySettings?.company?.phone || '—'}<br>
          Email: ${companySettings?.company?.email || '—'}
        </div>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:10pt;">
      <div><strong>Date:</strong> ${formatLetterDate(record.date || todayISO)}</div>
      <div class="ref-line">Ref: ${ref}</div>
    </div>

    <table class="meta-table" style="margin-bottom:12px;">
      <tr><td>To:</td><td>${employee.name}</td></tr>
      <tr><td>Department:</td><td>${employee.dept || '—'}</td></tr>
      <tr><td>Employee ID:</td><td>${employee.id}</td></tr>
      <tr><td>Biometric ID:</td><td>${employee.zkUserId || '—'}</td></tr>
    </table>

    <div class="subject-line">Notice of ${record.type || 'Disciplinary Warning'}</div>

    <table class="meta-table">
      <tr>
        <td>Nature of Offence:</td>
        <td>${record.type || '—'}</td>
      </tr>
      ${record.hearingDate ? `<tr><td>Hearing Date:</td><td>${formatLetterDate(record.hearingDate)}</td></tr>` : ''}
      ${record.chairperson ? `<tr><td>Chairperson:</td><td>${record.chairperson}</td></tr>` : ''}
      <tr>
        <td>Issued Date:</td>
        <td>${formatLetterDate(record.date || todayISO)}</td>
      </tr>
    </table>

    <div class="body-text">${bodyText}</div>

    <div class="rights-box">
      <strong>Your Rights</strong>
      You have the right to appeal this decision within 5 working days of receipt of this notice.
      Should you wish to appeal, please submit your written appeal to your direct supervisor or HR.
      This warning will remain on your employment record for a period of 12 months from the date of issue,
      after which it will lapse provided no further misconduct of a similar nature occurs.
      This document is issued in accordance with the Labour Relations Act 66 of 1995 and the
      company disciplinary code.
    </div>

  </div>

  <div class="signature-wrapper">
    <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 14px;" />

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">
          <strong>Issued by (Chairperson / Manager)</strong><br>
          Name: ${record.chairperson || '________________________________'}<br>
          On behalf of: ${companySettings?.company?.name || 'iMoto Manufacturing (Pty) Ltd'}<br>
          Date: ________________________________
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">
          <strong>Received by (Employee)</strong><br>
          Name: ${employee.name}<br>
          Department: ${employee.dept || '—'}<br>
          Employee ID: ${employee.id}<br>
          Date: ________________________________
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">
          <strong>Witness</strong><br>
          Name: ________________________________<br>
          Date: ________________________________
        </div>
      </div>
    </div>

    <div class="footer-note">
      This letter was issued to ${employee.name} (${employee.id}) and a signed copy is to be retained
      on the employee's personnel file. Reference: ${ref}
    </div>
  </div>

</body>
</html>`
  const newWin = window.open('', '_blank', 'width=900,height=700')
  if (!newWin) {
    alert('Pop-up blocked. Please allow pop-ups for this page and try again.')
    return
  }
  newWin.document.write(html)
  newWin.document.close()
  newWin.focus()
  newWin.print()
  newWin.onafterprint = () => newWin.close()
}
