import type { Voyage } from '../../../shared/race'

const key = 'mark-regatta-v1'

export function loadVoyages(): Voyage[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    if (!Array.isArray(value)) return []
    return value
      .filter((v): v is Voyage => Boolean(v) && typeof (v as Voyage).id === 'string' &&
        ((v as Voyage).status === 'finished' || (v as Voyage).status === 'abandoned') &&
        Number.isFinite((v as Voyage).duration) &&
        Array.isArray((v as Voyage).samples) && (v as Voyage).samples.length > 0 &&
        Array.isArray((v as Voyage).events))
      .map(normalizeVoyage)
  } catch { return [] }
}

export function saveVoyages(voyages: Voyage[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(voyages))
    return true
  } catch { return false }
}

/** 只补新字段，不改动旧航次已有的事件、读数与罚时 */
export function normalizeVoyage(voyage: Voyage): Voyage {
  if (voyage.record) return voyage
  return { ...voyage, record: { calibration: null, calls: [], capturedAt: 0 } }
}
