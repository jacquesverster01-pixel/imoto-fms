// Static disciplinary template data — templates, guidance, fields, placeholder map

export const DISC_TEMPLATES = [
  {
    label: 'Absenteeism / unauthorised absence',
    reason: `On [DATE], [EMPLOYEE NAME] was absent from work without prior authorisation and without notifying management before or during the shift. The employee failed to follow the correct procedure for reporting an absence, which requires notification to their direct supervisor before the start of the shift. No satisfactory explanation was provided for the absence.`,
  },
  {
    label: 'Late coming / poor timekeeping',
    reason: `On [DATE], [EMPLOYEE NAME] reported for duty at [ARRIVAL TIME], which was after the designated start time of 08:00. This conduct is in contravention of the company attendance policy. The employee was previously counselled regarding timekeeping expectations. The late arrival was observed and recorded by [SUPERVISOR NAME].`,
  },
  {
    label: 'Insubordination',
    reason: `On [DATE], [EMPLOYEE NAME] refused a direct and reasonable instruction given by [SUPERVISOR NAME] to [DESCRIBE INSTRUCTION]. The refusal was [REFUSAL TYPE] and occurred in the presence of [WITNESSES]. The employee was informed that the instruction was lawful and within the scope of their duties before the refusal was made.`,
  },
  {
    label: 'Poor work quality / negligence',
    reason: `On [DATE], [EMPLOYEE NAME] failed to meet the required standard of workmanship on [TASK OR JOB]. The work produced was found to be deficient in the following respect: [DESCRIBE DEFECT]. The employee has received prior training and is expected to perform to the required standard. This level of negligence resulted in [DESCRIBE IMPACT].`,
  },
  {
    label: 'Damage to company property',
    reason: `On [DATE], [EMPLOYEE NAME] caused damage to company property, namely [DESCRIBE ITEM]. The damage was caused through [DESCRIBE CAUSE]. The estimated cost of repair or replacement is [REPAIR COST]. The employee was trained in the correct use and care of this equipment and the damage was avoidable.`,
  },
  {
    label: 'Failure to follow safety procedures',
    reason: `On [DATE], [EMPLOYEE NAME] was observed failing to comply with the company health and safety procedures, specifically [DESCRIBE VIOLATION]. This conduct placed the employee and colleagues at risk of injury and is in direct contravention of iMoto Manufacturing's OHS policy and the Occupational Health and Safety Act 85 of 1993. The violation was observed by [SUPERVISOR NAME].`,
  },
  {
    label: 'Dishonesty / theft',
    reason: `On [DATE], [EMPLOYEE NAME] was found to have [DESCRIBE ACT]. The act of dishonesty was discovered by [DISCOVERED BY] and is supported by the following evidence: [DESCRIBE EVIDENCE]. This conduct constitutes a serious breach of trust and the employment relationship.`,
  },
  {
    label: 'Use of phone / internet during work hours',
    reason: `On [DATE], [EMPLOYEE NAME] was observed using a personal mobile phone or accessing non-work-related content during working hours without authorisation at approximately [ARRIVAL TIME]. This is in contravention of the company policy on personal device use. The behaviour was witnessed by [SUPERVISOR NAME] during productive work time.`,
  },
]

export const DISC_GUIDANCE = {
  'Absenteeism / unauthorised absence': {
    steps: [
      'Verify the absence was not due to an approved leave type or a medical emergency before proceeding.',
      'First offence typically warrants a verbal or written warning. Dismissal is only fair after repeated offences and prior warnings.',
      'LRA Schedule 8 requires that the employee be given an opportunity to state a reason for the absence before the sanction is decided.',
      'If the employee claims illness, they are entitled to request a medical certificate (BCEA s23). Failure to produce one after 2 consecutive days is grounds for a written warning.',
      'Document dates of absence, attempts to contact the employee, and any explanation given.',
    ],
    reference: 'LRA Schedule 8 cl. 3 & 4 — BCEA s23',
  },
  'Late coming / poor timekeeping': {
    steps: [
      'Confirm the employee is aware of the official start time and that late coming is a disciplinary offence — check if they signed the employment contract or workplace rules.',
      'Progressive discipline applies: verbal warning → written warning → final written warning → dismissal. Skipping steps requires justification.',
      'Record exact arrival times on each occasion from timelog data to build a factual record.',
      'A single late arrival rarely justifies more than a verbal warning unless it caused significant operational harm.',
      'LRA requires consistency — check that other employees have been treated the same way for similar conduct.',
    ],
    reference: 'LRA Schedule 8 cl. 3(5) — progressive discipline',
  },
  'Insubordination': {
    steps: [
      'Confirm the instruction given was lawful, reasonable, and within the scope of the employment relationship.',
      'The employee must have clearly understood the instruction and deliberately refused — confusion or miscommunication is not insubordination.',
      'Gross insubordination (e.g. aggressive refusal, public humiliation of a supervisor) may justify a final written warning or dismissal on first offence.',
      'A hearing is mandatory before any sanction above a verbal warning. The employee must be informed of the charge, given time to prepare, and allowed a representative (fellow employee or shop steward).',
      "Document the exact instruction given, by whom, in whose presence, and the employee's exact response.",
    ],
    reference: 'LRA s185 & Schedule 8 cl. 4 — right to fair hearing',
  },
  'Poor work quality / negligence': {
    steps: [
      'Distinguish between incapacity (the employee cannot do the work) and misconduct (the employee will not). Incapacity follows a different process under LRA Schedule 8 cl. 8.',
      'If misconduct: confirm the employee was trained, knew the standard required, and had the resources to meet it.',
      'Negligence causing significant harm or financial loss may justify a higher sanction on first offence.',
      'Document the specific defect, the standard that was expected, and the actual output with evidence (photos, measurements, job card).',
      'Allow the employee to respond to the allegation before imposing a sanction.',
    ],
    reference: 'LRA Schedule 8 cl. 8 — incapacity vs misconduct',
  },
  'Damage to company property': {
    steps: [
      'Establish whether the damage was caused by negligence, recklessness, or deliberate intent — the severity of sanction depends on this.',
      'Deliberate damage may constitute gross misconduct and warrant dismissal after a hearing.',
      'Document the item damaged, estimated repair/replacement cost, and how the damage occurred.',
      'The employee cannot be forced to pay for damage as a disciplinary sanction — deductions require written consent under BCEA s34.',
      'A fair hearing is required before any sanction above a verbal warning.',
    ],
    reference: 'BCEA s34 — deductions / LRA Schedule 8 cl. 4',
  },
  'Failure to follow safety procedures': {
    steps: [
      'This is treated seriously under the OHS Act 85 of 1993 — the employer has a duty to enforce safety rules.',
      'Confirm the employee was trained in the specific procedure that was violated and that signage or written rules exist.',
      'A first offence involving risk to life may justify a final written warning or dismissal — document the risk level clearly.',
      'The employee must be informed of the specific rule breached and given an opportunity to respond before sanction.',
      'Record any injury, near-miss, or exposure that resulted — this may be required for a COID Act report as well.',
    ],
    reference: 'OHS Act 85 of 1993 s8 & s14 — LRA Schedule 8',
  },
  'Dishonesty / theft': {
    steps: [
      'Dishonesty and theft are recognised as grounds for summary dismissal (dismissal without notice) on first offence if proven.',
      'Evidence must be clear and convincing — balance of probabilities applies in the CCMA, not beyond reasonable doubt.',
      'A formal disciplinary hearing is mandatory. The employee must be given written notice of the charge, sufficient time to prepare (minimum 48 hours is best practice), and the right to a representative.',
      'Document the evidence: CCTV footage, witness statements, stock discrepancies, access logs.',
      'If the employee is suspended pending investigation, the suspension must be on full pay unless a contractual provision exists.',
    ],
    reference: 'LRA Schedule 8 cl. 4 & 7 — CCMA Guidelines on Misconduct Arbitrations',
  },
  'Use of phone / internet during work hours': {
    steps: [
      'Confirm the company has a written policy on personal device use that the employee has signed or acknowledged.',
      'Without a clear policy, it is difficult to sustain a sanction above a verbal warning.',
      'First offence typically warrants a verbal or written warning unless the behaviour caused measurable harm.',
      'Document the time, duration, and nature of the usage and who observed it.',
      'Progressive discipline applies — repeated offences after prior warnings may justify a final written warning.',
    ],
    reference: 'LRA Schedule 8 cl. 3 — progressive discipline',
  },
}

export const TEMPLATE_FIELDS = {
  'Absenteeism / unauthorised absence': [],

  'Late coming / poor timekeeping': [
    { key: 'arrivalTime',    label: 'Actual arrival time',       placeholder: 'e.g. 08:34', type: 'text' },
    { key: 'supervisorName', label: 'Supervisor who observed',   placeholder: 'Full name', type: 'text' },
  ],

  'Insubordination': [
    { key: 'supervisorName',  label: 'Supervisor who gave the instruction', placeholder: 'Full name', type: 'text' },
    { key: 'instructionDesc', label: 'Instruction given',         placeholder: 'e.g. "to complete the assigned weld on job J042"', type: 'textarea' },
    { key: 'refusalType',     label: 'How the refusal was made',  placeholder: 'e.g. verbal, walked off, written refusal', type: 'text' },
    { key: 'witnesses',       label: 'Witness(es) present',       placeholder: 'Full name(s) of anyone present', type: 'text' },
  ],

  'Poor work quality / negligence': [
    { key: 'taskOrJob',   label: 'Task or job',              placeholder: 'e.g. Job J042 — cab assembly welds', type: 'text' },
    { key: 'defectDesc',  label: 'Defect / shortcoming',     placeholder: 'Describe what was wrong with the work', type: 'textarea' },
    { key: 'impactDesc',  label: 'Impact of the negligence', placeholder: 'e.g. 4 hours rework, R800 material wasted', type: 'textarea' },
  ],

  'Damage to company property': [
    { key: 'itemDesc',   label: 'Item or equipment damaged',             placeholder: 'e.g. Angle grinder #4, serial AG-2019-004', type: 'text' },
    { key: 'causeDesc',  label: 'Cause of damage',                       placeholder: 'e.g. dropped from height, operated incorrectly', type: 'text' },
    { key: 'repairCost', label: 'Estimated repair / replacement cost',   placeholder: 'e.g. R 2 500', type: 'text' },
  ],

  'Failure to follow safety procedures': [
    { key: 'violationDesc',  label: 'Safety violation',  placeholder: 'e.g. operating angle grinder without face shield', type: 'textarea' },
    { key: 'supervisorName', label: 'Observed by',       placeholder: 'Full name of person who observed the violation', type: 'text' },
  ],

  'Dishonesty / theft': [
    { key: 'dishonestAct', label: 'Act committed',       placeholder: 'e.g. removed company property without authorisation', type: 'textarea' },
    { key: 'discoveredBy', label: 'Discovered by',       placeholder: 'Full name of person who discovered it', type: 'text' },
    { key: 'evidenceDesc', label: 'Evidence available',  placeholder: 'e.g. CCTV footage, witness statement, stock count discrepancy', type: 'textarea' },
  ],

  'Use of phone / internet during work hours': [
    { key: 'arrivalTime',    label: 'Approximate time observed', placeholder: 'e.g. 10:15', type: 'text' },
    { key: 'supervisorName', label: 'Observed by',               placeholder: 'Full name of supervisor', type: 'text' },
  ],
}

export const FIELD_PLACEHOLDER_MAP = {
  arrivalTime:     '[ARRIVAL TIME]',
  supervisorName:  '[SUPERVISOR NAME]',
  instructionDesc: '[DESCRIBE INSTRUCTION]',
  refusalType:     '[REFUSAL TYPE]',
  witnesses:       '[WITNESSES]',
  taskOrJob:       '[TASK OR JOB]',
  defectDesc:      '[DESCRIBE DEFECT]',
  impactDesc:      '[DESCRIBE IMPACT]',
  itemDesc:        '[DESCRIBE ITEM]',
  causeDesc:       '[DESCRIBE CAUSE]',
  repairCost:      '[REPAIR COST]',
  violationDesc:   '[DESCRIBE VIOLATION]',
  dishonestAct:    '[DESCRIBE ACT]',
  discoveredBy:    '[DISCOVERED BY]',
  evidenceDesc:    '[DESCRIBE EVIDENCE]',
}
