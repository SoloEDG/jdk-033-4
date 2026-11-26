import {
  chordBearing, chartAngleOf, chartVector, courseOverGround, normalize, trackBearing,
} from '../../../shared/leeway'
import type { Gate, Point } from '../../../shared/race'
import type {
  Combo, FitSet, GateForecast, GateVerdict, SegmentView, TrialData, TrialFit, TrialLeg, TrialReading,
} from './types'

/** 定位误差之外再留的航向余量（度） */
const SLACK = .25
const DEV_MIN = -12
const DEV_MAX = 18
const DEV_STEP = .5
const K_MAX = 6
const K_STEP = .1

export { sheetFactor } from '../../../shared/leeway'

interface WorkSegment {
  view: SegmentView
  from: TrialReading
  to: TrialReading
  windFrom: number
}

function buildSegments(leg: TrialLeg): WorkSegment[] {
  const readings = [...leg.readings].sort((a, b) => a.time - b.time)
  const out: WorkSegment[] = []
  for (let i = 0; i < readings.length - 1; i++) {
    const from = readings[i]
    const to = readings[i + 1]
    const duration = to.time - from.time
    if (!(duration > 0)) continue
    const distance = Math.hypot(to.fix.x - from.fix.x, to.fix.y - from.fix.y)
    const errorSum = from.fixError + to.fixError
    const bearing = trackBearing(from.fix, to.fix)
    // 两个定位各自的误差圆叠加，允许的方向偏差就是这段锥角
    const cone = Math.min(Math.atan2(errorSum, Math.max(distance, 1e-6)) * 180 / Math.PI, 179.9)
    const status = distance <= errorSum ? 'indistinct' : 'usable'
    out.push({
      from, to, windFrom: leg.windFrom,
      view: {
        id: `${leg.id}:${from.id}-${to.id}`,
        legId: leg.id,
        legName: leg.name,
        role: leg.role,
        side: leg.side,
        fromId: from.id,
        toId: to.id,
        time: from.time,
        duration,
        distance,
        errorSum,
        bearing,
        cone,
        status,
        windFrom: leg.windFrom,
        compassA: from.compass,
        compassB: to.compass,
        sheetA: from.sheet,
        sheetB: to.sheet,
        compassError: (from.compassError + to.compassError) / 2,
        sheetError: (from.sheetError + to.sheetError) / 2,
        speedKnots: distance / duration * 1.943844,
      },
    })
  }
  return out
}

/** 该航段观测方向允许的偏差：定位锥 + 罗经误差 + 帆角误差经 k 放大的横滑差 + 小余量 */
export function segmentTolerance(view: SegmentView, dev: number, k: number): number {
  const sheetEffect = k * Math.abs(Math.sin((view.compassA + dev - view.windFrom) * Math.PI / 180)) * view.sheetError / 100
  return view.cone + view.compassError + sheetEffect + SLACK
}

function predictedBearing(seg: WorkSegment, dev: number, k: number): number {
  return chordBearing(
    courseOverGround(seg.from.compass, dev, seg.from.sheet, seg.windFrom, k),
    courseOverGround(seg.to.compass, dev, seg.to.sheet, seg.windFrom, k),
  )
}

function residual(seg: WorkSegment, dev: number, k: number): number {
  return Math.abs(normalize(predictedBearing(seg, dev, k) - seg.view.bearing + 180) - 180)
}

function fits(segments: WorkSegment[], dev: number, k: number): boolean {
  for (const seg of segments) {
    if (residual(seg, dev, k) > segmentTolerance(seg.view, dev, k)) return false
  }
  return true
}

function makeGrid(): Combo[] {
  const out: Combo[] = []
  for (let dev = DEV_MIN; dev <= DEV_MAX + 1e-9; dev += DEV_STEP) {
    for (let k = 0; k <= K_MAX + 1e-9; k += K_STEP) {
      out.push({ dev: Math.round(dev * 100) / 100, k: Math.round(k * 100) / 100 })
    }
  }
  return out
}

const GRID = makeGrid()

function extent(combos: Combo[], key: 'dev' | 'k'): [number, number] | null {
  if (!combos.length) return null
  const values = combos.map(combo => combo[key])
  return [Math.min(...values), Math.max(...values)]
}

function summarise(combos: Combo[]): FitSet {
  return { count: combos.length, dev: extent(combos, 'dev'), k: extent(combos, 'k') }
}

/** 偏差与横滑在合格集里是否显著耦合：单程中两者常互相抵消 */
function coupling(combos: Combo[]): number | null {
  if (combos.length < 8) return null
  const meanDev = combos.reduce((sum, combo) => sum + combo.dev, 0) / combos.length
  const meanK = combos.reduce((sum, combo) => sum + combo.k, 0) / combos.length
  let cov = 0, varDev = 0, varK = 0
  for (const combo of combos) {
    cov += (combo.dev - meanDev) * (combo.k - meanK)
    varDev += (combo.dev - meanDev) ** 2
    varK += (combo.k - meanK) ** 2
  }
  if (varDev < 1e-9 || varK < 1e-9) return null
  return cov / Math.sqrt(varDev * varK)
}

export const EMPTY_FIT: TrialFit = {
  segments: [], single: [], singleLegName: null, roundTrip: [], retained: [], dropped: 0, singleCoupling: null,
  calibrationLegs: 0, validationLegs: 0, calibrationSegments: 0, validationSegments: 0,
  excludedSegments: 0, gridSize: 0,
  singleSet: { count: 0, dev: null, k: null },
  roundTripSet: { count: 0, dev: null, k: null },
  retainedSet: { count: 0, dev: null, k: null },
  message: '还没有录入任何海试样本',
}

export function solveTrial(data: TrialData): TrialFit {
  const legs = data.legs.filter(leg => leg.readings.length >= 2)
  const calibration = legs.filter(leg => leg.role === 'calibration')
  const validation = legs.filter(leg => leg.role === 'validation')
  const segments = legs.flatMap(buildSegments)
  const views = segments.map(seg => seg.view)
  const usable = segments.filter(seg => seg.view.status === 'usable')
  const excluded = segments.length - usable.length
  const messages: string[] = []

  const base = {
    ...EMPTY_FIT,
    segments: views,
    excludedSegments: excluded,
    calibrationLegs: calibration.length,
    validationLegs: validation.length,
    gridSize: GRID.length,
  }

  if (!legs.length) return base
  if (!usable.length) {
    return { ...base, message: excluded ? '所有航段的位移都落在定位误差之内，无法确定运动方向' : '样本不足，无法组成航段' }
  }
  if (!calibration.length) return { ...base, message: '至少需要一段标为“校正”的航段' }

  const calSegments = usable.filter(seg => seg.view.role === 'calibration')
  const valSegments = usable.filter(seg => seg.view.role === 'validation')
  if (!calSegments.length) return { ...base, message: '校正航段在低速段全部不可用，无法确定运动方向' }

  const firstLegId = calibration[0].id
  const singleSegments = calSegments.filter(seg => seg.view.legId === firstLegId)
  const single = GRID.filter(combo => fits(singleSegments, combo.dev, combo.k))
  const roundTrip = GRID.filter(combo => fits(calSegments, combo.dev, combo.k))
  const retained = valSegments.length
    ? roundTrip.filter(combo => fits(valSegments, combo.dev, combo.k))
    : [...roundTrip]

  if (!roundTrip.length) {
    messages.push('校正航段之间互相矛盾，没有一组参数能同时满足误差范围')
  } else if (!validation.length) {
    messages.push('还没有未参与校正的验证航段')
  } else if (!valSegments.length) {
    messages.push('验证航段的位移都落在定位误差之内，不能用于核验')
  }

  return {
    ...base,
    single, singleLegName: calibration[0].name,
    roundTrip, retained,
    dropped: roundTrip.length - retained.length,
    singleCoupling: coupling(single),
    calibrationSegments: calSegments.length,
    validationSegments: valSegments.length,
    singleSet: summarise(single),
    roundTripSet: summarise(roundTrip),
    retainedSet: summarise(retained),
    message: messages.length ? messages.join('；') : null,
  }
}

/** 两读数之间的位移是否被误差盖住：低速时不能拿这段定方向 */
export function isIndistinct(from: TrialReading, to: TrialReading): SegmentView['status'] {
  const distance = Math.hypot(to.fix.x - from.fix.x, to.fix.y - from.fix.y)
  return distance <= from.fixError + to.fixError ? 'indistinct' : 'usable'
}

export interface ForecastInput {
  position: Point
  /** 罗经读数 */
  compass: number
  sheet: number
  /** 风来向（罗经方位） */
  windFrom: number
}

export interface InsideHit {
  across: number
  inside: boolean
  reach: number
  point: Point
  course: number
}
export interface MissedHit { reason: string }

export function projectGate(
  input: ForecastInput,
  combo: Combo,
  gate: Pick<Gate, 'center' | 'bearing' | 'width'>,
): InsideHit | MissedHit {
  const course = courseOverGround(input.compass, combo.dev, input.sheet, input.windFrom, combo.k)
  const travel = chartVector(chartAngleOf(course))
  const normal = chartVector(gate.bearing)
  const acrossAxis = chartVector(gate.bearing + 90)
  const offset = (input.position.x - gate.center.x) * normal.x + (input.position.y - gate.center.y) * normal.y
  const closing = travel.x * normal.x + travel.y * normal.y
  if (Math.abs(closing) < 1e-9) return { reason: '航向与门线平行' }
  if (offset >= 0) return { reason: '已越过门线' }
  if (closing <= 0) return { reason: '背向门线' }
  const reach = -offset / closing
  const point = { x: input.position.x + travel.x * reach, y: input.position.y + travel.y * reach }
  const across = (point.x - gate.center.x) * acrossAxis.x + (point.y - gate.center.y) * acrossAxis.y
  return { across, inside: Math.abs(across) <= gate.width / 2, reach, point, course }
}

/** 单组参数沿当前帆角与舵效继续，与某条门线的交点 */
export function landfallOf(input: ForecastInput, combo: Combo, gate: Pick<Gate, 'center' | 'bearing' | 'width'>) {
  const hit = projectGate(input, combo, gate)
  return 'reason' in hit ? null : { ...hit, combo }
}

export function landfallSpread(input: ForecastInput, combos: Combo[], gate: Pick<Gate, 'center' | 'bearing' | 'width'>) {
  const hits = combos
    .map(combo => landfallOf(input, combo, gate))
    .filter((hit): hit is NonNullable<typeof hit> => Boolean(hit))
  if (!hits.length) return null
  const values = hits.map(hit => hit.across)
  return {
    hits,
    inside: hits.filter(hit => hit.inside).length,
    count: hits.length,
    span: [Math.min(...values), Math.max(...values)] as [number, number],
    spread: Math.max(...values) - Math.min(...values),
  }
}

export function classify(inside: number, cross: number, total: number): GateVerdict {
  if (!total || !cross || !inside) return 'fail'
  if (inside === total) return 'pass'
  return 'maybe'
}

export function forecastGates(
  input: ForecastInput,
  combos: Combo[],
  gates: Pick<Gate, 'id' | 'name' | 'center' | 'bearing' | 'width'>[],
): GateForecast[] {
  return gates.map(gate => {
    let inside = 0
    let cross = 0
    let reason: string | null = null
    const offsets: number[] = []
    for (const combo of combos) {
      const hit = projectGate(input, combo, gate)
      if ('reason' in hit) { reason = hit.reason; continue }
      cross++
      offsets.push(hit.across)
      if (hit.inside) inside++
    }
    const verdict = classify(inside, cross, combos.length)
    return {
      gateId: gate.id,
      gateName: gate.name,
      verdict,
      inside,
      cross,
      total: combos.length,
      span: offsets.length ? [Math.min(...offsets), Math.max(...offsets)] : null,
      reason: verdict === 'fail' && cross === 0 ? reason ?? '没有组合能到达门线' : null,
    }
  })
}

export const verdictLabel: Record<GateVerdict, string> = { pass: '必过', maybe: '可能过', fail: '不能过' }

export const comboLabel = (combo: Combo) => `偏差 ${combo.dev.toFixed(1)}° · 横滑 ${combo.k.toFixed(1)}`

/**
 * 在保留集里挑最贴合观测的一组：所有航段的“残差 / 容差”最大值最小。
 * 只用于给驾驶一个默认值，不会挑到误差范围之外的组合。
 */
export function bestCombo(data: TrialData, combos: Combo[]): Combo | null {
  if (!combos.length) return null
  const segments = data.legs.flatMap(buildSegments).filter(seg => seg.view.status === 'usable')
  if (!segments.length) return combos[0]
  let best = combos[0]
  let bestScore = Infinity
  for (const combo of combos) {
    let worst = 0
    for (const seg of segments) {
      const limit = segmentTolerance(seg.view, combo.dev, combo.k)
      const score = limit > 0 ? residual(seg, combo.dev, combo.k) / limit : 0
      if (score > worst) worst = score
    }
    if (worst < bestScore) { bestScore = worst; best = combo }
  }
  return best
}

export { chordBearing, courseOverGround, normalize }
export type { Gate, Point }
