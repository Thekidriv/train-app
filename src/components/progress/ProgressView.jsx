// src/components/progress/ProgressView.jsx
// Three-level navigation:
//   1. Muscle groups overview (Chest, Back, Shoulders, ...) with counts
//   2. Exercises within the selected muscle group
//   3. Detail: max-weight + volume line charts + session history
//
// "All exercises" stays available as an alternative flat view at the top.
// Muscle-group lookup uses program.js → muscleGroupFor(), which falls back
// to keyword heuristics for legacy or sheet-only exercise names.

import React, { useMemo, useState } from 'react'
import {
  TrendingUp, Trophy, Search, ArrowLeft, RefreshCw, AlertCircle,
  Layers, ChevronRight, List,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useSheetData } from '../../lib/useSheetData'
import { toISODate, isConfigured } from '../../lib/settings'
import { muscleGroupFor, MUSCLE_GROUP_LIST } from '../../lib/program'

// View modes: 'groups' | 'exercises' | 'detail' | 'all'
export default function ProgressView() {
  const { rows, loading, error, refresh } = useSheetData()
  const [mode, setMode] = useState('groups')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [query, setQuery] = useState('')

  const byExercise = useMemo(() => buildByExercise(rows), [rows])
  const summarized = useMemo(() => {
    const list = Object.keys(byExercise).map(name => ({
      name,
      muscleGroup: muscleGroupFor(name) || 'Other',
      ...summarize(byExercise[name]),
    }))
    list.sort((a, b) => b.lastDateMs - a.lastDateMs)
    return list
  }, [byExercise])

  const groupCounts = useMemo(() => {
    const counts = {}
    for (const ex of summarized) counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + 1
    return counts
  }, [summarized])

  if (!isConfigured()) {
    return (
      <EmptyState
        icon={<AlertCircle size={28} className="text-warn" />}
        title="Not configured"
        subtitle="Open Settings from the calendar to connect your Apps Script URL."
      />
    )
  }
  if (error && !rows.length) {
    return (
      <EmptyState
        icon={<AlertCircle size={28} className="text-danger" />}
        title="Couldn't load progress"
        subtitle={error.message}
        action={<button onClick={refresh} className="mt-4 text-accent text-sm font-semibold">Try again</button>}
      />
    )
  }
  if (!summarized.length && !loading) {
    return (
      <EmptyState
        icon={<TrendingUp size={28} className="text-txt-muted" />}
        title="No data yet"
        subtitle="Log some workouts and progress charts will appear here."
      />
    )
  }

  // Detail
  if (mode === 'detail' && selectedExercise) {
    return (
      <ExerciseDetail
        name={selectedExercise}
        sessions={byExercise[selectedExercise] || {}}
        onBack={() => setMode(selectedGroup ? 'exercises' : 'all')}
      />
    )
  }

  // Exercises within a muscle group
  if (mode === 'exercises' && selectedGroup) {
    const list = summarized.filter(e => e.muscleGroup === selectedGroup)
    return (
      <ExerciseListView
        title={selectedGroup}
        exercises={list}
        query={query}
        onQuery={setQuery}
        onBack={() => { setMode('groups'); setSelectedGroup(null); setQuery('') }}
        onSelect={(name) => { setSelectedExercise(name); setMode('detail') }}
      />
    )
  }

  // Flat "all exercises" view
  if (mode === 'all') {
    return (
      <ExerciseListView
        title="All Exercises"
        exercises={summarized}
        query={query}
        onQuery={setQuery}
        onBack={() => { setMode('groups'); setQuery('') }}
        onSelect={(name) => { setSelectedExercise(name); setSelectedGroup(null); setMode('detail') }}
      />
    )
  }

  // Default: muscle groups overview
  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Progress</h1>
          <p className="text-xs text-txt-secondary mt-0.5">
            {summarized.length} exercise{summarized.length !== 1 ? 's' : ''} tracked across {Object.keys(groupCounts).length} muscle groups
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-[11px] text-txt-muted hover:text-white px-2 py-1"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing' : 'Refresh'}
        </button>
      </div>

      <div className="px-4 mb-3">
        <button
          onClick={() => { setMode('all'); setQuery('') }}
          className="w-full flex items-center gap-2 bg-bg-1 border border-bg-3 rounded-xl px-4 py-2.5 text-left hover:border-accent/40"
        >
          <List size={14} className="text-txt-muted" />
          <span className="text-sm text-white font-medium flex-1">All Exercises</span>
          <span className="text-[11px] text-txt-muted">{summarized.length}</span>
          <ChevronRight size={14} className="text-txt-muted" />
        </button>
      </div>

      <div className="px-4 space-y-1.5">
        {MUSCLE_GROUP_LIST.concat(['Other']).map(g => {
          const count = groupCounts[g] || 0
          if (!count) return null
          const top = summarized.filter(e => e.muscleGroup === g).slice(0, 3).map(e => e.name).join(' · ')
          return (
            <button
              key={g}
              onClick={() => { setSelectedGroup(g); setMode('exercises') }}
              className="w-full flex items-center gap-3 bg-bg-1 border border-bg-3 rounded-xl px-4 py-3 text-left hover:border-accent/40"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${groupColor(g)}`}>
                <Layers size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white text-[14px]">{g}</p>
                <p className="text-[11px] text-txt-muted mt-0.5 truncate">{top || `${count} exercise${count !== 1 ? 's' : ''}`}</p>
              </div>
              <span className="text-[11px] text-txt-muted">{count}</span>
              <ChevronRight size={14} className="text-txt-muted" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── List view (used for both per-group and "all") ──────────────

function ExerciseListView({ title, exercises, query, onQuery, onBack, onSelect }) {
  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button onClick={onBack} className="p-1 -ml-1 text-txt-secondary hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-txt-muted uppercase tracking-wider">Muscle group</div>
          <div className="text-white font-bold text-sm truncate">{title}</div>
        </div>
        <span className="text-[11px] text-txt-muted whitespace-nowrap">{exercises.length}</span>
      </div>

      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-2 bg-bg-1 border border-bg-3 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-txt-muted" />
          <input
            value={query}
            onChange={e => onQuery(e.target.value)}
            placeholder="Search exercises..."
            className="flex-1 bg-transparent text-sm text-white placeholder-txt-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-1.5">
        {filtered.map(e => (
          <button
            key={e.name}
            onClick={() => onSelect(e.name)}
            className="w-full flex items-center justify-between bg-bg-1 border border-bg-3 rounded-xl px-4 py-3 text-left hover:border-accent/40"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-[14px] truncate">{e.name}</p>
              <p className="text-[11px] text-txt-muted mt-0.5">
                {e.sessionCount} session{e.sessionCount !== 1 ? 's' : ''} · last {fmtDate(e.lastDateMs)}
              </p>
            </div>
            <div className="text-right ml-3">
              {e.pr != null && (
                <div className="flex items-center gap-1 justify-end text-warn text-xs font-bold">
                  <Trophy size={11} /> {fmtNum(e.pr)} kg
                </div>
              )}
              {e.lastMax != null && (
                <p className="text-[11px] text-txt-muted mt-0.5">{fmtNum(e.lastMax)} kg last</p>
              )}
            </div>
            <ChevronRight size={14} className="text-txt-muted ml-2" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Detail (charts) ───────────────────────────────────────────

function ExerciseDetail({ name, sessions, onBack }) {
  const isoList = Object.keys(sessions).sort()
  const points = isoList.map(iso => {
    const sets = sessions[iso]
    const weights = sets.map(r => Number(r.weight_kg)).filter(n => !Number.isNaN(n))
    const maxWeight = weights.length ? Math.max(...weights) : 0
    const volume = sets.reduce((sum, r) => {
      const w = Number(r.weight_kg) || 0
      const rp = Number(r.reps) || 0
      return sum + w * rp
    }, 0)
    return {
      iso,
      date: isoToShort(iso),
      weight: maxWeight,
      volume: Math.round(volume),
      sets: sets.length,
    }
  })

  const pr = points.length ? Math.max(...points.map(p => p.weight)) : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-1 border-b border-bg-3 flex-shrink-0">
        <button onClick={onBack} className="p-1 -ml-1 text-txt-secondary hover:text-white" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-txt-muted uppercase tracking-wider">Exercise</div>
          <div className="text-white font-bold text-sm truncate">{name}</div>
        </div>
        {pr != null && (
          <div className="flex items-center gap-1 bg-warn/10 text-warn px-2.5 py-1 rounded-lg text-[11px] font-bold">
            <Trophy size={11} /> {fmtNum(pr)} kg
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {points.length > 1 ? (
          <>
            <ChartCard title="Top weight per session (kg)" dataKey="weight" stroke="#4F86F7" data={points} />
            <ChartCard title="Volume per session (kg × reps)" dataKey="volume" stroke="#34C759" data={points} />
          </>
        ) : (
          <div className="bg-bg-1 border border-bg-3 rounded-2xl p-6 text-center">
            <p className="text-txt-secondary text-sm">
              Only {points.length} session so far. One more logged session and charts will appear.
            </p>
          </div>
        )}

        <div className="bg-bg-1 border border-bg-3 rounded-2xl p-4">
          <p className="text-[10px] text-txt-muted mb-3 font-semibold uppercase tracking-wider">
            Session History
          </p>
          <div className="space-y-1.5">
            {[...points].reverse().map(p => (
              <div key={p.iso} className="flex items-center justify-between py-1.5 border-b border-bg-3 last:border-0">
                <span className="text-xs text-txt-secondary">{p.date}</span>
                <span className="text-sm font-bold text-white tabular-nums">{fmtNum(p.weight)} kg</span>
                <span className="text-[11px] text-txt-muted">{p.sets} sets · {p.volume} vol</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, dataKey, stroke, data }) {
  return (
    <div className="bg-bg-1 border border-bg-3 rounded-2xl p-4">
      <p className="text-[10px] text-txt-muted mb-3 font-semibold uppercase tracking-wider">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
          <XAxis dataKey="date" tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#161616', border: '1px solid #303030', borderRadius: 8, color: '#fff', fontSize: 12 }}
            cursor={{ stroke: '#303030' }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} dot={{ fill: stroke, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 bg-bg-1 border border-bg-3 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-white font-semibold text-lg">{title}</p>
      {subtitle && <p className="text-txt-secondary text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action}
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────

function buildByExercise(rows) {
  const out = {}
  for (const r of rows) {
    if (!r.exercise || !r.date) continue
    const iso = toISODate(new Date(r.date))
    ;(out[r.exercise] ||= {})
    ;(out[r.exercise][iso] ||= []).push(r)
  }
  return out
}

function summarize(sessionsObj) {
  const isoList = Object.keys(sessionsObj).sort()
  const sessionCount = isoList.length
  if (!sessionCount) return { pr: null, lastMax: null, lastDateMs: 0, sessionCount: 0 }
  let pr = 0
  for (const iso of isoList) {
    for (const r of sessionsObj[iso]) {
      const w = Number(r.weight_kg)
      if (!Number.isNaN(w) && w > pr) pr = w
    }
  }
  const lastIso = isoList[isoList.length - 1]
  const lastWeights = sessionsObj[lastIso].map(r => Number(r.weight_kg)).filter(n => !Number.isNaN(n))
  const lastMax = lastWeights.length ? Math.max(...lastWeights) : null
  const [y, m, d] = lastIso.split('-').map(Number)
  return {
    pr: pr || null,
    lastMax,
    lastDateMs: new Date(y, m - 1, d).getTime(),
    sessionCount,
  }
}

function fmtDate(ms) {
  if (!ms) return '—'
  const d = new Date(ms)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isoToShort(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtNum(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : String(n)
}

function groupColor(g) {
  switch (g) {
    case 'Chest':         return 'bg-accent/15 text-accent-light'
    case 'Back':          return 'bg-success/15 text-success'
    case 'Shoulders':     return 'bg-warn/15 text-warn'
    case 'Biceps':        return 'bg-accent/15 text-accent-light'
    case 'Triceps':       return 'bg-success/15 text-success'
    case 'Forearms':      return 'bg-warn/15 text-warn'
    case 'Legs':          return 'bg-success/15 text-success'
    case 'Calves/Shins':  return 'bg-success/15 text-success'
    case 'Core':          return 'bg-accent/15 text-accent-light'
    case 'Conditioning':  return 'bg-warn/15 text-warn'
    default:              return 'bg-bg-2 text-txt-secondary'
  }
}
