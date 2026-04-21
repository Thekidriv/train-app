// src/components/quicklog/QuickLog.jsx
// Fast-entry logger: table of weight/reps/RPE per set for every exercise
// in the day's workout, then one Save All commits them in a single POST
// (upsert) so re-saving the same day updates rows instead of duplicating.

import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Save, Plus, Trash2, Loader2,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { exercisesFor, titleFor } from '../../lib/program'
import { workoutTypeForDate, toISODate } from '../../lib/settings'
import { saveSessionBatch } from '../../lib/sheets'
import { useSheetData } from '../../lib/useSheetData'
import useAppStore from '../../store/useAppStore'

export default function QuickLog() {
  const quickLogISO = useAppStore(s => s.quickLogISO)
  const setView = useAppStore(s => s.setView)
  const selectedISO = quickLogISO || toISODate(new Date())

  const { rows, refresh } = useSheetData()

  const date = useMemo(() => isoToDate(selectedISO), [selectedISO])
  const workoutType = workoutTypeForDate(date)
  const exercises = exercisesFor(workoutType)

  // Existing rows already logged for this date (for edit-reopen)
  const existingForDate = useMemo(
    () => rows.filter(r => r.date && toISODate(new Date(r.date)) === selectedISO),
    [rows, selectedISO]
  )

  // Most-recent previous session of the same workout_type — for prefill + "last" caption
  const lastByExercise = useMemo(() => {
    const candidates = rows.filter(r =>
      String(r.workout_type) === workoutType &&
      r.date && toISODate(new Date(r.date)) !== selectedISO
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
    for (const r of batch) {
      ;(map[r.exercise] ||= []).push(r)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (Number(a.set_num) || 0) - (Number(b.set_num) || 0))
    }
    return map
  }, [rows, workoutType, selectedISO])

  const [state, setState] = useState(() =>
    buildInitialState(exercises, existingForDate, lastByExercise)
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  // Rebuild only when the day/workout changes AND user hasn't started editing.
  useEffect(() => {
    if (!dirty) {
      setState(buildInitialState(exercises, existingForDate, lastByExercise))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO, workoutType, existingForDate.length])

  const updateSet = (exIdx, setIdx, field, value) => {
    setDirty(true)
    setResult(null)
    setState(s => {
      const next = [...s]
      const ex = { ...next[exIdx] }
      ex.sets = ex.sets.map((st, i) => i === setIdx ? { ...st, [field]: value } : st)
      next[exIdx] = ex
      return next
    })
  }

  const addSet = (exIdx) => {
    setDirty(true)
    setState(s => {
      const next = [...s]
      const ex = { ...next[exIdx] }
      const last = ex.sets[ex.sets.length - 1]
      ex.sets = [...ex.sets, {
        weight_kg: last?.weight_kg ?? String(ex.target.weight || ''),
        reps: last?.reps ?? String(ex.target.reps || ''),
        rpe: '',
        notes: '',
      }]
      next[exIdx] = ex
      return next
    })
  }

  const removeSet = (exIdx, setIdx) => {
    setDirty(true)
    setState(s => {
      const next = [...s]
      const ex = { ...next[exIdx] }
      ex.sets = ex.sets.filter((_, i) => i !== setIdx)
      next[exIdx] = ex
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    const flat = []
    for (const ex of state) {
      ex.sets.forEach((st, i) => {
        const blank = isBlank(st.weight_kg) && isBlank(st.reps) && isBlank(st.rpe) && !st.notes
        if (blank) return
        flat.push({
          date: selectedISO,
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
      setResult({ ok: false, error: 'Nothing to save — fill in at least one set.' })
      setSaving(false)
      return
    }

    try {
      const r = await saveSessionBatch(flat)
      setResult({ ...r, total: flat.length })
      setDirty(false)
      // Refresh cache so Calendar + banners update
      refresh()
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setSaving(false)
    }
  }

  // ─── Rest day / unknown split ───────────────────────────
  if (!exercises.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-txt-secondary text-sm">
          {workoutType === 'Rest'
            ? 'Rest day — nothing to log.'
            : `No exercises configured for "${workoutType}".`}
        </p>
        <button
          onClick={() => setView('calendar')}
          className="mt-4 text-accent text-sm font-semibold"
        >
          Back to calendar
        </button>
      </div>
    )
  }

  const totalSets = state.reduce((n, ex) => n + ex.sets.length, 0)
  const fmt = date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button
          onClick={() => setView('calendar')}
          className="p-1 -ml-1 text-txt-secondary hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-txt-muted uppercase tracking-wider">{fmt}</div>
          <div className="text-white font-bold text-sm truncate">{titleFor(workoutType)}</div>
        </div>
        <div className="text-[11px] text-txt-muted whitespace-nowrap">{totalSets} sets</div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {state.map((ex, exIdx) => (
          <ExerciseCard
            key={ex.exerciseName + exIdx}
            exercise={ex}
            lastSession={lastByExercise[ex.exerciseName]}
            onChangeSet={(setIdx, field, value) => updateSet(exIdx, setIdx, field, value)}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
          />
        ))}

        {result?.ok && (
          <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-lg px-3 py-2.5 text-success text-sm mx-1">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              {result.mode === 'upsert' && (
                <>Saved. Updated {result.updated}, added {result.appended}.</>
              )}
              {result.mode === 'legacy' && (
                <>Saved {result.succeeded}/{result.total} sets. (Upgrade Apps Script to avoid duplicates on resave.)</>
              )}
              {result.mode === 'legacy-fallback' && (
                <>Saved {result.succeeded}/{result.total} sets (legacy fallback).</>
              )}
              {!result.mode && <>Saved {result.total || 0} sets.</>}
            </div>
          </div>
        )}
        {result && result.ok === false && (
          <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-danger text-sm mx-1">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="break-all">{result.error}</span>
          </div>
        )}

        {/* Spacer so last card clears the sticky footer */}
        <div className="h-2" />
      </div>

      {/* Sticky bottom save */}
      <div className="flex-shrink-0 px-3 py-3 bg-bg-1 border-t border-bg-3">
        <button
          onClick={handleSave}
          disabled={saving || totalSets === 0}
          className="w-full bg-accent hover:bg-accent-dark disabled:opacity-40 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving…</>
          ) : (
            <><Save size={18} /> Save All ({totalSets})</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Components ────────────────────────────────────────────────

function ExerciseCard({ exercise, lastSession, onChangeSet, onAddSet, onRemoveSet }) {
  const { exerciseName, group, note, target, sets } = exercise
  const lastSummary = lastSession?.length
    ? lastSession.slice(0, 4).map(r => `${fmtNum(r.weight_kg)}×${fmtNum(r.reps)}`).join(' · ')
    : null

  return (
    <div className="bg-bg-1 border border-bg-3 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-bg-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-accent-light">{group}</div>
        <div className="text-white font-semibold text-sm leading-tight mt-0.5">{exerciseName}</div>
        <div className="text-[11px] text-txt-muted mt-0.5">
          Target: {target.sets}×{target.reps || '—'}{target.weight ? ` @ ${target.weight}kg` : ''}
          {lastSummary && <> · Last: {lastSummary}</>}
        </div>
        {note && <div className="text-[11px] text-txt-secondary italic mt-1">{note}</div>}
      </div>

      <div className="px-2 pt-2 pb-2">
        <div className="grid grid-cols-[24px_1fr_1fr_54px_28px] gap-1.5 px-1 pb-1.5">
          <div className="text-[9px] font-bold text-txt-muted uppercase tracking-wider text-center">#</div>
          <div className="text-[9px] font-bold text-txt-muted uppercase tracking-wider">kg</div>
          <div className="text-[9px] font-bold text-txt-muted uppercase tracking-wider">Reps</div>
          <div className="text-[9px] font-bold text-txt-muted uppercase tracking-wider">RPE</div>
          <div />
        </div>

        {sets.map((st, i) => (
          <SetRow
            key={i}
            num={i + 1}
            row={st}
            onChange={(field, val) => onChangeSet(i, field, val)}
            onRemove={sets.length > 1 ? () => onRemoveSet(i) : null}
          />
        ))}

        <button
          onClick={onAddSet}
          className="w-full mt-1.5 text-[11px] text-txt-secondary hover:text-white border border-dashed border-bg-3 hover:border-accent/60 rounded-md py-1.5 flex items-center justify-center gap-1"
        >
          <Plus size={12} /> Add set
        </button>
      </div>
    </div>
  )
}

function SetRow({ num, row, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[24px_1fr_1fr_54px_28px] gap-1.5 px-1 py-1 items-center">
      <div className="text-xs font-semibold text-txt-secondary text-center">{num}</div>
      <NumInput value={row.weight_kg} onChange={v => onChange('weight_kg', v)} />
      <NumInput value={row.reps} onChange={v => onChange('reps', v)} />
      <NumInput value={row.rpe} onChange={v => onChange('rpe', v)} placeholder="–" />
      {onRemove ? (
        <button
          onClick={onRemove}
          className="p-1 text-txt-muted hover:text-danger"
          aria-label="Remove set"
        >
          <Trash2 size={13} />
        </button>
      ) : <div />}
    </div>
  )
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-bg-2 text-white text-sm rounded-md px-2 py-1.5 border border-bg-3 focus:border-accent focus:outline-none w-full text-center tabular-nums"
    />
  )
}

// ─── Helpers ───────────────────────────────────────────────────

function buildInitialState(exercises, existingForDate, lastByExercise) {
  return exercises.map(ex => {
    const existing = existingForDate
      .filter(r => r.exercise === ex.name)
      .sort((a, b) => (Number(a.set_num) || 0) - (Number(b.set_num) || 0))

    if (existing.length) {
      return {
        exerciseName: ex.name,
        group: ex.group,
        note: ex.note,
        target: { sets: ex.sets, reps: ex.reps, weight: ex.weight },
        sets: existing.map(r => ({
          weight_kg: strVal(r.weight_kg),
          reps: strVal(r.reps),
          rpe: strVal(r.rpe),
          notes: strVal(r.notes),
        })),
      }
    }

    const last = lastByExercise[ex.name] || []
    const setsArr = []
    for (let i = 0; i < ex.sets; i++) {
      const l = last[i]
      setsArr.push({
        weight_kg: l ? strVal(l.weight_kg) : String(ex.weight || ''),
        reps: l ? strVal(l.reps) : String(ex.reps || ''),
        rpe: '',
        notes: '',
      })
    }
    return {
      exerciseName: ex.name,
      group: ex.group,
      note: ex.note,
      target: { sets: ex.sets, reps: ex.reps, weight: ex.weight },
      sets: setsArr,
    }
  })
}

function strVal(v) {
  if (v == null || v === '') return ''
  return String(v)
}

function isBlank(v) {
  return v == null || v === ''
}

function toNum(v) {
  if (isBlank(v)) return ''
  const n = Number(v)
  return Number.isNaN(n) ? v : n
}

function fmtNum(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  // Strip trailing zero for clean display: 72.5 / 70
  return Number.isInteger(n) ? String(n) : String(n)
}

function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
