// src/components/progress/ProgressView.jsx
// Per-exercise progress from the Google Sheet. All weights in kg.
// List of exercises → tap one → max-weight line chart + volume line chart
// + session history table.

import React, { useMemo, useState } from 'react'
import {
  TrendingUp, Trophy, Search, ArrowLeft, RefreshCw, AlertCircle,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useSheetData } from '../../lib/useSheetData'
import { toISODate, isConfigured } from '../../lib/settings'

export default function ProgressView() {
  const { rows, loading, error, refresh } = useSheetData()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const byExercise = useMemo(() => buildByExercise(rows), [rows])
  const exercises = useMemo(() => {
    const list = Object.keys(byExercise)
      .map(name => ({ name, ...summarize(byExercise[name]) }))
    list.sort((a, b) => b.lastDateMs - a.lastDateMs)
    return list
  }, [byExercise])

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

  if (!exercises.length && !loading) {
    return (
      <EmptyState
        icon={<TrendingUp size={28} className="text-txt-muted" />}
        title="No data yet"
        subtitle="Log some workouts and progress charts will appear here."
      />
    )
  }

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises

  if (selected) {
    return (
      <ExerciseDetail
        name={selected}
        sessions={byExercise[selected] || []}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Progress</h1>
          <p className="text-xs text-txt-secondary mt-0.5">
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} tracked
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
        <div className="flex items-center gap-2 bg-bg-1 border border-bg-3 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-txt-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises..."
            className="flex-1 bg-transparent text-sm text-white placeholder-txt-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 space-y-1.5">
        {filtered.map(e => (
          <button
            key={e.name}
            onClick={() => setSelected(e.name)}
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
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Detail ────────────────────────────────────────────────────

function ExerciseDetail({ name, sessions, onBack }) {
  // sessions = { [iso]: rows[] }
  const isoList = Object.keys(sessions).sort()
  const points = isoList.map(iso => {
    const rows = sessions[iso]
    const weights = rows.map(r => Number(r.weight_kg)).filter(n => !Number.isNaN(n))
    const maxWeight = weights.length ? Math.max(...weights) : 0
    const volume = rows.reduce((sum, r) => {
      const w = Number(r.weight_kg) || 0
      const rp = Number(r.reps) || 0
      return sum + w * rp
    }, 0)
    return {
      iso,
      date: isoToShort(iso),
      weight: maxWeight,
      volume: Math.round(volume),
      sets: rows.length,
    }
  })

  const pr = points.length ? Math.max(...points.map(p => p.weight)) : null
  const last = points[points.length - 1]

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
            contentStyle={{
              background: '#161616', border: '1px solid #303030',
              borderRadius: 8, color: '#fff', fontSize: 12,
            }}
            cursor={{ stroke: '#303030' }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            dot={{ fill: stroke, r: 3 }}
            activeDot={{ r: 5 }}
          />
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
  // exercise → { iso: rows[] }
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
  const lastRows = sessionsObj[lastIso]
  const lastWeights = lastRows.map(r => Number(r.weight_kg)).filter(n => !Number.isNaN(n))
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
  if (Number.isNaN(n)) return String(v)
  return Number.isInteger(n) ? String(n) : String(n)
}
