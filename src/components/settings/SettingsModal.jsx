import React, { useState, useEffect } from 'react'
import { X, Save, CheckCircle2, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { getSettings, setSettings } from '../../lib/settings'
import { jsonp, cleanDuplicates } from '../../lib/sheets'

export default function SettingsModal({ open, onClose }) {
  const [url, setUrl] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState(null)

  useEffect(() => {
    if (open) {
      const s = getSettings()
      setUrl(s.appsScriptUrl || '')
      setPassword(s.password || '')
      setTestResult(null)
      setCleanResult(null)
    }
  }, [open])

  if (!open) return null

  const save = () => {
    setSettings({ appsScriptUrl: url.trim(), password: password.trim() })
    onClose?.()
  }

  const handleClean = async () => {
    if (!confirm('Delete duplicate rows from your Google Sheet?\n\nKeeps the most recent version of every (date, exercise, set) entry. Older copies are removed permanently. This is safe and recommended.')) return
    setCleaning(true)
    setCleanResult(null)
    try {
      const res = await cleanDuplicates()
      setCleanResult({ ok: true, deleted: res.deleted ?? 0, kept: res.kept ?? 0 })
      // Wipe local cache so the next refresh pulls clean data.
      try { localStorage.removeItem('trainapp:sheet-cache:v2') } catch {}
      window.dispatchEvent(new CustomEvent('settings-changed'))
    } catch (e) {
      setCleanResult({ error: e.message })
    } finally {
      setCleaning(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await jsonp(url.trim(), {})
      // Accept either response shape:
      //   raw array [{...}, ...]               (current Apps Script)
      //   envelope { ok: true, rows: [...] }   (future upgrade)
      if (Array.isArray(res)) {
        setTestResult({ ok: true, count: res.length })
      } else if (res && res.ok) {
        setTestResult({ ok: true, count: (res.rows || []).length })
      } else if (res && res.ok === false) {
        setTestResult({ error: res.error || 'Server returned error' })
      } else {
        setTestResult({ error: 'Unexpected response: ' + JSON.stringify(res).slice(0, 120) })
      }
    } catch (e) {
      setTestResult({ error: e.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-bg-1 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-bg-3 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-3">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1 text-txt-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1.5 tracking-wide">
              APPS SCRIPT URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-bg-2 text-white text-sm rounded-lg px-3 py-2.5 border border-bg-3 focus:border-accent focus:outline-none"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-txt-muted mt-1">
              The /exec URL from your deployed Apps Script.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1.5 tracking-wide">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Matches SHEET_PASSWORD in Code.gs"
              className="w-full bg-bg-2 text-white text-sm rounded-lg px-3 py-2.5 border border-bg-3 focus:border-accent focus:outline-none"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-txt-muted mt-1">
              Stored only in this browser. Never committed to the repo.
            </p>
          </div>

          <button
            onClick={test}
            disabled={!url || testing}
            className="w-full bg-bg-2 hover:bg-bg-3 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 border border-bg-3"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>

          {testResult?.ok && (
            <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-lg px-3 py-2.5 text-success text-sm">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>Connected. Sheet has {testResult.count} rows.</span>
            </div>
          )}
          {testResult?.error && (
            <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-danger text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="break-all">{testResult.error}</span>
            </div>
          )}

          <div className="pt-2 border-t border-bg-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
              Maintenance
            </div>
            <button
              onClick={handleClean}
              disabled={!url || !password || cleaning}
              className="w-full bg-bg-2 hover:bg-bg-3 disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 border border-bg-3 flex items-center justify-center gap-2"
            >
              {cleaning ? (
                <><Loader2 size={14} className="animate-spin" /> Cleaning…</>
              ) : (
                <><Trash2 size={14} /> Clean duplicate rows</>
              )}
            </button>
            <p className="text-[11px] text-txt-muted mt-1.5 leading-snug">
              Removes leftover duplicate rows from your sheet (kept the latest version of each set). Safe to run any time.
            </p>

            {cleanResult?.ok && (
              <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-lg px-3 py-2.5 text-success text-sm mt-2">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span>Cleaned {cleanResult.deleted} duplicate rows. {cleanResult.kept} unique sets kept.</span>
              </div>
            )}
            {cleanResult?.error && (
              <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 text-danger text-sm mt-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="break-all">{cleanResult.error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-bg-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-bg-2 hover:bg-bg-3 text-white text-sm font-semibold rounded-lg py-2.5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!url || !password}
            className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-40 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-1.5"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
