import type { TrialData, TrialLeg, TrialReading } from './types'

interface Row {
  id: string
  leg: string
  time: number
  compass: number
  sheet: number
  x: number
  y: number
}

/**
 * 内置的往返海试记录：左舷去程（含末端低速段）、右舷回程，以及一段未参与
 * 校正的斜风验证段。罗经误差 ±.5°、帆角误差 ±1°、每次定位误差 ±1.5 m。
 */
const rows: Row[] = [
  { id: 'out-1', leg: 'out', time: 0, compass: 41, sheet: 20.2, x: 149.8, y: 470.6 },
  { id: 'out-2', leg: 'out', time: 20, compass: 40.9, sheet: 20.2, x: 196.1, y: 427.8 },
  { id: 'out-3', leg: 'out', time: 40, compass: 41.2, sheet: 20.2, x: 240.5, y: 386.2 },
  { id: 'out-4', leg: 'out', time: 60, compass: 40.9, sheet: 20.2, x: 286.6, y: 344.9 },
  { id: 'out-5', leg: 'out', time: 80, compass: 41, sheet: 20.2, x: 332.1, y: 303.2 },
  { id: 'out-6', leg: 'out', time: 81, compass: 41, sheet: 20.2, x: 332.7, y: 303.4 },
  { id: 'out-7', leg: 'out', time: 82, compass: 41, sheet: 20.2, x: 333, y: 303.3 },
  { id: 'back-1', leg: 'back', time: 100, compass: 221.2, sheet: 32, x: 332, y: 303.6 },
  { id: 'back-2', leg: 'back', time: 120, compass: 220.8, sheet: 31.9, x: 290.7, y: 348.6 },
  { id: 'back-3', leg: 'back', time: 140, compass: 221.1, sheet: 31.9, x: 248.6, y: 394.8 },
  { id: 'back-4', leg: 'back', time: 160, compass: 221.1, sheet: 31.8, x: 207, y: 439.8 },
  { id: 'back-5', leg: 'back', time: 180, compass: 220.8, sheet: 31.8, x: 165.9, y: 485.4 },
  { id: 'val-1', leg: 'val', time: 210, compass: 245.9, sheet: 49.8, x: 720.3, y: 119.9 },
  { id: 'val-2', leg: 'val', time: 240, compass: 246, sheet: 49.8, x: 631.9, y: 147.2 },
  { id: 'val-3', leg: 'val', time: 270, compass: 246, sheet: 49.8, x: 543.4, y: 173.3 },
  { id: 'val-4', leg: 'val', time: 300, compass: 246.1, sheet: 50.4, x: 453.5, y: 200.4 },
  { id: 'val-5', leg: 'val', time: 330, compass: 245.9, sheet: 50.1, x: 364.8, y: 226.8 },
]

const meta: Omit<TrialLeg, 'readings'>[] = [
  { id: 'out', name: '去程 · 左舷', role: 'calibration', side: 'port', windFrom: 300, windKnots: 12 },
  { id: 'back', name: '回程 · 右舷', role: 'calibration', side: 'starboard', windFrom: 300, windKnots: 12 },
  { id: 'val', name: '斜风验证段', role: 'validation', side: 'starboard', windFrom: 150, windKnots: 16 },
]

const reading = (row: Row): TrialReading => ({
  id: row.id, time: row.time, compass: row.compass, sheet: row.sheet,
  fix: { x: row.x, y: row.y }, fixError: 1.5, compassError: .5, sheetError: 1,
})

export const DEMO_TRIAL: TrialData = {
  legs: meta.map(leg => ({ ...leg, readings: rows.filter(row => row.leg === leg.id).map(reading) })),
}

export const DEMO_TRUTH = { dev: 4, k: 2.5 }
