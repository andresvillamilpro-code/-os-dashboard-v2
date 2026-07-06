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
  // Fires automatically when someone opens a Supabase password-reset email
  // link (the access token in the URL is auto-detected on load) — shows a
  // dedicated "set new password" screen instead of the normal login/app.
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') showSetNewPasswordScreen();
  });
} catch (err) {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app').innerHTML = `<div class="card" style="margin:20px;"><p class="card-title" style="color:var(--red)">Could not load Supabase library</p><p class="empty-state">${escapeHtmlSafe(err.message)}</p></div>`;
  });
}

const GOOGLE_CLIENT_ID = '915567420685-hdr89piauoouang6lp1vlaiu33p6n4jb.apps.googleusercontent.com';
// Widened from calendar.readonly — the Calendar tab needs to create/edit/delete
// events, not just list them. This scope covers full event CRUD without
// granting broader calendar management (renaming calendars, sharing, etc).
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const MISSION_STATEMENT = '"No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." — Hebrews 12:11';

const MORNING_ROUTINE_ITEMS = [
  'Wake before 6am',
  'Stretch 5 min',
  'Walk 10 min',
  'Pray and bible study',
  'Journal morning',
  '1 glass of water'
];

// Consistency items are now dynamic — stored in the `consistency_items` table
// (item_name, is_system, active, sort_order) instead of hardcoded here.
// The 9 original items were seeded as is_system = true (protected, can't be
// deleted). Anything added later is is_system = false and deletable.
// consistencyItemsCache holds the last-loaded rows: [{ item_name, is_system }]
let consistencyItemsCache = null;

async function loadConsistencyItems() {
  const { data } = await sb.from('consistency_items')
    .select('item_name, is_system')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  consistencyItemsCache = data && data.length ? data : [];
  return consistencyItemsCache;
}

async function loadActiveConsistencyItemNames() {
  const rows = consistencyItemsCache || await loadConsistencyItems();
  return rows.map(r => r.item_name);
}

async function addConsistencyItem(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter a habit name' };
  const existing = consistencyItemsCache || await loadConsistencyItems();
  if (existing.some(r => r.item_name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'That habit already exists' };
  }
  const user = (await sb.auth.getUser()).data.user;
  const { error } = await sb.from('consistency_items').insert({
    item_name: trimmed,
    is_system: false,
    active: true,
    sort_order: existing.length,
    user_id: user?.id
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function deleteConsistencyItem(itemName) {
  const { error } = await sb.from('consistency_items')
    .update({ active: false })
    .eq('item_name', itemName)
    .eq('active', true)
    .eq('is_system', false); // belt-and-suspenders — system items never deletable client-side either
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// AUTH HELPERS
// ============================================

// Single-user app — email is fixed internally so the login screen only
// asks for the password. Replace this before deploying.
const LOGIN_EMAIL = 'REPLACE_WITH_YOUR_EMAIL@example.com';

async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function signIn(password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: LOGIN_EMAIL, password });
  if (error) throw error;
  return data.user;
}

async function signOut() {
  await sb.auth.signOut();
  showLoginScreen();
}

function confirmLogout() {
  if (confirm('Log out of OS?')) signOut();
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    showLoginScreen();
    return null;
  }
  return user;
}

function startMatrixRain(canvas) {
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const fontSize = 15;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = new Array(columns).fill(1);
  window.addEventListener('resize', () => {
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(1);
  });
  return setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < drops.length; i++) {
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 45);
}

function showSetNewPasswordScreen() {
  document.getElementById('app').innerHTML = `
    <div class="matrix-login-wrap">
      <canvas id="matrix-rain-canvas"></canvas>
      <div class="matrix-login-box">
        <div class="matrix-login-title">OS // Andres Villamil</div>
        <div class="matrix-login-sub">Set new access code</div>
        <form class="matrix-login-form" id="new-password-form">
          <div class="matrix-input-wrap">
            <span>&gt;</span>
            <input type="password" id="new-password" placeholder="New password" required autofocus minlength="6" />
          </div>
          <div class="matrix-input-wrap">
            <span>&gt;</span>
            <input type="password" id="new-password-confirm" placeholder="Confirm new password" required minlength="6" />
          </div>
          <button type="submit" class="matrix-login-btn">Set password</button>
        </form>
        <div class="matrix-login-error" id="new-password-error"></div>
      </div>
    </div>
  `;
  startMatrixRain(document.getElementById('matrix-rain-canvas'));

  const form = document.getElementById('new-password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('new-password-error');
    const pw = document.getElementById('new-password').value;
    const pwConfirm = document.getElementById('new-password-confirm').value;
    if (pw !== pwConfirm) {
      errorEl.textContent = 'PASSWORDS DO NOT MATCH.';
      return;
    }
    try {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      // Clear the recovery token out of the URL, then go straight into the app
      history.replaceState(null, '', window.location.pathname);
      location.reload();
    } catch (err) {
      errorEl.textContent = 'COULD NOT SET PASSWORD — ' + (err.message || 'try again.').toUpperCase();
    }
  });
}

function showLoginScreen() {
  document.getElementById('app').innerHTML = `
    <div class="matrix-login-wrap">
      <canvas id="matrix-rain-canvas"></canvas>
      <div class="matrix-login-box">
        <div class="matrix-login-title">OS // Andres Villamil</div>
        <div class="matrix-login-sub">Enter access code</div>
        <form class="matrix-login-form" id="login-form">
          <div class="matrix-input-wrap">
            <span>&gt;</span>
            <input type="password" id="login-password" placeholder="••••••••" required autofocus />
          </div>
          <button type="submit" class="matrix-login-btn">Access system</button>
        </form>
        <div class="matrix-login-error" id="login-error"></div>
      </div>
    </div>
  `;
  startMatrixRain(document.getElementById('matrix-rain-canvas'));

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    try {
      await signIn(password);
      location.reload();
    } catch (err) {
      errorEl.textContent = 'ACCESS DENIED — incorrect password.';
    }
  });
}

// ============================================
// DATE HELPERS — week boundary is always Monday
// ============================================

function todayISO() {
  return isoDate(new Date());
}

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local calendar date (YYYY-MM-DD) — deliberately NOT toISOString().split('T')[0].
// toISOString() converts to UTC first, which shifts the date whenever local
// time is near the UTC day boundary — for Eastern time that's ~8pm, meaning
// anything logged in the evening would silently save under tomorrow's date.
// This uses the Date object's own local year/month/day instead, so "today"
// always matches the calendar day on the clock in front of you.
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  goals: renderGoalsTab,
  calendar: renderCalendarTab
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

  const consistencyItems = await loadConsistencyItems();
  const consistencyItemNames = consistencyItems.map(r => r.item_name);

  const [snapshot, routine, consistency, goals, tasks] = await Promise.all([
    loadTradingSnapshot(),
    loadChecklist('morning_routine_log', MORNING_ROUTINE_ITEMS, today),
    loadChecklist('consistency_log', consistencyItemNames, today),
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
    ${renderEditableChecklistCard('Consistency check', 'consistency', consistency, consistencyItems)}
    ${renderTradingSnapshotBox(snapshot)}
  `;

  attachChecklistHandlers('morning_routine_log', 'morning-routine', MORNING_ROUTINE_ITEMS);
  attachChecklistHandlers('consistency_log', 'consistency', consistencyItemNames);
  attachConsistencyEditHandlers();
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

function attachChecklistHandlers(table, idPrefix, items) {
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

// ---------- Consistency check (editable — add/delete custom habits) ----------

function renderEditableChecklistCard(title, idPrefix, rows, itemMeta) {
  const isSystemByName = {};
  (itemMeta || []).forEach(m => { isSystemByName[m.item_name] = m.is_system; });
  return `
    <div class="card">
      <p class="card-title">${title}</p>
      <div id="${idPrefix}-list">
        ${rows.map((r, i) => `
          <div class="check-row" data-item-name="${escapeHtml(r.item_name)}">
            <input type="checkbox" data-idx="${i}" ${r.completed ? 'checked' : ''} />
            <label class="check-label" style="flex:1;">${escapeHtml(r.item_name)}</label>
            ${isSystemByName[r.item_name] ? '' : `<span class="consistency-delete-btn" data-item-name="${escapeHtml(r.item_name)}" style="cursor:pointer;color:var(--text4);font-size:14px;padding:2px 6px;" title="Remove habit">×</span>`}
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border2);">
        <input type="text" id="${idPrefix}-new-habit-input" placeholder="Add a habit..." style="flex:1;" />
        <button type="button" id="${idPrefix}-add-habit-btn" class="btn-secondary">+ Add</button>
      </div>
      <div id="${idPrefix}-add-habit-error" style="font-size:11px;color:var(--red);margin-top:6px;"></div>
    </div>
  `;
}

function attachConsistencyEditHandlers() {
  const addBtn = document.getElementById('consistency-add-habit-btn');
  const input = document.getElementById('consistency-new-habit-input');
  const errorEl = document.getElementById('consistency-add-habit-error');

  if (addBtn && input) {
    const submit = async () => {
      if (errorEl) errorEl.textContent = '';
      const result = await addConsistencyItem(input.value);
      if (!result.ok) {
        if (errorEl) errorEl.textContent = result.error;
        return;
      }
      renderDailyTab();
    };
    addBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  document.querySelectorAll('.consistency-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemName = e.target.dataset.itemName;
      if (!confirm(`Remove "${itemName}" from your consistency list? Past logged history stays intact.`)) return;
      const result = await deleteConsistencyItem(itemName);
      if (!result.ok) { alert(result.error); return; }
      renderDailyTab();
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
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="cal-status" class="card-meta"></span>
          <a href="https://calendar.google.com" target="_blank" rel="noopener"
            style="font-size:11px;color:var(--purple-light);font-weight:500;text-decoration:none;padding:3px 9px;border:0.5px solid var(--purple-border);border-radius:6px;white-space:nowrap;">
            Open Google Calendar ↗
          </a>
        </div>
      </div>
      <div id="calendar-events">
        <div class="empty-state">
          <button class="btn-secondary" id="connect-calendar-btn">Connect Google Calendar</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// GOOGLE CALENDAR AUTH — persistent silent refresh
// Token + expiry live in localStorage (survives closing the tab, unlike the
// old sessionStorage approach). When expired, we first try a silent refresh
// (no popup) via Google Identity Services — this works as long as you're
// still signed into your Google account in this browser. Only falls back to
// the "Connect" button if that silent attempt truly fails (e.g. you signed
// out of Google entirely, or revoked access).
// ============================================

function saveGoogleToken(response) {
  const expiresAt = Date.now() + (Number(response.expires_in || 3600) * 1000);
  localStorage.setItem('gcal_token', response.access_token);
  localStorage.setItem('gcal_token_expiry', String(expiresAt));
}

function getStoredGoogleToken() {
  const token = localStorage.getItem('gcal_token');
  const expiry = Number(localStorage.getItem('gcal_token_expiry') || 0);
  // Treat as expired 2 minutes early so we refresh before a request fails mid-flight
  if (!token || Date.now() > expiry - 120000) return null;
  return token;
}

function clearGoogleToken() {
  localStorage.removeItem('gcal_token');
  localStorage.removeItem('gcal_token_expiry');
}

function getGoogleTokenClient(callback) {
  if (!window.google?.accounts?.oauth2) return null;
  return window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback
  });
}

// Tries to get a fresh token with no popup. Succeeds silently if you're
// still signed into Google in this browser and already granted access before.
function silentlyRefreshGoogleToken(onSuccess, onFail) {
  const client = getGoogleTokenClient((response) => {
    if (response?.access_token) {
      saveGoogleToken(response);
      onSuccess(response.access_token);
    } else {
      onFail && onFail();
    }
  });
  if (!client) { onFail && onFail(); return; }
  try {
    client.requestAccessToken({ prompt: '' });
  } catch {
    onFail && onFail();
  }
}

// Main entry point: get a usable token, refreshing silently if needed,
// falling back to onNeedsConnect (show the Connect button) only if that fails.
function ensureGoogleToken(onReady, onNeedsConnect) {
  const token = getStoredGoogleToken();
  if (token) { onReady(token); return; }
  silentlyRefreshGoogleToken(onReady, onNeedsConnect);
}

// Explicit, user-clicked first-time connection (shows Google's consent screen).
function startGoogleAuth(onSuccess) {
  if (!window.google?.accounts?.oauth2) {
    alert('Google sign-in is still loading, try again in a moment.');
    return;
  }
  const tokenClient = getGoogleTokenClient((response) => {
    if (response.access_token) {
      saveGoogleToken(response);
      onSuccess(response.access_token);
    }
  });
  tokenClient.requestAccessToken();
}

// Wraps a Google Calendar API call — if it 401s (expired/revoked token),
// tries one silent refresh + retry before giving up.
async function googleCalendarFetch(url, options = {}) {
  const token = getStoredGoogleToken() || localStorage.getItem('gcal_token');
  const doFetch = (t) => fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${t}` } });

  let res = await doFetch(token);
  if (res.status === 401) {
    const refreshed = await new Promise((resolve) => {
      silentlyRefreshGoogleToken((newToken) => resolve(newToken), () => resolve(null));
    });
    if (refreshed) {
      res = await doFetch(refreshed);
    } else {
      clearGoogleToken();
    }
  }
  return res;
}

function initGoogleCalendar() {
  ensureGoogleToken(
    (token) => fetchTodayEvents(token),
    () => {
      const btn = document.getElementById('connect-calendar-btn');
      if (btn) btn.addEventListener('click', () => startGoogleAuth((token) => fetchTodayEvents(token)));
    }
  );
}

async function fetchTodayEvents() {
  const eventsEl = document.getElementById('calendar-events');
  const statusEl = document.getElementById('cal-status');
  if (!eventsEl) return;
  eventsEl.innerHTML = '<p class="loading-text">Loading events...</p>';

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`;
    const res = await googleCalendarFetch(url);
    if (res.status === 401) {
      eventsEl.innerHTML = `<div class="empty-state"><button class="btn-secondary" id="connect-calendar-btn">Connect Google Calendar</button></div>`;
      document.getElementById('connect-calendar-btn')?.addEventListener('click', () => startGoogleAuth((token) => fetchTodayEvents(token)));
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
// CALENDAR TAB — week grid, full CRUD, backed live by Google Calendar
// ============================================

let calendarWeekStart = getMondayOfWeek(); // Date object, local midnight Monday — persists across tab switches
let calendarEventsCache = [];
let calendarEditingEventId = null;
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function renderCalendarTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading calendar...</p>`;
  const user = await requireAuth();
  if (!user) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Calendar</p>
        <button class="btn-secondary" id="cal-new-event-btn">+ New event</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;">
        <button class="week-nav-btn" id="cal-prev-week">← Prev</button>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="cal-week-label" style="font-size:13px;font-weight:500;color:var(--text2);"></span>
          <button class="week-nav-btn" id="cal-today-btn">Today</button>
        </div>
        <button class="week-nav-btn" id="cal-next-week">Next →</button>
      </div>
      <div id="cal-event-form-wrap"></div>
      <div id="cal-connect-wrap"></div>
      <div id="cal-week-grid"></div>
    </div>
  `;

  document.getElementById('cal-prev-week').addEventListener('click', () => shiftCalendarWeek(-7));
  document.getElementById('cal-next-week').addEventListener('click', () => shiftCalendarWeek(7));
  document.getElementById('cal-today-btn').addEventListener('click', () => {
    calendarWeekStart = getMondayOfWeek();
    loadAndRenderWeek();
  });
  document.getElementById('cal-new-event-btn').addEventListener('click', () => openEventForm(null));

  ensureGoogleToken(
    () => loadAndRenderWeek(),
    () => showCalendarConnectPrompt()
  );
}

function shiftCalendarWeek(deltaDays) {
  calendarWeekStart = new Date(calendarWeekStart);
  calendarWeekStart.setDate(calendarWeekStart.getDate() + deltaDays);
  loadAndRenderWeek();
}

function showCalendarConnectPrompt() {
  const gridEl = document.getElementById('cal-week-grid');
  const connectWrap = document.getElementById('cal-connect-wrap');
  if (gridEl) gridEl.innerHTML = '';
  if (connectWrap) {
    connectWrap.innerHTML = `<div class="empty-state"><button class="btn-secondary" id="cal-connect-btn">Connect Google Calendar</button></div>`;
    document.getElementById('cal-connect-btn')?.addEventListener('click', () => startGoogleAuth(() => loadAndRenderWeek()));
  }
}

async function loadAndRenderWeek() {
  const gridEl = document.getElementById('cal-week-grid');
  const labelEl = document.getElementById('cal-week-label');
  const connectWrap = document.getElementById('cal-connect-wrap');
  if (!gridEl) return;

  const weekEnd = new Date(calendarWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (labelEl) {
    const opts = { month: 'short', day: 'numeric' };
    const lastDay = new Date(weekEnd.getTime() - 86400000);
    labelEl.textContent = `${calendarWeekStart.toLocaleDateString(undefined, opts)} – ${lastDay.toLocaleDateString(undefined, opts)}`;
  }

  gridEl.innerHTML = '<p class="loading-text">Loading events...</p>';
  if (connectWrap) connectWrap.innerHTML = '';

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${calendarWeekStart.toISOString()}&timeMax=${weekEnd.toISOString()}&singleEvents=true&orderBy=startTime`;
    const res = await googleCalendarFetch(url);
    if (res.status === 401) {
      showCalendarConnectPrompt();
      return;
    }
    const data = await res.json();
    calendarEventsCache = data.items || [];
    renderWeekGrid();
  } catch (err) {
    gridEl.innerHTML = '<p class="empty-state">Could not load calendar events.</p>';
  }
}

const HOUR_HEIGHT = 48; // px per hour in the time grid

// Google Calendar's standard event color palette (colorId 1-11), used when
// an event has one set. Falls back to a deterministic hash-of-title color
// so recurring event names (Gym, Backtest, etc.) still get a consistent,
// distinct color even without ever setting colorId manually.
const GOOGLE_EVENT_COLORS = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73', '5': '#F6BF26',
  '6': '#F4511E', '7': '#039BE5', '8': '#616161', '9': '#3F51B5', '10': '#0B8043', '11': '#D50000'
};
const FALLBACK_EVENT_PALETTE = ['#7986CB', '#33B679', '#8E24AA', '#E67C73', '#F6BF26', '#F4511E', '#039BE5', '#0B8043', '#3F51B5'];

function colorForEvent(ev) {
  if (ev.colorId && GOOGLE_EVENT_COLORS[ev.colorId]) return GOOGLE_EVENT_COLORS[ev.colorId];
  const str = ev.summary || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return FALLBACK_EVENT_PALETTE[hash % FALLBACK_EVENT_PALETTE.length];
}

function formatHourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function renderWeekGrid() {
  const gridEl = document.getElementById('cal-week-grid');
  if (!gridEl) return;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(calendarWeekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = todayISO();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let todayInWeek = false;

  const dayData = days.map((d, i) => {
    const dStr = isoDate(d);
    if (dStr === todayStr) todayInWeek = true;
    const dayEvents = calendarEventsCache.filter(ev =>
      (ev.start?.dateTime ? isoDate(new Date(ev.start.dateTime)) : ev.start?.date) === dStr
    );
    return {
      date: d, dStr, isToday: dStr === todayStr,
      allDay: dayEvents.filter(ev => !ev.start?.dateTime),
      timed: dayEvents.filter(ev => ev.start?.dateTime)
    };
  });

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const gridHeight = 24 * HOUR_HEIGHT;

  gridEl.innerHTML = `
    <div class="cal-grid-wrap">
      <div class="cal-grid-header">
        <div class="cal-grid-gutter"></div>
        ${dayData.map((d, i) => `
          <div class="cal-grid-daycol-header ${d.isToday ? 'is-today' : ''}">
            <span class="week-day-name">${dayNames[i]}</span>
            <span class="week-day-num">${d.date.getDate()}</span>
          </div>
        `).join('')}
      </div>
      <div class="cal-allday-row">
        <div class="cal-grid-gutter"></div>
        ${dayData.map(d => `
          <div class="cal-allday-cell" data-day="${d.dStr}">
            ${d.allDay.map(ev => `
              <div class="cal-allday-chip" draggable="true" style="background:${colorForEvent(ev)};" data-event-id="${ev.id}">${escapeHtml(ev.summary || '(No title)')}</div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div class="cal-grid-scroll" id="cal-grid-scroll">
        <div class="cal-grid-gutter cal-grid-hours" style="height:${gridHeight}px;">
          ${hours.map(h => `<span class="cal-hour-label" style="top:${h * HOUR_HEIGHT - 7}px;">${formatHourLabel(h)}</span>`).join('')}
        </div>
        <div class="cal-grid-days" style="height:${gridHeight}px;">
          ${dayData.map(d => `
            <div class="cal-day-col" data-day="${d.dStr}" style="height:${gridHeight}px;">
              ${d.timed.map(ev => {
                const start = new Date(ev.start.dateTime);
                const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : new Date(start.getTime() + 30 * 60000);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const endMin = Math.max(startMin + 15, end.getHours() * 60 + end.getMinutes());
                const top = (startMin / 60) * HOUR_HEIGHT;
                const height = Math.max(18, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                const timeLabel = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                return `
                  <div class="cal-event-block" draggable="true" data-event-id="${ev.id}" style="top:${top}px;height:${height}px;background:${colorForEvent(ev)};">
                    <span class="evt-title">${escapeHtml(ev.summary || '(No title)')}</span>
                    <span class="evt-time">${timeLabel}</span>
                  </div>
                `;
              }).join('')}
              ${d.isToday ? `<div class="cal-now-line" style="top:${(nowMinutes / 60) * HOUR_HEIGHT}px;"><span class="cal-now-dot"></span></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Click an existing event (timed or all-day) → edit
  gridEl.querySelectorAll('.cal-event-block, .cal-allday-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = calendarEventsCache.find(ev => ev.id === chip.dataset.eventId);
      if (ev) openEventForm(ev);
    });
    // Drag to move to a different day — keeps the same time-of-day, just changes the date
    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', chip.dataset.eventId);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => chip.classList.add('dragging'), 0);
    });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
  });

  // Click empty grid space → create a new event pre-filled at that time
  gridEl.querySelectorAll('.cal-day-col').forEach(col => {
    col.addEventListener('click', (e) => {
      if (e.target.closest('.cal-event-block')) return;
      const rect = col.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const totalMinutes = Math.max(0, Math.min(23 * 60 + 45, (offsetY / HOUR_HEIGHT) * 60));
      const snapped = Math.round(totalMinutes / 30) * 30;
      const pad = (n) => String(n).padStart(2, '0');
      const startHH = Math.floor(snapped / 60), startMM = snapped % 60;
      const endTotal = Math.min(23 * 60 + 59, snapped + 60);
      const endHH = Math.floor(endTotal / 60), endMM = endTotal % 60;
      openEventForm(null, {
        date: col.dataset.day,
        startTime: `${pad(startHH)}:${pad(startMM)}`,
        endTime: `${pad(endHH)}:${pad(endMM)}`
      });
    });
  });

  gridEl.querySelectorAll('.cal-allday-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.cal-allday-chip')) return;
      openEventForm(null, { date: cell.dataset.day, allDay: true });
    });
  });

  // Drop target: any day column (timed) or all-day cell — moves the dragged event to that day
  gridEl.querySelectorAll('.cal-day-col, .cal-allday-cell').forEach(target => {
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', async (e) => {
      e.preventDefault();
      target.classList.remove('drag-over');
      const eventId = e.dataTransfer.getData('text/plain');
      const ev = calendarEventsCache.find(x => x.id === eventId);
      if (!ev) return;
      await moveEventToDate(ev, target.dataset.day);
    });
  });

  // Scroll to a sensible starting point — near "now" if today's in view, else mid-morning
  requestAnimationFrame(() => {
    const scrollEl = document.getElementById('cal-grid-scroll');
    if (!scrollEl) return;
    const scrollHour = todayInWeek ? Math.max(0, now.getHours() - 1) : 6;
    scrollEl.scrollTop = scrollHour * HOUR_HEIGHT;
  });
}

// Moves an event to a different day, keeping its original time-of-day and
// duration intact (drag-and-drop between day columns).
async function moveEventToDate(ev, newDateStr) {
  const pad = (n) => String(n).padStart(2, '0');
  let body;
  if (ev.start?.dateTime) {
    const oldStart = new Date(ev.start.dateTime);
    const oldEnd = new Date(ev.end.dateTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const startTimeStr = `${pad(oldStart.getHours())}:${pad(oldStart.getMinutes())}:00`;
    const newStart = new Date(`${newDateStr}T${startTimeStr}`);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const endDateStr = isoDate(newEnd);
    const endTimeStr = `${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}:00`;
    body = {
      start: { dateTime: `${newDateStr}T${startTimeStr}`, timeZone: LOCAL_TZ },
      end: { dateTime: `${endDateStr}T${endTimeStr}`, timeZone: LOCAL_TZ }
    };
  } else {
    const spanDays = Math.round((new Date(ev.end.date) - new Date(ev.start.date)) / 86400000) || 1;
    body = { start: { date: newDateStr }, end: { date: addDaysISO(newDateStr, spanDays) } };
  }
  try {
    await updateCalendarEvent(ev.id, body);
    loadAndRenderWeek();
  } catch {
    alert('Could not move event — try again.');
  }
}

function openEventForm(event, prefill) {
  calendarEditingEventId = event ? event.id : null;
  const wrap = document.getElementById('cal-event-form-wrap');
  if (!wrap) return;

  const isEdit = !!event;
  const startDT = event?.start?.dateTime ? new Date(event.start.dateTime) : null;
  const endDT = event?.end?.dateTime ? new Date(event.end.dateTime) : null;
  const isAllDay = event ? !event.start?.dateTime : !!prefill?.allDay;
  const dateVal = event ? (event.start?.date || (startDT ? isoDate(startDT) : '')) : (prefill?.date || todayISO());
  const pad = (n) => String(n).padStart(2, '0');
  const startTimeVal = startDT ? `${pad(startDT.getHours())}:${pad(startDT.getMinutes())}` : (prefill?.startTime || '09:00');
  const endTimeVal = endDT ? `${pad(endDT.getHours())}:${pad(endDT.getMinutes())}` : (prefill?.endTime || '10:00');

  wrap.innerHTML = `
    <div class="card" style="border:1px solid var(--purple-border);">
      <p class="card-title">${isEdit ? 'Edit event' : 'New event'}</p>
      <form id="cal-event-form" style="display:flex;flex-direction:column;gap:10px;">
        <input type="text" name="title" placeholder="Event title" value="${event ? escapeHtml(event.summary || '') : ''}" required />
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
          <input type="date" name="date" value="${dateVal}" required />
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text3);">
            <input type="checkbox" name="all_day" ${isAllDay ? 'checked' : ''} style="width:16px;height:16px;" /> All day
          </label>
        </div>
        <div class="settings-grid" id="cal-time-fields" style="${isAllDay ? 'display:none;' : ''}">
          <div class="settings-field"><label>Start time</label><input type="time" name="start_time" value="${startTimeVal}" /></div>
          <div class="settings-field"><label>End time</label><input type="time" name="end_time" value="${endTimeVal}" /></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
          ${isEdit ? '<button type="button" class="btn-secondary" id="cal-delete-btn" style="background:var(--red);">Delete</button>' : ''}
          <button type="button" class="btn-secondary" id="cal-cancel-btn" style="background:var(--bg3);color:var(--text2);">Cancel</button>
          <button type="submit" class="btn-secondary">${isEdit ? 'Save changes' : 'Add event'}</button>
        </div>
        <div id="cal-form-error" style="font-size:11px;color:var(--red);"></div>
      </form>
    </div>
  `;

  const form = document.getElementById('cal-event-form');
  const allDayCheckbox = form.querySelector('input[name="all_day"]');
  const timeFields = document.getElementById('cal-time-fields');
  allDayCheckbox.addEventListener('change', () => {
    timeFields.style.display = allDayCheckbox.checked ? 'none' : '';
  });

  document.getElementById('cal-cancel-btn').addEventListener('click', () => {
    wrap.innerHTML = '';
    calendarEditingEventId = null;
  });

  if (isEdit) {
    document.getElementById('cal-delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      try {
        await deleteCalendarEvent(event.id);
        wrap.innerHTML = '';
        calendarEditingEventId = null;
        loadAndRenderWeek();
      } catch {
        document.getElementById('cal-form-error').textContent = 'Could not delete — try again.';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('cal-form-error');
    errorEl.textContent = '';
    const fd = new FormData(form);
    const title = (fd.get('title') || '').trim();
    const date = fd.get('date');
    const isAllDayVal = fd.get('all_day') === 'on';
    if (!title || !date) { errorEl.textContent = 'Title and date are required.'; return; }

    let body;
    if (isAllDayVal) {
      body = { summary: title, start: { date }, end: { date: addDaysISO(date, 1) } };
    } else {
      const startTime = fd.get('start_time') || '09:00';
      const endTime = fd.get('end_time') || '10:00';
      body = {
        summary: title,
        start: { dateTime: `${date}T${startTime}:00`, timeZone: LOCAL_TZ },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: LOCAL_TZ }
      };
    }

    try {
      if (isEdit) {
        await updateCalendarEvent(event.id, body);
      } else {
        await createCalendarEvent(body);
      }
      wrap.innerHTML = '';
      calendarEditingEventId = null;
      loadAndRenderWeek();
    } catch (err) {
      errorEl.textContent = 'Could not save event — try again.';
    }
  });
}

async function createCalendarEvent(body) {
  const res = await googleCalendarFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Create failed');
  return res.json();
}

async function updateCalendarEvent(eventId, body) {
  const res = await googleCalendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

async function deleteCalendarEvent(eventId) {
  const res = await googleCalendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 410) throw new Error('Delete failed');
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

// ── serverDateKey: converts an MT5-stored trade timestamp to the FTMO server
// calendar day (Europe/Helsinki) — used for daily loss limit checking.
function serverDateKey(date) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const hh = date.getHours(), mm = date.getMinutes(), ss = date.getSeconds();
  const naiveUTC = Date.UTC(y, mo, d, hh, mm, ss);
  const serverFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const sp = Object.fromEntries(serverFmt.formatToParts(new Date(naiveUTC)).map(p => [p.type, p.value]));
  return `${sp.year}-${sp.month}-${sp.day}`;
}

// ── computeChallengeProgress: pure function, reused by Trading tab + Goals system (Goal #2).
// Combines profit target progress, max drawdown, and worst daily loss.
function computeChallengeProgress(trades, settings) {
  const accountSize = Number(settings.account_size) || 100000;
  const profitTargetPct = Number(settings.profit_target_pct) || 10;
  const maxDrawdownLimitPct = Number(settings.max_drawdown_pct) || 10;
  const dailyLossLimitPct = Number(settings.daily_loss_limit_pct) || 5;

  const totalPnl = trades.reduce((s, t) => s + netResult(t), 0);
  const currentBalance = accountSize + totalPnl;
  const targetBalance = accountSize * (1 + profitTargetPct / 100);
  const goalProgressPct = targetBalance > accountSize
    ? Math.max(0, Math.min(100, ((currentBalance - accountSize) / (targetBalance - accountSize)) * 100))
    : 0;
  const amountToGo = Math.max(0, targetBalance - currentBalance);

  const sorted = [...trades].sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
  let running = accountSize, peak = accountSize, maxDrawdownPct = 0;
  sorted.forEach(t => {
    running += netResult(t);
    if (running > peak) peak = running;
    const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
  });

  const byServerDay = {};
  sorted.forEach(t => {
    const key = serverDateKey(new Date(t.open_time));
    byServerDay[key] = (byServerDay[key] || 0) + netResult(t);
  });
  const dailyLossLimitUsd = accountSize * (dailyLossLimitPct / 100);
  let worstDailyLossPct = 0, breachDays = 0;
  Object.values(byServerDay).forEach(dayPnl => {
    if (dayPnl < 0) {
      const lossPct = (Math.abs(dayPnl) / accountSize) * 100;
      if (lossPct > worstDailyLossPct) worstDailyLossPct = lossPct;
      if (Math.abs(dayPnl) >= dailyLossLimitUsd) breachDays++;
    }
  });

  const drawdownBreached = maxDrawdownPct >= maxDrawdownLimitPct;
  const dailyBreached = breachDays > 0;
  const hasAnyData = trades.length > 0;
  const passed = hasAnyData && goalProgressPct >= 100 && !drawdownBreached && !dailyBreached;

  let status, statusColor, statusBg, statusLabel;
  if (!hasAnyData) {
    status = 'no_data'; statusColor = 'var(--text4)'; statusBg = 'var(--bg3)'; statusLabel = '— No trades yet';
  } else if (drawdownBreached || dailyBreached) {
    status = 'critical'; statusColor = 'var(--red)'; statusBg = 'var(--red-bg)'; statusLabel = '⛔ Challenge rules breached';
  } else if (passed) {
    status = 'on_track'; statusColor = 'var(--green)'; statusBg = 'var(--green-bg)'; statusLabel = '✅ Target reached';
  } else if (maxDrawdownPct >= maxDrawdownLimitPct * 0.7 || worstDailyLossPct >= dailyLossLimitPct * 0.7) {
    status = 'at_risk'; statusColor = 'var(--amber)'; statusBg = 'var(--amber-bg)'; statusLabel = '⚠️ Close to limits';
  } else {
    status = 'on_track'; statusColor = 'var(--blue)'; statusBg = 'var(--blue-bg)'; statusLabel = '📈 On track';
  }

  return {
    hasAnyData, currentBalance, targetBalance, goalProgressPct, amountToGo,
    maxDrawdownPct, maxDrawdownLimitPct, worstDailyLossPct, dailyLossLimitPct,
    breachDays, drawdownBreached, dailyBreached, passed,
    status, statusColor, statusBg, statusLabel,
  };
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
    await sb.from('trading_settings').insert({ ...fields, user_id: (await sb.auth.getUser()).data.user?.id });
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
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Balance over time</p>
        <span class="settings-gear-btn" id="trading-settings-toggle" title="Account settings">⚙️</span>
      </div>
      <div class="chart-wrap"><canvas id="balance-chart"></canvas></div>
      <div id="trading-settings-panel" class="settings-panel" style="display:none;">
        <p class="card-title" style="margin-top:2px;">Account settings</p>
        <form id="trading-settings-form" class="settings-grid">
          <div class="settings-field"><label>Account size ($)</label><input type="text" name="account_size" value="${accountSize}" /></div>
          <div class="settings-field"><label>Profit target (%)</label><input type="text" name="profit_target_pct" value="${settings.profit_target_pct}" /></div>
          <div class="settings-field"><label>Max trades / week</label><input type="text" name="max_trades_per_week" value="${settings.max_trades_per_week}" /></div>
          <div class="settings-field"><label>Max losses / week</label><input type="text" name="max_losses_per_week" value="${settings.max_losses_per_week}" /></div>
        </form>
      </div>
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

    <div id="discipline-section"><p class="loading-text">Loading discipline stats...</p></div>
  `;

  attachTradingSettingsHandler();
  attachTradingSettingsToggle();
  attachCsvUploadHandler();
  drawTradingCharts({ balancePoints, byInstrument, byDow, dowNames, byHour });

  // Load discipline section async (doesn't block the main render)
  loadAndRenderDisciplineSection();
}

function attachTradingSettingsToggle() {
  const btn = document.getElementById('trading-settings-toggle');
  const panel = document.getElementById('trading-settings-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
  });
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
// TRADING DISCIPLINE & PERFORMANCE
// ============================================

// Weighted scoring — matches the spec exactly
const DISCIPLINE_WEIGHTS = {
  // Preparation 20%
  pre_market_done:   5,
  htf_bias_done:    10,
  rules_reviewed:    5,
  // Execution 40%
  aplus_setup:      10,
  full_confirmation:10,
  entry_model:      10,
  risk_respected:   10,
  // Psychology 25%
  no_fomo:           8,
  no_revenge:        8,
  stayed_patient:    5,
  accepted_outcome:  4,
  // Review 15%
  journal_done:      5,
  screenshots_saved: 5,
  trade_reviewed:    5,
};

const DISCIPLINE_SECTIONS = [
  {
    key: 'prep', label: 'Preparation', weight: 20,
    fields: [
      { key: 'pre_market_done',   label: 'Completed pre-market routine',    weight: 5  },
      { key: 'htf_bias_done',     label: 'Identified HTF bias before trading', weight: 10 },
      { key: 'rules_reviewed',    label: 'Reviewed trading rules',          weight: 5  },
    ]
  },
  {
    key: 'exec', label: 'Execution', weight: 40,
    fields: [
      { key: 'aplus_setup',       label: 'Only traded A+ setups',          weight: 10 },
      { key: 'full_confirmation', label: 'Waited for full confirmation',    weight: 10 },
      { key: 'entry_model',       label: 'Followed entry model exactly',    weight: 10 },
      { key: 'risk_respected',    label: 'Respected risk management',       weight: 10 },
    ]
  },
  {
    key: 'psych', label: 'Psychology', weight: 25,
    fields: [
      { key: 'no_fomo',           label: 'No FOMO',                        weight: 8  },
      { key: 'no_revenge',        label: 'No revenge trading',              weight: 8  },
      { key: 'stayed_patient',    label: 'Stayed patient',                  weight: 5  },
      { key: 'accepted_outcome',  label: 'Accepted the outcome',            weight: 4  },
    ]
  },
  {
    key: 'review', label: 'Review', weight: 15,
    fields: [
      { key: 'journal_done',      label: 'Journal completed',               weight: 5  },
      { key: 'screenshots_saved', label: 'Charts / screenshots saved',      weight: 5  },
      { key: 'trade_reviewed',    label: 'Trade reviewed before closing',    weight: 5  },
    ]
  },
];

function calcDisciplineScore(session) {
  let score = 0;
  for (const [key, weight] of Object.entries(DISCIPLINE_WEIGHTS)) {
    if (session[key]) score += weight;
  }
  return score;
}

function sectionCompliance(sessions, sectionKey) {
  const sec = DISCIPLINE_SECTIONS.find(s => s.key === sectionKey);
  if (!sec || !sessions.length) return 0;
  const totalPossible = sessions.length * sec.weight;
  const earned = sessions.reduce((sum, session) => {
    return sum + sec.fields.reduce((s, f) => s + (session[f.key] ? f.weight : 0), 0);
  }, 0);
  return totalPossible ? Math.round((earned / totalPossible) * 100) : 0;
}

async function loadAndRenderDisciplineSection() {
  const el = document.getElementById('discipline-section');
  if (!el) return;

  const { data: sessions } = await sb
    .from('trading_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(200);

  const all = sessions || [];
  const today = todayISO();
  const todaySession = all.find(s => s.session_date === today) || null;

  // Identity score: % of sessions in last 30 days with discipline_score >= 95
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30 = all.filter(s => new Date(s.session_date) >= thirtyDaysAgo);
  const eliteSessions = last30.filter(s => (s.discipline_score || 0) >= 95).length;
  const identityScore = last30.length ? Math.round((eliteSessions / last30.length) * 100) : 0;

  // Lifetime avg discipline score
  const avgScore = all.length
    ? Math.round(all.reduce((s, r) => s + (r.discipline_score || 0), 0) / all.length)
    : 0;

  // Category compliance (all time)
  const prepPct  = sectionCompliance(all, 'prep');
  const execPct  = sectionCompliance(all, 'exec');
  const psychPct = sectionCompliance(all, 'psych');
  const revPct   = sectionCompliance(all, 'review');

  // Average ratings
  const avgFocus = all.length ? (all.reduce((s, r) => s + (r.focus_rating || 0), 0) / all.filter(r => r.focus_rating).length || 0).toFixed(1) : '—';
  const avgPatience = all.length ? (all.reduce((s, r) => s + (r.patience_rating || 0), 0) / all.filter(r => r.patience_rating).length || 0).toFixed(1) : '—';
  const avgEmotional = all.length ? (all.reduce((s, r) => s + (r.emotional_rating || 0), 0) / all.filter(r => r.emotional_rating).length || 0).toFixed(1) : '—';

  const scoreColor = (s) => s >= 95 ? 'var(--green)' : s >= 80 ? 'var(--amber)' : s > 0 ? 'var(--red)' : 'var(--text4)';

  el.innerHTML = `
    <!-- Section divider -->
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0 10px;">
      <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:var(--text4);">Trading discipline &amp; performance</div>
      <div style="flex:1;height:0.5px;background:var(--border2);"></div>
    </div>

    <!-- Motivation verse -->
    <div style="border-left:2px solid var(--purple);padding:10px 14px;background:var(--purple-bg);border-radius:0 8px 8px 0;margin-bottom:10px;font-size:12px;color:var(--purple-light);line-height:1.7;font-style:italic;font-weight:500;">
      "Whatever you do, work heartily, as for the Lord and not for men." — Colossians 3:23
    </div>

    <!-- 3 KPI cards -->
    <div class="stat-grid-3" style="margin-bottom:10px;">
      <div class="card stat-box">
        <div class="stat-box-value" style="color:${scoreColor(avgScore)};">${all.length ? avgScore + '%' : '—'}</div>
        <div class="stat-box-label">Discipline score</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">lifetime avg</div>
      </div>
      <div class="card stat-box">
        <div class="stat-box-value" style="color:${scoreColor(identityScore)};">${last30.length ? identityScore + '%' : '—'}</div>
        <div class="stat-box-label">Identity score</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">sessions ≥ 95 · last 30d</div>
      </div>
      <div class="card stat-box">
        <div class="stat-box-value">${all.length}</div>
        <div class="stat-box-label">Sessions logged</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">all time</div>
      </div>
    </div>

    <!-- Category compliance (all time) -->
    ${all.length ? `
    <div class="card" style="margin-bottom:10px;">
      <p class="card-title">Category compliance — all time</p>
      ${[
        { label: 'Preparation', pct: prepPct, weight: 20 },
        { label: 'Execution',   pct: execPct,  weight: 40 },
        { label: 'Psychology',  pct: psychPct, weight: 25 },
        { label: 'Review',      pct: revPct,   weight: 15 },
      ].map(c => `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--text2);font-weight:500;">${c.label}</span>
            <span style="color:var(--text4);">${c.weight}% weight &nbsp;·&nbsp; <span style="color:${scoreColor(c.pct)};font-weight:500;">${c.pct}%</span></span>
          </div>
          <div class="progress-track" style="height:5px;">
            <div class="progress-fill" style="width:${c.pct}%;background:${scoreColor(c.pct)};"></div>
          </div>
        </div>`).join('')}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;padding-top:10px;border-top:0.5px solid var(--border2);">
        <div style="text-align:center;"><div style="font-size:16px;font-weight:500;color:var(--text);">${avgFocus}</div><div style="font-size:10px;color:var(--text4);">avg focus</div></div>
        <div style="text-align:center;"><div style="font-size:16px;font-weight:500;color:var(--text);">${avgPatience}</div><div style="font-size:10px;color:var(--text4);">avg patience</div></div>
        <div style="text-align:center;"><div style="font-size:16px;font-weight:500;color:var(--text);">${avgEmotional}</div><div style="font-size:10px;color:var(--text4);">avg emotional ctrl</div></div>
      </div>
    </div>` : ''}

    <!-- Today's session log -->
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Log today's session</p>
        ${todaySession ? `<span style="font-size:11px;font-weight:500;color:var(--green);">✅ Logged — score: ${todaySession.discipline_score}%</span>` : '<span class="card-meta">Not logged yet</span>'}
      </div>
      <form id="session-form">
        ${DISCIPLINE_SECTIONS.map(sec => `
          <div style="margin-bottom:12px;">
            <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--text4);margin-bottom:6px;">${sec.label} — ${sec.weight}%</div>
            ${sec.fields.map(f => `
              <div class="check-row">
                <input type="checkbox" name="${f.key}" ${todaySession?.[f.key] ? 'checked' : ''} />
                <label class="check-label" style="flex:1;">${f.label}</label>
                <span style="font-size:10px;color:var(--text4);">${f.weight}%</span>
              </div>`).join('')}
          </div>`).join('')}

        <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-top:4px;">
          <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--text4);margin-bottom:10px;">Quick ratings</div>
          ${[
            { key: 'focus_rating',     label: 'Focus'            },
            { key: 'patience_rating',  label: 'Patience'         },
            { key: 'emotional_rating', label: 'Emotional control' },
          ].map(r => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:12px;color:var(--text2);min-width:120px;">${r.label}</span>
              <div style="display:flex;gap:4px;" id="rating-${r.key}">
                ${[1,2,3,4,5].map(n => `
                  <div onclick="setRating('${r.key}',${n})" data-val="${n}"
                    style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;border:0.5px solid ${(todaySession?.[r.key]||0)>=n?'var(--purple)':'var(--border2)'};background:${(todaySession?.[r.key]||0)>=n?'var(--purple-bg)':'var(--bg3)'};color:${(todaySession?.[r.key]||0)>=n?'var(--purple-light)':'var(--text4)'};">★</div>`).join('')}
              </div>
              <input type="hidden" name="${r.key}" value="${todaySession?.[r.key] || 0}" />
            </div>`).join('')}
        </div>

        <div style="margin-top:10px;">
          <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--text4);margin-bottom:6px;">Biggest lesson today <span style="color:var(--text4);font-weight:400;">(one sentence)</span></div>
          <input type="text" name="lesson" value="${escapeHtml(todaySession?.lesson || '')}" placeholder="e.g. Entered too early before BOS confirmation."
            style="width:100%;background:var(--bg3);border:0.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:12px;color:var(--text2);outline:none;font-family:var(--font);" />
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;">
          <div id="session-score-preview" style="font-size:13px;color:var(--text3);">Score: —</div>
          <button type="submit" class="btn-secondary">Save session</button>
        </div>
      </form>
    </div>

    <!-- Recent sessions -->
    ${all.length > 0 ? `
    <div class="card">
      <p class="card-title">Recent sessions</p>
      ${all.slice(0, 7).map(s => {
        const col = scoreColor(s.discipline_score || 0);
        return `<div class="check-row">
          <span class="check-label" style="color:var(--text4);min-width:90px;">${s.session_date}</span>
          <div style="flex:1;margin:0 10px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="height:100%;background:${col};width:${s.discipline_score || 0}%;border-radius:2px;"></div>
          </div>
          <span style="font-size:12px;font-weight:500;color:${col};min-width:36px;text-align:right;">${s.discipline_score || 0}%</span>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;

  attachSessionFormHandlers();
}

function setRating(key, val) {
  // Update hidden input
  const input = document.querySelector(`input[name="${key}"]`);
  if (input) input.value = val;
  // Update star UI
  const container = document.getElementById(`rating-${key}`);
  if (!container) return;
  container.querySelectorAll('[data-val]').forEach(star => {
    const n = Number(star.dataset.val);
    const active = n <= val;
    star.style.border = `0.5px solid ${active ? 'var(--purple)' : 'var(--border2)'}`;
    star.style.background = active ? 'var(--purple-bg)' : 'var(--bg3)';
    star.style.color = active ? 'var(--purple-light)' : 'var(--text4)';
  });
  updateScorePreview();
}

function updateScorePreview() {
  const form = document.getElementById('session-form');
  if (!form) return;
  const session = {};
  for (const [key] of Object.entries(DISCIPLINE_WEIGHTS)) {
    const cb = form.querySelector(`input[name="${key}"]`);
    session[key] = cb?.checked || false;
  }
  const score = calcDisciplineScore(session);
  const el = document.getElementById('session-score-preview');
  if (el) {
    const col = score >= 95 ? 'var(--green)' : score >= 80 ? 'var(--amber)' : 'var(--red)';
    el.innerHTML = `Score: <span style="font-weight:500;color:${col};">${score}%</span>`;
  }
}

function attachSessionFormHandlers() {
  const form = document.getElementById('session-form');
  if (!form) return;

  // Live score preview on checkbox change
  form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateScorePreview);
  });
  updateScorePreview();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const today = todayISO();
    const { data: { user } } = await sb.auth.getUser();

    // Build session object from form
    const session = { session_date: today, user_id: user?.id };
    for (const [key] of Object.entries(DISCIPLINE_WEIGHTS)) {
      const cb = form.querySelector(`input[name="${key}"]`);
      session[key] = cb?.checked || false;
    }
    ['focus_rating', 'patience_rating', 'emotional_rating'].forEach(key => {
      const inp = form.querySelector(`input[name="${key}"]`);
      session[key] = inp ? (parseInt(inp.value) || null) : null;
    });
    const lessonInput = form.querySelector('input[name="lesson"]');
    session.lesson = lessonInput?.value?.trim() || null;
    session.discipline_score = calcDisciplineScore(session);

    // Upsert (insert or update if today's session already exists)
    const { error } = await sb.from('trading_sessions')
      .upsert(session, { onConflict: 'user_id,session_date' });

    if (error) {
      alert('Save failed: ' + error.message);
      return;
    }
    loadAndRenderDisciplineSection();
  });
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
    sleepConsistency,
    weightThis,
    supplementsToday,
    photoRows,
    todaySessionArr,
    weekDataArr
  ] = await Promise.all([
    safeQuery(sb.from('fitness_muscle_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_cardio_log').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_strength').select('*').order('logged_at', { ascending: false })),
    // Sleep now lives in consistency_log (synced with Daily tab)
    safeQuery(sb.from('consistency_log').select('log_date, completed').eq('item_name', '7h+ sleep').gte('log_date', thisWeek).lte('log_date', thisWeekDates[6])),
    safeQuery(sb.from('fitness_weight_log').select('*').eq('week_start', thisWeek).limit(1)),
    safeQuery(sb.from('consistency_log').select('*').eq('log_date', today)),
    safeQuery(sb.from('fitness_photos').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_daily_session').select('*').eq('session_date', today).limit(1)),
    safeQuery(sb.from('fitness_weight_log').select('progressive_overload,cheat_days').eq('week_start', thisWeek).limit(1))
  ]);

  const todayFitnessSession = todaySessionArr[0] || null;
  const weekData = weekDataArr[0] || {};
  const progressiveOverload = weekData.progressive_overload || false;
  const cheatDays = weekData.cheat_days || 0;

  // ── This week live stats (always reflect current state) ──
  const thisTrainingDays = new Set(muscleThis.filter(r => r.trained).map(r => r.day_date));
  const thisCardioDays   = new Set(cardioThis.filter(r => r.done).map(r => r.day_date));
  // Sleep count from consistency_log — same data as Daily tab
  const thisSleep7Count  = sleepConsistency.filter(r => r.completed).length;
  const currentWeight    = weightThis[0]?.weight_lbs;

  // ── This week maps (for grids — individual checkboxes) ──
  const muscleMap = {};
  muscleThis.forEach(r => { muscleMap[`${r.muscle_group}-${r.day_date}`] = r.trained; });

  const cardioMap = {};
  cardioThis.forEach(r => { cardioMap[`${r.cardio_type}-${r.day_date}`] = r.done; });

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

    <!-- Supplements (synced with Daily tab) -->
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Supplements — today</p>
        <span class="card-meta">Synced with Daily tab</span>
      </div>
      <div id="fitness-supplements-list">
        ${SUPPLEMENT_ITEMS.map((item, idx) => `
          <div class="check-row">
            <input type="checkbox" data-idx="${idx}" ${suppMap[item] ? 'checked' : ''} />
            <label class="check-label">${escapeHtml(item)}</label>
          </div>`).join('')}
      </div>
    </div>

    <!-- Daily fitness session log -->
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Log today's session</p>
        ${todayFitnessSession ? `<span style="font-size:11px;font-weight:500;color:var(--green);">✅ Logged — ${Math.round((todayFitnessSession.discipline_score||0)/FITNESS_DAILY_MAX*100)}%</span>` : '<span class="card-meta">Not logged yet</span>'}
      </div>
      <form id="fitness-session-form">
        ${[
          { key: 'workout_done',   label: 'Workout completed as planned', weight: 25 },
          { key: 'protein_done',   label: 'Protein target reached',       weight: 20 },
          { key: 'nutrition_done', label: 'Nutrition followed',            weight: 20 },
        ].map(f => `
          <div class="check-row">
            <input type="checkbox" name="${f.key}" ${todayFitnessSession?.[f.key] ? 'checked' : ''} />
            <label class="check-label" style="flex:1;">${f.label}</label>
            <span style="font-size:10px;color:var(--text4);">${f.weight}%</span>
          </div>`).join('')}
        <div style="padding-top:12px;margin-top:4px;border-top:0.5px solid var(--border2);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;color:var(--text2);min-width:120px;">Energy level</span>
            <div style="display:flex;gap:4px;" id="fitness-rating-energy_rating">
              ${[1,2,3,4,5].map(n => `
                <div onclick="setFitnessRating('energy_rating',${n})" data-val="${n}"
                  style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;border:0.5px solid ${(todayFitnessSession?.energy_rating||0)>=n?'var(--green-border)':'var(--border2)'};background:${(todayFitnessSession?.energy_rating||0)>=n?'var(--green-bg)':'var(--bg3)'};color:${(todayFitnessSession?.energy_rating||0)>=n?'var(--green)':'var(--text4)'};">★</div>`).join('')}
            </div>
            <input type="hidden" name="energy_rating" value="${todayFitnessSession?.energy_rating || 0}" />
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;">
          <div id="fitness-score-preview" style="font-size:13px;color:var(--text3);">Score: —</div>
          <button type="submit" class="btn-secondary">Save session</button>
        </div>
      </form>
    </div>

    <!-- Strength + Weight & Sleep -->
    <div class="two-col">
      <div class="card">
        <p class="card-title">Strength — current numbers</p>
        ${renderStrengthTable(strengthMap)}
      </div>
      <div class="card">
        <p class="card-title">Weight &amp; sleep</p>
        ${renderWeightSleepCard(currentWeight, sleepConsistency, thisWeekDates)}
      </div>
    </div>

    <!-- Weekly check (progressive overload + cheat days) -->
    <div class="card">
      <p class="card-title">Weekly check</p>
      <div class="check-row">
        <input type="checkbox" id="progressive-overload-check" ${progressiveOverload ? 'checked' : ''} />
        <label class="check-label" style="flex:1;">Progressive overload achieved this week</label>
        <span style="font-size:10px;color:var(--text4);">+20% to weekly score</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-top:0.5px solid var(--border2);margin-top:4px;">
        <span class="check-label" style="flex:1;">Cheat days this week</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button onclick="adjustCheatDays(-1)" style="width:28px;height:28px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:16px;cursor:pointer;">−</button>
          <span id="cheat-days-display" style="font-size:14px;font-weight:500;color:var(--text);min-width:20px;text-align:center;">${cheatDays}</span>
          <button onclick="adjustCheatDays(1)" style="width:28px;height:28px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:16px;cursor:pointer;">+</button>
        </div>
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

    <div id="fitness-discipline-section"><p class="loading-text">Loading fitness discipline...</p></div>
  `;

  attachMuscleGridHandlers(thisWeek);
  attachCardioGridHandlers(thisWeek);
  attachStrengthHandlers();
  attachWeightSleepHandlers(thisWeek, thisWeekDates);
  attachChecklistHandlers('consistency_log', 'fitness-supplements', SUPPLEMENT_ITEMS);
  attachPhotoHandlers(thisWeek);
  attachFitnessSessionHandlers(thisWeek, weekData);
  updateFitnessScorePreview();

  // Load KPI stats section async
  loadAndRenderFitnessDiscipline(thisWeek);
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

function renderWeightSleepCard(currentWeight, sleepConsistency = [], thisWeekDates = []) {
  const sleepMap = {};
  sleepConsistency.forEach(r => { sleepMap[r.log_date] = r.completed; });

  const sleepDots = thisWeekDates.map((dateStr, i) => {
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
    ${thisWeekDates.length ? `
    <div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">7h+ sleep this week <span style="font-size:10px;color:var(--text4);">— synced with Daily</span></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${sleepDots}</div>
    </div>` : ''}`;
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
        await sb.from('fitness_muscle_log').insert({ week_start: weekStart, muscle_group: muscle, day_date, trained, user_id: (await sb.auth.getUser()).data.user?.id });
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

function attachWeightSleepHandlers(weekStart) {
  // Weight handler
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

  // Sleep handler — writes to consistency_log (same table as Daily tab)
  // Checking here instantly reflects in the Daily tab and vice versa
  document.querySelectorAll('input[data-sleep-date]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const log_date = e.target.dataset.sleepDate;
      const completed = e.target.checked;
      const { data: existing } = await sb.from('consistency_log').select('id')
        .eq('log_date', log_date).eq('item_name', '7h+ sleep').maybeSingle();
      if (existing) {
        await sb.from('consistency_log').update({ completed }).eq('id', existing.id);
      } else {
        await sb.from('consistency_log').insert({
          log_date, item_name: '7h+ sleep', completed,
          user_id: (await sb.auth.getUser()).data.user?.id
        });
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
    // Sleep now lives in consistency_log (synced with Daily tab)
    safeQuery(sb.from('consistency_log').select('log_date, completed').eq('item_name', '7h+ sleep').gte('log_date', thisWeek).lte('log_date', thisWeekDates[6])),
    safeQuery(sb.from('fitness_weight_log').select('*').eq('week_start', thisWeek).limit(1))
  ]);

  const trainingDays = new Set(muscleRows.filter(r => r.trained).map(r => r.day_date)).size;
  const cardioDays   = new Set(cardioRows.filter(r => r.done).map(r => r.day_date)).size;
  const sleep7Days   = sleepRows.filter(r => r.completed).length;
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
// FITNESS DISCIPLINE & PERFORMANCE
// ============================================

// Daily weights — sleep dropped from here since it's already tracked in
// the Daily tab consistency check + the Weight & Sleep weekly grid;
// keeping it here too was redundant triple-logging of the same thing.
const FITNESS_DAILY_WEIGHTS = {
  workout_done:  25,
  protein_done:  20,
  nutrition_done:20,
};
const FITNESS_DAILY_MAX = Object.values(FITNESS_DAILY_WEIGHTS).reduce((a, b) => a + b, 0); // 65

function calcFitnessDailyScore(session) {
  let score = 0;
  for (const [key, weight] of Object.entries(FITNESS_DAILY_WEIGHTS)) {
    if (session[key]) score += weight;
  }
  return score; // max FITNESS_DAILY_MAX
}

function calcFitnessWeeklyScore(avgDailyPct, progressiveOverload) {
  // Daily habit compliance counts for 80% of the weekly score,
  // progressive overload adds up to the remaining 20%.
  return Math.round(avgDailyPct * 0.8 + (progressiveOverload ? 20 : 0));
}

async function loadAndRenderFitnessDiscipline(thisWeek) {
  const el = document.getElementById('fitness-discipline-section');
  if (!el) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = isoDate(thirtyDaysAgo);

  const sessions = await safeQuery(
    sb.from('fitness_daily_session').select('*').order('session_date', { ascending: false }).limit(60)
  );

  const last30Sessions = sessions.filter(s => s.session_date >= thirtyDaysAgoISO);
  const avgDailyRaw = last30Sessions.length
    ? last30Sessions.reduce((s, r) => s + (r.discipline_score || 0), 0) / last30Sessions.length
    : 0;
  const avgDailyPct = last30Sessions.length ? Math.round(avgDailyRaw / FITNESS_DAILY_MAX * 100) : 0;

  const weekData = await safeQuery(
    sb.from('fitness_weight_log').select('progressive_overload').eq('week_start', thisWeek).limit(1)
  );
  const progressiveOverload = weekData[0]?.progressive_overload || false;
  const weeklyScore = calcFitnessWeeklyScore(avgDailyPct, progressiveOverload);

  const compliance = (key) => last30Sessions.length
    ? Math.round(last30Sessions.filter(s => s[key]).length / last30Sessions.length * 100)
    : 0;
  const scoreColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : s > 0 ? 'var(--red)' : 'var(--text4)';
  const avgEnergy = last30Sessions.filter(s => s.energy_rating).length
    ? (last30Sessions.reduce((s, r) => s + (r.energy_rating || 0), 0) / last30Sessions.filter(s => s.energy_rating).length).toFixed(1)
    : '—';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0 10px;">
      <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:var(--text4);">Fitness discipline &amp; performance</div>
      <div style="flex:1;height:0.5px;background:var(--border2);"></div>
    </div>

    <div class="stat-grid-3" style="margin-bottom:10px;">
      <div class="card stat-box">
        <div class="stat-box-value" style="color:${scoreColor(weeklyScore)};">${sessions.length ? weeklyScore + '%' : '—'}</div>
        <div class="stat-box-label">Weekly fitness score</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">daily avg + overload</div>
      </div>
      <div class="card stat-box">
        <div class="stat-box-value" style="color:${scoreColor(avgDailyPct)};">${last30Sessions.length ? avgDailyPct + '%' : '—'}</div>
        <div class="stat-box-label">Daily discipline</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">avg last 30 days</div>
      </div>
      <div class="card stat-box">
        <div class="stat-box-value">${sessions.length}</div>
        <div class="stat-box-label">Sessions logged</div>
        <div style="font-size:10px;color:var(--text4);margin-top:4px;">all time</div>
      </div>
    </div>

    ${last30Sessions.length ? `
    <div class="card" style="margin-bottom:10px;">
      <p class="card-title">Daily compliance — last 30 days</p>
      ${[
        { label: 'Workout completed', key: 'workout_done', weight: 25 },
        { label: 'Protein target reached', key: 'protein_done', weight: 20 },
        { label: 'Nutrition followed', key: 'nutrition_done', weight: 20 },
      ].map(c => {
        const pct = compliance(c.key);
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--text2);font-weight:500;">${c.label}</span>
            <span style="color:var(--text4);">${c.weight}% weight &nbsp;·&nbsp; <span style="color:${scoreColor(pct)};font-weight:500;">${pct}%</span></span>
          </div>
          <div class="progress-track" style="height:5px;">
            <div class="progress-fill" style="width:${pct}%;background:${scoreColor(pct)};"></div>
          </div>
        </div>`;
      }).join('')}
      <div style="padding-top:10px;border-top:0.5px solid var(--border2);display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:var(--text3);">Average energy level</span>
        <span style="font-size:16px;font-weight:500;color:var(--text);">${avgEnergy} / 5</span>
      </div>
    </div>` : ''}

    ${sessions.length > 0 ? `
    <div class="card">
      <p class="card-title">Recent sessions</p>
      ${sessions.slice(0, 7).map(s => {
        const pct = Math.round((s.discipline_score||0)/FITNESS_DAILY_MAX*100);
        const col = scoreColor(pct);
        return `<div class="check-row">
          <span class="check-label" style="color:var(--text4);min-width:90px;">${s.session_date}</span>
          <div style="flex:1;margin:0 10px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="height:100%;background:${col};width:${pct}%;border-radius:2px;"></div>
          </div>
          <span style="font-size:12px;font-weight:500;color:${col};min-width:36px;text-align:right;">${pct}%</span>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;
}

function setFitnessRating(key, val) {
  const input = document.querySelector(`input[name="${key}"]`);
  if (input) input.value = val;
  const container = document.getElementById(`fitness-rating-${key}`);
  if (!container) return;
  container.querySelectorAll('[data-val]').forEach(star => {
    const n = Number(star.dataset.val);
    const active = n <= val;
    star.style.border = `0.5px solid ${active ? 'var(--green-border)' : 'var(--border2)'}`;
    star.style.background = active ? 'var(--green-bg)' : 'var(--bg3)';
    star.style.color = active ? 'var(--green)' : 'var(--text4)';
  });
}

function updateFitnessScorePreview() {
  const form = document.getElementById('fitness-session-form');
  if (!form) return;
  const session = {};
  for (const key of Object.keys(FITNESS_DAILY_WEIGHTS)) {
    session[key] = form.querySelector(`input[name="${key}"]`)?.checked || false;
  }
  const raw = calcFitnessDailyScore(session);
  const pct = Math.round(raw / FITNESS_DAILY_MAX * 100);
  const el = document.getElementById('fitness-score-preview');
  if (el) {
    const col = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    el.innerHTML = `Score: <span style="font-weight:500;color:${col};">${pct}%</span>`;
  }
}

let _cheatDays = 0;
let _fitnessWeek = '';

function adjustCheatDays(delta) {
  _cheatDays = Math.max(0, Math.min(7, _cheatDays + delta));
  const el = document.getElementById('cheat-days-display');
  if (el) el.textContent = _cheatDays;
  saveWeeklyFitnessCheck();
}

async function saveWeeklyFitnessCheck() {
  const overload = document.getElementById('progressive-overload-check')?.checked || false;
  const { data: { user } } = await sb.auth.getUser();
  const { data: existing } = await sb.from('fitness_weight_log').select('id').eq('week_start', _fitnessWeek).maybeSingle();
  if (existing) {
    await sb.from('fitness_weight_log').update({ progressive_overload: overload, cheat_days: _cheatDays }).eq('id', existing.id);
  } else {
    await sb.from('fitness_weight_log').insert({ week_start: _fitnessWeek, progressive_overload: overload, cheat_days: _cheatDays, user_id: user?.id });
  }
}

function attachFitnessSessionHandlers(weekStart, weekData) {
  _fitnessWeek = weekStart;
  _cheatDays = weekData.cheat_days || 0;

  const form = document.getElementById('fitness-session-form');
  if (form) {
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateFitnessScorePreview);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const today = todayISO();
      const { data: { user } } = await sb.auth.getUser();
      const session = { session_date: today, user_id: user?.id };
      for (const key of Object.keys(FITNESS_DAILY_WEIGHTS)) {
        session[key] = form.querySelector(`input[name="${key}"]`)?.checked || false;
      }
      const energyInput = form.querySelector('input[name="energy_rating"]');
      session.energy_rating = parseInt(energyInput?.value) || null;
      session.discipline_score = calcFitnessDailyScore(session);
      const { error } = await sb.from('fitness_daily_session')
        .upsert(session, { onConflict: 'user_id,session_date' });
      if (error) { alert('Save failed: ' + error.message); return; }
      loadAndRenderFitnessDiscipline(weekStart);
    });
  }

  const overloadCheck = document.getElementById('progressive-overload-check');
  if (overloadCheck) {
    overloadCheck.addEventListener('change', saveWeeklyFitnessCheck);
  }
}

// ============================================
// WEEKLY CHECKLIST (church attendance etc.)
// ============================================

const ITEM_DISPLAY_LABELS = {
  'Family time': 'Intentional Family Time'
};

const WEEKLY_ITEMS = ['Attended church this week'];

async function loadWeeklyChecklist(table, items, weekStart) {
  const { data } = await sb.from(table).select('*').eq('week_start', weekStart);
  const byName = {};
  (data || []).forEach(row => { byName[row.item_name] = row; });
  return items.map(name => ({
    item_name: name,
    completed: byName[name]?.completed || false,
    id: byName[name]?.id || null
  }));
}

function renderWeeklyChecklistCard(title, idPrefix, rows) {
  return `
    <div class="card">
      <p class="card-title">${title}</p>
      <div id="${idPrefix}-list">
        ${rows.map((r, i) => `
          <div class="check-row">
            <input type="checkbox" data-idx="${i}" ${r.completed ? 'checked' : ''} />
            <label class="check-label">${escapeHtml(ITEM_DISPLAY_LABELS[r.item_name] || r.item_name)}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function attachWeeklyChecklistHandlers(table, idPrefix) {
  const items = WEEKLY_ITEMS;
  const list = document.getElementById(`${idPrefix}-list`);
  if (!list) return;
  const weekStart = isoDate(getMondayOfWeek());
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const idx = Number(e.target.dataset.idx);
      const itemName = items[idx];
      const completed = e.target.checked;
      const { data: existing } = await sb.from(table).select('id')
        .eq('week_start', weekStart).eq('item_name', itemName).maybeSingle();
      if (existing) {
        await sb.from(table).update({ completed }).eq('id', existing.id);
      } else {
        await sb.from(table).insert({ week_start: weekStart, item_name: itemName, completed, user_id: (await sb.auth.getUser()).data.user?.id });
      }
    });
  });
}

// ============================================
// GOAL SCORING — DETERMINISTIC CLIENT-SIDE
// Goals 2, 3, 5, 8 are computed here from real
// data and sent to Claude as reference, so Claude
// only scores what can't be calculated exactly.
// ============================================

function addDaysISO(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

// Daily-cadence metric stats (last 30 days + last 7 days trend)
async function calcDailyMetricStats(table, itemName, { capPerWeek = null } = {}) {
  const todayStr = todayISO();
  const startStr = addDaysISO(todayStr, -29);
  const { data } = await sb.from(table).select('log_date, completed')
    .eq('item_name', itemName).gte('log_date', startStr).lte('log_date', todayStr);
  const byDate = {};
  (data || []).forEach(r => { if (r.completed) byDate[r.log_date] = true; });
  const hasAnyData = Object.keys(byDate).length > 0;
  const days = [];
  for (let i = 0; i < 30; i++) days.push(addDaysISO(todayStr, -29 + i));
  const last7 = days.slice(-7), prev7 = days.slice(-14, -7);
  const count = (list) => list.filter(d => byDate[d]).length;
  const cap7 = capPerWeek || 7;
  const cap30 = capPerWeek ? Math.round(capPerWeek * 30 / 7) : 30;
  const last7Scored = Math.min(1, count(last7) / cap7);
  const last30Scored = Math.min(1, count(days) / cap30);
  const prev7Scored = Math.min(1, count(prev7) / cap7);
  const score = hasAnyData ? Math.round((0.6 * last7Scored + 0.4 * last30Scored) * 100) : 0;
  const trend = !hasAnyData ? 'no_data' : last7Scored > prev7Scored + 0.05 ? 'up' : last7Scored < prev7Scored - 0.05 ? 'down' : 'stable';
  return { score, trend, hasAnyData, last7: count(last7), cap7, last30: count(days), cap30 };
}

// Weekly-cadence metric stats (e.g. church attendance)
async function calcWeeklyMetricStats(table, itemName, weeksBack = 4) {
  const weekStartStr = isoDate(getMondayOfWeek());
  const earliestWeekStr = isoDate(getMondayOfWeek(new Date(new Date(weekStartStr).getTime() - (weeksBack - 1) * 7 * 86400000)));
  const { data } = await sb.from(table).select('week_start, completed')
    .eq('item_name', itemName).gte('week_start', earliestWeekStr).lte('week_start', weekStartStr);
  const byWeek = {};
  (data || []).forEach(r => { byWeek[r.week_start] = r.completed; });
  const hasAnyData = Object.keys(byWeek).length > 0;
  const weeks = [];
  for (let i = weeksBack - 1; i >= 0; i--) weeks.push(isoDate(getMondayOfWeek(new Date(new Date(weekStartStr).getTime() - i * 7 * 86400000))));
  const attendedCount = weeks.filter(w => byWeek[w]).length;
  const rate = attendedCount / weeks.length;
  const score = hasAnyData ? Math.round(rate * 100) : 0;
  const thisWeek = byWeek[weekStartStr];
  const lastWeek = byWeek[weeks[weeks.length - 2]];
  const trend = !hasAnyData ? 'no_data' : thisWeek && !lastWeek ? 'up' : !thisWeek && lastWeek ? 'down' : 'stable';
  return { score, trend, hasAnyData, attended: attendedCount, total: weeks.length };
}

function habitStatusFromScore(score, hasAnyData) {
  if (!hasAnyData) return 'no_data';
  if (score >= 85) return 'on_track';
  if (score >= 60) return 'at_risk';
  return 'critical';
}

// Composite goal from multiple weighted metrics
async function computeCompositeGoal(goalId, metrics) {
  const results = await Promise.all(metrics.map(async m => {
    const stats = m.cadence === 'weekly'
      ? await calcWeeklyMetricStats(m.table, m.itemName, m.weeksBack || 4)
      : await calcDailyMetricStats(m.table, m.itemName, { capPerWeek: m.capPerWeek });
    return { ...m, stats };
  }));
  const active = results.filter(r => r.stats.hasAnyData);
  if (!active.length) return { id: goalId, score: 0, trend: 'no_data', status: 'no_data', insight: 'No data logged yet.' };
  const weightSum = active.reduce((s, r) => s + r.weight, 0);
  const score = Math.round(active.reduce((s, r) => s + r.stats.score * (r.weight / weightSum), 0));
  const ups = active.filter(r => r.stats.trend === 'up').length;
  const downs = active.filter(r => r.stats.trend === 'down').length;
  const trend = ups > downs ? 'up' : downs > ups ? 'down' : 'stable';
  const parts = results.map(r => {
    if (!r.stats.hasAnyData) return `${r.label}: no data`;
    return `${r.label}: ${r.stats.score}%`;
  });
  const insight = parts.join(' · ');
  return { id: goalId, score, trend, status: habitStatusFromScore(score, true), insight };
}

// Goal 5 — Faith metrics
const FAITH_METRICS = [
  { table: 'morning_routine_log', itemName: 'Pray and bible study', label: 'Prayer + Bible', weight: 70, cadence: 'daily' },
  { table: 'weekly_checks', itemName: 'Attended church this week', label: 'Church attendance', weight: 30, cadence: 'weekly' },
];

// Goal 8 — Family metrics
const FAMILY_METRICS = [
  { table: 'consistency_log', itemName: 'Family time', label: 'Intentional family time', weight: 100, cadence: 'daily' },
];

// Session score stats (trading discipline + fitness discipline)
async function calcSessionScoreStats(table, dateField, scoreField, { scale = 1 } = {}) {
  const todayStr = todayISO();
  const start30 = addDaysISO(todayStr, -29);
  const start7 = addDaysISO(todayStr, -6);
  const { data } = await sb.from(table).select(`${dateField}, ${scoreField}`)
    .gte(dateField, start30).lte(dateField, todayStr).order(dateField);
  const rows = data || [];
  const hasAnyData = rows.length > 0;
  const scoreOf = r => (r[scoreField] || 0) * scale;
  const last7Rows = rows.filter(r => r[dateField] >= start7);
  const prev7Rows = rows.filter(r => r[dateField] >= addDaysISO(todayStr, -13) && r[dateField] < start7);
  const avg = (list) => list.length ? list.reduce((s, r) => s + scoreOf(r), 0) / list.length : null;
  const last30Avg = avg(rows);
  const last7Avg = avg(last7Rows);
  const prev7Avg = avg(prev7Rows);
  const blendedLast7 = last7Avg != null ? last7Avg : (last30Avg || 0);
  const score = hasAnyData ? Math.round(0.6 * blendedLast7 + 0.4 * (last30Avg || 0)) : 0;
  const trend = !hasAnyData ? 'no_data' : last7Avg != null && prev7Avg != null
    ? (last7Avg > prev7Avg + 2 ? 'up' : last7Avg < prev7Avg - 2 ? 'down' : 'stable')
    : 'stable';
  return { score, trend, hasAnyData, last30Avg, last7Avg, sessions: rows.length };
}

// Checklist group stats (multiple items from one table)
async function calcChecklistGroupStats(table, itemNames) {
  const todayStr = todayISO();
  const startStr = addDaysISO(todayStr, -29);
  const { data } = await sb.from(table).select('log_date, item_name, completed')
    .in('item_name', itemNames).gte('log_date', startStr).lte('log_date', todayStr);
  const byDate = {};
  (data || []).forEach(r => {
    if (!byDate[r.log_date]) byDate[r.log_date] = {};
    byDate[r.log_date][r.item_name] = r.completed;
  });
  const hasAnyData = Object.keys(byDate).length > 0;
  const days = [];
  for (let i = 0; i < 30; i++) days.push(addDaysISO(todayStr, -29 + i));
  const dayRate = (d) => {
    const entry = byDate[d];
    if (!entry) return 0;
    const done = itemNames.filter(n => entry[n]).length;
    return done / itemNames.length;
  };
  const avg = (list) => list.reduce((s, d) => s + dayRate(d), 0) / list.length;
  const last30Rate = avg(days);
  const last7Rate = avg(days.slice(-7));
  const score = hasAnyData ? Math.round((0.6 * last7Rate + 0.4 * last30Rate) * 100) : 0;
  const trend = !hasAnyData ? 'no_data' : last7Rate > last30Rate + 0.05 ? 'up' : last7Rate < last30Rate - 0.05 ? 'down' : 'stable';
  return { score, trend, hasAnyData };
}

// Items from consistency_log that feed the Discipline System goal.
// Pulled live from consistency_items so newly added custom habits are
// automatically included — only Family time (Goal 8) and reading are excluded.
async function getDisciplineSystemConsistencyItems() {
  const names = await loadActiveConsistencyItemNames();
  return names.filter(n => !['Family time', '20 pages reading'].includes(n));
}

// Like calcChecklistGroupStats, but with one substitution rule: the actual
// training goal is 5 days/week, not 7, so requiring 'Gym' checked every
// single calendar day would cap this group below 100% even with perfect
// adherence to that real target. A day counts as compliant for 'Gym' if
// EITHER Gym (consistency_log) OR "Walk 10 min" (morning_routine_log) was
// checked that day — a planned rest-day walk counts as showing up.
async function calcConsistencyGroupStatsForGoal3(itemNames) {
  const todayStr = todayISO();
  const startStr = addDaysISO(todayStr, -29);
  const needsWalkData = itemNames.includes('Gym');

  const [{ data: consistencyRows }, walkRes] = await Promise.all([
    sb.from('consistency_log').select('log_date, item_name, completed')
      .in('item_name', itemNames).gte('log_date', startStr).lte('log_date', todayStr),
    needsWalkData
      ? sb.from('morning_routine_log').select('log_date, completed')
          .eq('item_name', 'Walk 10 min').gte('log_date', startStr).lte('log_date', todayStr)
      : Promise.resolve({ data: [] }),
  ]);

  const byDate = {};
  (consistencyRows || []).forEach(r => {
    if (!byDate[r.log_date]) byDate[r.log_date] = {};
    byDate[r.log_date][r.item_name] = r.completed;
  });
  const walkedByDate = {};
  (walkRes.data || []).forEach(r => { walkedByDate[r.log_date] = r.completed; });

  const hasAnyData = Object.keys(byDate).length > 0;
  const days = [];
  for (let i = 0; i < 30; i++) days.push(addDaysISO(todayStr, -29 + i));
  const dayRate = (d) => {
    const entry = byDate[d];
    if (!entry) return 0;
    const done = itemNames.filter(n => {
      if (n === 'Gym') return entry[n] || walkedByDate[d];
      return entry[n];
    }).length;
    return done / itemNames.length;
  };
  const avg = (list) => list.reduce((s, d) => s + dayRate(d), 0) / list.length;
  const last30Rate = avg(days);
  const last7Rate = avg(days.slice(-7));
  const score = hasAnyData ? Math.round((0.6 * last7Rate + 0.4 * last30Rate) * 100) : 0;
  const trend = !hasAnyData ? 'no_data' : last7Rate > last30Rate + 0.05 ? 'up' : last7Rate < last30Rate - 0.05 ? 'down' : 'stable';
  return { score, trend, hasAnyData };
}

// Goal 3 — Discipline System (trading + fitness + morning + consistency)
async function computeDisciplineSystemGoal() {
  const consistencySystemItems = await getDisciplineSystemConsistencyItems();
  const [trading, fitness, morning, systems] = await Promise.all([
    calcSessionScoreStats('trading_sessions', 'session_date', 'discipline_score'),
    calcSessionScoreStats('fitness_daily_session', 'session_date', 'discipline_score', { scale: 100 / FITNESS_DAILY_MAX }),
    calcChecklistGroupStats('morning_routine_log', MORNING_ROUTINE_ITEMS),
    consistencySystemItems.length
      ? calcConsistencyGroupStatsForGoal3(consistencySystemItems)
      : Promise.resolve({ score: 0, trend: 'no_data', hasAnyData: false }),
  ]);
  const metrics = [
    { label: 'Trading discipline', stats: trading, weight: 35 },
    { label: 'Fitness discipline', stats: fitness, weight: 25 },
    { label: 'Morning routine', stats: morning, weight: 25 },
    { label: 'Consistency', stats: systems, weight: 15 },
  ];
  const active = metrics.filter(m => m.stats.hasAnyData);
  if (!active.length) return { id: 3, score: 0, trend: 'no_data', status: 'no_data', insight: 'No discipline data logged yet.' };
  const weightSum = active.reduce((s, m) => s + m.weight, 0);
  const score = Math.round(active.reduce((s, m) => s + m.stats.score * (m.weight / weightSum), 0));
  const trend = active.some(m => m.stats.trend === 'up') ? 'up' : active.some(m => m.stats.trend === 'down') ? 'down' : 'stable';
  const insight = metrics.map(m => m.stats.hasAnyData ? `${m.label}: ${m.stats.score}%` : `${m.label}: no data`).join(' · ');
  return { id: 3, score, trend, status: habitStatusFromScore(score, true), insight };
}

// Goal 2 — FTMO Challenge Progress
async function computeTradingChallengeGoal() {
  const [settingsRes, tradesRes] = await Promise.all([
    sb.from('trading_settings').select('*').limit(1),
    sb.from('trades').select('open_time, profit, swap, commission'),
  ]);
  const trades = tradesRes.data || [];
  const settings = settingsRes.data?.[0] || {};
  const c = computeChallengeProgress(trades, settings);
  const score = Math.round(c.goalProgressPct);
  const status = (c.drawdownBreached || c.dailyBreached) ? 'critical' : habitStatusFromScore(score, c.hasAnyData);
  const insight = c.hasAnyData
    ? `Balance $${Math.round(c.currentBalance).toLocaleString()} of $${Math.round(c.targetBalance).toLocaleString()} — ${score}% to target. Drawdown: ${c.maxDrawdownPct.toFixed(1)}% used of ${c.maxDrawdownLimitPct}%.`
    : 'No trades imported yet.';
  return { id: 2, score, trend: score > 0 ? 'up' : 'no_data', status, insight };
}

// Dispatch for habit-based goals
async function computeHabitGoal(goalId) {
  if (goalId === 2) return computeTradingChallengeGoal();
  if (goalId === 3) return computeDisciplineSystemGoal();
  if (goalId === 5) return computeCompositeGoal(5, FAITH_METRICS);
  if (goalId === 8) return computeCompositeGoal(8, FAMILY_METRICS);
  return { id: goalId, score: 0, trend: 'no_data', status: 'no_data', insight: 'Not yet implemented.' };
}

// Compute all client-side goals and merge them into the cached analysis
async function mergeHabitGoalsIntoAnalysis(analysis) {
  const base = analysis || {};
  const goals = Array.isArray(base.goals) ? [...base.goals] : [];
  const ids = [2, 3, 5, 8];
  const computed = await Promise.all(ids.map(computeHabitGoal));
  computed.forEach(g => {
    const idx = goals.findIndex(x => x.id === g.id);
    if (idx >= 0) goals[idx] = g; else goals.push(g);
  });
  goals.sort((a, b) => a.id - b.id);
  const scored = goals.filter(g => g.status !== 'no_data');
  const overall_score = scored.length
    ? Math.round(scored.reduce((s, g) => s + (g.score || 0), 0) / scored.length)
    : 0;
  return { ...base, goals, overall_score };
}

// ============================================
// GOALS TAB — AI-powered analysis via Supabase Edge Function
// ============================================

const GOALS_META = [
  { id: 1, name: 'Become a Disciplined Trader', priority: 'critical' },
  { id: 2, name: 'Pass and Maintain FTMO $100K', priority: 'critical' },
  { id: 3, name: 'Build an Elite Discipline System', priority: 'critical' },
  { id: 4, name: 'Reach 200 lbs With Improved Strength', priority: 'high' },
  { id: 5, name: 'Strengthen Relationship With God', priority: 'high' },
  { id: 8, name: 'Become More Present With Family', priority: 'medium' },
  // Goals 6, 7, 9 not yet shown — tracking not built yet
];

const PRIORITY_STYLE = {
  critical: { color: 'var(--red)', bg: 'var(--red-bg)', label: 'Critical' },
  high:     { color: 'var(--amber)', bg: 'var(--amber-bg)', label: 'High' },
  medium:   { color: 'var(--purple-light)', bg: 'var(--purple-bg)', label: 'Medium' },
  support:  { color: 'var(--text4)', bg: 'var(--bg3)', label: 'Support' },
};

const STATUS_STYLE = {
  on_track: { color: 'var(--green)', label: '✅ On track' },
  at_risk:  { color: 'var(--amber)', label: '⚠️ At risk' },
  critical: { color: 'var(--red)', label: '⛔ Critical' },
  no_data:  { color: 'var(--text4)', label: '— No data yet' },
};

const TREND_ICON = { up: '↑', down: '↓', stable: '→', no_data: '—' };

async function renderGoalsTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = '<p class="loading-text">Loading goals...</p>';

  const user = await requireAuth();
  if (!user) return;

  const { data: cached } = await sb
    .from('goals_analysis_cache')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Auto-refresh on Sunday after 3pm Eastern (browser local time = Eastern)
  const shouldAutoRefresh = (() => {
    if (!cached) return false;
    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() < 15) return false;
    const todayAt3pm = new Date(now);
    todayAt3pm.setHours(15, 0, 0, 0);
    return new Date(cached.created_at) < todayAt3pm;
  })();

  if (shouldAutoRefresh) {
    triggerGoalsAnalysis('weekly', true);
    return;
  }

  if (cached?.analysis) {
    const merged = await mergeHabitGoalsIntoAnalysis(cached.analysis);
    renderGoalsUI(merged, cached.created_at, 'weekly');
  } else {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:28px;">
        <div style="font-size:28px; margin-bottom:10px;">🎯</div>
        <p style="font-size:14px; font-weight:500; color:var(--text); margin-bottom:6px;">No analysis yet</p>
        <p style="font-size:12px; color:var(--text4); margin-bottom:16px; line-height:1.6;">Claude will read all your tracking data and write a report for each goal — what's working, what's not, and one concrete action to improve.</p>
        <button class="btn-secondary" onclick="triggerGoalsAnalysis('weekly', true)">Run first analysis</button>
      </div>`;
  }
}

async function triggerGoalsAnalysis(period = 'weekly', force = false) {
  const container = document.getElementById('tab-content');
  container.innerHTML = `
    <div class="card" style="text-align:center; padding:32px;">
      <div style="font-size:28px; margin-bottom:12px;">🤖</div>
      <p style="font-size:14px; font-weight:500; color:var(--text); margin-bottom:6px;">Analyzing your ${period} performance...</p>
      <p style="font-size:12px; color:var(--text4);">Claude is reading your trades, habits, fitness, sleep and writing a report for each goal.</p>
    </div>`;

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not logged in');

    const clientComputedGoals = await Promise.all([2, 3, 5, 8].map(computeHabitGoal));

    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ force, period, client_computed_goals: clientComputedGoals })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const { analysis, cached_at } = await res.json();
    renderGoalsUI(analysis, cached_at, period);

  } catch (err) {
    container.innerHTML = `
      <div class="card">
        <p class="card-title" style="color:var(--red);">Analysis failed</p>
        <p class="empty-state">${escapeHtml(err.message)}</p>
        <button class="btn-secondary" style="margin-top:10px;" onclick="triggerGoalsAnalysis('weekly', true)">Retry</button>
      </div>`;
  }
}

function renderGoalsUI(analysis, cachedAt, period = 'weekly') {
  const container = document.getElementById('tab-content');
  if (!container || !analysis) return;

  window._lastGoalsAnalysis = analysis;
  window._lastGoalsCachedAt = cachedAt;

  const { goals = [], overall_score = 0, summary = '', top_priority = '' } = analysis;

  const sc = s => s >= 70 ? 'var(--green)' : s >= 40 ? 'var(--amber)' : s > 0 ? 'var(--red)' : 'var(--text4)';
  const onTrack = goals.filter(g => g.status === 'on_track').length;
  const atRisk  = goals.filter(g => g.status === 'at_risk' || g.status === 'critical').length;
  const cachedLabel = cachedAt
    ? new Date(cachedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Just now';

  const goalRow = (meta) => {
    const g = goals.find(x => x.id === meta.id);
    const hasData = g && g.status !== 'no_data';
    const pri = PRIORITY_STYLE[meta.priority] || PRIORITY_STYLE.support;
    const stat = g ? (STATUS_STYLE[g.status] || STATUS_STYLE.no_data) : STATUS_STYLE.no_data;
    const score = g?.score || 0;
    const trend = TREND_ICON[g?.trend] || '—';
    const trendCol = g?.trend === 'up' ? 'var(--green)' : g?.trend === 'down' ? 'var(--red)' : 'var(--text4)';

    return `
      <div style="padding:12px 0; border-bottom:0.5px solid var(--border2);">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:${hasData ? '8px' : '0'};">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:10px; font-weight:500; padding:2px 6px; border-radius:4px; background:${pri.bg}; color:${pri.color};">${pri.label}</span>
              <span style="font-size:11px; color:${stat.color}; font-weight:500;">${stat.label}</span>
            </div>
            <div style="font-size:13px; font-weight:500; color:var(--text);">${escapeHtml(meta.name)}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:24px; font-weight:500; color:${sc(score)}; line-height:1;">${hasData ? score + '%' : '—'}</div>
            <div style="font-size:12px; color:${trendCol}; font-weight:500;">${trend}</div>
          </div>
        </div>
        ${hasData ? `
          <div class="progress-track" style="margin-bottom:10px;">
            <div class="progress-fill" style="width:${score}%; background:${sc(score)};"></div>
          </div>
          ${g.what_working ? `<div style="margin-bottom:6px;"><span style="font-size:10px;font-weight:500;color:var(--green);text-transform:uppercase;letter-spacing:.05em;">✓ Working</span><div style="font-size:12px;color:var(--text3);margin-top:2px;line-height:1.5;">${escapeHtml(g.what_working)}</div></div>` : ''}
          ${g.what_not ? `<div style="margin-bottom:6px;"><span style="font-size:10px;font-weight:500;color:var(--red);text-transform:uppercase;letter-spacing:.05em;">✗ Not working</span><div style="font-size:12px;color:var(--text3);margin-top:2px;line-height:1.5;">${escapeHtml(g.what_not)}</div></div>` : ''}
          ${g.improve ? `<div><span style="font-size:10px;font-weight:500;color:var(--amber);text-transform:uppercase;letter-spacing:.05em;">→ Improve this ${period === 'monthly' ? 'month' : 'week'}</span><div style="font-size:12px;color:var(--text3);margin-top:2px;line-height:1.5;">${escapeHtml(g.improve)}</div></div>` : g.insight ? `<div style="font-size:12px;color:var(--text3);font-style:italic;line-height:1.5;">"${escapeHtml(g.insight)}"</div>` : ''}
        ` : '<div style="font-size:12px;color:var(--text4);">No data logged yet.</div>'}
      </div>`;
  };

  const section = (icon, label, ids) => `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:14px;">${icon}</span>
        <span style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:var(--text4);">${label}</span>
      </div>
      ${GOALS_META.filter(m => ids.includes(m.id)).map(goalRow).join('')}
    </div>`;

  const mon = getMondayOfWeek();
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  const weekLabel = `${mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${sun.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
  const monthLabel = new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});

  container.innerHTML = `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:4px;">2026 Goals — Overall</div>
          <div style="font-size:36px;font-weight:500;color:${sc(overall_score)};line-height:1;">${overall_score}<span style="font-size:16px;color:var(--text4);">%</span></div>
        </div>
        <div style="text-align:right;">
          <div style="display:flex;gap:4px;margin-bottom:4px;">
            <button onclick="renderGoalsUI(window._lastGoalsAnalysis,window._lastGoalsCachedAt,'weekly')"
              style="font-size:11px;padding:4px 12px;border-radius:6px;cursor:pointer;border:0.5px solid ${period==='weekly'?'var(--purple)':'var(--border)'};background:${period==='weekly'?'var(--purple)':'var(--bg2)'};color:${period==='weekly'?'#EEEDFE':'var(--text4)'};">
              This week
            </button>
            <button onclick="triggerGoalsAnalysis('monthly',false)"
              style="font-size:11px;padding:4px 12px;border-radius:6px;cursor:pointer;border:0.5px solid ${period==='monthly'?'var(--purple)':'var(--border)'};background:${period==='monthly'?'var(--purple)':'var(--bg2)'};color:${period==='monthly'?'#EEEDFE':'var(--text4)'};">
              This month
            </button>
          </div>
          <div style="font-size:10px;color:var(--text4);text-align:right;margin-bottom:8px;">${period==='weekly' ? weekLabel : monthLabel}</div>
          <div class="stat-grid-3" style="gap:6px;margin-bottom:8px;">
            <div class="stat-box"><div class="stat-box-value g">${onTrack}</div><div class="stat-box-label">On track</div></div>
            <div class="stat-box"><div class="stat-box-value ${atRisk>0?'a':'dim'}">${atRisk}</div><div class="stat-box-label">At risk</div></div>
            <div class="stat-box"><div class="stat-box-value dim">${6-onTrack-atRisk}</div><div class="stat-box-label">No data</div></div>
          </div>
          <button class="btn-secondary" onclick="triggerGoalsAnalysis('${period}',true)" style="font-size:11px;padding:4px 12px;">🔄 Refresh</button>
        </div>
      </div>
      ${summary ? `<div style="background:var(--purple-bg);border-left:2px solid var(--purple);border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:10px;">
        <p style="font-size:10px;font-weight:500;color:var(--text4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">${period==='monthly'?'Monthly':'Weekly'} summary</p>
        <p style="font-size:12px;color:var(--purple-light);line-height:1.7;">${escapeHtml(summary)}</p>
      </div>` : ''}
      ${top_priority ? `<div style="background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:8px;padding:10px 14px;">
        <p style="font-size:10px;font-weight:500;color:var(--text4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Top priority this week</p>
        <p style="font-size:13px;color:var(--amber);font-weight:500;">${escapeHtml(top_priority)}</p>
      </div>` : ''}
      <p style="font-size:10px;color:var(--text4);margin-top:8px;text-align:right;">Last updated: ${cachedLabel}</p>
    </div>
    ${section('📈','Trading',[1,2])}
    ${section('⚙️','Discipline System',[3])}
    ${section('💪','Fitness',[4])}
    ${section('🙏','Faith',[5])}
    ${section('👨‍👩‍👧','Family',[8])}
  `;
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
