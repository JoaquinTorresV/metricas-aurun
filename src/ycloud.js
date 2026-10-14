// Envío de plantillas WhatsApp vía YCloud (para el recordatorio de reunión).
// Usa las mismas credenciales que el bot: YCLOUD_API_KEY + YCLOUD_PHONE_NUMBER.
const API_KEY = process.env.YCLOUD_API_KEY;
const FROM    = process.env.YCLOUD_PHONE_NUMBER;
const BASE    = 'https://api.ycloud.com/v2';

export const ycloudReady = !!(API_KEY && FROM);

// Envía una plantilla aprobada. bodyParams llena las variables {{1}}, {{2}}, ... en orden.
export async function sendTemplate(to, name, bodyParams = [], lang = process.env.YCLOUD_TEMPLATE_LANG || 'es') {
  const template = { name, language: { code: lang } };
  if (bodyParams.length) {
    template.components = [{
      type: 'body',
      parameters: bodyParams.map(text => ({ type: 'text', text: String(text) })),
    }];
  }
  const res = await fetch(`${BASE}/whatsapp/messages/sendDirectly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ from: FROM, to, type: 'template', template }),
  });
  if (!res.ok) throw new Error(`YCloud sendTemplate: ${await res.text()}`);
  return res.json();
}
