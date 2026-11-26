import type { Point } from '../../../shared/race'

export type LegRole = 'calibration' | 'validation'
export type TackSide = 'port' | 'starboard'

export interface TrialReading {
  id: string
  time: number
  /** 罗经读数，0° 为北、顺时针 */
  compass: number
  /** 帆角，0–85° */
  sheet: number
  /** 定位，航图坐标 */
  fix: Point
  /** 定位误差上限（米） */
  fixError: number
  /** 罗经读数误差上限（度） */
  compassError: number
  /** 帆角读数误差上限（度） */
  sheetError: number
}

export interface TrialLeg {
  id: string
  name: string
  role: LegRole
  /** 受风舷侧：仅供标注，说明这是一次换舷 */
  side: TackSide
  /** 风来向，罗经方位 */
  windFrom: number
  windKnots: number
  readings: TrialReading[]
}

export interface TrialData {
  legs: TrialLeg[]
}

export interface Combo {
  dev: number
  k: number
}

export type SegmentStatus = 'usable' | 'indistinct'

export interface SegmentView {
  id: string
  legId: string
  legName: string
  role: LegRole
  side: TackSide
  fromId: string
  toId: string
  time: number
  duration: number
  distance: number
  errorSum: number
  bearing: number
  cone: number
  status: SegmentStatus
  windFrom: number
  compassA: number
  compassB: number
  sheetA: number
  sheetB: number
  compassError: number
  sheetError: number
  speedKnots: number
}

export interface FitSet {
  count: number
  dev: [number, number] | null
  k: [number, number] | null
}

export interface TrialFit {
  segments: SegmentView[]
  single: Combo[]
  singleLegName: string | null
  roundTrip: Combo[]
  retained: Combo[]
  dropped: number
  /** 单程合格集里偏差与横滑的相关系数：明显为负说明两种误差在单程中互相抵消 */
  singleCoupling: number | null
  calibrationLegs: number
  validationLegs: number
  calibrationSegments: number
  validationSegments: number
  excludedSegments: number
  gridSize: number
  singleSet: FitSet
  roundTripSet: FitSet
  retainedSet: FitSet
  message: string | null
}

export type GateVerdict = 'pass' | 'maybe' | 'fail'

export interface GateForecast {
  gateId: string
  gateName: string
  verdict: GateVerdict
  inside: number
  cross: number
  total: number
  span: [number, number] | null
  reason: string | null
}
