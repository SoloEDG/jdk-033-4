<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Plus, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { clock } from '../../../shared/format'
import { buildPreview } from '../lib/preview'
import { comboLabel, verdictLabel } from '../lib/solver'
import type { Combo, TrialData, TrialFit } from '../lib/types'
import type { DraftLeg } from '../model/draft'

const props = defineProps<{
  open: boolean
  draft: DraftLeg[]
  data: TrialData
  fit: TrialFit
  issues: { legId: string; readingId: string | null; message: string }[]
  chosen: Combo | null
  effective: Combo | null
  representatives: Combo[]
  locked: boolean
}>()
const emit = defineEmits<{
  close: []
  leg: [id: string, patch: Record<string, string>]
  addLeg: []
  removeLeg: [id: string]
  addReading: [legId: string]
  removeReading: [legId: string, readingId: string]
  reading: [legId: string, readingId: string, patch: Record<string, string>]
  choose: [combo: Combo | null]
  demo: []
}>()

const issuesFor = (legId: string, readingId: string | null) =>
  props.issues.filter(issue => issue.legId === legId && issue.readingId === readingId).map(issue => issue.message)

const legIssues = (legId: string) => [...new Set(issuesFor(legId, null))]
const readingIssues = (legId: string, readingId: string) => [...new Set(issuesFor(legId, readingId))]

const preview = computed(() => props.open
  ? buildPreview(props.data, props.fit.retained, props.representatives)
  : null)

const chosenKey = computed(() => props.chosen ? `${props.chosen.dev}/${props.chosen.k}` : '')
const zone = (label: string, set: TrialFit['singleSet']) =>
  `${label} ${set.count} 组` + (set.dev && set.k
    ? ` · 偏差 ${set.dev[0].toFixed(1)}–${set.dev[1].toFixed(1)}° · 横滑 ${set.k[0].toFixed(1)}–${set.k[1].toFixed(1)}`
    : '')

const excluded = computed(() => props.fit.segments.filter(seg => seg.status !== 'usable'))
const usable = computed(() => props.fit.segments.filter(seg => seg.status === 'usable'))
const rowFor = (combo: Combo) => preview.value?.rows.find(row => row.combo.dev === combo.dev && row.combo.k === combo.k) ?? null
const expanded = ref<string | null>(null)
const showAll = ref(false)
const comboList = computed(() => {
  const list = props.fit.retained
  if (showAll.value || list.length <= 48) return list
  const step = Math.ceil(list.length / 48)
  return list.filter((_, i) => i % step === 0)
})

function toggle(id: string) { expanded.value = expanded.value === id ? null : id }
</script>

<template>
  <div v-if="open" class="scrim" @click.self="$emit('close')">
    <section class="workbench" role="dialog" aria-modal="true" aria-label="海试样本与校正">
      <header class="workbench-head">
        <div>
          <h2>海试样本 · 往返校正</h2>
          <p>每次读数都可标出误差上限；位移落在定位误差之和以内的航段不参与求向。</p>
        </div>
        <div class="workbench-tools">
          <button type="button" class="ghost-button" :disabled="locked" @click="$emit('demo')"><RotateCcw :size="14"/> 复原示例</button>
          <button type="button" class="icon-button" title="关闭" aria-label="关闭" @click="$emit('close')"><X :size="17"/></button>
        </div>
      </header>

      <nav class="workbench-tabs">
        <button type="button" :aria-pressed="!showAll" @click="showAll = false">保留组合</button>
        <button type="button" :aria-pressed="showAll" @click="showAll = true">落点对比</button>
      </nav>

      <div class="workbench-body">
        <div class="workbench-left">
          <section v-for="(leg, index) in draft" :key="leg.id" class="leg-card">
            <header>
              <label class="leg-name"><span>航段</span><input :value="leg.name" :disabled="locked" aria-label="航段名称" @input="$emit('leg', leg.id, { name: ($event.target as HTMLInputElement).value })"></label>
              <select :value="leg.role" :disabled="locked" aria-label="航段用途" @change="$emit('leg', leg.id, { role: ($event.target as HTMLSelectElement).value })">
                <option value="calibration">校正</option>
                <option value="validation">验证</option>
              </select>
              <select :value="leg.side" :disabled="locked" aria-label="受风舷" @change="$emit('leg', leg.id, { side: ($event.target as HTMLSelectElement).value })">
                <option value="port">左舷</option>
                <option value="starboard">右舷</option>
              </select>
              <span class="leg-wind">
                <label>风来向<input :value="leg.windFrom" :disabled="locked" inputmode="decimal" @input="$emit('leg', leg.id, { windFrom: ($event.target as HTMLInputElement).value })"></label>
                <label>节<input :value="leg.windKnots" :disabled="locked" inputmode="decimal" @input="$emit('leg', leg.id, { windKnots: ($event.target as HTMLInputElement).value })"></label>
              </span>
              <button type="button" class="icon-button small" title="删除航段" aria-label="删除航段" :disabled="locked || draft.length <= 2" @click="$emit('removeLeg', leg.id)"><Trash2 :size="14"/></button>
            </header>
            <p v-for="message in legIssues(leg.id)" :key="message" class="leg-issue">{{ message }}</p>
            <div class="reading-grid" role="table">
              <span role="columnheader">时刻</span>
              <span role="columnheader">罗经°</span>
              <span role="columnheader">帆角°</span>
              <span role="columnheader">定位 x</span>
              <span role="columnheader">定位 y</span>
              <span role="columnheader">定位±</span>
              <span role="columnheader">罗经±</span>
              <span role="columnheader">帆角±</span>
              <span role="columnheader"></span>
              <template v-for="reading in leg.readings" :key="reading.id">
                <input :value="reading.time" :disabled="locked" inputmode="decimal" aria-label="时刻" @input="$emit('reading', leg.id, reading.id, { time: ($event.target as HTMLInputElement).value })">
                <input :value="reading.compass" :disabled="locked" inputmode="decimal" aria-label="罗经" @input="$emit('reading', leg.id, reading.id, { compass: ($event.target as HTMLInputElement).value })">
                <input :value="reading.sheet" :disabled="locked" inputmode="decimal" aria-label="帆角" @input="$emit('reading', leg.id, reading.id, { sheet: ($event.target as HTMLInputElement).value })">
                <input :value="reading.x" :disabled="locked" inputmode="decimal" aria-label="定位 x" @input="$emit('reading', leg.id, reading.id, { x: ($event.target as HTMLInputElement).value })">
                <input :value="reading.y" :disabled="locked" inputmode="decimal" aria-label="定位 y" @input="$emit('reading', leg.id, reading.id, { y: ($event.target as HTMLInputElement).value })">
                <input :value="reading.fixError" :disabled="locked" inputmode="decimal" aria-label="定位误差上限" @input="$emit('reading', leg.id, reading.id, { fixError: ($event.target as HTMLInputElement).value })">
                <input :value="reading.compassError" :disabled="locked" inputmode="decimal" aria-label="罗经误差上限" @input="$emit('reading', leg.id, reading.id, { compassError: ($event.target as HTMLInputElement).value })">
                <input :value="reading.sheetError" :disabled="locked" inputmode="decimal" aria-label="帆角误差上限" @input="$emit('reading', leg.id, reading.id, { sheetError: ($event.target as HTMLInputElement).value })">
                <button type="button" class="icon-button small" title="删除读数" aria-label="删除读数" :disabled="locked || leg.readings.length <= 2" @click="$emit('removeReading', leg.id, reading.id)"><Trash2 :size="13"/></button>
                <p v-if="readingIssues(leg.id, reading.id).length" class="reading-issue">{{ readingIssues(leg.id, reading.id).join('；') }}</p>
              </template>
            </div>
            <button type="button" class="ghost-button small" :disabled="locked" @click="$emit('addReading', leg.id)"><Plus :size="13"/> 加读数</button>
          </section>
          <button type="button" class="ghost-button" :disabled="locked || draft.length >= 6" @click="$emit('addLeg')"><Plus :size="14"/> 加航段</button>
        </div>

        <div class="workbench-right">
          <section class="fit-card">
            <h3>候选参数</h3>
            <dl>
              <div><dt>单程</dt><dd data-testid="wb-single">{{ fit.single.length }}</dd></div>
              <div><dt>往返</dt><dd data-testid="wb-roundtrip">{{ fit.roundTrip.length }}</dd></div>
              <div><dt>保留</dt><dd data-testid="wb-retained">{{ fit.retained.length }}</dd></div>
              <div><dt>低速剔除</dt><dd>{{ fit.excludedSegments }}</dd></div>
            </dl>
            <p class="fit-note">{{ zone('单程可容', fit.singleSet) }}<template v-if="fit.singleLegName">（{{ fit.singleLegName }}）</template></p>
            <p class="fit-note">{{ zone('换舷后', fit.roundTripSet) }}</p>
            <p class="fit-note">{{ zone('验证后', fit.retainedSet) }}</p>
            <p v-if="fit.singleCoupling !== null && fit.singleCoupling < -.35" class="fit-note coupling-note" data-testid="coupling-note">
              单程合格集里偏差与横滑相关系数 {{ fit.singleCoupling.toFixed(2) }}：
              两种误差在单程中互相抵消，只看一段分不开，换舷后才收窄。
            </p>
            <p v-if="fit.message" class="leg-issue">{{ fit.message }}</p>
            <p v-else class="fit-note">保留集只取决于仍落在各段误差范围内的组合，验证段不参与校正。</p>
          </section>

          <section class="fit-card">
            <h3>航段判定 <b>{{ usable.length }} 向 / {{ excluded.length }} 弃</b></h3>
            <ul class="segment-list">
              <li v-for="seg in fit.segments" :key="seg.id" :data-status="seg.status">
                <button type="button" @click="toggle(seg.id)">
                  <ChevronDown :size="12"/>
                  <span>{{ seg.legName }}</span>
                  <time>{{ clock(seg.time) }}</time>
                  <b>{{ seg.status === 'usable' ? '可定向' : '位移在误差内' }}</b>
                </button>
                <p v-if="expanded === seg.id" class="segment-detail">
                  位移 {{ seg.distance.toFixed(1) }} m / 误差合计 {{ seg.errorSum.toFixed(1) }} m，
                  航迹 {{ seg.bearing.toFixed(1) }}°，允许偏差 ±{{ seg.cone.toFixed(1) }}°。
                </p>
              </li>
            </ul>
          </section>

          <section v-if="!showAll" class="fit-card">
            <h3>保留组合 <b>{{ fit.retained.length }}</b></h3>
            <div class="combo-grid">
              <button v-for="combo in comboList" :key="`${combo.dev}/${combo.k}`" type="button"
                :aria-pressed="chosenKey === `${combo.dev}/${combo.k}`" :disabled="locked"
                @click="$emit('choose', combo)">{{ combo.dev.toFixed(1) }} / {{ combo.k.toFixed(1) }}</button>
            </div>
            <p v-if="!fit.retained.length" class="fit-note">还没有保留组合。</p>
            <div class="chosen-row">
              <span data-testid="wb-effective">{{ effective ? comboLabel(effective) : '未锁定参数' }}</span>
              <button type="button" class="ghost-button small" :disabled="locked || !fit.retained.length" @click="$emit('choose', fit.retained[0])">取第一组</button>
            </div>
          </section>

          <section v-else class="fit-card">
            <h3>落点对比 <b>{{ representatives.length }} 组</b></h3>
            <p class="fit-note">把验证段末端当作起点，帆角不变：换舷后仍合格的各组参数会把船带到不同落点。</p>
            <ul class="landfall-list">
              <li v-for="combo in representatives" :key="`${combo.dev}/${combo.k}`">
                <button type="button" :aria-pressed="chosenKey === `${combo.dev}/${combo.k}`" :disabled="locked" @click="$emit('choose', combo)">
                  <span>{{ comboLabel(combo) }}</span>
                  <b :data-inside="rowFor(combo)?.inside">{{ rowFor(combo) ? (rowFor(combo)!.inside ? '命中门线' : '偏出门线') : '无法到达' }}</b>
                </button>
              </li>
            </ul>
            <p v-if="preview?.spread" class="fit-note">
              落点跨度 {{ preview.spread.spread.toFixed(0) }} m；门线宽 {{ preview.gate.width }} m，
              {{ preview.spread.inside }} / {{ preview.spread.count }} 组命中。
            </p>
            <p v-if="preview" class="fit-note">
              检验门线判定：<b data-testid="preview-verdict">{{ verdictLabel[preview.call.verdict] }}</b>
              （{{ preview.call.inside }} / {{ preview.call.total }}）
            </p>
            <p v-else class="fit-note">还没有可用于验证的样本。</p>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>
