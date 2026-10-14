// Recordatorio de reunión: cada X minutos revisa las reuniones próximas y, ~1h antes,
// envía la plantilla de WhatsApp una sola vez por lead (marca recordatorio_enviado_at).
import * as db from './db.js';
import { sendTemplate, ycloudReady } from './ycloud.js';

const LEAD_MINUTES   = Number(process.env.REMINDER_LEAD_MINUTES  || 60);   // cuánto antes recordar
const CHECK_SECONDS  = Number(process.env.REMINDER_CHECK_SECONDS || 300);  // cada cuánto revisar
const TEMPLATE       = process.env.YCLOUD_TEMPLATE_RECORDATORIO;
const TEMPLATE_LANG  = process.env.YCLOUD_TEMPLATE_LANG || 'es';

// "lunes, 13 de octubre, 15:00" en hora de Chile.
function fmtChile(date) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Santiago',
  }).format(new Date(date));
}

async function tick() {
  let due;
  try {
    due = await db.dueReminders(LEAD_MINUTES);
  } catch (e) {
    console.error('[recordatorio] error consultando reuniones:', e.message);
    return;
  }
  for (const lead of due) {
    const nombre = (lead.nombre || '').trim().split(/\s+/)[0] || 'hola';
    const cuando = fmtChile(lead.meeting_at);
    // {{3}} = link de Meet (guardado por el bot al agendar). Fallback no vacío por si una
    // reunión vieja no tiene link; la plantilla pone el texto fijo "Nos conectamos aquí:".
    const link   = lead.meet_link || process.env.STATIC_MEET_LINK || 'te lo comparto por este chat';
    try {
      await sendTemplate(lead.phone, TEMPLATE, [nombre, cuando, link], TEMPLATE_LANG);
      await db.markRecordatorioEnviado(lead.phone);
      console.log(`[recordatorio] enviado a ${lead.phone} (reunión ${cuando})`);
    } catch (e) {
      // no marcamos enviado → se reintenta en el próximo tick mientras siga en ventana
      console.error(`[recordatorio] fallo enviando a ${lead.phone}:`, e.message);
    }
  }
}

export function startReminderLoop() {
  if (!db.hasDB) { console.log('[recordatorio] sin BD → loop desactivado'); return; }
  if (!ycloudReady || !TEMPLATE) {
    console.log('[recordatorio] falta YCLOUD_API_KEY/YCLOUD_PHONE_NUMBER o YCLOUD_TEMPLATE_RECORDATORIO → loop desactivado');
    return;
  }
  console.log(`[recordatorio] activo: ${LEAD_MINUTES} min antes, revisa cada ${CHECK_SECONDS}s, plantilla "${TEMPLATE}"`);
  tick();                                   // primer chequeo al arrancar
  setInterval(tick, CHECK_SECONDS * 1000);
}
