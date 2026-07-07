/* ============================================================
   QuadraPro — camada compartilhada (db.js)
   Usada por admin.html e portal.html. Ambos leem/gravam o
   MESMO localStorage (mesmo domínio), então o cadastro feito
   no portal aparece nas Solicitações do admin.
   ============================================================ */

/* ---------- helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = v => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const initials = n => (n || '').replace(/[^a-zA-ZÀ-ú ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'Q';
const todayISO = () => new Date().toISOString().slice(0, 10);
const brDate = iso => iso ? iso.split('-').reverse().join('/') : '—';
const toMin = hhmm => { const [a, b] = (hhmm || '0:0').split(':').map(Number); return a * 60 + b; };

const AVA = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#f97316'];
const WD_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const WD_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fmtDayLabel = iso => { const d = new Date(iso + 'T00:00:00'); return WD_FULL[d.getDay()] + ', ' + brDate(iso); };

/* número que recebe os cadastros/comprovantes (55 + DDD 16 + número) */
const WA_NUMBER = '5516992300711';

/* ---------- banco ---------- */
const DB_KEY = 'quadrapro_db_v2';

function defaultPlans() {
  return [
    { id: 'basic', name: 'Plano Basic', price: 129, color: 'blue', maxCourts: 2, maxUsers: 3, active: true,
      features: ['Agenda mensal e avulsa', 'Controle de caixa e vendas', 'Cadastro de clientes'] },
    { id: 'pro', name: 'Plano Pro', price: 199, color: 'green', maxCourts: 5, maxUsers: 8, active: true,
      features: ['Tudo do Basic', 'Dashboards avançados', 'Relatórios e exportação'] },
    { id: 'premium', name: 'Plano Premium', price: 349, color: 'purple', maxCourts: 99, maxUsers: 99, active: true,
      features: ['Recursos ilimitados', 'Suporte prioritário', 'Personalização (white-label)'] }
  ];
}
function defaultProducts() {
  return [
    { id: uid(), name: 'Água', price: 4.5, category: 'bebida' },
    { id: uid(), name: 'Isotônico', price: 9, category: 'bebida' },
    { id: uid(), name: 'Combo pós-jogo', price: 18, category: 'combo' }
  ];
}
function seedTenantData(products) {
  return {
    schedules: [
      { id: uid(), court: 'Quadra 1', customer_name: 'Time dos Amigos', type: 'mensal', date: todayISO(), start: '19:00', end: '20:00', status: 'confirmado' },
      { id: uid(), court: 'Quadra 2', customer_name: 'Grupo Terça', type: 'avulso', date: todayISO(), start: '20:00', end: '21:00', status: 'pendente' }
    ],
    customers: [
      { id: uid(), name: 'Carlos Henrique', phone: '(16) 99999-1111', type: 'mensalista', plan: '2x por semana', due_date: '2026-07-15', status: 'em_dia' },
      { id: uid(), name: 'Juliana Rocha', phone: '(16) 99999-2222', type: 'avulso', plan: 'Reserva unitária', due_date: '', status: 'pendente' }
    ],
    products: products,
    sales: [
      { id: uid(), product_name: 'Água', category: 'bebida', quantity: 8, unit_price: 4.5, total: 36, payment: 'pix', date: todayISO() },
      { id: uid(), product_name: 'Isotônico', category: 'bebida', quantity: 5, unit_price: 9, total: 45, payment: 'cartao', date: todayISO() }
    ],
    settings: { quadraName: '', courts: ['Quadra 1', 'Quadra 2', 'Quadra 3'], pix: '', whatsapp: '',
      openTime: '08:00', closeTime: '23:00', slotMinutes: 60, weekdays: [1, 2, 3, 4, 5, 6] }
  };
}
function seedDB() {
  const mk = (name, city, domain, plan, status, user, pass, color) => {
    const d = seedTenantData(defaultProducts()); d.settings.quadraName = name;
    return { id: uid(), name, city, domain, plan, status, due: '25/07/2026', login: { user, pass }, color, data: d };
  };
  return {
    superadmin: { user: 'admin', pass: 'admin123' },
    plans: defaultPlans(),
    requests: [
      { id: uid(), name: 'Arena Nova Geração', dom: 'novageracao.com', plan: 'Plano Pro', time: 'Hoje', city: 'Uberaba - MG', responsavel: 'João', phone: '(34) 90000-0000', email: 'contato@novageracao.com', courts: 3, login: { user: 'novageracao', pass: 'nova123' } },
      { id: uid(), name: 'Society Ouro Verde', dom: 'ouroverde.com', plan: 'Plano Basic', time: 'Ontem', city: 'Sete Lagoas - MG', responsavel: 'Marcos', phone: '(31) 90000-0000', email: 'contato@ouroverde.com', courts: 2, login: { user: 'ouroverde', pass: 'ouro123' } }
    ],
    tenants: [
      mk('Quadra Prime Society', 'Contagem - MG', 'contagem.qdrprime.com', 'Plano Pro', 'ativo', 'prime', 'prime123', AVA[0]),
      mk('Arena Sports Bar', 'Uberlândia - MG', 'arenauberlandia.com', 'Plano Pro', 'ativo', 'arena', 'arena123', AVA[1]),
      mk('Society Green', 'Betim - MG', 'societygreen.com', 'Plano Basic', 'ativo', 'green', 'green123', AVA[2]),
      mk('Resenha Sports Bar', 'Ribeirão das Neves - MG', 'resenhasports.com', 'Plano Pro', 'inad', 'resenha', 'resenha123', AVA[4]),
      mk('Quadra do Zé', 'Ibirité - MG', 'quadradoze.com', 'Plano Basic', 'susp', 'ze', 'ze123', AVA[3])
    ]
  };
}
let DB = JSON.parse(localStorage.getItem(DB_KEY) || 'null') || seedDB();
const saveDB = () => localStorage.setItem(DB_KEY, JSON.stringify(DB));
function reloadDB() { DB = JSON.parse(localStorage.getItem(DB_KEY) || 'null') || seedDB(); normalizeDB(); }
function normalizeDB() {
  if (!DB.plans || !DB.plans.length) DB.plans = defaultPlans();
  if (!DB.requests) DB.requests = [];
  (DB.tenants || []).forEach(t => {
    const s = t.data.settings || (t.data.settings = {});
    if (!s.courts || !s.courts.length) s.courts = ['Quadra 1'];
    if (!s.openTime) s.openTime = '08:00';
    if (!s.closeTime) s.closeTime = '23:00';
    if (!s.slotMinutes) s.slotMinutes = 60;
    if (!Array.isArray(s.weekdays)) s.weekdays = [1, 2, 3, 4, 5, 6];
  });
}
normalizeDB();

/* ---------- planos ---------- */
const activePlans = () => DB.plans.filter(p => p.active !== false);
const planByName = n => DB.plans.find(p => p.name === n);
const planPrice = n => { const p = planByName(n); return p ? p.price : 0; };
const PLAN_COLOR_CLS = { green: 'badge-pro', blue: 'badge-basic', purple: 'badge-premium', amber: 'badge-warn' };
const planBadgeClass = n => { const p = planByName(n); return PLAN_COLOR_CLS[p ? p.color : 'blue'] || 'badge-basic'; };
const tenantMRR = t => planPrice(t.plan);

/* ---------- sessão ---------- */
const SES_KEY = 'quadrapro_session_v2';
const getSession = () => JSON.parse(localStorage.getItem(SES_KEY) || 'null');
const setSession = s => localStorage.setItem(SES_KEY, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SES_KEY);

/* ---------- disponibilidade ---------- */
function daySlotStarts(s) { const o = toMin(s.openTime), c = toMin(s.closeTime), step = s.slotMinutes || 60, arr = []; for (let t = o; t + step <= c; t += step) arr.push(t); return arr; }
function dayAvailability(t, iso, courtFilter) {
  const s = t.data.settings, dow = new Date(iso + 'T00:00:00').getDay();
  const courts = courtFilter ? [courtFilter] : (s.courts && s.courts.length ? s.courts : ['Quadra 1']);
  const daySched = t.data.schedules.filter(x => x.date === iso && (!courtFilter || x.court === courtFilter));
  if (!(s.weekdays || []).includes(dow)) return { status: 'closed', count: daySched.length, cap: 0, occ: 0, free: 0 };
  const starts = daySlotStarts(s), step = s.slotMinutes || 60, cap = starts.length * courts.length;
  if (cap === 0) return { status: 'closed', count: daySched.length, cap: 0, occ: 0, free: 0 };
  let occ = 0;
  courts.forEach(court => starts.forEach(st => { const en = st + step; if (daySched.some(sc => sc.court === court && toMin(sc.start) < en && toMin(sc.end) > st)) occ++; }));
  const free = cap - occ;
  const status = free <= 0 ? 'r' : (free / cap <= 0.25 ? 'o' : 'g');
  return { status, count: daySched.length, cap, occ, free };
}

/* ---------- calendário ---------- */
function makeCalendar(sel, opts) {
  const el = $(sel); let cur = opts.selected || todayISO();
  let view = new Date(cur + 'T00:00:00'); view.setDate(1);
  function render() {
    const y = view.getFullYear(), m = view.getMonth();
    const firstDow = new Date(y, m, 1).getDay(), ndays = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += '<div class="cal-day empty"></div>';
    for (let d = 1; d <= ndays; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = opts.classify(iso);
      const cls = ['cal-day', info.status === 'closed' ? 'closed' : info.status];
      if (iso === cur) cls.push('sel');
      if (iso === todayISO()) cls.push('today');
      const title = info.status === 'closed' ? 'Fechado' : `${info.free} livre(s) de ${info.cap} · ${info.count} reserva(s)`;
      cells += `<div class="${cls.join(' ')}" data-iso="${iso}" title="${title}">${d}${info.count > 0 ? '<span class="cd-dot"></span>' : ''}</div>`;
    }
    el.innerHTML = `<div class="cal">
      <div class="cal-head"><div class="mname">${MONTHS[m]} ${y}</div><div class="cal-nav"><button type="button" data-prev>‹</button><button type="button" data-today>Hoje</button><button type="button" data-next>›</button></div></div>
      <div class="cal-grid">${WD_SHORT.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      <div class="cal-legend"><span><i style="background:var(--green)"></i>livre</span><span><i style="background:var(--amber)"></i>quase cheio</span><span><i style="background:var(--red)"></i>lotado</span><span><i style="background:var(--muted-2)"></i>fechado</span></div>
    </div>`;
    el.querySelector('[data-prev]').onclick = () => { view.setMonth(m - 1); render(); };
    el.querySelector('[data-next]').onclick = () => { view.setMonth(m + 1); render(); };
    el.querySelector('[data-today]').onclick = () => { cur = todayISO(); view = new Date(); view.setDate(1); opts.onSelect(cur); render(); };
    el.querySelectorAll('.cal-day[data-iso]').forEach(c => c.onclick = () => { cur = c.dataset.iso; opts.onSelect(cur); render(); });
  }
  render();
  return { refresh: render, select(iso) { cur = iso; view = new Date(iso + 'T00:00:00'); view.setDate(1); render(); }, get selected() { return cur; } };
}

/* ---------- tema ---------- */
function initTheme() { document.documentElement.dataset.theme = localStorage.getItem('qp_theme') || 'dark'; syncThemeIcons(); }
function syncThemeIcons() { const dark = document.documentElement.dataset.theme === 'dark'; $$('.i-moon').forEach(e => e.classList.toggle('hidden', !dark)); $$('.i-sun').forEach(e => e.classList.toggle('hidden', dark)); }
let onThemeChange = () => {};
function bindTheme() {
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
    const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = n; localStorage.setItem('qp_theme', n); syncThemeIcons(); onThemeChange();
  }));
}

/* ---------- toast ---------- */
function ensureToast() {
  if ($('#toast')) return;
  const t = document.createElement('div'); t.id = 'toast'; t.className = 'toast';
  t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span id="toastMsg">Feito!</span>';
  document.body.appendChild(t);
}
function toast(msg, err) { ensureToast(); const t = $('#toast'); $('#toastMsg').textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------- WhatsApp (cadastro + comprovante) ---------- */
function whatsappSignupLink(d) {
  const price = planPrice(d.plan);
  const linhas = [
    'Olá! Quero contratar o QuadraPro.',
    '',
    `*Estabelecimento:* ${d.name}`,
    `*Cidade:* ${d.city || '-'}`,
    `*Responsável:* ${d.responsavel || '-'}`,
    `*Contato:* ${d.phone || '-'}`,
    `*E-mail:* ${d.email || '-'}`,
    `*Domínio desejado:* ${d.domain || '-'}`,
    `*Qtd. de quadras:* ${d.courts || '-'}`,
    `*Plano escolhido:* ${d.plan} — ${money(price)}/mês`,
    `*Login desejado:* ${d.user}`,
    '',
    'Vou anexar o *comprovante de pagamento* aqui neste chat. ✅'
  ];
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(linhas.join('\n'))}`;
}

/* ---------- gráficos (Chart.js carregado em cada página) ---------- */
let CHARTS = [];
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clearCharts = () => { CHARTS.forEach(c => c.destroy()); CHARTS = []; };
function donut(el, data, colors) { return new Chart(el, { type: 'doughnut', data: { datasets: [{ data, backgroundColor: colors, borderWidth: 0, cutout: '68%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
function line(el, labels, data, fmt) {
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt(c.parsed.y) } } }, scales: { y: { grid: { color: cssv('--border') }, ticks: { callback: fmt } }, x: { grid: { display: false } } } };
  return new Chart(el, { type: 'line', data: { labels, datasets: [{ data, borderColor: cssv('--green'), backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: .4, pointBackgroundColor: cssv('--green'), pointRadius: 4, borderWidth: 2.5 }] }, options: opts });
}
const legendHTML = items => items.map(i => `<div class="li"><span class="sw" style="background:${i.c}"></span>${i.l}<span class="v">${i.v}</span></div>`).join('');
