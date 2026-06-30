// ============================================
// SUPABASE CLIENT
// The publishable key below is SAFE to be public — it only works
// because Row Level Security is enabled on every table, requiring
// a real logged-in user before any data can be read or written.
// ============================================

const SUPABASE_URL = 'https://bdjtelveoaopwesptpuf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Wg_NDkad2exsc44cXJLBVA_Tq-NyN-a';

window.addEventListener('error', (e) => {
  const el = document.getElementById('tab-content');
  if (el) el.innerHTML = `<div class="card"><p class="card-title" style="color:var(--red)">Something went wrong</p><p class="empty-state">${escapeHtmlSafe(e.message)}</p></div>`;
});
window.addEventListener('unhandledrejection', (e) => {
  const el = document.getElementById('tab-content');
  const msg = e.reason?.message || String(e.reason);
  if (el) el.innerHTML = `<div class="card"><p class="card-title" style="color:var(--red)">Something went wrong (async)</p><p class="empty-state">${escapeHtmlSafe(msg)}</p></div>`;
});
function escapeHtmlSafe(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

let sb;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} catch (err) {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app').innerHTML = `<div class="card" style="margin:20px;"><p class="card-title" style="color:var(--red)">Could not load Supabase library</p><p class="empty-state">${escapeHtmlSafe(err.message)}</p></div>`;
  });
}

const GOOGLE_CLIENT_ID = '915567420685-hdr89piauoouang6lp1vlaiu33p6n4jb.apps.googleusercontent.com';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

const MISSION_STATEMENT = '"You are building a funded trading career, mastering AI, and creating a Spanish content empire — simultaneously. Every day either moves the mission forward or it doesn\'t. There is no neutral."';

const MORNING_ROUTINE_ITEMS = [
  'Wake before 6am',
  'Stretch 5 min',
  'Walk 10 min',
  'Pray and bible study',
  'Journal morning',
  '1 glass of water'
];

const CONSISTENCY_ITEMS = [
  '2L water',
  '160g protein',
  'Creatine',
  'Zinc',
  'Magnesium',
  'Gym',
  'Family time',
  '20 pages reading'
];

// ============================================
// AUTH HELPERS
// ============================================

async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  await sb.auth.signOut();
  showLoginScreen();
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    showLoginScreen();
    return null;
  }
  return user;
}

function showLoginScreen() {
  document.getElementById('app').innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <div class="login-title">OS — Andres Villamil</div>
        <div class="login-sub">Sign in to continue</div>
        <form class="login-form" id="login-form">
          <input type="email" id="login-email" placeholder="Email" required />
          <input type="password" id="login-password" placeholder="Password" required />
          <button type="submit" class="btn-secondary">Sign in</button>
        </form>
        <div class="login-error" id="login-error" hidden></div>
      </div>
    </div>
  `;
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    try {
      await signIn(email, password);
      location.reload();
    } catch (err) {
      errorEl.textContent = 'Sign-in failed — check your email and password.';
      errorEl.hidden = false;
    }
  });
}

// ============================================
// DATE HELPERS — week boundary is always Monday
// ============================================

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// ============================================
// NAVIGATION
// ============================================

const TAB_RENDERERS = {
  daily: renderDailyTab,
  trading: renderTradingTab,
  fitness: () => renderPlaceholderTab('Fitness', 'Fitness tab is being built next — coming soon.'),
  goals: () => renderPlaceholderTab('Goals', 'Goals tracker is coming soon.'),
  calendar: () => renderPlaceholderTab('Calendar', 'Full calendar tab is coming soon.')
};

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  const renderer = TAB_RENDERERS[tabName];
  if (renderer) renderer();
}

function renderPlaceholderTab(name, message) {
  const container = document.getElementById('tab-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <p class="card-title">${name}</p>
      <p class="empty-state">${message}</p>
    </div>
  `;
}

// ============================================
// DAILY TAB
// ============================================

async function renderDailyTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading today...</p>`;

  const user = await requireAuth();
  if (!user) return;

  const today = todayISO();

  const [snapshot, routine, consistency, goals, tasks] = await Promise.all([
    loadTradingSnapshot(),
    loadChecklist('morning_routine_log', MORNING_ROUTINE_ITEMS, today),
    loadChecklist('consistency_log', CONSISTENCY_ITEMS, today),
    loadTopGoals(today),
    loadActiveTasks()
  ]);

  container.innerHTML = `
    <div class="identity-banner">${MISSION_STATEMENT}</div>
    ${renderTradingSnapshotBox(snapshot)}
    ${renderChecklistCard('Morning routine', 'morning-routine', routine)}
    ${renderCalendarCard()}
    <div class="two-col">
      ${renderTopGoalsCard(goals)}
      ${renderTaskListCard(tasks)}
    </div>
    ${renderChecklistCard('Consistency check', 'consistency', consistency)}
  `;

  attachChecklistHandlers('morning_routine_log', 'morning-routine');
  attachChecklistHandlers('consistency_log', 'consistency');
  attachTopGoalsHandlers();
  attachTaskListHandlers();
  initGoogleCalendar();
}

// ---------- Trading snapshot box ----------

async function loadTradingSnapshot() {
  const monday = isoDate(getMondayOfWeek());

  const { data: settingsRows } = await sb.from('trading_settings').select('*').limit(1);
  const settings = settingsRows?.[0] || {
    account_size: 100000, profit_target_pct: 10,
    max_drawdown_pct: 10, daily_loss_limit_pct: 5
  };

  const { data: weekTrades } = await sb
    .from('trades')
    .select('profit, open_time')
    .gte('open_time', monday + 'T00:00:00Z');

  const trades = weekTrades || [];
  const wins = trades.filter(t => netResult(t) > 0).length;
  const losses = trades.filter(t => netResult(t) <= 0).length;

  const { data: allTrades } = await sb.from('trades').select('profit');
  const totalPnl = (allTrades || []).reduce((sum, t) => sum + netResult(t), 0);
  const currentBalance = Number(settings.account_size) + totalPnl;
  const pnlPct = (totalPnl / Number(settings.account_size)) * 100;

  return {
    accountSize: Number(settings.account_size),
    currentBalance,
    pnlPct,
    profitTargetPct: Number(settings.profit_target_pct),
    weekTradesCount: trades.length,
    weekWins: wins,
    weekLosses: losses
  };
}

function renderTradingSnapshotBox(s) {
  if (!s) return '';
  const pnlClass = s.pnlPct >= 0 ? 'g' : 'r';
  return `
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Trading snapshot</p>
        <span class="card-meta">This week</span>
      </div>
      <div class="check-row" style="border:none;">
        <span class="check-label">Account balance</span>
        <span class="check-label" style="margin-left:auto; font-weight:500; color:var(--text);">$${s.currentBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
      </div>
      <div class="check-row" style="border:none;">
        <span class="check-label">P&amp;L vs target</span>
        <span class="check-label" style="margin-left:auto; font-weight:500;" class="${pnlClass}">${s.pnlPct >= 0 ? '+' : ''}${s.pnlPct.toFixed(1)}% / ${s.profitTargetPct}%</span>
      </div>
      <div class="check-row" style="border:none;">
        <span class="check-label">Trades this week</span>
        <span class="check-label" style="margin-left:auto; font-weight:500; color:var(--text);">${s.weekTradesCount} (${s.weekWins}W ${s.weekLosses}L)</span>
      </div>
    </div>
  `;
}

// ---------- Generic checklist (morning routine + consistency) ----------

async function loadChecklist(table, items, date) {
  const { data } = await sb.from(table).select('*').eq('log_date', date);
  const byName = {};
  (data || []).forEach(row => { byName[row.item_name] = row; });
  return items.map(name => ({
    item_name: name,
    completed: byName[name]?.completed || false,
    id: byName[name]?.id || null
  }));
}

function renderChecklistCard(title, idPrefix, rows) {
  return `
    <div class="card">
      <p class="card-title">${title}</p>
      <div id="${idPrefix}-list">
        ${rows.map((r, i) => `
          <div class="check-row">
            <input type="checkbox" data-idx="${i}" ${r.completed ? 'checked' : ''} />
            <label class="check-label">${escapeHtml(r.item_name)}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function attachChecklistHandlers(table, idPrefix) {
  const items = table === 'morning_routine_log' ? MORNING_ROUTINE_ITEMS : CONSISTENCY_ITEMS;
  const list = document.getElementById(`${idPrefix}-list`);
  if (!list) return;
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const idx = Number(e.target.dataset.idx);
      const itemName = items[idx];
      const today = todayISO();
      const completed = e.target.checked;

      const { data: existing } = await sb
        .from(table)
        .select('id')
        .eq('log_date', today)
        .eq('item_name', itemName)
        .maybeSingle();

      if (existing) {
        await sb.from(table).update({ completed }).eq('id', existing.id);
      } else {
        await sb.from(table).insert({ log_date: today, item_name: itemName, completed });
      }
    });
  });
}

// ---------- Top 3 goals ----------

async function loadTopGoals(date) {
  const { data } = await sb.from('top_goals').select('*').eq('log_date', date).order('slot');
  const bySlot = {};
  (data || []).forEach(row => { bySlot[row.slot] = row; });
  return [1, 2, 3].map(slot => ({
    slot,
    text: bySlot[slot]?.text || '',
    completed: bySlot[slot]?.completed || false
  }));
}

function renderTopGoalsCard(goals) {
  return `
    <div class="card">
      <p class="card-title">Top 3 goals</p>
      <div id="top-goals-list">
        ${goals.map(g => `
          <div class="goal-slot">
            <span class="goal-num">${g.slot}</span>
            <input type="text" data-slot="${g.slot}" value="${escapeHtml(g.text)}" placeholder="Top priority #${g.slot}..." />
            <input type="checkbox" data-slot-check="${g.slot}" ${g.completed ? 'checked' : ''} />
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function attachTopGoalsHandlers() {
  const list = document.getElementById('top-goals-list');
  if (!list) return;
  const today = todayISO();

  async function upsertSlot(slot, fields) {
    const { data: existing } = await sb
      .from('top_goals')
      .select('id')
      .eq('log_date', today)
      .eq('slot', slot)
      .maybeSingle();
    if (existing) {
      await sb.from('top_goals').update(fields).eq('id', existing.id);
    } else {
      await sb.from('top_goals').insert({ log_date: today, slot, ...fields });
    }
  }

  list.querySelectorAll('input[type="text"]').forEach(input => {
    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      const slot = Number(e.target.dataset.slot);
      debounce = setTimeout(() => upsertSlot(slot, { text: e.target.value }), 500);
    });
  });

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const slot = Number(e.target.dataset.slotCheck);
      upsertSlot(slot, { completed: e.target.checked });
    });
  });
}

// ---------- Task list ----------

async function loadActiveTasks() {
  const { data } = await sb
    .from('tasks')
    .select('*')
    .eq('status', 'active')
    .order('date_created', { ascending: true })
    .limit(5);
  return data || [];
}

function renderTaskListCard(tasks) {
  return `
    <div class="card">
      <p class="card-title">Task of the day</p>
      <div id="task-list">
        ${tasks.length ? tasks.map(t => `
          <div class="check-row" data-task-id="${t.id}">
            <input type="checkbox" data-task-check="${t.id}" />
            <label class="check-label ${t.date_created < todayISO() ? 'muted-italic' : ''}">${escapeHtml(t.text)}</label>
          </div>
        `).join('') : '<p class="empty-state">No tasks yet — add one below.</p>'}
      </div>
      <form id="add-task-form" style="display:flex; gap:8px; margin-top:10px;">
        <input type="text" id="new-task-input" placeholder="Add a task..." style="flex:1;" />
        <button type="submit" class="btn-secondary">Add</button>
      </form>
    </div>
  `;
}

function attachTaskListHandlers() {
  const list = document.getElementById('task-list');
  const form = document.getElementById('add-task-form');
  if (!list || !form) return;

  list.querySelectorAll('input[data-task-check]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.taskCheck;
      await sb.from('tasks').update({ status: 'done', date_completed: todayISO() }).eq('id', id);
      const row = e.target.closest('.check-row');
      if (row) row.style.opacity = '0.4';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;
    await sb.from('tasks').insert({ text, status: 'active', date_created: todayISO() });
    input.value = '';
    renderDailyTab();
  });
}

// ---------- Calendar (Google Calendar, read-only) ----------

function renderCalendarCard() {
  return `
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Calendar</p>
        <span id="cal-status" class="card-meta"></span>
      </div>
      <div id="calendar-events">
        <div class="empty-state">
          <button class="btn-secondary" id="connect-calendar-btn">Connect Google Calendar</button>
        </div>
      </div>
    </div>
  `;
}

function initGoogleCalendar() {
  const token = sessionStorage.getItem('gcal_token');
  if (token) {
    fetchTodayEvents(token);
  } else {
    const btn = document.getElementById('connect-calendar-btn');
    if (btn) btn.addEventListener('click', startGoogleAuth);
  }
}

function startGoogleAuth() {
  if (!window.google?.accounts?.oauth2) {
    alert('Google sign-in is still loading, try again in a moment.');
    return;
  }
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback: (response) => {
      if (response.access_token) {
        sessionStorage.setItem('gcal_token', response.access_token);
        fetchTodayEvents(response.access_token);
      }
    }
  });
  tokenClient.requestAccessToken();
}

async function fetchTodayEvents(token) {
  const eventsEl = document.getElementById('calendar-events');
  const statusEl = document.getElementById('cal-status');
  if (!eventsEl) return;
  eventsEl.innerHTML = '<p class="loading-text">Loading events...</p>';

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      sessionStorage.removeItem('gcal_token');
      eventsEl.innerHTML = `<div class="empty-state"><button class="btn-secondary" id="connect-calendar-btn">Connect Google Calendar</button></div>`;
      document.getElementById('connect-calendar-btn')?.addEventListener('click', startGoogleAuth);
      return;
    }
    const data = await res.json();
    const events = data.items || [];
    if (statusEl) statusEl.textContent = events.length ? `${events.length} events today` : '';

    if (!events.length) {
      eventsEl.innerHTML = '<p class="empty-state">No events scheduled today.</p>';
      return;
    }

    eventsEl.innerHTML = events.map(ev => {
      const start = ev.start?.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : 'All day';
      return `
        <div class="check-row">
          <span class="check-label" style="min-width:70px; color:var(--purple-light); font-weight:500;">${start}</span>
          <span class="check-label">${escapeHtml(ev.summary || '(No title)')}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    eventsEl.innerHTML = '<p class="empty-state">Could not load calendar events.</p>';
  }
}

// ============================================
// TRADING TAB
// ============================================

const TRADING_CHARTS = {}; // holds Chart.js instances so we can destroy/recreate on re-render

// FTMO's real account balance = Profit + Swap + Commission per trade, not Profit alone.
// Verified against the live FTMO dashboard: Profit-only undercounted the real balance.
function netResult(t) {
  return Number(t.profit || 0) + Number(t.swap || 0) + Number(t.commission || 0);
}

function getMondaySundayRange(weeksAgo = 0) {
  const monday = getMondayOfWeek();
  monday.setDate(monday.getDate() - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

// ---------- CSV parsing (FTMO Account MetriX export) ----------

function parseCSV(text) {
  // Basic CSV parser handling quoted fields and commas/semicolons as delimiter (FTMO sometimes uses ;)
  const delimiter = text.split('\n')[0].includes(';') ? ';' : ',';
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(line => {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delimiter && !inQuotes) { cells.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

function parseMT4Date(str) {
  if (!str) return null;
  // Formats seen: "2026.02.20 13:45:32" or "2026-02-20 13:45:32"
  const cleaned = str.replace(/\./g, '-');
  const d = new Date(cleaned.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function findColIndex(headers, ...candidates) {
  for (const cand of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(cand.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseFtmoCsv(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0];

  const idx = {
    ticket: findColIndex(headers, 'ticket'),
    open: findColIndex(headers, 'open time', 'open'),
    type: findColIndex(headers, 'type'),
    volume: findColIndex(headers, 'volume', 'lots'),
    symbol: findColIndex(headers, 'symbol'),
    openPrice: findColIndex(headers, 'price open', 'open price', 'price'),
    sl: findColIndex(headers, 'sl', 'stop loss'),
    tp: findColIndex(headers, 'tp', 'take profit'),
    close: findColIndex(headers, 'close time', 'close'),
    closePrice: findColIndex(headers, 'price close', 'close price'),
    swap: findColIndex(headers, 'swap'),
    commission: findColIndex(headers, 'commission'),
    profit: findColIndex(headers, 'profit'),
    pips: findColIndex(headers, 'pips'),
    duration: findColIndex(headers, 'duration')
  };

  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const trades = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;
    const ticketRaw = idx.ticket >= 0 ? r[idx.ticket] : '';
    const ticket = String(ticketRaw || '').replace(/[^0-9a-zA-Z]/g, '').trim();
    if (!ticket) continue;

    const openTime = idx.open >= 0 ? parseMT4Date(r[idx.open]) : null;
    if (!openTime) continue;
    const closeTime = idx.close >= 0 ? parseMT4Date(r[idx.close]) : null;

    trades.push({
      ticket,
      open_time: openTime.toISOString(),
      close_time: closeTime ? closeTime.toISOString() : null,
      trade_type: idx.type >= 0 ? (r[idx.type] || '').toLowerCase() : null,
      symbol: idx.symbol >= 0 ? r[idx.symbol] : null,
      volume: idx.volume >= 0 ? num(r[idx.volume]) : null,
      open_price: idx.openPrice >= 0 ? num(r[idx.openPrice]) : null,
      close_price: idx.closePrice >= 0 ? num(r[idx.closePrice]) : null,
      sl: idx.sl >= 0 ? num(r[idx.sl]) : 0,
      tp: idx.tp >= 0 ? num(r[idx.tp]) : 0,
      swap: idx.swap >= 0 ? num(r[idx.swap]) : 0,
      commission: idx.commission >= 0 ? num(r[idx.commission]) : 0,
      profit: idx.profit >= 0 ? num(r[idx.profit]) : 0,
      pips: idx.pips >= 0 ? num(r[idx.pips]) : 0,
      duration_seconds: idx.duration >= 0 ? Math.round(num(r[idx.duration])) : null
    });
  }
  return trades;
}

async function importTradesFromCsv(file, statusEl) {
  statusEl.textContent = 'Reading file...';
  const text = await file.text();
  const parsed = parseFtmoCsv(text);
  if (!parsed.length) {
    statusEl.textContent = 'No valid trades found in that file.';
    return;
  }

  statusEl.textContent = `Found ${parsed.length} trades in file — checking for duplicates...`;
  const { data: existing } = await sb.from('trades').select('ticket');
  const existingTickets = new Set((existing || []).map(t => t.ticket));
  const newRows = parsed.filter(t => !existingTickets.has(t.ticket));

  if (!newRows.length) {
    statusEl.textContent = `All ${parsed.length} trades already imported — nothing new.`;
    return;
  }

  statusEl.textContent = `Importing ${newRows.length} new trades...`;
  const { error } = await sb.from('trades').insert(newRows);
  if (error) {
    statusEl.textContent = `Import failed: ${error.message}`;
    return;
  }

  localStorage.setItem('trading_last_upload', new Date().toISOString());
  statusEl.textContent = `Imported ${newRows.length} new trades (${parsed.length - newRows.length} already existed).`;
  renderTradingTab();
}

// ---------- Settings ----------

async function loadTradingSettings() {
  const { data } = await sb.from('trading_settings').select('*').limit(1);
  return data?.[0] || {
    account_size: 100000, profit_target_pct: 10,
    max_drawdown_pct: 10, daily_loss_limit_pct: 5,
    max_trades_per_week: 10, max_losses_per_week: 3
  };
}

async function saveTradingSettings(fields) {
  const { data: existing } = await sb.from('trading_settings').select('id').limit(1);
  if (existing?.[0]) {
    await sb.from('trading_settings').update(fields).eq('id', existing[0].id);
  } else {
    await sb.from('trading_settings').insert(fields);
  }
}

// ---------- Stats calculations ----------

function computeTradeStats(trades) {
  const wins = trades.filter(t => netResult(t) > 0);
  const losses = trades.filter(t => netResult(t) <= 0);
  const winRate = trades.length ? Math.round((wins.length / trades.length) * 100) : 0;

  const rrValues = trades
    .filter(t => Number(t.sl) > 0 && Number(t.tp) > 0 && Number(t.open_price) > 0)
    .map(t => {
      const risk = Math.abs(Number(t.open_price) - Number(t.sl));
      const reward = Math.abs(Number(t.tp) - Number(t.open_price));
      return risk > 0 ? reward / risk : null;
    })
    .filter(v => v != null && isFinite(v));
  const avgRR = rrValues.length ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length) : null;

  return { wins, losses, winRate, avgRR };
}

function maxStreak(trades, predicate) {
  let max = 0, cur = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
  for (const t of sorted) {
    if (predicate(t)) { cur++; max = Math.max(max, cur); } else { cur = 0; }
  }
  return max;
}

// ---------- Render ----------

async function renderTradingTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading trading data...</p>`;

  const user = await requireAuth();
  if (!user) return;

  const [settings, { data: tradesRaw }] = await Promise.all([
    loadTradingSettings(),
    sb.from('trades').select('*').order('open_time', { ascending: true })
  ]);
  const trades = tradesRaw || [];

  const accountSize = Number(settings.account_size);
  const totalPnl = trades.reduce((sum, t) => sum + netResult(t), 0);
  const currentBalance = accountSize + totalPnl;
  const targetBalance = accountSize * (1 + Number(settings.profit_target_pct) / 100);
  const pnlPct = accountSize ? (totalPnl / accountSize) * 100 : 0;

  const { wins, losses, winRate, avgRR } = computeTradeStats(trades);

  // This week / weekly review (last completed week)
  const thisWeek = getMondaySundayRange(0);
  const lastWeek = getMondaySundayRange(1);
  const thisWeekTrades = trades.filter(t => new Date(t.open_time) >= thisWeek.start);
  const lastWeekTrades = trades.filter(t => {
    const d = new Date(t.open_time);
    return d >= lastWeek.start && d <= lastWeek.end;
  });
  const lastWeekStats = computeTradeStats(lastWeekTrades);
  const lastWeekPnl = lastWeekTrades.reduce((s, t) => s + netResult(t), 0);
  const lastWeekBest = lastWeekTrades.length ? Math.max(...lastWeekTrades.map(t => netResult(t))) : 0;
  const lastWeekWorst = lastWeekTrades.length ? Math.min(...lastWeekTrades.map(t => netResult(t))) : 0;

  // avg trades/week
  let avgTradesPerWeek = trades.length;
  if (trades.length) {
    const firstDate = new Date(trades[0].open_time);
    const lastDate = new Date(trades[trades.length - 1].open_time);
    const weeksSpan = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 7)) + 1);
    avgTradesPerWeek = (trades.length / weeksSpan).toFixed(1);
  }

  // Winners / losers breakdown
  const winnerProfits = wins.map(t => netResult(t));
  const loserProfits = losses.map(t => netResult(t));
  const winStreak = maxStreak(trades, t => netResult(t) > 0);
  const lossStreak = maxStreak(trades, t => netResult(t) <= 0);

  // By instrument
  const byInstrument = {};
  trades.forEach(t => {
    const sym = t.symbol || 'Unknown';
    byInstrument[sym] = (byInstrument[sym] || 0) + 1;
  });

  // By day of week
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDow = [0, 0, 0, 0, 0, 0, 0];
  trades.forEach(t => { byDow[new Date(t.open_time).getDay()]++; });

  // By time of day (hour buckets)
  const byHour = new Array(24).fill(0);
  trades.forEach(t => { byHour[new Date(t.open_time).getHours()]++; });

  // Balance over time
  let running = accountSize;
  const balancePoints = [{ x: 'Start', y: running }];
  trades.forEach(t => {
    running += netResult(t);
    balancePoints.push({ x: new Date(t.open_time).toLocaleDateString(), y: running });
  });

  // Goal progress
  const goalProgressPct = targetBalance > accountSize
    ? Math.max(0, Math.min(100, ((currentBalance - accountSize) / (targetBalance - accountSize)) * 100))
    : 0;
  const amountToGo = Math.max(0, targetBalance - currentBalance);

  const lastUpload = localStorage.getItem('trading_last_upload');
  const lastUploadText = lastUpload ? new Date(lastUpload).toLocaleString() : 'Never uploaded yet';

  container.innerHTML = `
    <div class="card">
      <p class="card-title">Last week review</p>
      ${lastWeekTrades.length ? `
        <div class="stat-grid-4">
          <div class="stat-box"><div class="stat-box-value">${lastWeekTrades.length}</div><div class="stat-box-label">Trades</div></div>
          <div class="stat-box"><div class="stat-box-value ${lastWeekStats.winRate >= 50 ? 'g' : 'a'}">${lastWeekStats.winRate}%</div><div class="stat-box-label">Win rate</div></div>
          <div class="stat-box"><div class="stat-box-value ${lastWeekPnl >= 0 ? 'g' : 'r'}">${lastWeekPnl >= 0 ? '+' : ''}$${lastWeekPnl.toFixed(0)}</div><div class="stat-box-label">P&amp;L</div></div>
          <div class="stat-box"><div class="stat-box-value g">+$${lastWeekBest.toFixed(0)}</div><div class="stat-box-label">Best trade</div></div>
        </div>
      ` : '<p class="empty-state">No trades logged last week.</p>'}
    </div>

    <div class="card">
      <p class="card-title">Import trades</p>
      <div class="upload-row">
        <label class="file-input-btn">Upload FTMO CSV<input type="file" id="csv-input" accept=".csv" /></label>
        <span class="upload-status" id="upload-status">Last upload: ${lastUploadText}</span>
      </div>
    </div>

    <div class="stat-grid-4">
      <div class="card stat-box"><div class="stat-box-value">$${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div class="stat-box-label">Account balance</div></div>
      <div class="card stat-box"><div class="stat-box-value ${pnlPct >= 0 ? 'g' : 'r'}">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%</div><div class="stat-box-label">Total P&amp;L</div></div>
      <div class="card stat-box"><div class="stat-box-value ${winRate >= 50 ? 'g' : 'a'}">${winRate}%</div><div class="stat-box-label">Win rate</div></div>
      <div class="card stat-box"><div class="stat-box-value">${trades.length}</div><div class="stat-box-label">Total trades</div></div>
    </div>

    <div class="card">
      <p class="card-title">Account settings</p>
      <form id="trading-settings-form" class="settings-grid">
        <div class="settings-field"><label>Account size ($)</label><input type="text" name="account_size" value="${accountSize}" /></div>
        <div class="settings-field"><label>Profit target (%)</label><input type="text" name="profit_target_pct" value="${settings.profit_target_pct}" /></div>
        <div class="settings-field"><label>Max trades / week</label><input type="text" name="max_trades_per_week" value="${settings.max_trades_per_week}" /></div>
        <div class="settings-field"><label>Max losses / week</label><input type="text" name="max_losses_per_week" value="${settings.max_losses_per_week}" /></div>
      </form>
    </div>

    <div class="card">
      <p class="card-title">Balance over time</p>
      <div class="chart-wrap"><canvas id="balance-chart"></canvas></div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="card-title">Winners</p>
        <div class="check-row" style="border:none;"><span class="check-label">Total wins</span><span class="check-label" style="margin-left:auto; color:var(--green); font-weight:500;">${wins.length}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Best trade</span><span class="check-label" style="margin-left:auto; color:var(--green); font-weight:500;">+$${(winnerProfits.length ? Math.max(...winnerProfits) : 0).toFixed(0)}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Average win</span><span class="check-label" style="margin-left:auto; color:var(--green); font-weight:500;">+$${(winnerProfits.length ? winnerProfits.reduce((a, b) => a + b, 0) / winnerProfits.length : 0).toFixed(0)}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Max win streak</span><span class="check-label" style="margin-left:auto; color:var(--green); font-weight:500;">${winStreak}</span></div>
      </div>
      <div class="card">
        <p class="card-title">Losers</p>
        <div class="check-row" style="border:none;"><span class="check-label">Total losses</span><span class="check-label" style="margin-left:auto; color:var(--red); font-weight:500;">${losses.length}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Worst trade</span><span class="check-label" style="margin-left:auto; color:var(--red); font-weight:500;">$${(loserProfits.length ? Math.min(...loserProfits) : 0).toFixed(0)}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Average loss</span><span class="check-label" style="margin-left:auto; color:var(--red); font-weight:500;">$${(loserProfits.length ? loserProfits.reduce((a, b) => a + b, 0) / loserProfits.length : 0).toFixed(0)}</span></div>
        <div class="check-row" style="border:none;"><span class="check-label">Max loss streak</span><span class="check-label" style="margin-left:auto; color:var(--red); font-weight:500;">${lossStreak}</span></div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="card-title">By instrument</p>
        <div class="chart-wrap-sm"><canvas id="instrument-chart"></canvas></div>
      </div>
      <div class="card">
        <p class="card-title">By day of week</p>
        <div class="chart-wrap-sm"><canvas id="dow-chart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">By time of day</p>
        <span class="card-meta">Broker server time (as recorded by MT5) — not your local time</span>
      </div>
      <div class="chart-wrap-sm"><canvas id="hour-chart"></canvas></div>
    </div>

    <div class="stat-grid-3">
      <div class="card stat-box"><div class="stat-box-value">${avgRR != null ? avgRR.toFixed(2) : '—'}</div><div class="stat-box-label">Avg R:R</div></div>
      <div class="card stat-box"><div class="stat-box-value">${avgTradesPerWeek}</div><div class="stat-box-label">Avg trades / week</div></div>
      <div class="card stat-box"><div class="stat-box-value">${thisWeekTrades.length} / ${settings.max_trades_per_week}</div><div class="stat-box-label">This week</div></div>
    </div>

    <div class="card">
      <p class="card-title">Goal progress</p>
      <div class="check-row" style="border:none;"><span class="check-label">$${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} of $${targetBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span class="check-label" style="margin-left:auto;">${goalProgressPct.toFixed(0)}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${goalProgressPct}%;"></div></div>
      <p class="empty-state" style="padding-top:10px; text-align:left;">${amountToGo > 0 ? `$${amountToGo.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go` : 'Target reached!'}</p>
    </div>
  `;

  attachTradingSettingsHandler();
  attachCsvUploadHandler();
  drawTradingCharts({ balancePoints, byInstrument, byDow, dowNames, byHour });
}

function attachTradingSettingsHandler() {
  const form = document.getElementById('trading-settings-form');
  if (!form) return;
  form.querySelectorAll('input').forEach(input => {
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const fields = {};
        form.querySelectorAll('input').forEach(i => { fields[i.name] = Number(i.value) || 0; });
        await saveTradingSettings(fields);
      }, 600);
    });
  });
}

function attachCsvUploadHandler() {
  const input = document.getElementById('csv-input');
  const statusEl = document.getElementById('upload-status');
  if (!input || !statusEl) return;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      await importTradesFromCsv(file, statusEl);
    } catch (err) {
      statusEl.textContent = `Import error: ${err.message}`;
    }
  });
}

function drawTradingCharts({ balancePoints, byInstrument, byDow, dowNames, byHour }) {
  if (typeof Chart === 'undefined') return;

  const textColor = '#888888';
  const gridColor = '#1e1e1e';
  const purple = '#7F77DD';
  const palette = ['#534AB7', '#378ADD', '#1D9E75', '#EF9F27', '#E24B4A', '#7F77DD', '#888888'];

  Object.values(TRADING_CHARTS).forEach(c => c?.destroy());

  const balanceEl = document.getElementById('balance-chart');
  if (balanceEl) {
    TRADING_CHARTS.balance = new Chart(balanceEl, {
      type: 'line',
      data: { labels: balancePoints.map(p => p.x), datasets: [{ data: balancePoints.map(p => p.y), borderColor: purple, backgroundColor: 'rgba(127,119,221,0.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } } }, responsive: true, maintainAspectRatio: false }
    });
  }

  const instEl = document.getElementById('instrument-chart');
  if (instEl) {
    const labels = Object.keys(byInstrument);
    TRADING_CHARTS.instrument = new Chart(instEl, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: Object.values(byInstrument), backgroundColor: palette }] },
      options: { plugins: { legend: { position: 'right', labels: { color: textColor, font: { size: 10 }, boxWidth: 10 } } }, responsive: true, maintainAspectRatio: false }
    });
  }

  const dowEl = document.getElementById('dow-chart');
  if (dowEl) {
    TRADING_CHARTS.dow = new Chart(dowEl, {
      type: 'bar',
      data: { labels: dowNames, datasets: [{ data: byDow, backgroundColor: purple, borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } } }, responsive: true, maintainAspectRatio: false }
    });
  }

  const hourEl = document.getElementById('hour-chart');
  if (hourEl) {
    TRADING_CHARTS.hour = new Chart(hourEl, {
      type: 'bar',
      data: { labels: Array.from({ length: 24 }, (_, i) => i + 'h'), datasets: [{ data: byHour, backgroundColor: '#378ADD', borderRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { size: 8 }, maxTicksLimit: 12 }, grid: { display: false } }, y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } } }, responsive: true, maintainAspectRatio: false }
    });
  }
}

// ============================================
// APP BOOTSTRAP — this was missing, which is why the page stayed blank
// ============================================

async function initApp() {
  try {
    const user = await Promise.race([
      getCurrentUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for Supabase (10s) — check your connection or that the Supabase project is reachable.')), 10000))
    ]);
    if (!user) {
      showLoginScreen();
      return;
    }
    switchTab('daily');
  } catch (err) {
    const el = document.getElementById('tab-content');
    if (el) el.innerHTML = `<div class="card"><p class="card-title" style="color:var(--red)">Startup failed</p><p class="empty-state">${escapeHtmlSafe(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', initApp);
