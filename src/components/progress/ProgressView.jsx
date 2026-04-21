import React, { useState } from 'react'
import { TrendingUp, Trophy, Search } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import useAppStore from '../../store/useAppStore'
import { formatDateShort } from '../../utils/youtube'

export default function ProgressView() {
  const { sessions, getExerciseHistory } = useAppStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  // Get all unique exercise names from completed sessions
  const allExercises = [...new Set(
    sessions
      .filter(s => s.completed)
      .flatMap(s => s.exerciseLogs.map(el => el.exerciseName))
  )].sort()

  const filtered = query.trim()
    ? allExercises.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : allExercises

  const history = selected ? getExerciseHistory(selected) : []

  const chartData = history.map(h => ({
    date: formatDateShort(h.date),
    weight: h.maxWeight,
    volume: Math.round(h.totalVolume),
  }))

  const pr = history.length ? Math.max(...history.map(h => h.maxWeight)) : null

  if (allExercises.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 bg-bg-2 rounded-full flex items-center justify-center mb-4">
          <TrendingUp size={28} className="text-txt-muted" />
        </div>
        <p className="text-white font-semibold text-lg">No data yet</p>
        <p className="text-txt-secondary text-sm mt-1">Log some workouts to see progress charts</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-white">Progress</h1>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 bg-bg-2 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-txt-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises..."
            className="flex-1 bg-transparent text-sm text-white placeholder-txt-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 pb-24">
        {/* Exercise list */}
        {!selected ? (
          <div className="space-y-1.5">
            {filtered.map(name => {
              const hist = getExerciseHistory(name)
              const pr = hist.length ? Math.max(...hist.map(h => h.maxWeight)) : null
              const recent = hist[hist.length - 1]
              return (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className="w-full flex items-center justify-between bg-bg-2 rounded-xl px-4 py-3 text-left hover:bg-bg-3 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white text-[14px]">{name}</p>
                    <p className="text-xs text-txt-secondary mt-0.5">{hist.length} session{hist.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    {pr !== null && (
                      <div className="flex items-center gap-1 justify-end text-warn text-xs font-bold">
                        <Trophy size={11} /> {pr} lb
                      </div>
                    )}
                    {recent && (
                      <p className="text-xs text-txt-muted">{recent.maxWeight} lb last</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* Exercise detail chart */
          <div>
            <button onClick={() => setSelected(null)} className="text-xs text-txt-secondary hover:text-white mb-4">← All exercises</button>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{selected}</h2>
              {pr !== null && (
                <div className="flex items-center gap-1.5 bg-warn/10 px-3 py-1.5 rounded-xl">
                  <Trophy size={14} className="text-warn" />
                  <span className="text-warn text-sm font-bold">PR: {pr} lb</span>
                </div>
              )}
            </div>

            {chartData.length > 1 ? (
              <>
                <div className="bg-bg-2 rounded-2xl p-4 mb-4">
                  <p className="text-xs text-txt-secondary mb-3 font-semibold uppercase tracking-wider">Max Weight (lb)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                      <XAxis dataKey="date" tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1E1E1E', border: '1px solid #303030', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        cursor={{ stroke: '#303030' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#4F86F7" strokeWidth={2} dot={{ fill: '#4F86F7', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-bg-2 rounded-2xl p-4">
                  <p className="text-xs text-txt-secondary mb-3 font-semibold uppercase tracking-wider">Volume (lb × reps)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                      <XAxis dataKey="date" tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5A5A5A', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1E1E1E', border: '1px solid #303030', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        cursor={{ stroke: '#303030' }}
                      />
                      <Line type="monotone" dataKey="volume" stroke="#34C759" strokeWidth={2} dot={{ fill: '#34C759', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="bg-bg-2 rounded-2xl p-8 text-center">
                <p className="text-txt-secondary text-sm">Need at least 2 sessions to show a chart</p>
              </div>
            )}

            {/* Session history table */}
            <div className="bg-bg-2 rounded-2xl p-4 mt-4">
              <p className="text-xs text-txt-secondary mb-3 font-semibold uppercase tracking-wider">Session History</p>
              <div className="space-y-2">
                {[...history].reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-bg-3 last:border-0">
                    <span className="text-xs text-txt-secondary">{formatDateShort(h.date)}</span>
                    <span className="text-sm font-bold text-white">{h.maxWeight} lb</span>
                    <span className="text-xs text-txt-muted">{h.sets.length} sets</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
