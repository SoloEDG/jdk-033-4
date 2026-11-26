import { bestCombo, courseOverGround, forecastGates, landfallOf, landfallSpread } from './solver'
import type { Combo, TrialData, TrialFit } from './types'
import type { Point } from '../../../shared/race'

const DEG = Math.PI / 180

export interface PlanCourse {
  compass: number
  sheet: number
  windFrom: number
  windKnots: number
}

export interface PreviewRow {
  combo: Combo
  inside: boolean
  across: number
  point: Point
}

export interface Preview {
  origin: Point
  plan: PlanCourse
  gate: { id: string; name: string; center: Point; bearing: number; width: number }
  input: { position: Point; compass: number; sheet: number; windFrom: number }
  spread: ReturnType<typeof landfallSpread>
  call: ReturnType<typeof forecastGates>[number]
  anchor: Combo
  total: number
}

/**
 * 验证段末端的模拟过门：同一段实测航向、同一张帆，几组仍合格的参数会把船带到
 * 哪。门线横向摆放，宽度 40 m，落点差别直接读得出来。
 */
export function buildPreview(data: TrialData, combos: Combo[], selected: Combo[]): (Preview & { rows: PreviewRow[] }) | null {
  const leg = data.legs.find(item => item.role === 'validation')
  const last = leg?.readings.at(-1)
  if (!leg || !last || !combos.length) return null
  const anchor = bestCombo(data, combos) ?? combos[0]
  const plan: PlanCourse = { compass: 106, sheet: 40, windFrom: leg.windFrom, windKnots: leg.windKnots }
  const course = courseOverGround(plan.compass, anchor.dev, plan.sheet, plan.windFrom, anchor.k)
  // 航图角度 = 罗经方位 - 90°
  const bearing = course - 90
  const travel = { x: Math.cos(bearing * DEG), y: Math.sin(bearing * DEG) }
  const center: Point = { x: last.fix.x + travel.x * 620, y: last.fix.y + travel.y * 620 }
  const gate = { id: 'preview', name: '检验门线', center, bearing, width: 40 }
  const input = { position: last.fix, compass: plan.compass, sheet: plan.sheet, windFrom: plan.windFrom }
  const rows: PreviewRow[] = []
  for (const combo of selected) {
    const hit = landfallOf(input, combo, gate)
    if (hit) rows.push({ combo, inside: hit.inside, across: hit.across, point: hit.point })
  }
  return {
    origin: last.fix,
    plan,
    gate,
    input,
    spread: landfallSpread(input, combos, gate),
    call: forecastGates(input, combos, [gate])[0],
    anchor,
    total: combos.length,
    rows,
  }
}
