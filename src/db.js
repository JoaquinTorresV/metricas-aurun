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
