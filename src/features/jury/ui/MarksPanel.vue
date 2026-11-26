<script setup lang="ts">
import { Check, Flag, MapPin, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-vue-next'
import type { Gate } from '../../../shared/race'
import { verdictLabel } from '../../trial'
import type { GateForecast } from '../../trial'

const props = defineProps<{
  gates: Gate[]
  nextGate: number
  penalty: number
  calls: GateForecast[] | null
  replay: { label: string } | null
  legacy: boolean
  uncalibrated: boolean
}>()

const callFor = (index: number) => props.calls?.find(call => call.gateId === (props.gates[index]?.id ?? '')) ?? null
const iconFor = (verdict: string) => verdict === 'pass' ? ShieldCheck : verdict === 'maybe' ? ShieldQuestion : ShieldAlert
const tone = (verdict: string | undefined) => verdict ?? 'unknown'
</script>

<template>
  <section class="instrument marks" aria-label="绕标裁判">
    <h2><Flag :size="17"/> 绕标裁判 <b data-testid="marks-count">{{ nextGate }} / {{ gates.length }}</b></h2>
    <ol>
      <li v-for="(gate, i) in gates" :key="gate.id" :data-state="i === nextGate ? 'next' : i < nextGate ? 'cleared' : 'later'">
        <span>{{ gate.id }}</span>{{ gate.name }}<Check v-if="i < nextGate" :size="16"/><MapPin v-else-if="i === nextGate" :size="15"/>
      </li>
    </ol>
    <p v-if="replay" class="gauges" data-testid="marks-calibration">起航校正 · {{ replay.label }}（保留组合）</p>
    <p v-else-if="legacy" class="gauges" data-testid="marks-calibration">旧航次未记录校正，判罚不可追溯</p>
    <ul v-if="calls" class="call-list" aria-label="过门预判">
      <li v-for="(gate, i) in gates" :key="gate.id" :data-verdict="tone(callFor(i)?.verdict)">
        <component :is="iconFor(callFor(i)?.verdict ?? 'fail')" :size="14"/>
        <span>{{ gate.id }} {{ gate.name }}</span>
        <b data-testid="gate-verdict">{{ verdictLabel[callFor(i)?.verdict ?? 'fail'] }}</b>
      </li>
    </ul>
    <p v-else-if="legacy" class="gauges">判罚只在实时驾驶时给出</p>
    <p v-else-if="uncalibrated" class="gauges" data-testid="marks-uncalibrated">还没有合格参数，先在仪表里完成海试校正</p>
    <div class="penalty">累计罚时 <output data-testid="penalty">+{{ penalty }} s</output></div>
  </section>
</template>
