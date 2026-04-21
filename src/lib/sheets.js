// src/lib/sheets.js
// Google Apps Script bridge — JSONP for reads (no CORS), POST for writes.

import { getSettings } from './settings'

// ─── JSONP (read) ──────────────────────────────────────────────────
// Apps Script doGet supports ?callback=fn for JSONP. We create a unique
// global function, inject a <script> tag, and resolve when it fires.
let jsonpCounter = 0
export function jsonp(url, params = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cbName = `__sheets_cb_${Date.now()}_${jsonpCounter++}`
    const qs = new URLSearchParams({ ...params, callback: cbName }).toString()
    const sep = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${sep}${qs}`

    const script = document.createElement('script')
    let timer = null

    const cleanup = () => {
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
      if (timer) clearTimeout(timer)
    }

    window[cbName] = (data) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP network error'))
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP timeout'))
    }, timeoutMs)

    script.src = fullUrl
    document.head.appendChild(script)
  })
}

// ─── High-level API ────────────────────────────────────────────────
function requireUrl() {
  const { appsScriptUrl } = getSettings()
  if (!appsScriptUrl) throw new Error('Apps Script URL not configured. Open Settings.')
  return appsScriptUrl
}

function requirePassword() {
  const { password } = getSettings()
  if (!password) throw new Error('Password not configured. Open Settings.')
  return password
}

/**
 * Fetch all rows from the sheet (optionally filtered).
 * Returns array of row objects keyed by header.
 *
 * Accepts either response shape:
 *   A. Raw array: [{...}, {...}]                          (current Apps Script)
 *   B. Envelope:  { ok: true, rows: [...] }              (future upgraded script)
 *   C. Error:     { ok: false, error: 'msg' }
 *
 * Client-side filtering for `since` / `workout_type` in case the script
 * doesn't support query-param filtering.
 */
export async function fetchRows({ since, workout_type } = {}) {
  const url = requireUrl()
  const params = {}
  if (since) params.since = since
  if (workout_type) params.workout_type = workout_type
  const res = await jsonp(url, params)

  let rows
  if (Array.isArray(res)) {
    rows = res
  } else if (res && typeof res === 'object') {
    if (res.ok === false) throw new Error(res.error || 'Fetch failed')
    rows = res.rows || []
  } else {
    throw new Error('Unexpected response shape')
  }

  // Defensive client-side filtering (in case server didn't filter).
  if (since) {
    const t = new Date(since).getTime()
    rows = rows.filter(r => r.date && new Date(r.date).getTime() >= t)
  }
  if (workout_type) {
    rows = rows.filter(r => String(r.workout_type) === workout_type)
  }
  return rows
}

/**
 * Post one flat row in the format the existing Apps Script doPost expects:
 *   { secret, date, workout_type, exercise, set_num, weight_kg, reps, rpe, notes }
 * Returns "OK" (plain text) on success.
 *
 * NOTE: text/plain content-type avoids CORS preflight; Apps Script reads
 * e.postData.contents raw regardless of content-type.
 */
async function postOne(row) {
  const url = requireUrl()
  const secret = requirePassword()
  const body = { secret, ...row }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  })
  const text = await res.text()
  // Current doPost returns "OK" as plain text. If it's ever upgraded to return
  // JSON {ok: true}, handle that too.
  if (text === 'OK') return { ok: true }
  try {
    const data = JSON.parse(text)
    if (data.ok === false) throw new Error(data.error || 'POST failed')
    return data
  } catch (e) {
    // Not JSON — probably an unauthorized plain-text response
    if (text.toLowerCase().includes('unauthorized')) throw new Error('Unauthorized — check password in Settings')
    throw new Error(e.message || text || 'POST failed')
  }
}

/** Append a single set log. */
export function logSet({ date, workout_type, exercise, set_num, weight_kg, reps, rpe, notes = '' }) {
  return postOne({ date, workout_type, exercise, set_num, weight_kg, reps, rpe, notes })
}

/**
 * Save many sets sequentially. Returns { succeeded, failed } counts.
 * The existing doPost is append-only (no upsert), so re-saving the same
 * session will create duplicate rows. TODO: when we ship the upsert-capable
 * doPost upgrade, switch saveSession to use it.
 */
export async function saveSession(rows) {
  let succeeded = 0
  const failures = []
  for (const r of rows) {
    try {
      await postOne(r)
      succeeded++
    } catch (e) {
      failures.push({ row: r, error: e.message })
    }
  }
  return { succeeded, failed: failures.length, failures }
}
