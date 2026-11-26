/**
 * 风压横滑与罗经偏差的共用模型。
 *
 * 角度约定：
 * - “罗经方位” 0° 北、顺时针；罗经读数 + 偏差 = 船首真方向。
 * - “航图角度” 0° 指向 +x、顺时针；航图角度 + 90° = 罗经方位。
 *
 * 海试求解、正式驾驶与过门预报都从这里取公式，避免三处各写一套。
 */

export interface Leeway {
  /** 罗经偏差（度），读数 + 偏差 = 船首真方向 */
  dev: number
  /** 横滑系数：帆角 100° 时的最大横滑角（度） */
  k: number
}

export const NO_LEEWAY: Leeway = { dev: 0, k: 0 }

const DEG = Math.PI / 180, RAD = 180 / Math.PI
export const normalize = (degrees: number) => ((degrees % 360) + 360) % 360

/** 帆角对风压横滑的放大系数：帆越松，船被推得越偏 */
export const sheetFactor = (sheet: number) => .8 + sheet / 100

/**
 * 风压横滑角（度）。船首相对风的夹角决定方向，帆角决定幅度，总是把船推向
 * 下风；k 是帆角 100° 时的最大横滑角。heading 与 windFrom 用同一套角度即可。
 */
export function leewayAngle(heading: number, sheet: number, windFrom: number, k: number): number {
  return k * sheetFactor(sheet) * Math.sin((heading - windFrom) * DEG)
}

/** 罗经读数 → 船首真方向 */
export const trueHeadingOf = (compass: number, dev: number) => normalize(compass + dev)

/** 驾驶用的换算：船首与风在航图角度里，罗经读数是“航图角度 + 90° − 偏差”。 */
export const compassFromChart = (chartHeading: number, dev: number) => normalize(chartHeading + 90 - dev)

/** 罗经方位 → 航图角度 */
export const chartAngleOf = (bearing: number) => bearing - 90

/** 航图角度 → 航图单位向量 */
export const chartVector = (angle: number): { x: number; y: number } => ({
  x: Math.cos(angle * DEG),
  y: Math.sin(angle * DEG),
})

/** 一组罗经读数与两个参数：对地航迹向（罗经方位） */
export function courseOverGround(compass: number, dev: number, sheet: number, windFrom: number, k: number): number {
  const heading = trueHeadingOf(compass, dev)
  return normalize(heading + leewayAngle(heading, sheet, windFrom, k))
}

/**
 * 正式驾驶用：船首航向是航图角度，风来向也是航图角度，
 * 直接在同一坐标系里加横滑，再交回航图角度。
 */
export function chartCourseOverGround(chartHeading: number, sheet: number, chartWindFrom: number, k: number): number {
  return chartHeading + leewayAngle(chartHeading, sheet, chartWindFrom, k)
}

/** 两个定位之间的航迹向（罗经方位） */
export function trackBearing(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return normalize(Math.atan2(to.x - from.x, -(to.y - from.y)) * RAD)
}

/** 平均两条航迹向，得到航段弦向 */
export function chordBearing(a: number, b: number): number {
  return normalize(Math.atan2(Math.sin(a * DEG) + Math.sin(b * DEG), Math.cos(a * DEG) + Math.cos(b * DEG)) * RAD)
}
