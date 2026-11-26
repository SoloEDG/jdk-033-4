export interface Point { x: number; y: number }

export interface Gate {
  id: string
  name: string
  center: Point
  bearing: number
  width: number
  buoySide: -1 | 1
  approach?: { center: Point; bearing: number; width: number }
}

export interface Course {
  id: string
  name: string
  size: Point
  start: Point
  heading: number
  gates: Gate[]
  hazards: { id: string; center: Point; radius: number }[]
}

export type WindMode = 'steady' | 'shifting'
export interface Wind { bearing: number; knots: number }
export interface Boat { position: Point; heading: number; knots: number; sheet: number; rudder: number }
export type RaceStatus = 'ready' | 'running' | 'paused' | 'finished' | 'abandoned'
export type EventKind = 'start' | 'mark' | 'collision' | 'deviation' | 'finish' | 'abandon'
export interface RaceEvent {
  id: string
  time: number
  kind: EventKind
  position: Point
  label: string
  penalty: number
}
export interface Sample {
  time: number
  boat: Boat
  wind: Wind
  nextGate: number
  penalty: number
  /** 仪表上的罗经读数（与船首差一个罗经偏差）。旧航迹可能没有。 */
  compass?: number
}
export type GateVerdict = 'pass' | 'maybe' | 'fail'
/** 出发时按当时的校正组合算出的过门判罚，随航次存档，回看时不再重算。 */
export interface GateCall {
  gateId: string
  gateName: string
  verdict: GateVerdict
  inside: number
  cross: number
  total: number
  span: [number, number] | null
  reason: string | null
}
export interface CalibrationSnapshot {
  label: string
  dev: number
  k: number
  retained: number
  roundTrip: number
  single: number
  devRange: [number, number]
  kRange: [number, number]
}
export interface VoyageRecord {
  calibration: CalibrationSnapshot | null
  calls: GateCall[]
  capturedAt: number
}
export interface Voyage {
  id: string
  date: string
  courseId: string
  windMode: WindMode
  status: 'finished' | 'abandoned'
  duration: number
  penalty: number
  samples: Sample[]
  events: RaceEvent[]
  record?: VoyageRecord
}
