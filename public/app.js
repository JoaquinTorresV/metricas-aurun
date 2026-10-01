// ===== Aurun · Panel de leads =====
// Funciona en modo demo (datos de ejemplo) o contra la API real (/api/*) si existe backend.

const ESTADOS = ['nuevo','contactado','respondio','agendado','cerrado','perdido','no_show'];
const ESTADO_LABEL = { nuevo:'Nuevo', contactado:'Contactado', respondio:'Respondió', agendado:'Agendado', cerrado:'Cerrado', perdido:'Perdido', no_show:'No-show' };
const SRC_COLOR = { web:'#26C6BE', voz:'#8B5CF6', organico:'#F59E0B' };

// ---- Datos demo (se usan si no hay backend) ----
const DEMO_LEADS = [
  { phone:'+56 9 6721 4408', nombre:'Rodrigo Fuentes', negocio:'Automotora del Valle', rubro:'Automotriz', desafio:'Los leads de los ads se pierden, nadie los contacta a tiempo.', source:'web', estado:'agendado', meeting_at:'2026-10-02T15:00', created_at:'2026-09-28T11:20' },
  { phone:'+56 9 5540 1129', nombre:'Camila Rojas', negocio:'Clínica Dental Sonríe', rubro:'Clínicas / Salud', desafio:'Muchos no-shows y la recepción no da abasto con WhatsApp.', source:'web', estado:'respondio', meeting_at:null, created_at:'2026-09-28T09:05' },
  { phone:'+56 9 8890 3321', nombre:'Diego Herrera', negocio:'InmoSur Propiedades', rubro:'Inmobiliaria', desafio:'Consultas fuera de horario se quedan sin respuesta.', source:'web', estado:'contactado', meeting_at:null, created_at:'2026-09-27T18:42' },
  { phone:'+56 9 3312 7765', nombre:'Valentina Soto', negocio:'Boutique Aurora', rubro:'E-Commerce', desafio:'Pauta gastando sin retorno claro, no sabe qué funciona.', source:'web', estado:'nuevo', meeting_at:null, created_at:'2026-09-29T08:15' },
  { phone:'+56 9 7788 5540', nombre:'Matías Vera', negocio:'Logística Andes', rubro:'Logística', desafio:'Procesos manuales, quiere automatizar seguimiento de clientes.', source:'voz', estado:'agendado', meeting_at:'2026-10-01T11:30', created_at:'2026-09-27T14:10' },
  { phone:'+591 7 123 4455', nombre:'Ariana López', negocio:'Rojas Retail', rubro:'Retail', desafio:'Quiere un CRM para ordenar los clientes y el seguimiento.', source:'web', estado:'respondio', meeting_at:null, created_at:'2026-09-28T16:30' },
  { phone:'+56 9 4455 9021', nombre:'Sebastián Muñoz', negocio:'Parrilla El Fogón', rubro:'Restaurantes', desafio:'Pierde reservas por no contestar WhatsApp a tiempo.', source:'web', estado:'cerrado', meeting_at:'2026-09-26T12:00', created_at:'2026-09-24T10:00' },
  { phone:'+56 9 2201 6678', nombre:'Fernanda Díaz', negocio:'Estudio Díaz & Asoc.', rubro:'Servicios profesionales', desafio:'Sin sistema para captar leads de forma constante.', source:'organico', estado:'nuevo', meeting_at:null, created_at:'2026-09-29T07:40' },
  { phone:'+56 9 6690 3312', nombre:'Tomás Reyes', negocio:'FitZone Gym', rubro:'Otro', desafio:'Muchas consultas repetidas, quiere un agente que responda 24/7.', source:'web', estado:'contactado', meeting_at:null, created_at:'2026-09-28T20:05' },
  { phone:'+56 9 9912 4478', nombre:'Josefa Castro', negocio:'Dental Premium', rubro:'Clínicas / Salud', desafio:'Necesita recordatorios automáticos para bajar inasistencias.', source:'web', estado:'perdido', meeting_at:null, created_at:'2026-09-25T13:22' },
  { phone:'+56 9 3320 7789', nombre:'Ignacio Peña', negocio:'AutoMax', rubro:'Automotriz', desafio:'Quiere calificar leads antes de que lleguen al vendedor.', source:'voz', estado:'agendado', meeting_at:'2026-10-03T16:30', created_at:'2026-09-29T10:50' },
  { phone:'+56 9 5567 8890', nombre:'Antonia Vidal', negocio:'Casa Vidal Deco', rubro:'E-Commerce', desafio:'Campañas de Meta sin buen retorno, quiere optimizar.', source:'web', estado:'no_show', meeting_at:'2026-09-27T17:00', created_at:'2026-09-23T09:30' },
];

let API = false;            // se activa si el backend responde
let LEADS = [];
let state = { filter:'todos', search:'', selected:new Set(), active:null };

// ---------- utils ----------
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const initials = n => (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avatarColor = n => { let h=0; for(const c of (n||'')) h=(h*31+c.charCodeAt(0))%360; return `hsl(${h} 45% 55%)`; };
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const waDigits = p => (p||'').replace(/\D/g,'');

// ---------- carga de datos ----------
async function loadData(){
  try{
    const r = await fetch('/api/leads',{cache:'no-store'});
    if(r.ok){ LEADS = await r.json(); API = true; return; }
  }catch(_){}
  API = false;
  LEADS = DEMO_LEADS.map(l=>({...l}));
}

// ---------- métricas ----------
function computeMetrics(){
  const total = LEADS.length;
  const by = e => LEADS.filter(l=>l.estado===e).length;
  const contactados = LEADS.filter(l=>!['nuevo'].includes(l.estado)).length;
  const respondieron = LEADS.filter(l=>['respondio','agendado','cerrado','no_show'].includes(l.estado)).length;
  const agendados = by('agendado')+by('cerrado')+by('no_show');
  const cerrados = by('cerrado');
  const tasaAgenda = total ? Math.round(agendados/total*100) : 0;
  return [
    { label:'Leads totales', val:total, delta:12, spark:sparkFromDays() },
    { label:'Respondió', val:respondieron, delta:8, spark:sparkFromDays(0.6) },
    { label:'Agendados', val:agendados, delta:15, spark:sparkFromDays(0.4) },
    { label:'Tasa de agenda', val:tasaAgenda+'%', delta:4, spark:sparkFromDays(0.5) },
  ];
}
function sparkFromDays(scale=1){
  // pequeña serie para el sparkline (demo/derivada)
  const base=[3,5,4,6,5,7,6,8,7,9,8,10];
  return base.map(v=>Math.max(1,Math.round(v*scale + (Math.random()*1.5))));
}
function sparkline(points, up=true){
  const w=90,h=30, max=Math.max(...points), min=Math.min(...points);
  const dx=w/(points.length-1);
  const pts=points.map((p,i)=>`${(i*dx).toFixed(1)},${(h-((p-min)/(max-min||1))*(h-4)-2).toFixed(1)}`).join(' ');
  const col = up ? '#26C6BE' : '#EF4444';
  return `<svg class="m-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function renderMetrics(){
  $('#metrics').innerHTML = computeMetrics().map(m=>{
    const up = m.delta>=0;
    return `<div class="metric">
      <div class="m-top"><span class="m-label">${m.label}</span>${sparkline(m.spark,up)}</div>
      <div class="m-val">${m.val}<span class="m-delta ${up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(m.delta)}%</span></div>
    </div>`;
  }).join('');
}

// ---------- tabla ----------
function filtered(){
  const q = state.search.toLowerCase();
  return LEADS.filter(l=>{
    if(state.filter!=='todos' && l.estado!==state.filter) return false;
    if(!q) return true;
    return [l.nombre,l.negocio,l.rubro,l.desafio].some(v=>(v||'').toLowerCase().includes(q));
  });
}
function badge(estado){
  return `<span class="badge ${estado}"><span class="bdot"></span>${ESTADO_LABEL[estado]||estado}</span>`;
}
function estadoSelect(l){
  const opts = ESTADOS.map(e=>`<option value="${e}" ${e===l.estado?'selected':''}>${ESTADO_LABEL[e]}</option>`).join('');
  return `<span class="badge ${l.estado} badge-select"><span class="bdot"></span>${ESTADO_LABEL[l.estado]}
    <select data-phone="${l.phone}" onclick="event.stopPropagation()">${opts}</select></span>`;
}
function renderTable(){
  const rows = filtered();
  $('#totalCount').textContent = LEADS.length;
  const body = $('#leadsBody');
  $('#emptyState').hidden = rows.length>0;
  body.innerHTML = rows.map(l=>`
    <tr data-phone="${l.phone}" class="${state.selected.has(l.phone)?'selected':''}">
      <td class="col-check"><input type="checkbox" ${state.selected.has(l.phone)?'checked':''} data-check="${l.phone}" onclick="event.stopPropagation()"></td>
      <td><div class="cell-client"><div class="av-ini" style="background:${avatarColor(l.nombre)}">${initials(l.nombre)}</div><div><b>${l.nombre||'—'}</b></div></div></td>
      <td>${l.negocio||'<span class="muted">—</span>'}</td>
      <td><a class="wa-link" href="https://wa.me/${waDigits(l.phone)}" target="_blank" onclick="event.stopPropagation()"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95s-.45-.15-.65.15-.75.95-.9 1.15-.32.22-.6.07a8 8 0 0 1-2.35-1.45 8.8 8.8 0 0 1-1.6-2c-.17-.3 0-.45.13-.6l.4-.47c.13-.15.17-.25.27-.42s.05-.32-.02-.47-.65-1.57-.9-2.15-.47-.48-.65-.48h-.55c-.2 0-.5.07-.75.35s-1 .98-1 2.4 1.02 2.78 1.17 2.97 2 3.05 4.85 4.28c.68.3 1.2.47 1.62.6.68.22 1.3.19 1.78.11.55-.08 1.7-.7 1.95-1.36s.24-1.25.17-1.37-.27-.2-.57-.35ZM12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2Z"/></svg>${l.phone}</a></td>
      <td>${l.rubro||'<span class="muted">—</span>'}</td>
      <td>${estadoSelect(l)}</td>
      <td><span class="src"><span class="sdot" style="background:${SRC_COLOR[l.source]||'#98A2AD'}"></span>${l.source||'—'}</span></td>
      <td class="date">${fmtDate(l.created_at)}</td>
      <td class="date">${l.meeting_at?fmtDateTime(l.meeting_at):'<span class="muted">—</span>'}</td>
      <td class="col-actions"><button class="row-actions" title="Ver">›</button></td>
    </tr>`).join('');
}

// ---------- detalle ----------
function openDetail(phone){
  const l = LEADS.find(x=>x.phone===phone); if(!l) return;
  state.active = phone;
  const opts = ESTADOS.map(e=>`<option value="${e}" ${e===l.estado?'selected':''}>${ESTADO_LABEL[e]}</option>`).join('');
  $('#detail').innerHTML = `
    <div class="detail-head">
      <span class="t"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.8"/></svg> Perfil del lead</span>
      <button class="detail-close" id="detailClose">×</button>
    </div>
    <div class="dp-card"><div class="av-ini" style="background:${avatarColor(l.nombre)}">${initials(l.nombre)}</div>
      <div><b>${l.nombre||'—'}</b><small>${l.negocio||''}</small></div></div>
    <div class="dp-actions">
      <a class="btn-teal" href="https://wa.me/${waDigits(l.phone)}" target="_blank"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2Z"/></svg>Abrir WhatsApp</a>
      <button class="btn-ghost" id="dpDelete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Eliminar</button>
    </div>
    <div class="dp-section"><div class="lbl">Estado</div>
      <select class="dp-estado-select" id="dpEstado">${opts}</select></div>
    <div class="dp-section"><div class="lbl">Correo</div><div class="val">${l.email ? `<a href="mailto:${l.email}" style="color:var(--teal-dark)">${l.email}</a>` : '<span class="muted">Sin correo aún</span>'}</div></div>
    <div class="dp-grid">
      <div class="dp-section"><div class="lbl">WhatsApp</div><div class="val">${l.phone}</div></div>
      <div class="dp-section"><div class="lbl">Rubro</div><div class="val">${l.rubro||'—'}</div></div>
      <div class="dp-section"><div class="lbl">Origen</div><div class="val" style="text-transform:capitalize">${l.source||'—'}</div></div>
      <div class="dp-section"><div class="lbl">Registrado</div><div class="val">${fmtDate(l.created_at)}</div></div>
    </div>
    <div class="dp-section"><div class="lbl">Reunión</div><div class="val">${l.meeting_at?fmtDateTime(l.meeting_at):'Sin agendar'}</div></div>
    <div class="dp-section"><div class="lbl">Desafío</div><div class="val desafio">${l.desafio||'—'}</div></div>
  `;
  $('#detail').hidden=false; $('#detailBackdrop').hidden=false;
  $('#detailClose').onclick=closeDetail;
  $('#dpEstado').onchange=e=>changeEstado(phone,e.target.value);
  $('#dpDelete').onclick=()=>{ if(confirm('¿Eliminar este lead?')) deleteLead(phone); };
}
function closeDetail(){ state.active=null; $('#detail').hidden=true; $('#detailBackdrop').hidden=true; }

// ---------- acciones (API o demo local) ----------
async function changeEstado(phone, estado){
  const l = LEADS.find(x=>x.phone===phone); if(l) l.estado=estado;
  if(l && estado==='agendado' && !l.meeting_at) l.meeting_at=new Date().toISOString();
  renderAll();
  if(state.active===phone) openDetail(phone);
  if(API){ try{ await fetch(`/api/leads/${encodeURIComponent(phone)}/estado`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado})}); }catch(_){} }
}
async function deleteLead(phone){
  LEADS = LEADS.filter(x=>x.phone!==phone);
  state.selected.delete(phone);
  closeDetail(); renderAll();
  if(API){ try{ await fetch(`/api/leads/${encodeURIComponent(phone)}`,{method:'DELETE'}); }catch(_){} }
}
function bulkEstado(estado){
  if(!estado) return;
  state.selected.forEach(p=>changeEstado(p,estado));
  clearSelection();
}

// ---------- selección ----------
function toggleSelect(phone,on){ on?state.selected.add(phone):state.selected.delete(phone); renderSelection(); renderTable(); }
function clearSelection(){ state.selected.clear(); $('#checkAll').checked=false; renderSelection(); renderTable(); }
function renderSelection(){
  const n=state.selected.size;
  $('#bulkbar').hidden = n===0;
  $('#selCount').textContent = n;
}

// ---------- render maestro ----------
function renderAll(){ renderMetrics(); renderTable(); renderSelection(); }

// ---------- eventos ----------
function bind(){
  $('#leadsBody').addEventListener('click',e=>{
    const chk=e.target.closest('[data-check]');
    if(chk){ toggleSelect(chk.dataset.check, chk.checked); return; }
    const tr=e.target.closest('tr[data-phone]');
    if(tr) openDetail(tr.dataset.phone);
  });
  $('#leadsBody').addEventListener('change',e=>{
    const sel=e.target.closest('select[data-phone]');
    if(sel) changeEstado(sel.dataset.phone, sel.value);
  });
  $('#checkAll').addEventListener('change',e=>{
    const on=e.target.checked;
    filtered().forEach(l=> on?state.selected.add(l.phone):state.selected.delete(l.phone));
    renderSelection(); renderTable();
  });
  $$('.tab').forEach(t=>t.addEventListener('click',()=>{
    $$('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    state.filter=t.dataset.filter; renderTable();
  }));
  $$('.nav-item[data-estado]').forEach(n=>n.addEventListener('click',()=>{
    const est=n.dataset.estado;
    const tab=$(`.tab[data-filter="${est}"]`); if(tab) tab.click();
  }));
  $('#search').addEventListener('input',e=>{ state.search=e.target.value; renderTable(); });
  $('#detailBackdrop').addEventListener('click',closeDetail);
  $('#bulkEstado').addEventListener('change',e=>{ bulkEstado(e.target.value); e.target.value=''; });
  $('#bulkCancel').addEventListener('click',clearSelection);
  $('#refreshBtn').addEventListener('click',async()=>{ await loadData(); clearSelection(); renderAll(); });
  $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
}

// ---------- init ----------
(async function init(){
  await loadData();
  bind();
  renderAll();

  // auto-refresco cada 20s (solo con backend real y sin interrumpir lo que estés haciendo)
  setInterval(async () => {
    if (!API) return;                                   // modo demo: no refrescar
    if (state.active || state.selected.size) return;    // panel abierto o selección en curso
    if (document.activeElement && document.activeElement.tagName === 'SELECT') return; // editando estado
    try { await loadData(); renderMetrics(); renderTable(); } catch (_) {}
  }, 20000);
})();
