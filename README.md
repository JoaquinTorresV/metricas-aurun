# Aurun · Panel de leads

Dashboard interno para gestionar los leads del embudo de Aurun y medir la conversión.
Comparte la base de datos Postgres con el bot de WhatsApp.

## Qué hace
- **Tabla de leads** estilo Excel: cliente, negocio, WhatsApp, rubro, estado (editable), origen, fecha, reunión.
- **Métricas del embudo**: leads totales, respondió, agendados, tasa de agenda.
- **Estados**: `nuevo → contactado → respondio → agendado → cerrado / perdido / no_show`.
  - `nuevo/contactado/respondio/agendado` los mueve el bot automáticamente.
  - `cerrado/perdido/no_show` se marcan a mano desde el panel.
- Filtros por estado, buscador, panel de detalle por lead, acciones masivas.

## Modo demo
Sin `DATABASE_URL`, el panel muestra datos de ejemplo (útil para ver el diseño).
Sirviendo solo `public/` como estático también funciona en modo demo.

## Correr local
```bash
npm install
cp .env.example .env   # completar DATABASE_URL si quieres datos reales
npm start              # http://localhost:3000
```

## Deploy en Easypanel
1. Crear un servicio **Postgres** en Easypanel.
2. Crear una app (este repo) con el **Dockerfile** incluido.
3. Variables de entorno: `DATABASE_URL` (apuntando al Postgres), `DASHBOARD_PASSWORD`, `PGSSL` si aplica.
4. La tabla `leads` se crea sola al arrancar (`initSchema`).

## Base de datos
Tablas `leads` y `lead_events` (log de cambios de estado para métricas de tiempo/conversión).
El esquema completo está en `src/db.js`.

## API
- `GET /api/leads` — lista de leads.
- `PATCH /api/leads/:phone/estado` — cambia el estado (`{ "estado": "agendado" }`).
- `DELETE /api/leads/:phone` — elimina un lead.
- `GET /health` — estado del servicio.
