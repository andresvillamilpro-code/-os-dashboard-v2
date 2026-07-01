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

const MISSION_STATEMENT = '"No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." — Hebrews 12:11';

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
  fitness: renderFitnessTab,
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
    loadTasks()
  ]);

  container.innerHTML = `
    <div class="identity-banner">${MISSION_STATEMENT}</div>
    ${renderChecklistCard('Morning routine', 'morning-routine', routine)}
    ${renderCalendarCard()}
    <div class="two-col">
      ${renderTopGoalsCard(goals)}
      ${renderTaskListCard(tasks)}
    </div>
    ${renderChecklistCard('Consistency check', 'consistency', consistency)}
    ${renderTradingSnapshotBox(snapshot)}
  `;

  attachChecklistHandlers('morning_routine_log', 'morning-routine');
  attachChecklistHandlers('consistency_log', 'consistency');
  attachTopGoalsHandlers();
  attachTaskListHandlers();
  initGoogleCalendar();
}

// ---------- Trading snapshot box (Daily tab) ----------

async function loadTradingSnapshot() {
  const thisWeek = getMondayOfWeek();
  const mondayISO = isoDate(thisWeek);

  const [settingsRows, weekTradesRaw, allTradesRaw] = await Promise.all([
    sb.from('trading_settings').select('*').limit(1).then(r => r.data),
    sb.from('trades').select('profit, swap, commission, open_time').gte('open_time', mondayISO + 'T00:00:00Z').then(r => r.data),
    sb.from('trades').select('profit, swap, commission').then(r => r.data)
  ]);

  const settings = settingsRows?.[0] || {
    account_size: 100000, profit_target_pct: 10,
    max_drawdown_pct: 10, daily_loss_limit_pct: 5,
    max_trades_per_week: 10, max_losses_per_week: 3
  };

  const weekTrades = weekTradesRaw || [];
  const allTrades = allTradesRaw || [];

  const totalPnl = allTrades.reduce((sum, t) => sum + netResult(t), 0);
  const accountSize = Number(settings.account_size);
  const currentBalance = accountSize + totalPnl;
  const pnlPct = (totalPnl / accountSize) * 100;

  const weekPnl = weekTrades.reduce((sum, t) => sum + netResult(t), 0);
  const weekWins = weekTrades.filter(t => netResult(t) > 0).length;
  const weekLosses = weekTrades.filter(t => netResult(t) <= 0).length;

  // Week status logic (same as Trading tab)
  let weekStatus, weekStatusColor, weekAlert;
  if (weekLosses >= Number(settings.max_losses_per_week)) {
    weekStatus = '⛔ Stop trading — max losses reached';
    weekStatusColor = 'var(--red)';
    weekAlert = `${weekLosses} losses this week (limit: ${settings.max_losses_per_week}). No more trades until Monday.`;
  } else if (weekTrades.length >= Number(settings.max_trades_per_week)) {
    weekStatus = '⚠️ Trade limit reached';
    weekStatusColor = 'var(--amber)';
    weekAlert = `${weekTrades.length} trades taken (limit: ${settings.max_trades_per_week}). Wait until Monday.`;
  } else if (weekPnl < -accountSize * 0.025) {
    weekStatus = '⚠️ Down 2.5%+ this week';
    weekStatusColor = 'var(--amber)';
    weekAlert = `Down $${Math.abs(weekPnl).toFixed(0)} this week. Reduce size, focus on A+ setups only.`;
  } else if (weekPnl > 0) {
    weekStatus = '✅ Positive week';
    weekStatusColor = 'var(--green)';
    weekAlert = `Up $${weekPnl.toFixed(0)} this week. Protect the gains — A+ setups only.`;
  } else if (weekTrades.length === 0) {
    weekStatus = 'No trades yet this week';
    weekStatusColor = 'var(--text4)';
    weekAlert = 'Stay patient. Wait for A+ setups only.';
  } else {
    weekStatus = 'Negative week — stay disciplined';
    weekStatusColor = 'var(--text3)';
    weekAlert = `Down $${Math.abs(weekPnl).toFixed(0)} this week. Stick to the process.`;
  }

  return {
    accountSize, currentBalance, pnlPct,
    profitTargetPct: Number(settings.profit_target_pct),
    weekPnl, weekWins, weekLosses,
    weekTradesCount: weekTrades.length,
    maxTradesPerWeek: Number(settings.max_trades_per_week),
    maxLossesPerWeek: Number(settings.max_losses_per_week),
    weekStatus, weekStatusColor, weekAlert
  };
}

function renderTradingSnapshotBox(s) {
  if (!s) return '';
  const pnlClass = s.pnlPct >= 0 ? 'g' : 'r';
  return `
    <div class="card" style="border-left: 2px solid ${s.weekStatusColor};">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Trading — this week</p>
        <span style="font-size:11px; font-weight:500; color:${s.weekStatusColor};">${s.weekStatus}</span>
      </div>
      <div style="background:var(--bg3); border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:12px; color:${s.weekStatusColor}; font-weight:500;">${s.weekAlert}</div>
      <div class="stat-grid-4">
        <div class="stat-box">
          <div class="stat-box-value ${s.weekPnl >= 0 ? 'g' : 'r'}">${s.weekPnl >= 0 ? '+' : ''}$${s.weekPnl.toFixed(0)}</div>
          <div class="stat-box-label">P&amp;L this week</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${s.weekTradesCount} / ${s.maxTradesPerWeek}</div>
          <div class="stat-box-label">Trades used</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${s.weekLosses >= s.maxLossesPerWeek ? 'r' : 'w'}">${s.weekLosses} / ${s.maxLossesPerWeek}</div>
          <div class="stat-box-label">Losses</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${s.pnlPct >= 0 ? 'g' : 'r'}">${s.pnlPct >= 0 ? '+' : ''}${s.pnlPct.toFixed(1)}% / ${s.profitTargetPct}%</div>
          <div class="stat-box-label">Total P&amp;L vs target</div>
        </div>
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
        await sb.from(table).insert({ log_date: today, item_name: itemName, completed, user_id: (await sb.auth.getUser()).data.user?.id });
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
      await sb.from('top_goals').insert({ log_date: today, slot, ...fields, user_id: (await sb.auth.getUser()).data.user?.id });
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

// ---------- Task list ----------

async function loadTasks() {
  const today = todayISO();
  const weekStart = isoDate(getMondayOfWeek());

  const [activeRes, todayDoneRes, weekDoneRes] = await Promise.all([
    sb.from('tasks').select('*').eq('status', 'active').order('date_created', { ascending: true }),
    sb.from('tasks').select('*').eq('status', 'done').eq('date_completed', today).order('date_completed', { ascending: true }),
    sb.from('tasks').select('*').eq('status', 'done').gte('date_completed', weekStart).lt('date_completed', today).order('date_completed', { ascending: true })
  ]);

  return {
    active: activeRes.data || [],
    completedToday: todayDoneRes.data || [],
    completedWeek: weekDoneRes.data || []
  };
}

function renderTaskListCard(tasks) {
  const { active, completedToday, completedWeek } = tasks;
  const totalWeek = completedToday.length + completedWeek.length;

  const deleteBtn = (id) =>
    `<span data-task-delete="${id}" style="font-size:11px;color:var(--text4);cursor:pointer;padding:2px 6px;border-radius:4px;border:0.5px solid var(--border2);flex-shrink:0;">✕</span>`;

  // Active tasks
  const activeRows = active.map(t => `
    <div class="check-row" data-task-id="${t.id}">
      <input type="checkbox" data-task-check="${t.id}" />
      <label class="check-label" style="flex:1;">${escapeHtml(t.text)}</label>
      ${deleteBtn(t.id)}
    </div>`).join('');

  // Completed today (visible by default)
  const todayRows = completedToday.map(t => `
    <div class="check-row" data-task-id="${t.id}">
      <input type="checkbox" checked data-task-check="${t.id}" />
      <label class="check-label" style="text-decoration:line-through;color:var(--text4);flex:1;">${escapeHtml(t.text)}</label>
      ${deleteBtn(t.id)}
    </div>`).join('');

  // This week — grouped by day, collapsible
  const DOW_FULL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const byDay = {};
  completedWeek.forEach(t => {
    const d = t.date_completed || '';
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(t);
  });
  const weekRows = Object.entries(byDay).sort().map(([date, dayTasks]) => {
    const dow = DOW_FULL[new Date(date + 'T12:00:00').getDay()];
    const rows = dayTasks.map(t => `
      <div class="check-row" data-task-id="${t.id}" style="padding-left:10px;">
        <input type="checkbox" checked data-task-check="${t.id}" />
        <label class="check-label" style="text-decoration:line-through;color:var(--text4);flex:1;">${escapeHtml(t.text)}</label>
        ${deleteBtn(t.id)}
      </div>`).join('');
    return `<div style="font-size:10px;font-weight:500;color:var(--text4);text-transform:uppercase;letter-spacing:.06em;padding:6px 0 2px;">${dow}</div>${rows}`;
  }).join('');

  const todaySection = completedToday.length ? `
    <div style="border-top:0.5px solid var(--border2);margin:6px 0 4px;"></div>
    <div style="font-size:10px;font-weight:500;color:var(--text4);text-transform:uppercase;letter-spacing:.06em;padding:2px 0 6px;">Completed today</div>
    ${todayRows}` : '';

  const weekSection = completedWeek.length ? `
    <div style="border-top:0.5px solid var(--border2);margin:6px 0;"></div>
    <div onclick="toggleWeekTasks()" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;padding:2px 0;">
      <span style="font-size:11px;font-weight:500;color:var(--text3);">This week</span>
      <span style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;background:var(--green-bg);color:var(--green);border:0.5px solid var(--green-border);border-radius:10px;padding:1px 8px;font-weight:500;">${completedWeek.length}</span>
        <span id="week-tasks-arrow" style="font-size:10px;color:var(--text4);">▶</span>
      </span>
    </div>
    <div id="week-tasks-list" style="display:none;margin-top:4px;">${weekRows}</div>` : '';

  const empty = !active.length && !completedToday.length && !completedWeek.length;

  return `
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Task of the day</p>
        ${totalWeek > 0 ? `<span class="card-meta">${totalWeek} done this week</span>` : ''}
      </div>
      <div id="task-list">
        ${empty ? '<p class="empty-state" style="padding:8px 0;">No tasks yet — add one below.</p>' : activeRows}
        ${todaySection}
        ${weekSection}
      </div>
      <form id="add-task-form" style="display:flex;gap:8px;margin-top:10px;">
        <input type="text" id="new-task-input" placeholder="Add a task..." style="flex:1;" />
        <button type="submit" class="btn-secondary">Add</button>
      </form>
    </div>`;
}

function toggleWeekTasks() {
  const list = document.getElementById('week-tasks-list');
  const arrow = document.getElementById('week-tasks-arrow');
  if (!list) return;
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
}

function attachTaskListHandlers() {
  const list = document.getElementById('task-list');
  const form = document.getElementById('add-task-form');
  if (!list || !form) return;

  list.querySelectorAll('[data-task-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.taskDelete;
      await sb.from('tasks').delete().eq('id', id);
      renderDailyTab();
    });
  });

  list.querySelectorAll('input[data-task-check]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.taskCheck;
      const isDone = e.target.checked;
      if (isDone) {
        await sb.from('tasks').update({ status: 'done', date_completed: todayISO() }).eq('id', id);
      } else {
        // Uncheck — restore to active
        await sb.from('tasks').update({ status: 'active', date_completed: null }).eq('id', id);
      }
      renderDailyTab(); // Refresh to move task between sections
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;
    await sb.from('tasks').insert({ text, status: 'active', date_created: todayISO(), user_id: (await sb.auth.getUser()).data.user?.id });
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

// FTMO's MT5 server time runs on GMT+2 (winter) / GMT+3 (summer) — Eastern European
// Time, switching DST on Europe's schedule. The viewer is in Eastern time (GMT-5/-4),
// switching DST on North America's schedule — these two shift on different dates, so a
// fixed-hour offset would be wrong for part of the year. This does a real DST-aware
// conversion via Intl, using Europe/Helsinki as a reference EET/EEST zone.
//
// Note: the literal server-time digits (the numbers as written in the FTMO CSV) are
// recovered here using the JS Date object's LOCAL getters, because trades are imported
// and viewed from the same Eastern-timezone browser, which makes that round trip exact.
function serverTimeToLocalParts(date, targetTimeZone = 'America/Toronto') {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const hh = date.getHours(), mm = date.getMinutes(), ss = date.getSeconds();
  const naiveUTC = Date.UTC(y, mo, d, hh, mm, ss);

  // Find the EET/EEST UTC offset at this moment (DST-aware) — matches FTMO's documented GMT+2/+3 server time
  const serverFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const sp = Object.fromEntries(serverFmt.formatToParts(new Date(naiveUTC)).map(p => [p.type, p.value]));
  const serverHour = sp.hour === '24' ? 0 : Number(sp.hour);
  const serverAsUTC = Date.UTC(Number(sp.year), Number(sp.month) - 1, Number(sp.day), serverHour, Number(sp.minute), Number(sp.second));
  const realUTC = naiveUTC - (serverAsUTC - naiveUTC);

  // Express that true instant in the viewer's local time zone (DST-aware)
  const localFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimeZone, hour12: false, weekday: 'short', hour: '2-digit'
  });
  const lp = Object.fromEntries(localFmt.formatToParts(new Date(realUTC)).map(p => [p.type, p.value]));
  return { hour: (lp.hour === '24' ? 0 : Number(lp.hour)), weekday: lp.weekday };
}

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

  // FTMO's export has TWO columns both literally named "Price" (open price, then close
  // price) — name-matching can't tell them apart, so resolve by position: first "Price"
  // column is open price, the next one after it is close price.
  const priceColumnIndices = headers
    .map((h, i) => ({ h: h.toLowerCase().trim(), i }))
    .filter(o => o.h === 'price')
    .map(o => o.i);

  let openPriceIdx = findColIndex(headers, 'price open', 'open price');
  let closePriceIdx = findColIndex(headers, 'price close', 'close price');
  if (openPriceIdx < 0 && priceColumnIndices.length >= 1) openPriceIdx = priceColumnIndices[0];
  if (closePriceIdx < 0 && priceColumnIndices.length >= 2) closePriceIdx = priceColumnIndices[1];
  if (openPriceIdx < 0) openPriceIdx = findColIndex(headers, 'price');

  const idx = {
    ticket: findColIndex(headers, 'ticket'),
    open: findColIndex(headers, 'open time', 'open'),
    type: findColIndex(headers, 'type'),
    volume: findColIndex(headers, 'volume', 'lots'),
    symbol: findColIndex(headers, 'symbol'),
    openPrice: openPriceIdx,
    sl: findColIndex(headers, 'sl', 'stop loss'),
    tp: findColIndex(headers, 'tp', 'take profit'),
    close: findColIndex(headers, 'close time', 'close'),
    closePrice: closePriceIdx,
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

  statusEl.textContent = `Found ${parsed.length} trades — importing (existing trades get refreshed too)...`;
  const { error } = await sb.from('trades').upsert(parsed, { onConflict: 'user_id,ticket' });
  if (error) {
    statusEl.textContent = `Import failed: ${error.message}`;
    return;
  }

  localStorage.setItem('trading_last_upload', new Date().toISOString());
  statusEl.textContent = `Imported/refreshed ${parsed.length} trades from file.`;
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

  // R-multiple: realized result measured against planned risk (entry-to-stop distance),
  // not against the TP field. TP isn't a meaningful target for trades closed manually —
  // R-multiple instead asks "how many multiples of my planned risk did I actually make
  // or lose," which is the right metric for a discretionary/manual-close trading style.
  const rMultiples = trades
    .filter(t => Number(t.sl) > 0 && Number(t.open_price) > 0 && Number(t.close_price) > 0)
    .map(t => {
      const risk = Math.abs(Number(t.open_price) - Number(t.sl));
      if (risk <= 0) return null;
      const move = t.trade_type === 'sell'
        ? Number(t.open_price) - Number(t.close_price)
        : Number(t.close_price) - Number(t.open_price);
      return move / risk;
    })
    .filter(v => v != null && isFinite(v));

  // Median, not mean — MT5 only exports the stop's position at close, not where it
  // started. A trailed-tight stop on a big winner can produce an extreme R-multiple
  // that isn't a data error, but it skews a mean heavily. Median reflects the typical
  // trade far more honestly.
  const sorted = [...rMultiples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianRMultiple = sorted.length
    ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
    : null;

  return { wins, losses, winRate, medianRMultiple };
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

  const { wins, losses, winRate, medianRMultiple } = computeTradeStats(trades);

  // ── THIS WEEK (Mon–Fri window) ──
  const thisWeek = getMondaySundayRange(0);
  const thisWeekTrades = trades.filter(t => new Date(t.open_time) >= thisWeek.start);
  const thisWeekStats = computeTradeStats(thisWeekTrades);
  const thisWeekPnl = thisWeekTrades.reduce((s, t) => s + netResult(t), 0);
  const thisWeekLosses = thisWeekTrades.filter(t => netResult(t) <= 0).length;
  const thisWeekWins = thisWeekTrades.filter(t => netResult(t) > 0).length;
  const maxTradesLeft = Math.max(0, Number(settings.max_trades_per_week) - thisWeekTrades.length);
  const maxLossesLeft = Math.max(0, Number(settings.max_losses_per_week) - thisWeekLosses);

  // Determine week status
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun, 6=Sat
  const tradingDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const currentDayName = todayDow >= 1 && todayDow <= 5 ? tradingDayNames[todayDow - 1] : null;
  const daysRemaining = todayDow >= 1 && todayDow <= 5 ? 5 - todayDow : 0;

  let weekStatus, weekStatusColor, weekStatusBg, weekAlert;
  if (thisWeekLosses >= Number(settings.max_losses_per_week)) {
    weekStatus = '⛔ Stop trading — max losses reached';
    weekStatusColor = 'var(--red)';
    weekStatusBg = 'var(--red-bg)';
    weekAlert = `You've hit ${thisWeekLosses} losses this week (limit: ${settings.max_losses_per_week}). Do not take any more trades until Monday.`;
  } else if (thisWeekTrades.length >= Number(settings.max_trades_per_week)) {
    weekStatus = '⚠️ Trade limit reached';
    weekStatusColor = 'var(--amber)';
    weekStatusBg = 'var(--amber-bg)';
    weekAlert = `${thisWeekTrades.length} trades taken this week (limit: ${settings.max_trades_per_week}). Wait until Monday to trade again.`;
  } else if (thisWeekPnl < -Number(accountSize) * 0.025) {
    weekStatus = '⚠️ Down more than 2.5% — be careful';
    weekStatusColor = 'var(--amber)';
    weekStatusBg = 'var(--amber-bg)';
    weekAlert = `You are down $${Math.abs(thisWeekPnl).toFixed(0)} this week. Reduce size and focus on clean setups only.`;
  } else if (thisWeekTrades.length === 0) {
    weekStatus = currentDayName ? `No trades yet — ${currentDayName}` : 'Weekend — markets closed';
    weekStatusColor = 'var(--text4)';
    weekStatusBg = 'var(--bg3)';
    weekAlert = currentDayName ? 'Week is open. Stay patient, wait for A+ setups only.' : 'Rest, review, and prepare your plan for Monday.';
  } else if (thisWeekPnl >= 0) {
    weekStatus = '✅ Positive week so far';
    weekStatusColor = 'var(--green)';
    weekStatusBg = 'var(--green-bg)';
    weekAlert = `Up $${thisWeekPnl.toFixed(0)} with ${daysRemaining} trading day${daysRemaining !== 1 ? 's' : ''} remaining. Protect the gains — only A+ setups.`;
  } else {
    weekStatus = '📉 Negative week — stay disciplined';
    weekStatusColor = 'var(--text3)';
    weekStatusBg = 'var(--bg3)';
    weekAlert = `Down $${Math.abs(thisWeekPnl).toFixed(0)} this week. Stay patient, stick to the process.`;
  }

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

  // By day of week + time of day — converted from FTMO's MT5 server time to local time
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDow = [0, 0, 0, 0, 0, 0, 0];
  const byHour = new Array(24).fill(0);
  trades.forEach(t => {
    const { hour, weekday } = serverTimeToLocalParts(new Date(t.open_time));
    byHour[hour]++;
    const dowIdx = dowNames.indexOf(weekday);
    if (dowIdx >= 0) byDow[dowIdx]++;
  });

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

  const mondayStr = thisWeek.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fridayEnd = new Date(thisWeek.start); fridayEnd.setDate(fridayEnd.getDate() + 4);
  const fridayStr = fridayEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  container.innerHTML = `
    <div class="card" style="border-left: 2px solid ${weekStatusColor};">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">This week — ${mondayStr} to ${fridayStr}</p>
        <span style="font-size:11px; font-weight:500; color:${weekStatusColor};">${weekStatus}</span>
      </div>
      <div style="background:${weekStatusBg}; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:${weekStatusColor}; font-weight:500;">${weekAlert}</div>
      <div class="stat-grid-4">
        <div class="stat-box">
          <div class="stat-box-value ${thisWeekPnl >= 0 ? 'g' : 'r'}">${thisWeekPnl >= 0 ? '+' : ''}$${thisWeekPnl.toFixed(0)}</div>
          <div class="stat-box-label">P&amp;L this week</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${thisWeekTrades.length} / ${settings.max_trades_per_week}</div>
          <div class="stat-box-label">Trades used</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${thisWeekLosses >= settings.max_losses_per_week ? 'r' : 'w'}">${thisWeekLosses} / ${settings.max_losses_per_week}</div>
          <div class="stat-box-label">Losses</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${thisWeekStats.winRate >= 50 ? 'g' : 'a'}">${thisWeekTrades.length ? thisWeekStats.winRate + '%' : '—'}</div>
          <div class="stat-box-label">Win rate</div>
        </div>
      </div>
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
        <span class="card-meta">Converted to your local time zone (from FTMO's MT5 server time)</span>
      </div>
      <div class="chart-wrap-sm"><canvas id="hour-chart"></canvas></div>
    </div>

    <div class="stat-grid-3">
      <div class="card stat-box"><div class="stat-box-value">${medianRMultiple != null ? (medianRMultiple >= 0 ? "+" : "") + medianRMultiple.toFixed(2) + "R" : "—"}</div><div class="stat-box-label">Median R-multiple</div></div>
      <div class="card stat-box"><div class="stat-box-value">${avgTradesPerWeek}</div><div class="stat-box-label">Avg trades / week</div></div>
      <div class="card stat-box">
        <div class="stat-box-value g">+$${winnerProfits.length ? (winnerProfits.reduce((a,b)=>a+b,0)/winnerProfits.length).toFixed(0) : '—'}</div>
        <div class="stat-box-label">Avg win</div>
        <div style="font-size:11px;color:var(--red);margin-top:4px;">−$${loserProfits.length ? Math.abs(loserProfits.reduce((a,b)=>a+b,0)/loserProfits.length).toFixed(0) : '—'} avg loss</div>
      </div>
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
      data: { labels: balancePoints.map(p => p.x), datasets: [{ data: balancePoints.map(p => p.y), borderColor: purple, backgroundColor: 'rgba(127,119,221,0.1)', fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: purple }] },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '$' + ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 }) } } },
        scales: { x: { ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: textColor, font: { size: 10 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } } },
        responsive: true, maintainAspectRatio: false
      }
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
// FITNESS TAB
// ============================================

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
const CARDIO_TYPES = ['Running', 'Cycling', 'Boxing'];
const STRENGTH_LIFTS = [
  { name: 'Bench press', unit: 'lb' },
  { name: 'Squat', unit: 'lb' },
  { name: 'Deadlift', unit: 'lb' },
  { name: 'Overhead press', unit: 'lb' },
  { name: 'Pull-ups', unit: 'reps' }
];
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEIGHT_GOAL_LBS = 200;
// Supplement items synced with Daily tab's consistency_log (same table, same data)
const SUPPLEMENT_ITEMS = ['160g protein', 'Creatine', 'Zinc', 'Magnesium'];

function fitnessWeekStart(weeksAgo = 0) {
  const mon = getMondayOfWeek();
  mon.setDate(mon.getDate() - weeksAgo * 7);
  return isoDate(mon);
}

function getWeekDates(weekStartISO) {
  // Returns ISO date strings for Mon–Sun of the given week
  const start = new Date(weekStartISO + 'T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
}

function formatWeekRange(weekStartISO) {
  const start = new Date(weekStartISO + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

async function safeQuery(queryPromise) {
  try { const r = await queryPromise; return r.data || []; } catch { return []; }
}

async function renderFitnessTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = '<p class="loading-text">Loading fitness data...</p>';
  const user = await requireAuth();
  if (!user) return;

  maybeLockWeekSnapshot(); // Fire-and-forget — locks this week on Sundays

  const thisWeek = fitnessWeekStart(0);
  const today = todayISO();
  const thisWeekDates = getWeekDates(thisWeek);

  // How many days have passed so far this week (Mon=1 through today)
  const todayDow = new Date().getDay(); // 0=Sun
  const daysPassedThisWeek = todayDow === 0 ? 7 : todayDow; // Sun counts as day 7

  const [
    muscleThis,
    cardioThis,
    strength,
    sleepRows,
    weightThis,
    supplementsToday,
    photoRows
  ] = await Promise.all([
    safeQuery(sb.from('fitness_muscle_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_cardio_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_strength').select('*').order('logged_at', { ascending: false })),
    safeQuery(sb.from('fitness_sleep_log').select('*').gte('log_date', thisWeek).lte('log_date', thisWeekDates[6])),
    safeQuery(sb.from('fitness_weight_log').select('*').eq('week_start', thisWeek).limit(1)),
    safeQuery(sb.from('consistency_log').select('*').eq('log_date', today)),
    safeQuery(sb.from('fitness_photos').select('*').eq('week_start', thisWeek))
  ]);

  // ── This week live stats (always reflect current state) ──
  const thisTrainingDays = new Set(muscleThis.filter(r => r.trained).map(r => r.day_date));
  const thisCardioDays   = new Set(cardioThis.filter(r => r.done).map(r => r.day_date));
  const thisSleep7Count  = sleepRows.filter(r => r.slept_7plus).length;
  const currentWeight    = weightThis[0]?.weight_lbs;

  // ── This week maps (for grids — individual checkboxes) ──
  const muscleMap = {};
  muscleThis.forEach(r => { muscleMap[`${r.muscle_group}-${r.day_date}`] = r.trained; });

  const cardioMap = {};
  cardioThis.forEach(r => { cardioMap[`${r.cardio_type}-${r.day_date}`] = r.done; });

  const sleepMap = {};
  sleepRows.forEach(r => { sleepMap[r.log_date] = r.slept_7plus; });

  // ── Strength: latest per lift ──
  const strengthMap = {};
  strength.forEach(r => { if (!strengthMap[r.lift_name]) strengthMap[r.lift_name] = r; });

  // ── Supplements synced with Daily ──
  const suppMap = {};
  supplementsToday.forEach(r => { suppMap[r.item_name] = r.completed; });

  // ── Weight & goal ──
  const weightGoalPct = currentWeight ? Math.min(100, (currentWeight / WEIGHT_GOAL_LBS) * 100) : 0;
  const weightToGo    = currentWeight ? Math.max(0, WEIGHT_GOAL_LBS - currentWeight) : null;

  // ── Photos ──
  const frontPhoto = photoRows.find(r => r.photo_type === 'front');
  const backPhoto  = photoRows.find(r => r.photo_type === 'back');

  // ── Week status message ──
  let weekStatus, weekStatusColor;
  if (thisTrainingDays.size >= 5) {
    weekStatus = '✅ Training goal hit — 5 days done';
    weekStatusColor = 'var(--green)';
  } else if (thisTrainingDays.size >= 3) {
    weekStatus = `💪 ${thisTrainingDays.size} of 5 days done — keep going`;
    weekStatusColor = 'var(--amber)';
  } else if (thisTrainingDays.size > 0) {
    weekStatus = `${thisTrainingDays.size} of 5 training days logged so far`;
    weekStatusColor = 'var(--text3)';
  } else {
    weekStatus = 'No training logged yet this week';
    weekStatusColor = 'var(--text4)';
  }

  // ── Render ──
  container.innerHTML = `

    <!-- This week live summary -->
    <div class="card" style="border-left: 2px solid ${weekStatusColor};">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">This week — ${formatWeekRange(thisWeek)}</p>
        <span style="font-size:11px; font-weight:500; color:${weekStatusColor};">${weekStatus}</span>
      </div>
      <div style="font-size:11px; color:var(--text4); margin-bottom:10px;">
        Live — updates as you check boxes below. Final snapshot locks in Sunday night.
      </div>
      <div class="stat-grid-4">
        <div class="stat-box"><div class="stat-box-value ${currentWeight ? 'w' : 'dim'}">${currentWeight != null ? currentWeight + ' lb' : '—'}</div><div class="stat-box-label">Weight</div></div>
        <div class="stat-box"><div class="stat-box-value" style="color:${weekStatusColor};">${thisTrainingDays.size} / 5</div><div class="stat-box-label">Days trained</div></div>
        <div class="stat-box"><div class="stat-box-value">${thisCardioDays.size}</div><div class="stat-box-label">Cardio sessions</div></div>
        <div class="stat-box"><div class="stat-box-value ${thisSleep7Count >= 5 ? 'g' : 'a'}">${thisSleep7Count} / 7</div><div class="stat-box-label">7h+ sleep days</div></div>
      </div>
    </div>

    <!-- Muscle group grid -->
    <div class="card">
      <p class="card-title">Muscle groups trained — this week</p>
      ${renderMuscleGrid(muscleMap, thisWeekDates)}
    </div>

    <!-- Cardio grid -->
    <div class="card">
      <p class="card-title">Cardio — this week</p>
      ${renderCardioGrid(cardioMap, thisWeekDates)}
    </div>

    <!-- Strength + Weight & Sleep -->
    <div class="two-col">
      <div class="card">
        <p class="card-title">Strength — current numbers</p>
        ${renderStrengthTable(strengthMap)}
      </div>
      <div class="card">
        <p class="card-title">Weight &amp; sleep</p>
        ${renderWeightSleepCard(currentWeight, sleepMap, thisWeekDates)}
      </div>
    </div>

    <!-- Supplements (synced with Daily tab) -->
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Supplements — today</p>
        <span class="card-meta">Synced with Daily tab</span>
      </div>
      <div id="fitness-supplements-list">
        ${SUPPLEMENT_ITEMS.map((item) => {
          const idx = CONSISTENCY_ITEMS.indexOf(item);
          return `<div class="check-row">
            <input type="checkbox" data-idx="${idx}" ${suppMap[item] ? 'checked' : ''} />
            <label class="check-label">${escapeHtml(item)}</label>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Weekly photo check -->
    <div class="card">
      <p class="card-title">Weekly photo check</p>
      <div class="two-col">
        ${renderPhotoSlot('front', frontPhoto)}
        ${renderPhotoSlot('back', backPhoto)}
      </div>
    </div>

    <!-- Weight goal progress -->
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Weight goal progress</p>
        <span style="font-size:12px; font-weight:500; color:var(--text);">${currentWeight != null ? currentWeight + ' lb' : '—'} / ${WEIGHT_GOAL_LBS} lb</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${weightGoalPct.toFixed(1)}%; background:var(--green);"></div>
      </div>
      <p style="font-size:11px; color:var(--text4); margin-top:6px;">
        ${weightToGo != null ? `${weightToGo} lb to go` : 'Enter your weekly weight above to track progress'}
      </p>
    </div>
  `;

  attachMuscleGridHandlers(thisWeek);
  attachCardioGridHandlers(thisWeek);
  attachStrengthHandlers();
  attachWeightSleepHandlers(thisWeek, thisWeekDates);
  attachChecklistHandlers('consistency_log', 'fitness-supplements');
  attachPhotoHandlers(thisWeek);
}

// ── Grid renderers ──

function renderMuscleGrid(muscleMap, dates) {
  let html = `<div style="display:grid; grid-template-columns:110px repeat(7,1fr); gap:4px; align-items:center;">`;
  html += `<div></div>`;
  DOW_LABELS.forEach(d => {
    html += `<div style="text-align:center; font-size:10px; color:var(--text4); font-weight:500; padding-bottom:4px;">${d}</div>`;
  });
  MUSCLE_GROUPS.forEach(group => {
    html += `<div style="font-size:12px; color:var(--text2); padding:3px 0;">${group}</div>`;
    dates.forEach(dateStr => {
      const checked = muscleMap[`${group}-${dateStr}`] || false;
      html += `<div style="text-align:center; padding:3px 0;">
        <input type="checkbox" data-muscle="${escapeHtml(group)}" data-date="${dateStr}" ${checked ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--purple);cursor:pointer;" />
      </div>`;
    });
  });
  html += `</div>`;
  return html;
}

function renderCardioGrid(cardioMap, dates) {
  let html = `<div style="display:grid; grid-template-columns:110px repeat(7,1fr); gap:4px; align-items:center;">`;
  html += `<div></div>`;
  DOW_LABELS.forEach(d => {
    html += `<div style="text-align:center; font-size:10px; color:var(--text4); font-weight:500; padding-bottom:4px;">${d}</div>`;
  });
  CARDIO_TYPES.forEach(type => {
    html += `<div style="font-size:12px; color:var(--text2); padding:3px 0;">${type}</div>`;
    dates.forEach(dateStr => {
      const checked = cardioMap[`${type}-${dateStr}`] || false;
      html += `<div style="text-align:center; padding:3px 0;">
        <input type="checkbox" data-cardio="${escapeHtml(type)}" data-date="${dateStr}" ${checked ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--blue);cursor:pointer;" />
      </div>`;
    });
  });
  html += `</div>`;
  return html;
}

function renderStrengthTable(strengthMap) {
  let rows = STRENGTH_LIFTS.map(lift => {
    const row = strengthMap[lift.name];
    const val = row ? `${row.value} ${lift.unit}` : '—';
    return `<div class="check-row">
      <span class="check-label" style="flex:1;">${lift.name}</span>
      <span style="font-size:13px;font-weight:500;color:var(--text);">${val}</span>
    </div>`;
  }).join('');
  rows += `
    <button class="btn-secondary" id="update-lift-btn" style="width:100%;margin-top:10px;">+ Update a lift</button>
    <div id="update-lift-form" style="display:none;margin-top:10px;">
      <select id="lift-select" style="width:100%;background:var(--bg3);border:0.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:12px;color:var(--text2);outline:none;margin-bottom:6px;font-family:var(--font);">
        ${STRENGTH_LIFTS.map(l => `<option value="${l.name}">${l.name} (${l.unit})</option>`).join('')}
      </select>
      <div style="display:flex;gap:6px;">
        <input type="number" id="lift-value" placeholder="Enter value" style="flex:1;" />
        <button class="btn-secondary" onclick="saveLiftUpdate()">Save</button>
      </div>
    </div>`;
  return rows;
}

function renderWeightSleepCard(currentWeight, sleepMap, dates) {
  const sleepDots = dates.map((dateStr, i) => {
    const slept = sleepMap[dateStr] || false;
    return `<div style="text-align:center;">
      <input type="checkbox" data-sleep-date="${dateStr}" ${slept ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--blue);cursor:pointer;display:block;margin:0 auto 3px;" />
      <div style="font-size:9px;color:var(--text4);">${DOW_LABELS[i][0]}</div>
    </div>`;
  }).join('');

  return `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">This week's weight</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" id="weight-input" placeholder="e.g. 194" value="${currentWeight != null ? currentWeight : ''}"
          style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:14px;font-weight:500;color:var(--text);outline:none;font-family:var(--font);" />
        <span style="font-size:12px;color:var(--text4);">lb</span>
      </div>
      <div style="font-size:10px;color:var(--text4);margin-top:4px;">Goal: ${WEIGHT_GOAL_LBS} lb</div>
    </div>
    <div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">7h+ sleep this week</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${sleepDots}</div>
    </div>`;
}

function renderPhotoSlot(type, photo) {
  const label = type === 'front' ? 'Front photo' : 'Back photo';
  if (photo?.url) {
    return `<div style="border:0.5px dashed var(--border);border-radius:8px;overflow:hidden;position:relative;">
      <img src="${escapeHtml(photo.url)}" style="width:100%;height:180px;object-fit:cover;display:block;" />
      <label style="position:absolute;bottom:8px;right:8px;background:var(--purple);color:#EEEDFE;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:500;cursor:pointer;">
        Replace<input type="file" accept="image/*" data-photo-type="${type}" style="display:none;" />
      </label>
    </div>`;
  }
  return `<label style="display:block;border:0.5px dashed var(--border);border-radius:8px;padding:36px 14px;text-align:center;cursor:pointer;background:var(--bg3);">
    <div style="font-size:26px;margin-bottom:6px;">📷</div>
    <div style="font-size:11px;color:var(--text4);">${label}</div>
    <input type="file" accept="image/*" data-photo-type="${type}" style="display:none;" />
  </label>`;
}

// ── Handlers ──

function attachMuscleGridHandlers(weekStart) {
  document.querySelectorAll('input[data-muscle]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const muscle = e.target.dataset.muscle;
      const day_date = e.target.dataset.date;
      const trained = e.target.checked;
      const { data: existing } = await sb.from('fitness_muscle_log').select('id')
        .eq('week_start', weekStart).eq('muscle_group', muscle).eq('day_date', day_date).maybeSingle();
      if (existing) {
        await sb.from('fitness_muscle_log').update({ trained }).eq('id', existing.id);
      } else {
        await sb.from('fitness_muscle_log').insert({ week_start: weekStart, muscle_group: muscle, day_date, trained, user_id: (await sb.auth.getUser()).data.user.id });
      }
    });
  });
}

function attachCardioGridHandlers(weekStart) {
  document.querySelectorAll('input[data-cardio]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const cardio_type = e.target.dataset.cardio;
      const day_date = e.target.dataset.date;
      const done = e.target.checked;
      const { data: existing } = await sb.from('fitness_cardio_log').select('id')
        .eq('week_start', weekStart).eq('cardio_type', cardio_type).eq('day_date', day_date).maybeSingle();
      if (existing) {
        await sb.from('fitness_cardio_log').update({ done }).eq('id', existing.id);
      } else {
        await sb.from('fitness_cardio_log').insert({ week_start: weekStart, cardio_type, day_date, done, user_id: (await sb.auth.getUser()).data.user?.id });
      }
    });
  });
}

function attachStrengthHandlers() {
  const btn = document.getElementById('update-lift-btn');
  const form = document.getElementById('update-lift-form');
  if (btn && form) {
    btn.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  }
}

async function saveLiftUpdate() {
  const liftName = document.getElementById('lift-select')?.value;
  const rawVal = document.getElementById('lift-value')?.value;
  const value = parseFloat(rawVal);
  if (!liftName || isNaN(value) || value <= 0) return;
  const lift = STRENGTH_LIFTS.find(l => l.name === liftName);
  await sb.from('fitness_strength').insert({ lift_name: liftName, value, unit: lift?.unit || '', logged_at: new Date().toISOString(), user_id: (await sb.auth.getUser()).data.user?.id });
  renderFitnessTab();
}

function attachWeightSleepHandlers(weekStart, dates) {
  const weightInput = document.getElementById('weight-input');
  if (weightInput) {
    let debounce;
    weightInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const weight_lbs = parseFloat(e.target.value);
        if (isNaN(weight_lbs) || weight_lbs <= 0) return;
        const { data: existing } = await sb.from('fitness_weight_log').select('id').eq('week_start', weekStart).maybeSingle();
        if (existing) {
          await sb.from('fitness_weight_log').update({ weight_lbs }).eq('id', existing.id);
        } else {
          await sb.from('fitness_weight_log').insert({ week_start: weekStart, weight_lbs, user_id: (await sb.auth.getUser()).data.user?.id });
        }
      }, 600);
    });
  }

  document.querySelectorAll('input[data-sleep-date]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const log_date = e.target.dataset.sleepDate;
      const slept_7plus = e.target.checked;
      const { data: existing } = await sb.from('fitness_sleep_log').select('id').eq('log_date', log_date).maybeSingle();
      if (existing) {
        await sb.from('fitness_sleep_log').update({ slept_7plus }).eq('id', existing.id);
      } else {
        await sb.from('fitness_sleep_log').insert({ log_date, slept_7plus, user_id: (await sb.auth.getUser()).data.user?.id });
      }
    });
  });
}

function attachPhotoHandlers(weekStart) {
  document.querySelectorAll('input[data-photo-type]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      const photo_type = e.target.dataset.photoType;
      if (!file) return;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${weekStart}/${photo_type}.${ext}`;
      const { error } = await sb.storage.from('fitness-photos').upload(path, file, { upsert: true });
      if (error) { console.error('Photo upload error:', error.message); return; }
      const { data: urlData } = sb.storage.from('fitness-photos').getPublicUrl(path);
      const { data: existing } = await sb.from('fitness_photos').select('id')
        .eq('week_start', weekStart).eq('photo_type', photo_type).maybeSingle();
      if (existing) {
        await sb.from('fitness_photos').update({ url: urlData.publicUrl, path }).eq('id', existing.id);
      } else {
        await sb.from('fitness_photos').insert({ week_start: weekStart, photo_type, url: urlData.publicUrl, path, user_id: (await sb.auth.getUser()).data.user?.id });
      }
      renderFitnessTab();
    });
  });
}

// ── Weekly snapshot — runs on Sunday, locks the week permanently ──
// Called automatically when the Fitness tab loads on a Sunday.
// Saves a permanent summary of the closing week so it's preserved
// even after next Monday's fresh week starts.

async function maybeLockWeekSnapshot() {
  const today = new Date();
  if (today.getDay() !== 0) return; // Only runs on Sunday

  const thisWeek = fitnessWeekStart(0);
  const thisWeekDates = getWeekDates(thisWeek);

  // Check if already snapshotted this week
  const { data: existing } = await sb.from('fitness_weekly_snapshot').select('id').eq('week_start', thisWeek).maybeSingle().catch(() => ({ data: null }));
  if (existing) return;

  // Gather final state
  const [muscleRows, cardioRows, sleepRows, weightRow] = await Promise.all([
    safeQuery(sb.from('fitness_muscle_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_cardio_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_sleep_log').select('*').gte('log_date', thisWeek).lte('log_date', thisWeekDates[6])),
    safeQuery(sb.from('fitness_weight_log').select('*').eq('week_start', thisWeek).limit(1))
  ]);

  const trainingDays = new Set(muscleRows.filter(r => r.trained).map(r => r.day_date)).size;
  const cardioDays   = new Set(cardioRows.filter(r => r.done).map(r => r.day_date)).size;
  const sleep7Days   = sleepRows.filter(r => r.slept_7plus).length;
  const weight       = weightRow[0]?.weight_lbs ?? null;

  const { data: { user } } = await sb.auth.getUser();
  await sb.from('fitness_weekly_snapshot').insert({
    week_start: thisWeek,
    training_days: trainingDays,
    cardio_days: cardioDays,
    sleep_7plus_days: sleep7Days,
    weight_lbs: weight,
    user_id: user?.id,
    locked_at: new Date().toISOString()
  }).catch(() => {}); // Silent — table may not exist yet, doesn't break anything
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
