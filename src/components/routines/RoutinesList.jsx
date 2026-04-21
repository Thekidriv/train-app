// src/components/routines/RoutinesList.jsx
// Read-only catalog of the 4-day program. Tap a split → see exercises grouped
// by Main / Superset A / B / C. Each split has a "Quick Log" shortcut that
// opens Quick Log for the next scheduled occurrence of that workout_type.

import React, { useState } from 'react'
import { ChevronRight, ArrowLeft, ClipboardList } from 'lucide-react'
import { PROGRAM } from '../../lib/program'
import { workoutTypeForDate, toISODate } from '../../lib/settings'
import useAppStore from '../../store/useAppStore'

const ORDER = ['Upper A', 'Lower A', 'Upper B', 'Lower B']

export default function RoutinesList() {
  const [selected, setSelected] = useState(null)

  if (selected) {
    return <RoutineDetail workoutType={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-white">Routines</h1>
        <p className="text-xs text-txt-secondary mt-0.5">
          Your 4-day program. Tap a split to see exercises.
        </p>
      </div>

      <div className="px-4 space-y-2">
        {ORDER.map(key => {
          const entry = PROGRAM[key]
          if (!entry) return null
          const { summary } = summarize(entry.exercises)
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
                  {entry.exercises.length} exercises · {entry.duration} · {summary}
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

  // Group exercises by group label
  const groups = {}
  for (const ex of entry.exercises) {
    ;(groups[ex.group] ||= []).push(ex)
  }

  // Find the next date in the next ~14 days matching this workout_type (so
  // "Quick Log this workout" opens the right calendar day)
  const nextISO = findNextScheduledDate(workoutType)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-txt-secondary hover:text-white"
          aria-label="Back"
        >
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
                <ExerciseRow key={ex.name + i} ex={ex} />
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

function ExerciseRow({ ex }) {
  const target = `${ex.sets}×${ex.reps || '—'}${ex.weight ? ` @ ${ex.weight}kg` : ''}`
  return (
    <div className="bg-bg-1 border border-bg-3 rounded-xl px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-white font-semibold text-sm leading-tight">{ex.name}</span>
        <span className="text-[11px] text-txt-secondary font-mono tabular-nums whitespace-nowrap">{target}</span>
      </div>
      {ex.note && (
        <div className="text-[11px] text-txt-muted italic mt-1 leading-snug">{ex.note}</div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function summarize(exercises) {
  const main = exercises.filter(e => e.group === 'Main').map(e => e.name).slice(0, 2)
  return { summary: main.join(' + ') || 'Mixed' }
}

function shortLabel(key) {
  // "Upper A" -> "UA"
  return key.split(/\s+/).map(w => w[0]).join('').toUpperCase()
}

function badge(key) {
  const k = key.toLowerCase()
  if (k.startsWith('upper')) return 'bg-accent/15 text-accent-light'
  if (k.startsWith('lower')) return 'bg-success/15 text-success'
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
