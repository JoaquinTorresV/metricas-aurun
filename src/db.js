// Capa de datos del panel (Postgres). Comparte la BD con el bot de WhatsApp.
import pg from 'pg';
const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    })
  : null;

export const hasDB = !!pool;

// Crea las tablas si no existen (idempotente). El bot usa las mismas.
export async function initSchema() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id          BIGSERIAL PRIMARY KEY,
      phone       TEXT UNIQUE NOT NULL,
      nombre      TEXT,
      negocio     TEXT,
      rubro       TEXT,
      desafio     TEXT,
      email       TEXT,
      source      TEXT NOT NULL DEFAULT 'web',
      estado      TEXT NOT NULL DEFAULT 'nuevo',
      fbp         TEXT,
      fbc         TEXT,
      meeting_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS lead_events (
      id     BIGSERIAL PRIMARY KEY,
      phone  TEXT NOT NULL,
      estado TEXT NOT NULL,
      at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function listLeads() {
  const { rows } = await pool.query(
    `SELECT phone, nombre, negocio, rubro, desafio, email, source, estado, meeting_at, created_at
       FROM leads ORDER BY created_at DESC`
  );
  return rows;
}

export async function updateEstado(phone, estado) {
  await pool.query(
    `UPDATE leads
        SET estado = $2,
            updated_at = now(),
            meeting_at = CASE WHEN $2 = 'agendado' AND meeting_at IS NULL THEN now() ELSE meeting_at END
      WHERE phone = $1`,
    [phone, estado]
  );
  await pool.query(`INSERT INTO lead_events (phone, estado) VALUES ($1, $2)`, [phone, estado]);
}

export async function deleteLead(phone) {
  await pool.query(`DELETE FROM leads WHERE phone = $1`, [phone]);
}

// Inserta leads de ejemplo SOLO si la tabla está vacía (para verificar el deploy).
// Se activa con SEED_DEMO=true. Quitar esa variable después.
export async function seedDemo() {
  if (!pool) return;
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM leads');
  if (rows[0].n > 0) return;
  const d = (days, h = 10) => new Date(Date.now() - days * 864e5 + h * 36e5).toISOString();
  const demo = [
    ['+56 9 6721 4408','Rodrigo Fuentes','Automotora del Valle','Automotriz','Los leads de los ads se pierden, nadie los contacta a tiempo.','web','agendado', d(-3), d(1)],
    ['+56 9 5540 1129','Camila Rojas','Clínica Dental Sonríe','Clínicas / Salud','Muchos no-shows y la recepción no da abasto con WhatsApp.','web','respondio', null, d(1)],
    ['+56 9 8890 3321','Diego Herrera','InmoSur Propiedades','Inmobiliaria','Consultas fuera de horario se quedan sin respuesta.','web','contactado', null, d(2)],
    ['+56 9 3312 7765','Valentina Soto','Boutique Aurora','E-Commerce','Pauta gastando sin retorno claro.','web','nuevo', null, d(0)],
    ['+56 9 7788 5540','Matías Vera','Logística Andes','Logística','Quiere automatizar el seguimiento de clientes.','voz','agendado', d(-2), d(2)],
    ['+56 9 4455 9021','Sebastián Muñoz','Parrilla El Fogón','Restaurantes','Pierde reservas por no contestar a tiempo.','web','cerrado', d(3), d(5)],
  ];
  for (const r of demo) {
    await pool.query(
      `INSERT INTO leads (phone,nombre,negocio,rubro,desafio,source,estado,meeting_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (phone) DO NOTHING`, r
    );
  }
  console.log('seedDemo: leads de ejemplo insertados');
}
