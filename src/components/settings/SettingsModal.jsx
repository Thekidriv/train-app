import React, { useState, useEffect } from 'react'
import { X, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { getSettings, setSettings } from '../../lib/settings'
import { jsonp } from '../../lib/sheets'

export default function SettingsModal({ open, onClose }) {
  const [url, setUrl] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | { error }

  useEffect(() => {
    if (open) {
      const s = getSettings()
      setUrl(s.appsScriptUrl || '')
      setPassword(s.password || '')
      setTestResult(null)
    }
  }, [open])

  if (!open) return null

  const save = () => {
    setSettings({ appsScriptUrl: url.trim(), password: password.trim() })
    onClose?.()
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
