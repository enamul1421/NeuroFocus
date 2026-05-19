const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxpLYNi8oGefi2MJrhvx-c6M2Tns5_wyeMI-Tzy0FxfKnql1qfRczAEhKfOIg-OzWjp4Q/exec';

// Fire-and-forget — never blocks the user, fails silently
export function syncToSheets(module, participantCode, payload) {
  if (!SHEETS_URL) return;
  const code = participantCode || 'unknown';
  fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      participantCode: code,
      module,
      payload,
    }),
  })
    .then(r => r.text().then(t => console.log(`[Sheets] ${module}:`, t)))
    .catch(e => console.warn('[Sheets] sync failed:', e.message));
}
