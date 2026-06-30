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
  trading: () => renderPlaceholderTab('Trading', 'Trading tab is being built next — coming soon.'),
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
  const wins = trades.filter(t => Number(t.profit) > 0).length;
  const losses = trades.filter(t => Number(t.profit) <= 0).length;

  const { data: allTrades } = await sb.from('trades').select('profit');
  const totalPnl = (allTrades || []).reduce((sum, t) => sum + Number(t.profit || 0), 0);
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
