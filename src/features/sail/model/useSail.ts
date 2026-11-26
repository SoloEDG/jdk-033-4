import { ref } from 'vue'
import { clamp, normalize } from '../../../shared/math'
import type { Course, Wind } from '../../../shared/race'
import { advanceBoat, NO_CALIBRATION, type Calibration } from '../lib/dynamics'

const atStart = (course: Course) => ({ position: { ...course.start }, heading: normalize(course.heading), knots: 0, sheet: 39, rudder: 0 })

export function useSail(course: Course) {
  const boat = ref(atStart(course))
  const reset = () => { boat.value = atStart(course) }
  const steer = (direction: number) => { boat.value = { ...boat.value, rudder: clamp(direction, -1, 1) } }
  const sheet = (value: number) => { boat.value = { ...boat.value, sheet: clamp(value, 0, 85) } }
  const step = (wind: Wind, seconds: number, calibration: Calibration = NO_CALIBRATION) =>
    advanceBoat(boat.value, wind, seconds, calibration)
  return { boat, reset, steer, sheet, step }
}
