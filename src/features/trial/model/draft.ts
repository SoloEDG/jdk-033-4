import type { TrialData, TrialLeg, TrialReading } from '../lib/types'

export interface DraftReading {
  id: string
  time: string
  compass: string
  sheet: string
  x: string
  y: string
  fixError: string
  compassError: string
  sheetError: string
}

export interface DraftLeg {
  id: string
  name: string
  role: 'calibration' | 'validation'
  side: 'port' | 'starboard'
  windFrom: string
  windKnots: string
  readings: DraftReading[]
}

const uid = () => Math.random().toString(36).slice(2, 9)

export const emptyReading = (): DraftReading => ({
  id: uid(), time: '', compass: '', sheet: '', x: '', y: '',
  fixError: '1.5', compassError: '.5', sheetError: '1',
})

export const emptyLeg = (index: number): DraftLeg => ({
  id: uid(),
  name: index === 0 ? '去程 · 左舷' : index === 1 ? '回程 · 右舷' : `航段 ${index + 1}`,
  role: index === 2 ? 'validation' : 'calibration',
  side: index % 2 === 0 ? 'port' : 'starboard',
  windFrom: '', windKnots: '12',
  readings: [emptyReading(), emptyReading()],
})

const num = (value: string): number => {
  const text = String(value).trim()
  if (!text) return Number.NaN
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export interface DraftIssue {
  legId: string
  readingId: string | null
  message: string
}

export interface DraftResult {
  data: TrialData
  issues: DraftIssue[]
}

export function parseDraft(legs: DraftLeg[]): DraftResult {
  const issues: DraftIssue[] = []
  const out: TrialLeg[] = []
  for (const leg of legs) {
    const windFrom = num(leg.windFrom)
    const windKnots = num(leg.windKnots)
    if (!Number.isFinite(windFrom)) issues.push({ legId: leg.id, readingId: null, message: '缺少风来向' })
    if (!Number.isFinite(windKnots) || windKnots <= 0) issues.push({ legId: leg.id, readingId: null, message: '风强需为正数' })
    const readings: TrialReading[] = []
    const seen = new Set<number>()
    for (const draft of leg.readings) {
      const values = {
        time: num(draft.time), compass: num(draft.compass), sheet: num(draft.sheet),
        x: num(draft.x), y: num(draft.y),
        fixError: num(draft.fixError), compassError: num(draft.compassError), sheetError: num(draft.sheetError),
      }
      const blank = Object.values(values).some(v => !Number.isFinite(v))
      if (blank) {
        if (draft.time || draft.compass || draft.x || draft.y) {
          issues.push({ legId: leg.id, readingId: draft.id, message: '时刻、罗经、帆角、定位与误差上限都要填齐' })
        }
        continue
      }
      if (values.compass < 0 || values.compass >= 360) issues.push({ legId: leg.id, readingId: draft.id, message: '罗经读数应在 0–360°' })
      if (values.sheet < 0 || values.sheet > 85) issues.push({ legId: leg.id, readingId: draft.id, message: '帆角应在 0–85°' })
      if (values.fixError < 0 || values.compassError < 0 || values.sheetError < 0) {
        issues.push({ legId: leg.id, readingId: draft.id, message: '误差上限不能为负' })
      }
      if (seen.has(values.time)) issues.push({ legId: leg.id, readingId: draft.id, message: '同一航段内时刻要唯一' })
      seen.add(values.time)
      readings.push({
        id: draft.id,
        time: values.time,
        compass: values.compass,
        sheet: values.sheet,
        fix: { x: values.x, y: values.y },
        fixError: values.fixError,
        compassError: values.compassError,
        sheetError: values.sheetError,
      })
    }
    if (readings.length < 2) issues.push({ legId: leg.id, readingId: null, message: '每段至少需要两个完整读数' })
    out.push({
      id: leg.id, name: leg.name || '未命名航段', role: leg.role, side: leg.side === 'starboard' ? 'starboard' : 'port',
      windFrom: Number.isFinite(windFrom) ? windFrom : 0,
      windKnots: Number.isFinite(windKnots) ? windKnots : 0,
      readings,
    })
  }
  return { data: { legs: out }, issues }
}

export function draftFromData(data: TrialData): DraftLeg[] {
  return data.legs.map(leg => ({
    id: leg.id,
    name: leg.name,
    role: leg.role,
    side: leg.side,
    windFrom: String(leg.windFrom),
    windKnots: String(leg.windKnots),
    readings: leg.readings.map(reading => ({
      id: reading.id,
      time: String(reading.time),
      compass: String(reading.compass),
      sheet: String(reading.sheet),
      x: String(reading.fix.x),
      y: String(reading.fix.y),
      fixError: String(reading.fixError),
      compassError: String(reading.compassError),
      sheetError: String(reading.sheetError),
    })),
  }))
}
