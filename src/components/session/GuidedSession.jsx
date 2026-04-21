// src/components/session/GuidedSession.jsx
// Guided Workout: one exercise at a time, big Log-Set button, auto rest
// timer (Main=3min, Superset=75s) with a red ring under 10s. State is
// persisted to localStorage so closing the app doesn't lose progress.
// On Finish, all logged sets are committed in a single upsert call.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check, SkipForward,
  Play, Flag, Loader2, Trash2, Plus, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { exercisesFor, titleFor } from '../../lib/program'
import { workoutTypeForDate, toISODate } from '../../lib/settings'
import { saveSessionBatch } from '../../lib/sheets'
import { useSheetData } from '../../lib/useSheetData'
import useAppStore from '../../store/useAppStore'

const REST_MAIN = 180     // 3 min
const REST_SUPERSET = 75  // 75s

export default function GuidedSession() {
  const sessionISO = useAppStore(s => s.sessionISO) || toISODate(new Date())
  const endGuidedSession = useAppStore(s => s.endGuidedSession)
  const { rows, refresh } = useSheetData()

  const date = useMemo(() => isoToDate(sessionISO), [sessionISO])
  const workoutType = workoutTypeForDate(date)
  const exercises = exercisesFor(workoutType)

  // Last-session prefill per exercise for this workout_type
  const lastByExercise = useMemo(() => {
    const candidates = rows.filter(r =>
      String(r.workout_type) === workoutType &&
      r.date && toISODate(new Date(r.date)) !== sessionISO
    )
    if (!candidates.length) return {}
    const byDate = {}
    for (const r of candidates) {
      const iso = toISODate(new Date(r.date))
      ;(byDate[iso] ||= []).push(r)
    }
    const mostRecent = Object.keys(byDate).sort().pop()
    const batch = byDate[mostRecent] || []
    const map = {}
    for (const r of batch) (map[r.exercise] ||= []).push(r)
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (Number(a.set_num) || 0) - (Number(b.set_num) || 0))
    }
    return map
  }, [rows, workoutType, sessionISO])

  const storageKey = `trainapp:session:${sessionISO}:${workoutType}`

  const [state, setState] = useState(() => loadOrBuild(storageKey, exercises, lastByExercise))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rest, setRest] = useState(null) // { duration, startedAt }
  const [finishing, setFinishing] = useState(false)
  const [result, setResult] = useState(null)

  // Persist on every state change
  useEffect(() => {
    if (!state) return
    try { localStorage.setItem(storageKey, JSON.stringify({ state, currentIdx })) } catch {}
  }, [state, currentIdx, storageKey])

  if (!exercises.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-txt-secondary text-sm">
          {workoutType === 'Rest'
            ? 'Rest day. Nothing to train.'
            : `No exercises configured for "${workoutType}".`}
        </p>
        <button
          onClick={endGuidedSession}
          className="mt-4 text-accent text-sm font-semibold"
        >
          Back to calendar
        </button>
      </div>
    )
  }

  const current = state[currentIdx]
  const isLast = currentIdx === state.length - 1
  const loggedOnCurrent = current.sets.filter(s => s.logged).length
  const allLoggedOnCurrent = loggedOnCurrent === current.sets.length

  const totalLogged = state.reduce((n, ex) => n + ex.sets.filter(s => s.logged).length, 0)
  const totalPlanned = state.reduce((n, ex) => n + ex.sets.length, 0)

  const updateSet = (setIdx, patch) => {
    setState(s => {
      const next = [...s]
      const ex = { ...next[currentIdx] }
      ex.sets = ex.sets.map((st, i) => i === setIdx ? { ...st, ...patch } : st)
      next[currentIdx] = ex
      return next
    })
  }

  const logSet = (setIdx) => {
    const st = current.sets[setIdx]
    if (!st.weight_kg && !st.reps) return // require at least one value
    updateSet(setIdx, { logged: true, timestamp: Date.now() })
    // Auto-start rest timer
    const dur = restDurationFor(current.group)
    setRest({ duration: dur, startedAt: Date.now() })
  }

  const unlogSet = (setIdx) => {
    updateSet(setIdx, { logged: false })
  }

  const addSet = () => {
    setState(s => {
      const next = [...s]
      const ex = { ...next[currentIdx] }
      const last = ex.sets[ex.sets.length - 1]
      ex.sets = [...ex.sets, {
        weight_kg: last?.weight_kg ?? String(ex.target.weight || ''),
        reps: last?.reps ?? String(ex.target.reps || ''),
        rpe: '',
        notes: '',
        logged: false,
      }]
      next[currentIdx] = ex
      return next
    })
  }

  const removeSet = (setIdx) => {
    if (current.sets.length <= 1) return
    setState(s => {
      const next = [...s]
      const ex = { ...next[currentIdx] }
      ex.sets = ex.sets.filter((_, i) => i !== setIdx)
      next[currentIdx] = ex
      return next
    })
  }

  const goPrev = () => {
    setRest(null)
    setCurrentIdx(i => Math.max(0, i - 1))
  }
  const goNext = () => {
    setRest(null)
    setCurrentIdx(i => Math.min(state.length - 1, i + 1))
  }

  const handleFinish = async () => {
    setFinishing(true)
    setResult(null)
    const flat = []
    for (const ex of state) {
      ex.sets.forEach((st, i) => {
        if (!st.logged) return
        flat.push({
          date: sessionISO,
          workout_type: workoutType,
          exercise: ex.exerciseName,
          set_num: i + 1,
          weight_kg: toNum(st.weight_kg),
          reps: toNum(st.reps),
          rpe: toNum(st.rpe),
          notes: st.notes || '',
        })
      })
    }
    if (!flat.length) {
      setResult({ ok: false, error: 'No sets logged yet — tap "Log Set" on at least one set first.' })
      setFinishing(false)
      return
    }
    try {
      const r = await saveSessionBatch(flat)
      setResult({ ...r, total: flat.length })
      try { localStorage.removeItem(storageKey) } catch {}
      refresh()
      setTimeout(() => { endGuidedSession() }, 1200)
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setFinishing(false)
    }
  }

  const fmt = date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button
          onClick={endGuidedSession}
          className="p-1 -ml-1 text-txt-secondary hover:text-white"
          aria-label="Exit session"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-txt-muted uppercase tracking-wider">{fmt}</div>
          <div className="text-white font-bold text-sm truncate">{titleFor(workoutType)}</div>
        </div>
        <div className="text-[11px] text-txt-muted whitespace-nowrap">
          {totalLogged}/{totalPlanned}
        </div>
      </div>

      {/* Exercise pager */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-1/60 border-b border-bg-3 flex-shrink-0">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="p-1.5 text-txt-secondary disabled:opacity-30 hover:text-white"
          aria-label="Previous exercise"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent-light">
            {current.group}
          </div>
          <div className="text-[11px] text-txt-muted">
            Exercise {currentIdx + 1} of {state.length}
          </div>
        </div>
        <button
          onClick={goNext}
          disabled={isLast}
          className="p-1.5 text-txt-secondary disabled:opacity-30 hover:text-white"
          aria-label="Next exercise"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Exercise card */}
        <div className="bg-bg-1 border border-bg-3 rounded-2xl p-4">
          <h2 className="text-white font-bold text-lg leading-tight">{current.exerciseName}</h2>
          <div className="text-[12px] text-txt-secondary mt-1 tabular-nums">
            Target: {current.target.sets}×{current.target.reps || '—'}
            {current.target.weight ? ` @ ${current.target.weight}kg` : ''}
          </div>
          {lastByExercise[current.exerciseName]?.length > 0 && (
            <div className="text-[11px] text-txt-muted mt-0.5">
              Last: {lastByExercise[current.exerciseName]
                .slice(0, 4)
                .map(r => `${fmtNum(r.weight_kg)}×${fmtNum(r.reps)}`)
                .join(' · ')}
            </div>
          )}
          {current.note && (
            <div className="text-[12px] text-accent-light italic bg-accent/5 border border-accent/20 rounded-md px-3 py-2 mt-3 leading-snug">
              {current.note}
            </div>
          )}
        </div>

        {/* Set tracker */}
        <div className="space-y-2">
          {current.sets.map((st, i) => (
            <SetCard
              key={i}
              num={i + 1}
              row={st}
              onChange={(field, val) => updateSet(i, { [field]: val })}
              onLog={() => logSet(i)}
              onUnlog={() => unlogSet(i)}
              onRemove={current.sets.length > 1 ? () => removeSet(i) : null}
            />
          ))}

          <button
            onClick={addSet}
            className="w-full text-[12px] text-txt-secondary hover:text-white border border-dashed border-bg-3 hover:border-accent/60 rounded-md py-2 flex items-center justify-center gap-1"
          >
            <Plus size={13} /> Add set
          </button>
        </div>

        {result?.ok && (
          <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-lg px-3 py-2.5 text-success text-sm">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <div>Session saved. {result.total} sets committed.</div>
          </div>
        )}
        {result && result.ok === false && (
          <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-danger text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="break-all">{result.error}</span>
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* Sticky footer */}
      <div className="flex-shrink-0 px-3 py-3 bg-bg-1 border-t border-bg-3 flex gap-2">
        {allLoggedOnCurrent && !isLast ? (
          <button
            onClick={goNext}
            className="flex-1 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            Next Exercise <ChevronRight size={18} />
          </button>
        ) : isLast ? (
          <button
            onClick={handleFinish}
            disabled={finishing || totalLogged === 0}
            className="flex-1 bg-success hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-success/20"
          >
            {finishing ? (
              <><Loader2 size={18} className="animate-spin" /> Saving…</>
            ) : (
              <><Flag size={18} /> Finish & Save ({totalLogged})</>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 bg-bg-2 hover:bg-bg-3 text-txt-secondary font-semibold rounded-xl py-3 flex items-center justify-center gap-2 border border-bg-3"
          >
            Skip to Next <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Rest timer overlay */}
      {rest && (
        <RestTimerOverlay
          key={rest.startedAt}
          duration={rest.duration}
          onDone={() => setRest(null)}
          onSkip={() => setRest(null)}
        />
      )}
    </div>
  )
}

// ─── Set card ──────────────────────────────────────────────────

function SetCard({ num, row, onChange, onLog, onUnlog, onRemove }) {
  const canLog = !row.logged && (!isBlank(row.weight_kg) || !isBlank(row.reps))

  return (
    <div className={`rounded-xl border overflow-hidden ${
      row.logged
        ? 'bg-success/10 border-success/40'
        : 'bg-bg-1 border-bg-3'
    }`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          row.logged ? 'bg-success text-white' : 'bg-bg-2 text-txt-secondary'
        }`}>
          {row.logged ? <Check size={13} /> : num}
        </div>
        <div className="grid grid-cols-[1fr_1fr_54px] gap-1.5 flex-1">
          <NumInput
            value={row.weight_kg} placeholder="kg"
            onChange={v => onChange('weight_kg', v)}
            disabled={row.logged}
          />
          <NumInput
            value={row.reps} placeholder="reps"
            onChange={v => onChange('reps', v)}
            disabled={row.logged}
          />
          <NumInput
            value={row.rpe} placeholder="RPE"
            onChange={v => onChange('rpe', v)}
            disabled={row.logged}
          />
        </div>
        {row.logged ? (
          <button
            onClick={onUnlog}
            className="px-2 py-1 text-[11px] text-success-light/80 hover:text-white"
            aria-label="Undo log"
          >
            Undo
          </button>
        ) : (
          <button
            onClick={onLog}
            disabled={!canLog}
            className="px-3 py-1.5 bg-accent hover:bg-accent-dark disabled:opacity-30 text-white text-[11px] font-bold rounded-md"
          >
            Log
          </button>
        )}
        {onRemove && !row.logged && (
          <button
            onClick={onRemove}
            className="p-1 text-txt-muted hover:text-danger"
            aria-label="Remove set"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function NumInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`text-sm rounded-md px-2 py-1.5 border text-center tabular-nums focus:outline-none w-full ${
        disabled
          ? 'bg-transparent text-white border-transparent font-semibold'
          : 'bg-bg-2 text-white border-bg-3 focus:border-accent'
      }`}
    />
  )
}

// ─── Rest timer overlay ───────────────────────────────────────

function RestTimerOverlay({ duration, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(duration)
  const startedRef = useRef(Date.now())

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedRef.current) / 1000
      const left = Math.max(0, duration - elapsed)
      setRemaining(Math.ceil(left))
      if (left <= 0) {
        clearInterval(id)
        onDone()
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = Math.max(0, remaining) / duration
  const isCritical = remaining <= 10
  const r = 56
  const c = 2 * Math.PI * r
  const dashoffset = c * (1 - pct)
  const color = isCritical ? '#FF453A' : '#4F86F7'

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const fmt = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="flex flex-col items-center">
        <div className="text-[11px] uppercase tracking-widest text-txt-muted mb-3">
          Rest
        </div>
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={r} stroke="#272727" strokeWidth="6" fill="none" />
            <circle
              cx="80" cy="80" r={r}
              stroke={color} strokeWidth="6" fill="none"
              strokeDasharray={c}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 250ms linear, stroke 200ms' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color }}
            >
              {fmt}
            </span>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="mt-6 px-5 py-2.5 bg-bg-2 hover:bg-bg-3 text-white text-sm font-semibold rounded-full border border-bg-3 flex items-center gap-2"
        >
          <SkipForward size={14} /> Skip rest
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function loadOrBuild(storageKey, exercises, lastByExercise) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state && Array.isArray(parsed.state)) return parsed.state
    }
  } catch {}
  return buildFresh(exercises, lastByExercise)
}

function buildFresh(exercises, lastByExercise) {
  return exercises.map(ex => {
    const last = lastByExercise[ex.name] || []
    const sets = []
    for (let i = 0; i < ex.sets; i++) {
      const l = last[i]
      sets.push({
        weight_kg: l ? String(l.weight_kg ?? ex.weight) : String(ex.weight || ''),
        reps: l ? String(l.reps ?? ex.reps) : String(ex.reps || ''),
        rpe: '',
        notes: '',
        logged: false,
      })
    }
    return {
      exerciseName: ex.name,
      group: ex.group,
      note: ex.note,
      target: { sets: ex.sets, reps: ex.reps, weight: ex.weight },
      sets,
    }
  })
}

function restDurationFor(group) {
  return /superset/i.test(group) ? REST_SUPERSET : REST_MAIN
}

function isBlank(v) { return v == null || v === '' }
function toNum(v) {
  if (isBlank(v)) return ''
  const n = Number(v)
  return Number.isNaN(n) ? v : n
}
function fmtNum(v) {
  if (isBlank(v)) return '—'
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : String(n)
}
function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
