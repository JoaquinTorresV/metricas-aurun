import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

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
  const validos = ['nuevo','contactado','respondio','agendado','cerrado','perdido','no_show'];
  if (!validos.includes(estado)) return res.status(400).json({ error: 'estado inválido' });
  try { await db.updateEstado(req.params.phone, estado); res.json({ ok: true }); }
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
  }));
