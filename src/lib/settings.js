// src/lib/settings.js
// Non-secret app config + SECRET password live in localStorage only.
// Nothing here is committed to the repo.

const KEY = 'trainapp:settings:v1'

const DEFAULTS = {
  appsScriptUrl: '',   // e.g. https://script.google.com/macros/s/XXX/exec
  password: '',        // matches SHEET_PASSWORD in your Apps Script
  defaultPattern: {    // weekday → workout_type. 0 = Sunday.
    0: 'Rest',
    1: 'Upper A',
    2: 'Lower A',
    3: 'Rest',
    4: 'Upper B',
    5: 'Lower B',
    6: 'Rest',
  },
  // Override specific calendar dates: { 'YYYY-MM-DD': 'Upper A' | 'Rest' | ... }
  dayOverrides: {},
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...parsed,
      defaultPattern: { ...DEFAULTS.defaultPattern, ...(parsed.defaultPattern || {}) },
      dayOverrides: { ...(parsed.dayOverrides || {}) },
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setSettings(patch) {
  const cur = getSettings()
  const next = { ...cur, ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: next }))
  return next
}

export function setDayOverride(isoDate, workoutType) {
  const cur = getSettings()
  const overrides = { ...cur.dayOverrides }
  if (workoutType == null) {
    delete overrides[isoDate]
  } else {
    overrides[isoDate] = workoutType
  }
  return setSettings({ dayOverrides: overrides })
}

export function clearAllOverrides() {
  return setSettings({ dayOverrides: {} })
}

export function isConfigured() {
  const { appsScriptUrl, password } = getSettings()
  return !!(appsScriptUrl && password)
}

/** Given a Date, return the assigned workout_type based on override-or-pattern. */
export function workoutTypeForDate(date) {
  const s = getSettings()
  const iso = toISODate(date)
  if (s.dayOverrides[iso] !== undefined) return s.dayOverrides[iso]
  const dow = date.getDay()
  return s.defaultPattern[dow] || 'Rest'
}

/** YYYY-MM-DD in local time (avoid UTC surprises near midnight). */
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
