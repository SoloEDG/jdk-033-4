import { computed, ref } from 'vue'
import { DEMO_TRIAL, DEMO_TRUTH } from '../lib/demo'
import { bestCombo, solveTrial } from '../lib/solver'
import type { Combo } from '../lib/types'
import { draftFromData, emptyLeg, emptyReading, parseDraft, type DraftLeg } from './draft'

const STORE_KEY = 'mark-regatta-trial-v1'

interface Stored {
  draft: DraftLeg[]
  chosen: Combo | null
}

function load(): Stored | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Stored | null
    if (!value || !Array.isArray(value.draft) || !value.draft.length) return null
    const draft = value.draft.filter(leg => leg && typeof leg.id === 'string' && Array.isArray(leg.readings))
    if (!draft.length) return null
    const chosen = value.chosen && Number.isFinite(value.chosen.dev) && Number.isFinite(value.chosen.k)
      ? { dev: value.chosen.dev, k: value.chosen.k } : null
    return { draft, chosen }
  } catch { return null }
}

function save(value: Stored) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(value)) } catch { /* 仅存于当前页面 */ }
}

const initial = load()

/* 单一实例：海试编辑与正式驾驶共用同一份校正结果 */
const draft = ref<DraftLeg[]>(initial?.draft ?? draftFromData(DEMO_TRIAL))
const chosen = ref<Combo | null>(initial?.chosen ?? { dev: DEMO_TRUTH.dev, k: DEMO_TRUTH.k })

const parsed = computed(() => parseDraft(draft.value))
const data = computed(() => parsed.value.data)
const fit = computed(() => solveTrial(data.value))
const issues = computed(() => parsed.value.issues)

const retained = computed(() => fit.value.retained)
/** 锁定的一组：必须仍在保留集里，否则自动退回最贴合观测的一组 */
const auto = computed(() => {
  const pick = chosen.value
  if (pick && retained.value.some(combo => Math.abs(combo.dev - pick.dev) < 1e-6 && Math.abs(combo.k - pick.k) < 1e-6)) {
    return false
  }
  return Boolean(retained.value.length)
})
const effective = computed<Combo | null>(() => {
  const pick = chosen.value
  if (pick && retained.value.some(combo => Math.abs(combo.dev - pick.dev) < 1e-6 && Math.abs(combo.k - pick.k) < 1e-6)) {
    return pick
  }
  return bestCombo(data.value, retained.value) ?? retained.value[0] ?? null
})

function persist() {
  save({ draft: draft.value, chosen: chosen.value })
}

function addLeg() {
  draft.value = [...draft.value, emptyLeg(draft.value.length)]
  persist()
}

function removeLeg(id: string) {
  draft.value = draft.value.filter(leg => leg.id !== id)
  persist()
}

function addReading(legId: string) {
  draft.value = draft.value.map(leg => leg.id === legId ? { ...leg, readings: [...leg.readings, emptyReading()] } : leg)
  persist()
}

function removeReading(legId: string, readingId: string) {
  draft.value = draft.value.map(leg => leg.id === legId
    ? { ...leg, readings: leg.readings.filter(reading => reading.id !== readingId) }
    : leg)
  persist()
}

function updateLeg(id: string, patch: Partial<Omit<DraftLeg, 'readings' | 'id'>>) {
  draft.value = draft.value.map(leg => leg.id === id ? { ...leg, ...patch } : leg)
  persist()
}

function updateReading(legId: string, readingId: string, patch: Partial<Omit<DraftLeg['readings'][number], 'id'>>) {
  draft.value = draft.value.map(leg => leg.id === legId
    ? { ...leg, readings: leg.readings.map(reading => reading.id === readingId ? { ...reading, ...patch } : reading) }
    : leg)
  persist()
}

function choose(combo: Combo | null) {
  chosen.value = combo
  persist()
}

function restoreDemo() {
  draft.value = draftFromData(DEMO_TRIAL)
  chosen.value = { dev: DEMO_TRUTH.dev, k: DEMO_TRUTH.k }
  persist()
}

/** 几组有代表性的边界组合，用来对比落点 */
const representatives = computed<Combo[]>(() => {
  if (!retained.value.length) return []
  const picks: Combo[] = [...retained.value]
    .sort((a, b) => a.dev - b.dev || a.k - b.k)
    .filter((_, index, list) => index === 0 || index === list.length - 1 || index === Math.floor(list.length / 2))
  for (const key of ['k', 'dev'] as const) {
    const sorted = [...retained.value].sort((a, b) => a[key] - b[key])
    picks.push(sorted[0], sorted[sorted.length - 1])
  }
  const seen = new Set<string>()
  return picks.filter(combo => {
    const key = `${combo.dev}/${combo.k}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

export function useTrial() {
  return {
    draft, data, fit, issues, retained, chosen, effective, auto, representatives,
    addLeg, removeLeg, addReading, removeReading, updateLeg, updateReading, choose, restoreDemo,
  }
}
