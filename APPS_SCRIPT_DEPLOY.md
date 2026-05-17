# Apps Script — Complete Code.gs

**Version: v2 (lock-wrapped doPost)** — if you previously deployed v1 (no lock), re-paste and redeploy. The lock prevents concurrent writes from producing duplicate rows when a save races with a retry, a double-tap, or two devices saving simultaneously.

This is a **single, complete `Code.gs`** for your train-app Apps Script.
Paste the whole thing in to get:

- ✅ JSONP reads (`?callback=fn`) — unchanged behavior the app expects today
- ✅ Legacy single-row POST (backward compatible — old clients still work)
- ✅ **`action: "upsert"`** — re-saving a day **overwrites** rows instead of appending duplicates
- ✅ **`action: "clean-duplicates"`** — collapses existing duplicate rows in your sheet, keeping the newest timestamp per `(date | workout_type | exercise | set_num)`
- ✅ **Document lock around every write** — concurrent doPost calls serialize cleanly instead of racing each other into duplicate appends

## Sheet columns

```
date | workout_type | exercise | set_num | weight_kg | reps | rpe | notes | timestamp
```

The 9th column `timestamp` is auto-populated by every write with `new Date().toISOString()`.

## Deploy steps

1. Open https://script.google.com → your train-app project.
2. Replace the entire `Code.gs` contents with the code below.
3. Set `SHEET_PASSWORD` to match the password you typed into the app's Settings screen.
4. **Deploy → Manage deployments → pencil → New version → Deploy.**
5. URL stays the same — no changes needed in the app.
6. (One-time cleanup) In the app: Settings → **Clean duplicate rows**. This collapses any leftover duplicates from before the upgrade.

## Code.gs

```javascript
// ─── Config ──────────────────────────────────────────────────────
const SHEET_PASSWORD = 'CHANGE_ME_BEFORE_DEPLOY'; // set to match the password you typed into the app's Settings screen

// ─── READ (JSONP-compatible) ─────────────────────────────────────
function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback || '').trim();
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const values = sheet.getDataRange().getValues();
    if (!values.length) return _respond({ ok: true, rows: [] }, callback);

    const headers = values[0];
    const rows = values.slice(1).map(row => {
      const o = {};
      headers.forEach((h, i) => o[h] = row[i]);
      return o;
    });

    // Optional server-side filtering
    let filtered = rows;
    const since = e && e.parameter && e.parameter.since;
    if (since) {
      const t = new Date(since).getTime();
      filtered = filtered.filter(r => r.date && new Date(r.date).getTime() >= t);
    }
    const wt = e && e.parameter && e.parameter.workout_type;
    if (wt) filtered = filtered.filter(r => String(r.workout_type) === wt);

    return _respond(filtered, callback);
  } catch (err) {
    return _respond({ ok: false, error: String(err) }, callback);
  }
}

// ─── WRITE / UPSERT / CLEAN ──────────────────────────────────────
function doPost(e) {
  // Serialize writes — without this, two concurrent doPost calls (double-tap,
  // retry-during-original, two devices) both read the same sheet baseline and
  // both append, defeating the upsert. Reads (doGet) don't need locking.
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000); // 30s — fail loudly rather than silently racing
  } catch (err) {
    return _json({ ok: false, error: 'Could not acquire lock — try again' });
  }
  try {
    try {
      const body = JSON.parse(e.postData.contents || '{}');
  
      // Accept both "secret" (legacy) and "password" field names
      const pw = body.secret || body.password;
      if (pw !== SHEET_PASSWORD) {
        return ContentService.createTextOutput('unauthorized');
      }
  
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const values = sheet.getDataRange().getValues();
      const headers = values[0];
  
      // Helper: build an array in header order
      const toArray = (r) => headers.map(h => {
        if (h === 'timestamp') return new Date().toISOString();
        return r[h] != null ? r[h] : '';
      });
  
      // ── Legacy single-row append (no action field) ──
      if (!body.action && (body.date || body.exercise)) {
        sheet.appendRow([
          body.date || '',
          body.workout_type || '',
          body.exercise || '',
          body.set_num || '',
          body.weight_kg || '',
          body.reps || '',
          body.rpe || '',
          body.notes || '',
          new Date().toISOString(),
        ]);
        return ContentService.createTextOutput('OK');
      }
  
      const action = body.action || 'append';
  
      // ── Append batch ──
      if (action === 'append') {
        const rows = body.rows || (body.row ? [body.row] : []);
        rows.forEach(r => sheet.appendRow(toArray(r)));
        return _json({ ok: true, appended: rows.length });
      }
  
      // ── Upsert: update if key matches, append otherwise ──
      if (action === 'upsert') {
        const rows = body.rows || (body.row ? [body.row] : []);
        const keyFields = (body.upsertKey || 'date|workout_type|exercise|set_num').split('|');
  
        // In-memory snapshot of existing rows for fast key matching.
        const existing = values.slice(1).map(row => {
          const o = {}; headers.forEach((h, i) => o[h] = row[i]); return o;
        });
        const keyOf = o => keyFields.map(f => String(o[f] != null ? o[f] : '')).join('');
  
        let updated = 0, appended = 0;
        rows.forEach(r => {
          const idx = existing.findIndex(x => keyOf(x) === keyOf(r));
          if (idx >= 0) {
            // Preserve original timestamp — re-saving must not overwrite when
            // the row was first logged. Only update fields the client provided.
            const rowNum = idx + 2; // +1 header, +1 1-indexed
            headers.forEach((h, i) => {
              if (h === 'timestamp') return;
              if (r[h] !== undefined) {
                sheet.getRange(rowNum, i + 1).setValue(r[h]);
                existing[idx][h] = r[h];
              }
            });
            updated++;
          } else {
            const arr = toArray(r);
            sheet.appendRow(arr);
            // Keep `existing` in sync so later rows in same batch dedupe correctly
            const newRow = {};
            headers.forEach((h, i) => newRow[h] = arr[i]);
            existing.push(newRow);
            appended++;
          }
        });
        return _json({ ok: true, updated, appended });
      }
  
      // ── Clean duplicates: collapse rows by key, keep newest timestamp ──
      if (action === 'clean-duplicates') {
        const keyFields = (body.dedupeKey || 'date|workout_type|exercise|set_num').split('|');
        const tsIdx = headers.indexOf('timestamp');
        const dataRows = values.slice(1);
  
        const map = new Map();   // key -> { rowNum, ts }
        const toDelete = [];     // sheet row numbers (1-indexed)
  
        dataRows.forEach((row, i) => {
          const rowNum = i + 2;
          const o = {}; headers.forEach((h, j) => o[h] = row[j]);
          // Skip rows missing any key field — preserve them
          if (keyFields.some(f => o[f] === '' || o[f] == null)) return;
          const k = keyFields.map(f => String(o[f])).join('');
          const ts = tsIdx >= 0 ? (new Date(row[tsIdx]).getTime() || 0) : 0;
          const prev = map.get(k);
          if (!prev) {
            map.set(k, { rowNum, ts });
          } else if (ts > prev.ts) {
            // Newer wins — delete the previous, track this one
            toDelete.push(prev.rowNum);
            map.set(k, { rowNum, ts });
          } else {
            toDelete.push(rowNum);
          }
        });
  
        // Delete in descending order so row numbers don't shift mid-loop
        toDelete.sort((a, b) => b - a).forEach(n => sheet.deleteRow(n));
        return _json({ ok: true, deleted: toDelete.length, kept: map.size });
      }
  
      return _json({ ok: false, error: 'unknown action: ' + action });
    } catch (err) {
      return _json({ ok: false, error: String(err) });
    }
  } finally {
    lock.releaseLock();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _respond(data, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return _json(data);
}
```

## Why this is backward-compatible

- Legacy single-row POST (`{ secret, date, exercise, ... }` with no `action`) still works — existing tools won't break.
- JSONP reads (`?callback=fn`) work identically to before.
- The `Content-Type: text/plain` workaround the app uses to avoid CORS preflight still works (Apps Script reads `e.postData.contents` regardless).
