<script setup lang="ts">
import { ref, watch } from 'vue'
import { Anchor, CircleStop, Flag, Pause, Play, RotateCcw } from 'lucide-vue-next'
import { CourseChart } from '../features/chart'
import { WindPanel } from '../features/wind'
import { SailPanel } from '../features/sail'
import { MarksPanel } from '../features/jury'
import { LogbookPanel } from '../features/logbook'
import { TrialPanel, TrialWorkbench } from '../features/trial'
import { clock } from '../shared/format'
import { useRace } from './useRace'

const {
  course, wind, sail, jury, logbook, trial, status, focus, frame, trail, active,
  calibration, autoCalibration, displayCalls, replayCalibration, fan, landfalls,
  start, togglePause, end, locate,
} = useRace()
const { voyages, selected, cursor, notice, seek, open } = logbook
const { mode } = wind
const { events } = jury
const labels = { ready: '待出发', running: '竞速中', paused: '已暂停', finished: '已完赛', abandoned: '未完赛' }

const editing = ref(false)
const openWorkbench = () => { if (!active.value) editing.value = true }
// 进入回看或开始比赛时收起样本台，避免把正在进行的这一场改乱
watch([active, selected], () => { editing.value = false })
</script>

<template>
  <main class="shell">
    <header class="masthead">
      <div class="brand"><Anchor :size="30" :stroke-width="1.8"/><div><h1>绕标</h1><span>MARK REGATTA</span></div></div>
      <div class="mast-data"><Flag :size="16"/>{{ course.name }} <span class="divider"></span><span data-testid="race-state">{{ selected ? '回看中' : labels[status] }}</span></div>
    </header>
    <div class="workspace">
      <div class="main-column">
        <div class="race-bar">
          <div class="timer"><span>{{ selected ? '回看时间' : '赛时' }}</span><output data-testid="elapsed">{{ clock(frame.time) }}</output></div>
          <div class="timer final-time"><span>{{ selected ? '记录成绩' : '含罚时' }}</span><output data-testid="result">{{ clock(selected ? selected.duration + selected.penalty : frame.time + frame.penalty) }}</output></div>
          <div class="race-actions">
            <button v-if="!active" type="button" class="primary" @click="start"><component :is="status === 'ready' ? Play : RotateCcw" :size="15"/>{{ status === 'ready' ? '出发' : '再跑一场' }}</button>
            <template v-else>
              <button type="button" class="primary" @click="togglePause"><component :is="status === 'running' ? Pause : Play" :size="15"/>{{ status === 'running' ? '暂停' : '继续' }}</button>
              <button class="icon-button" type="button" title="结束航次" aria-label="结束航次" @click="end('abandoned')"><CircleStop :size="18"/></button>
            </template>
          </div>
        </div>
        <CourseChart :course="course" :frame="frame" :trail="trail" :replay="Boolean(selected)" :focus="focus"
          :fan="fan" :landfalls="landfalls" :calls="displayCalls"/>
        <LogbookPanel :voyages="voyages" :selected="selected" :events="selected?.events ?? events" :cursor="cursor" :notice="notice" :locked="active"
          @open="id => { focus = null; open(id) }" @close="selected = null; focus = null" @seek="time => { focus = null; seek(time) }" @focus="locate"/>
      </div>
      <aside class="instruments" aria-label="比赛仪表">
        <WindPanel :wind="frame.wind" :mode="selected?.windMode ?? mode" :locked="active || Boolean(selected)" @mode="wind.set"/>
        <SailPanel :boat="frame.boat" :compass="frame.compass ?? null" :disabled="status !== 'running' || Boolean(selected)" @steer="sail.steer" @sheet="sail.sheet"/>
        <TrialPanel :fit="trial.fit.value" :effective="calibration" :auto="autoCalibration" :locked="active" @open="openWorkbench"/>
        <MarksPanel :gates="course.gates" :next-gate="frame.nextGate" :penalty="frame.penalty"
          :calls="displayCalls" :replay="replayCalibration" :legacy="Boolean(selected) && !replayCalibration && !displayCalls"
          :uncalibrated="!selected && !displayCalls"/>
      </aside>
    </div>
    <TrialWorkbench :open="editing" :draft="trial.draft.value" :fit="trial.fit.value" :data="trial.data.value"
      :issues="trial.issues.value" :chosen="trial.chosen.value" :effective="trial.effective.value"
      :representatives="trial.representatives.value" :locked="active"
      @close="editing = false" @leg="trial.updateLeg" @add-leg="trial.addLeg" @remove-leg="trial.removeLeg"
      @add-reading="trial.addReading" @remove-reading="trial.removeReading" @reading="trial.updateReading"
      @choose="trial.choose" @demo="trial.restoreDemo"/>
  </main>
</template>
