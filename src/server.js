import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import { startReminderLoop } from './reminders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ── Auth básica (opcional) ─────────────────────────────────
// Define DASHBOARD_PASSWORD (y opcional DASHBOARD_USER) para proteger el panel.
const USER = process.env.DASHBOARD_USER || 'aurun';
const PASS = process.env.DASHBOARD_PASSWORD;
app.use((req, res, next) => {
  if (!PASS) return next(); // sin password configurado → abierto (solo dev)
  const [, b64 = ''] = (req.headers.authorization || '').split(' ');
  const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
  if (u === USER && p === PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="Aurun"');
  return res.status(401).send('Autenticación requerida');
});

// ── API ────────────────────────────────────────────────────
app.get('/api/leads', async (_req, res) => {
  if (!db.hasDB) return res.status(503).json({ error: 'sin base de datos configurada' });
  try { res.json(await db.listLeads()); }
  catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.patch('/api/leads/:phone/estado', async (req, res) => {
  if (!db.hasDB) return res.status(503).json({ error: 'sin base de datos' });
  const { estado } = req.body || {};
  const validos = ['incompleto','nuevo','contactado','respondio','agendado','cerrado','perdido','no_show'];
  if (!validos.includes(estado)) return res.status(400).json({ error: 'estado inválido' });
  try { await db.updateEstado(req.params.phone, estado); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.patch('/api/leads/:phone/reagendar', async (req, res) => {
  if (!db.hasDB) return res.status(503).json({ error: 'sin base de datos' });
  const { meeting_at } = req.body || {};
  const when = meeting_at ? new Date(meeting_at) : null;
  if (!when || isNaN(when.getTime())) return res.status(400).json({ error: 'fecha inválida' });

  // Camino principal: el bot mueve el evento en Google Calendar (mantiene el Meet) y actualiza la BD.
  const BOT_URL = process.env.BOT_RESCHEDULE_URL;   // ej. https://whatsapp.jqsystem.es/reschedule
  const SECRET  = process.env.ADMIN_SECRET;
  if (BOT_URL && SECRET) {
    try {
      const r = await fetch(BOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
        body: JSON.stringify({ phone: req.params.phone, meeting_at: when.toISOString() }),
      });
      if (!r.ok) {
        console.error('[reagendar] bot respondió', r.status, await r.text());
        return res.status(502).json({ error: 'no se pudo mover la reunión en el calendario' });
      }
      const data = await r.json().catch(() => ({}));
      return res.json({ ok: true, movedCalendar: data.movedCalendar !== false });
    } catch (err) {
      console.error('[reagendar] bot inalcanzable:', err.message);
      return res.status(502).json({ error: 'bot inalcanzable' });
    }
  }

  // Fallback: solo BD (si no está configurado el bot). El calendario NO se mueve.
  try { await db.reagendar(req.params.phone, when.toISOString()); res.json({ ok: true, movedCalendar: false }); }
  catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.delete('/api/leads/:phone', async (req, res) => {
  if (!db.hasDB) return res.status(503).json({ error: 'sin base de datos' });
  try { await db.deleteLead(req.params.phone); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.get('/health', (_req, res) => res.json({ ok: true, db: db.hasDB }));

// ── Estáticos (panel) ──────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
db.initSchema()
  .then(() => process.env.SEED_DEMO === 'true' ? db.seedDemo() : null)
  .catch(e => console.error('initSchema/seed:', e.message))
  .finally(() => app.listen(PORT, () => {
    console.log(`Panel Aurun en :${PORT} — BD: ${db.hasDB ? 'conectada' : 'no configurada (modo demo)'}`);
    startReminderLoop();
  }));
