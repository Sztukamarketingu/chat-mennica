const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Przechowuj ostatnie 10 eventów w pamięci (debug)
const eventLog = [];

const N8N_BOT_WEBHOOK = 'https://n8n.sztukaautomatyzacji.pl/webhook/mennica-chatbase-bot';
const BITRIX_REST     = 'https://mennica.bitrix24.pl/rest/';

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
  const body  = req.body || {};

  // Bitrix wysyła event jako małe litery w polu "event"
  // ale pola auth jako wielkie litery płasko (AUTH_ID, APPLICATION_TOKEN, APPLICATION_SCOPE)
  const event = body.event || body.EVENT || '';

  // Obsługa obu formatów: płaski uppercase (ONAPPINSTALL) i zagnieżdżony (legacy)
  const applicationToken = body.APPLICATION_TOKEN || body.auth?.application_token || '';
  const authId           = body.AUTH_ID           || body.auth?.access_token      || '';
  const scope            = body.APPLICATION_SCOPE || '';

  // Zapisz event do logu debug
  eventLog.unshift({
    ts: new Date().toISOString(),
    event,
    scope: scope.slice(0, 300),
    authId: authId.slice(0, 20) + '...',
    applicationToken: applicationToken.slice(0, 20) + '...',
    body: JSON.stringify(body).slice(0, 600),
  });
  if (eventLog.length > 10) eventLog.pop();

  console.log(`[${new Date().toISOString()}] Event: "${event}" scope: ${scope.slice(0, 100)}`);

  // Zawsze odpowiedz 200 szybko
  res.json({ status: 'ok' });

  // ONAPPINSTALL — Bitrix może wysłać event pusty przy instalacji lokalnej,
  // wykrywamy po obecności APPLICATION_TOKEN + APPLICATION_SCOPE
  const isInstall = event === 'ONAPPINSTALL' || (!event && applicationToken && scope);

  if (isInstall) {
    if (!scope.includes('imbot')) {
      console.warn('[INSTALL] Brak scope "imbot" — dodaj uprawnienia imbot, im, imopenlines w ustawieniach aplikacji Bitrix i zainstaluj ponownie.');
      return;
    }
    try {
      const params = new URLSearchParams({
        auth:          authId,
        CODE:          'mennica_ai_bot',
        EVENT_HANDLER: N8N_BOT_WEBHOOK,
        OPENLINE:      'Y',
        NAME:          'Asystent Mennica',
        COLOR:         'AQUA',
      });
      const resp = await fetch(`${BITRIX_REST}imbot.register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await resp.json();
      console.log('[INSTALL] imbot.register:', JSON.stringify(data));
    } catch (e) {
      console.error('[INSTALL] Błąd rejestracji bota:', e.message);
    }
    return;
  }

  if (event === 'ONIMBOTMESSAGEADD') {
    // Ten event normalnie idzie bezpośrednio do n8n (EVENT_HANDLER w imbot.register),
    // ale obsługujemy na wszelki wypadek
    const params = body.data?.PARAMS || {};
    try {
      await fetch(N8N_BOT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { PARAMS: params },
          auth: { AUTH_ID: authId, APPLICATION_TOKEN: applicationToken },
        }),
      });
    } catch (e) {
      console.error('[BOT] Błąd przekazania do n8n:', e.message);
    }
    return;
  }

  // Pozostałe eventy — tylko loguj
  console.log(`[EVENT] "${event}" — pomijam`);
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Debug — ostatnie eventy z Bitrix
app.get('/debug', (req, res) => res.json({ events: eventLog }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mennica Bitrix App nasłuchuje na porcie ${PORT}`));
