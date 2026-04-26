// src/components/routines/RoutinesList.jsx
// Phase-aware program catalog. Shows the splits for the currently active
// phase. Each split detail view lists exercises grouped by Main / Superset
// with target × weight, coaching note, optional TRIAL badge, and the
// per-exercise next-session suggestion pulled from sheet history.

import React, { useMemo, useState } from 'react'
import { ChevronRight, ArrowLeft, ClipboardList, Heart, Activity } from 'lucide-react'
import { PROGRAM, WORKOUT_TYPES_ORIGINAL, WORKOUT_TYPES_RECOVERY } from '../../lib/program'
import { workoutTypeForDate, toISODate, activePhase, getTrialStatus } from '../../lib/settings'
import { useSheetData } from '../../lib/useSheetData'
import { suggestNext } from '../../lib/suggest'
import useAppStore from '../../store/useAppStore'

export default function RoutinesList() {
  const [selected, setSelected] = useState(null)
  const phase = activePhase()
  const order = phase === 'until-recovery'
    ? WORKOUT_TYPES_RECOVERY.filter(t => t !== 'Rest')
    : WORKOUT_TYPES_ORIGINAL.filter(t => t !== 'Rest')

  if (selected) {
    return <RoutineDetail workoutType={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-white">Routines</h1>
          <PhasePill phase={phase} />
        </div>
        <p className="text-xs text-txt-secondary mt-0.5">
          {phase === 'until-recovery'
            ? 'Recovery phase — upper-body focus while shin heals.'
            : 'Your standard 4-day program.'}
        </p>
      </div>

      <div className="px-4 space-y-2">
        {order.map(key => {
          const entry = PROGRAM[key]
          if (!entry) return null
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="w-full flex items-center gap-3 bg-bg-1 border border-bg-3 rounded-2xl px-4 py-3.5 text-left hover:border-accent/60 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${badge(key)}`}>
                <span className="text-xs font-bold">{shortLabel(key)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-[15px] leading-tight">{entry.title}</p>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  {entry.exercises.length} exercises · {entry.duration}
                </p>
              </div>
              <ChevronRight size={16} className="text-txt-muted flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Detail ─────────────────────────────────────────────────────

function RoutineDetail({ workoutType, onBack }) {
  const entry = PROGRAM[workoutType]
  const openQuickLog = useAppStore(s => s.openQuickLog)
  const { rows } = useSheetData()
  const phase = activePhase()

  // Filter out exercises marked 'removed' by the trial system for this phase.
  const visibleExercises = useMemo(() => {
    return entry.exercises.filter(ex => {
      const t = getTrialStatus(phase, ex.name)
      return !t || t.status !== 'removed'
    })
  }, [entry.exercises, phase])

  // Group by group label
  const groups = {}
  for (const ex of visibleExercises) (groups[ex.group] ||= []).push(ex)

  const nextISO = findNextScheduledDate(workoutType)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button onClick={onBack} className="p-1 -ml-1 text-txt-secondary hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-txt-muted uppercase tracking-wider">{workoutType}</div>
          <div className="text-white font-bold text-sm truncate">{entry.title}</div>
        </div>
        <div className="text-[11px] text-txt-muted whitespace-nowrap">{entry.duration}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {Object.entries(groups).map(([groupName, exes]) => (
          <div key={groupName}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-accent-light px-2 mb-1.5">
              {groupName}
            </div>
            <div className="space-y-1.5">
              {exes.map((ex, i) => (
                <ExerciseRow key={ex.name + i} ex={ex} rows={rows} phase={phase} />
              ))}
            </div>
          </div>
        ))}
        <div className="h-2" />
      </div>

      <div className="flex-shrink-0 px-3 py-3 bg-bg-1 border-t border-bg-3">
        <button
          onClick={() => openQuickLog(nextISO)}
          className="w-full bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
        >
          <ClipboardList size={18} />
          Quick Log {prettyDate(nextISO)}
        </button>
      </div>
    </div>
  )
}

function ExerciseRow({ ex, rows, phase }) {
  const target = `${ex.sets}×${ex.reps || '—'}${ex.weight ? ` @ ${ex.weight}kg` : ''}`
  const trial = getTrialStatus(phase, ex.name)
  const suggestion = useMemo(() => suggestNext(ex, rows), [ex, rows])
  const hasHistory = !!suggestion && suggestion.reason && !suggestion.reason.includes('No history')

  return (
    <div className="bg-bg-1 border border-bg-3 rounded-xl px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-white font-semibold text-sm leading-tight truncate">{ex.name}</span>
          {trial?.status === 'pending' || ex.trial && !trial ? (
            <span className="bg-warn/15 border border-warn/40 text-warn px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Trial</span>
          ) : trial?.status === 'cleared' ? (
            <span className="bg-success/15 border border-success/40 text-success px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Cleared</span>
          ) : null}
        </div>
        <span className="text-[11px] text-txt-secondary font-mono tabular-nums whitespace-nowrap">{target}</span>
      </div>
      {ex.note && (
        <div className="text-[11px] text-txt-muted italic mt-1 leading-snug">{ex.note}</div>
      )}
      {hasHistory && (
        <div className="text-[11px] text-accent-light mt-1 leading-snug">
          → Next: {suggestion.headline}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function PhasePill({ phase }) {
  if (phase === 'until-recovery') {
    return (
      <span className="flex items-center gap-1 bg-warn/10 border border-warn/30 text-warn rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
        <Heart size={10} /> Recovery
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 bg-accent/10 border border-accent/30 text-accent-light rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      <Activity size={10} /> Original
    </span>
  )
}

function shortLabel(key) {
  if (/upper a.*until/i.test(key)) return 'UA·R'
  if (/upper b.*until/i.test(key)) return 'UB·R'
  if (/recovery.*core a/i.test(key)) return 'R+A'
  if (/recovery.*core b/i.test(key)) return 'R+B'
  return key.split(/\s+/).map(w => w[0]).join('').toUpperCase()
}

function badge(key) {
  const k = key.toLowerCase()
  if (k.startsWith('upper')) return 'bg-accent/15 text-accent-light'
  if (k.startsWith('lower')) return 'bg-success/15 text-success'
  if (k.startsWith('recovery')) return 'bg-warn/15 text-warn'
  return 'bg-bg-2 text-txt-secondary'
}

function findNextScheduledDate(workoutType) {
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    if (workoutTypeForDate(d) === workoutType) return toISODate(d)
  }
  return toISODate(now)
}

function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(date); target.setHours(0,0,0,0)
  const diffDays = Math.round((target - today) / 86_400_000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
