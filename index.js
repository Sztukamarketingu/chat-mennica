const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Przechowuj ostatnie 10 eventów w pamięci (debug)
const eventLog = [];

const N8N_BOT_WEBHOOK = 'https://n8n.sztukaautomatyzacji.pl/webhook/mennica-chatbase-bot';
const BITRIX_WEBHOOK  = 'https://mennica.bitrix24.pl/rest/10/jxsd91458zoj2r6t/';

// Strona instalacji — otwierana w iframe w Bitrix
app.get('/install', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asystent Mennica AI</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; border-radius: 12px; padding: 40px; text-align: center;
            box-shadow: 0 2px 16px rgba(0,0,0,0.08); max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; margin: 0 0 8px; font-size: 22px; }
    p { color: #666; margin: 0 0 24px; line-height: 1.5; }
    .badge { background: #e8f5e9; color: #2e7d32; padding: 6px 16px;
             border-radius: 20px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🤖</div>
    <h1>Asystent Mennica AI</h1>
    <p>Bot AI do obsługi klientów został zainstalowany i skonfigurowany w Twoim Bitrix24.</p>
    <span class="badge">✓ Aktywny</span>
  </div>
</body>
</html>`);
});

// Handler — odbiera wszystkie eventy z Bitrix
app.post('/handler', async (req, res) => {
  const body   = req.body || {};
  const event  = body.event || '';
  const auth   = body.auth  || {};

  // Zapisz event do logu debug
  eventLog.unshift({ ts: new Date().toISOString(), event, auth: JSON.stringify(auth).slice(0, 300), body: JSON.stringify(body).slice(0, 500) });
  if (eventLog.length > 10) eventLog.pop();

  console.log(`[${new Date().toISOString()}] Event: ${event}`, JSON.stringify(auth).slice(0, 120));

  // Zawsze odpowiedz 200 szybko
  res.json({ status: 'ok' });

  const clientEndpoint   = auth.client_endpoint   || '';
  const applicationToken = auth.application_token || '';

  if (event === 'ONAPPINSTALL') {
    // Zarejestruj bota
    try {
      const resp = await fetch(`${clientEndpoint}imbot.register?auth=${applicationToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODE:          'mennica_ai_bot',
          EVENT_HANDLER: N8N_BOT_WEBHOOK,
          OPENLINE:      'Y',
          NAME:          'Asystent Mennica',
          COLOR:         'AQUA',
        }),
      });
      const data = await resp.json();
      console.log('[INSTALL] imbot.register:', JSON.stringify(data));
    } catch (e) {
      console.error('[INSTALL] Błąd rejestracji bota:', e.message);
    }
    return;
  }

  if (event === 'ONIMBOTMESSAGEADD') {
    // Przekaż wiadomość do n8n → Chatbase
    const params = body.data?.PARAMS || {};
    try {
      await fetch(N8N_BOT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { PARAMS: params }, auth }),
      });
    } catch (e) {
      console.error('[BOT] Błąd przekazania do n8n:', e.message);
    }
    return;
  }

  // Pozostałe eventy — tylko loguj
  console.log(`[EVENT] ${event} — pomijam`);
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Debug — ostatnie eventy z Bitrix
app.get('/debug', (req, res) => res.json({ events: eventLog }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mennica Bitrix App nasłuchuje na porcie ${PORT}`));
