import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings as SettingsIcon, Pencil, Check, RefreshCw } from 'lucide-react'
import { getSettings, workoutTypeForDate, toISODate, isConfigured } from '../../lib/settings'
import { useSheetData, rowsByDate, lastSessionForType } from '../../lib/useSheetData'
import useAppStore from '../../store/useAppStore'
import SettingsModal from '../settings/SettingsModal'
import DayAssignSheet from './DayAssignSheet'
import LastSessionBanner from './LastSessionBanner'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function CalendarHome() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()))
  const [editMode, setEditMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(!isConfigured())
  const [assignISO, setAssignISO] = useState(null)

  const { rows, loading, error, refresh } = useSheetData()
  const byDate = useMemo(() => rowsByDate(rows), [rows])

  // Build 6×7 grid
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor])

  const selectedDate = isoToDate(selectedISO)
  const selectedWorkout = workoutTypeForDate(selectedDate)
  const lastSession = useMemo(
    () => isRestType(selectedWorkout) ? null : lastSessionForType(rows, selectedWorkout),
    [rows, selectedWorkout]
  )

  const handleDayClick = (iso) => {
    if (editMode) {
      setAssignISO(iso)
    } else {
      setSelectedISO(iso)
    }
  }

  const goMonth = (delta) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1)
    setCursor(next)
  }

  const goToday = () => {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedISO(toISODate(now))
  }

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => goMonth(-1)}
          className="p-2 -ml-2 text-txt-secondary hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={goToday}
          className="flex-1 text-center text-white font-bold text-lg"
        >
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </button>
        <button
          onClick={() => goMonth(1)}
          className="p-2 -mr-2 text-txt-secondary hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2 text-[11px] text-txt-muted">
          {loading && <span className="flex items-center gap-1"><RefreshCw size={11} className="animate-spin" />Syncing…</span>}
          {error && !loading && (
            <button onClick={refresh} className="text-danger">Sync failed · retry</button>
          )}
          {!loading && !error && (
            <button onClick={refresh} className="flex items-center gap-1 hover:text-white">
              <RefreshCw size={11} />Synced
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditMode((e) => !e)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
              editMode
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-1 text-txt-secondary border-bg-3 hover:text-white'
            }`}
          >
            {editMode ? <Check size={13} /> : <Pencil size={13} />}
            {editMode ? 'Done' : 'Edit'}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-txt-secondary hover:text-white"
            aria-label="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      {editMode && (
        <div className="mx-4 mb-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-[11px] text-accent-light">
          Tap any day to assign a different workout, or reset to the default pattern.
        </div>
      )}

      {/* Weekday header */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-txt-muted tracking-wider">
            {w.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 px-2">
        {grid.map(({ date, inMonth }) => {
          const iso = toISODate(date)
          const wt = workoutTypeForDate(date)
          const hasData = !!byDate[iso]?.length
          const isToday = iso === toISODate(new Date())
          const isSelected = iso === selectedISO
          return (
            <DayCell
              key={iso}
              date={date}
              inMonth={inMonth}
              workoutType={wt}
              hasData={hasData}
              isToday={isToday}
              isSelected={isSelected}
              editMode={editMode}
              onClick={() => handleDayClick(iso)}
            />
          )
        })}
      </div>

      {/* Today / Selected preview */}
      <div className="px-4 pt-5">
        <LastSessionBanner
          workoutType={selectedWorkout}
          lastSession={lastSession}
          selectedISO={selectedISO}
        />
        <SelectedDayCard
          selectedISO={selectedISO}
          workoutType={selectedWorkout}
          loggedRows={byDate[selectedISO] || []}
        />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DayAssignSheet
        iso={assignISO}
        onClose={() => setAssignISO(null)}
      />
    </div>
  )
}

// ─── Day cell ───────────────────────────────────────────────────────
function DayCell({ date, inMonth, workoutType, hasData, isToday, isSelected, editMode, onClick }) {
  const tint = tintForType(workoutType)
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-lg relative flex flex-col items-center justify-center transition-colors ${
        inMonth ? tint.bg : 'bg-bg-1/40'
      } ${isSelected ? 'ring-2 ring-accent' : ''} ${
        editMode && inMonth ? 'ring-1 ring-accent/40' : ''
      }`}
    >
      <span className={`text-sm font-semibold ${inMonth ? 'text-white' : 'text-txt-muted'} ${
        isToday ? 'text-accent' : ''
      }`}>
        {date.getDate()}
      </span>
      {inMonth && !isRestType(workoutType) && (
        <span className={`text-[9px] font-bold tracking-wide ${tint.label}`}>
          {shortType(workoutType)}
        </span>
      )}
      {hasData && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-success" />
      )}
    </button>
  )
}

// ─── Selected day card ──────────────────────────────────────────────
function SelectedDayCard({ selectedISO, workoutType, loggedRows }) {
  const openQuickLog = useAppStore(s => s.openQuickLog)
  const startGuidedSession = useAppStore(s => s.startGuidedSession)
  const date = isoToDate(selectedISO)
  const isToday = selectedISO === toISODate(new Date())
  const isFuture = date.getTime() > new Date().setHours(23,59,59,999)
  const isRest = isRestType(workoutType)

  const label = date.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  const uniqueExercises = [...new Set(loggedRows.map(r => r.exercise))]
  const setCount = loggedRows.length
  const hasLog = setCount > 0

  return (
    <div className="bg-bg-1 border border-bg-3 rounded-2xl p-4 mt-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-txt-muted">
            {isToday ? 'Today' : isFuture ? 'Upcoming' : 'Past'}
          </div>
          <div className="text-white font-bold text-base">{label}</div>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pillForType(workoutType)}`}>
          {workoutType}
        </div>
      </div>

      {isRest ? (
        <p className="text-txt-secondary text-sm mt-3">Rest day. Recover.</p>
      ) : (
        <>
          {hasLog ? (
            <div className="mt-3 space-y-1">
              <div className="text-xs text-txt-muted">
                {setCount} sets logged · {uniqueExercises.length} exercises
              </div>
              <div className="text-[11px] text-txt-secondary truncate">
                {uniqueExercises.slice(0, 4).join(' · ')}
                {uniqueExercises.length > 4 && ` +${uniqueExercises.length - 4}`}
              </div>
            </div>
          ) : (
            <p className="text-txt-muted text-sm mt-3">No sets logged yet.</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => openQuickLog(selectedISO)}
              className="flex-1 bg-bg-2 hover:bg-bg-3 text-white text-sm font-semibold rounded-lg py-2.5 border border-bg-3"
            >
              {hasLog ? 'Edit Quick Log' : 'Quick Log'}
            </button>
            <button
              onClick={() => startGuidedSession(selectedISO)}
              className="flex-1 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg py-2.5"
            >
              Start Session
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────
function buildMonthGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const startOffset = first.getDay() // 0=Sun
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - startOffset + i)
    cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() })
  }
  return cells
}

function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isRestType(t) {
  const s = String(t || '').toLowerCase()
  return !t || s === 'rest' || s === 'off' || s === '—'
}

function shortType(t) {
  // "Upper A" → "U A", "Lower B" → "L B", "Push" → "P"
  return String(t)
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

// Color tints per spec: Blue=Upper, Green=Lower, Dark=Rest
function tintForType(t) {
  if (isRestType(t)) return { bg: 'bg-bg-1', label: 'text-txt-muted' }
  const s = String(t).toLowerCase()
  if (s.startsWith('upper')) return { bg: 'bg-accent/15', label: 'text-accent-light' }
  if (s.startsWith('lower')) return { bg: 'bg-success/15', label: 'text-success' }
  return { bg: 'bg-bg-2', label: 'text-txt-secondary' }
}

function pillForType(t) {
  if (isRestType(t)) return 'bg-bg-2 text-txt-muted'
  const { bg, label } = tintForType(t)
  return `${bg} ${label}`
}
