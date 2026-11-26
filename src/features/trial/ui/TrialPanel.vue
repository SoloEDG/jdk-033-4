<script setup lang="ts">
import { computed } from 'vue'
import { Compass, FlaskConical } from 'lucide-vue-next'
import type { TrialFit } from '../lib/types'
import type { Combo } from '../lib/types'

const props = defineProps<{ fit: TrialFit; effective: Combo | null; auto: boolean; locked: boolean }>()
defineEmits<{ open: [] }>()

const retained = computed(() => props.fit.retainedSet)
const range = (pair: [number, number] | null, unit: string) => pair ? `${pair[0].toFixed(1)}–${pair[1].toFixed(1)}${unit}` : '—'
const verdict = computed(() => {
  if (!props.fit.retained.length) return { text: '无合格组合', tone: 'fail' as const }
  if (!props.fit.validationSegments) return { text: '待验证', tone: 'maybe' as const }
  return { text: `验证保留 ${props.fit.retained.length} 组`, tone: 'pass' as const }
})
const note = computed(() => {
  if (props.fit.message) return props.fit.message
  if (props.fit.singleCoupling !== null && props.fit.singleCoupling < -.35) {
    return `单程里偏差与横滑互相抵消（相关 ${props.fit.singleCoupling.toFixed(2)}），换舷淘汰 ${props.fit.dropped} 组。`
  }
  return `换舷淘汰 ${props.fit.dropped} 组；${props.fit.validationSegments} 段斜风验证未参与校正。`
})
</script>

<template>
  <section class="instrument trial" aria-label="海试校正">
    <h2><FlaskConical :size="17"/> 海试校正 <b class="trial-pill" :data-tone="verdict.tone">{{ verdict.text }}</b></h2>
    <div class="trial-figures">
      <div><span>单程</span><strong data-testid="fit-single">{{ fit.single.length }}</strong></div>
      <div><span>往返</span><strong data-testid="fit-roundtrip">{{ fit.roundTrip.length }}</strong></div>
      <div><span>保留</span><strong data-testid="fit-retained">{{ fit.retained.length }}</strong></div>
    </div>
    <p class="trial-range">
      偏差 {{ range(retained.dev, '°') }} · 横滑 {{ range(retained.k, '') }}
    </p>
    <p v-if="fit.message" class="empty-note">{{ fit.message }}</p>
    <p v-else class="empty-note">{{ note }}</p>
    <div class="trial-actions">
      <span class="trial-chosen" data-testid="fit-effective">
        <Compass :size="14"/>
        <template v-if="effective">偏差 {{ effective.dev.toFixed(1) }}° · 横滑 {{ effective.k.toFixed(1) }}<em v-if="auto">自动</em></template>
        <template v-else>未锁定参数</template>
      </span>
      <button type="button" class="ghost-button" :disabled="locked" @click="$emit('open')">编辑样本</button>
    </div>
  </section>
</template>
