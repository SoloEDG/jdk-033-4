import { chartCourseOverGround } from '../../../shared/leeway'
import { angleDelta, axis, clamp, normalize } from '../../../shared/math'
import type { Boat, Wind } from '../../../shared/race'

export interface Calibration { dev: number; k: number }

export const NO_CALIBRATION: Calibration = { dev: 0, k: 0 }

/**
 * 正式驾驶：船首按舵角转，风压横滑把船推向下风。横滑角与海试求解共用同一个
 * k。罗经偏差只影响仪表读数，不改变船的实际移动。
 */
export function advanceBoat(boat: Boat, wind: Wind, dt: number, calibration: Calibration = NO_CALIBRATION): Boat {
  const turn = boat.rudder * (26 + Math.min(boat.knots, 18))
  const heading = normalize(boat.heading + turn * dt)
  const fromWind = Math.abs(angleDelta(heading, wind.bearing))
  const preferredSheet = clamp((fromWind - 37) * .55, 9, 78)
  const trim = Math.max(.08, 1 - Math.abs(boat.sheet - preferredSheet) / 69)
  const lift = clamp((fromWind - 32) / 45, 0, 1) * (1 - Math.max(0, fromWind - 110) / 180)
  const target = .65 + wind.knots * 1.03 * lift * trim
  const knots = boat.knots + (target - boat.knots) * (1 - Math.exp(-dt * 1.45))
  // 航迹 = 船首方向 + 风压横滑；wind.bearing 是风来向（航图角度）
  const course = chartCourseOverGround(heading, boat.sheet, wind.bearing, calibration.k)
  const v = axis(course)
  const travel = knots * 3.65 * dt
  return {
    ...boat, heading, knots,
    position: { x: boat.position.x + v.x * travel, y: boat.position.y + v.y * travel },
  }
}
