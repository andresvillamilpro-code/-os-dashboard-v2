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

// Wake time differs by day type — weekends allow a later wake-up. Rather
// than one fixed list, this is a function of the date, so the correct item
// ("Wake before 6am" weekdays, "Wake before 9am" Sat/Sun) is shown and
// logged under its own item_name for that day.
function isWeekendDate(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDay();
  return day === 0 || day === 6;
}

function morningRoutineItemsForDate(dateStr) {
  const wakeItem = isWeekendDate(dateStr) ? 'Wake before 9am' : 'Wake before 6am';
  return [wakeItem, 'Stretch 5 min', 'Walk 10 min', 'Pray and bible study', 'Journal morning', '1 glass of water'];
}

// Zinc is taken every 2 days — this flips on/off by calendar day-of-year,
// so it's fully deterministic forever without needing to store any
// "last taken" state anywhere.
function isZincDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const start = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - start) / 86400000) + 1;
  return dayOfYear % 2 === 0;
}

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
  trading: renderTradingOverview,
  fitness: renderFitnessTab,
  goals: renderGoalsTab,
  calendar: renderCalendarTab,
  expenses: renderExpensesTab
};

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  // Calendar's time grid benefits from the full viewport width — every
  // other tab keeps the default centered, readable max-width.
  const mainEl = document.querySelector('.main');
  if (mainEl) mainEl.classList.toggle('main-wide', tabName === 'calendar');
  localStorage.setItem('os_active_tab', tabName);
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
  const morningItems = morningRoutineItemsForDate(today);

  const rawConsistencyItems = await loadConsistencyItems();
  // Zinc is only taken every 2 days — hide it from the checklist entirely
  // on days it's not due, rather than showing it unchecked every day.
  const consistencyItems = isZincDay(today)
    ? rawConsistencyItems
    : rawConsistencyItems.filter(r => r.item_name !== 'Zinc');
  const consistencyItemNames = consistencyItems.map(r => r.item_name);

  const [routine, consistency, goals, tasks] = await Promise.all([
    loadChecklist('morning_routine_log', morningItems, today),
    loadChecklist('consistency_log', consistencyItemNames, today),
    loadTopGoals(today),
    loadTasks()
  ]);

  container.innerHTML = `
    <div class="identity-banner">${MISSION_STATEMENT}</div>
    ${renderCalendarCard()}
    ${renderTopGoalsCard(goals)}
    <div class="two-col">
      ${renderChecklistCard('Morning routine', 'morning-routine', routine)}
      ${renderEditableChecklistCard('Consistency check', 'consistency', consistency, consistencyItems)}
    </div>
    ${renderTaskListCard(tasks)}
  `;

  attachChecklistHandlers('morning_routine_log', 'morning-routine', morningItems);
  attachChecklistHandlers('consistency_log', 'consistency', consistencyItemNames);
  attachConsistencyEditHandlers();
  attachTopGoalsHandlers();
  attachTaskListHandlers(tasks);
  initGoogleCalendar();
  loadTopbarStatus();
}

function renderHeroCard(s, opts = {}) {
  if (!s) {
    return opts.showMission ? `<div class="hero-card"><div class="hero-mission" style="margin-top:0;padding-top:0;border-top:none;">${MISSION_STATEMENT}</div></div>` : '';
  }
  const progressPct = Math.max(0, Math.min(100, (s.pnlPct / s.profitTargetPct) * 100));
  const pnlColor = s.pnlPct >= 0 ? 'var(--green)' : 'var(--red)';
  return `
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <div class="hero-label">${opts.label || 'Account balance'}</div>
          <div class="hero-value" style="color:${pnlColor};">$${Math.round(s.currentBalance).toLocaleString()}</div>
          <div class="hero-sub">${s.pnlPct >= 0 ? '+' : ''}${s.pnlPct.toFixed(1)}% overall &middot; target ${s.profitTargetPct}%</div>
        </div>
        <span class="hero-status-pill" style="border:0.5px solid ${s.weekStatusColor};color:${s.weekStatusColor};">${s.weekStatus}</span>
      </div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${progressPct}%;background:${pnlColor};"></div></div>
      <div class="hero-progress-caption"><span>Progress to profit target</span><span>${progressPct.toFixed(0)}%</span></div>
      ${opts.showMission ? `<div class="hero-mission">${MISSION_STATEMENT}</div>` : ''}
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

      // '160g protein' drives Fitness's "Protein target reached" directly —
      // no separate checkbox to keep in sync by hand.
      if (table === 'consistency_log' && itemName === '160g protein') {
        await syncProteinDoneForDate(today);
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

  const priorityBtn = (id) =>
    `<span data-task-priority="${id}" title="Make this a Top 3 priority" style="font-size:11px;color:var(--purple-light);cursor:pointer;padding:2px 6px;border-radius:4px;border:0.5px solid var(--purple-border);flex-shrink:0;">⭐</span>`;

  // Active tasks
  const activeRows = active.map(t => `
    <div class="check-row" data-task-id="${t.id}">
      <input type="checkbox" data-task-check="${t.id}" />
      <label class="check-label" style="flex:1;">${escapeHtml(t.text)}</label>
      ${priorityBtn(t.id)}
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

// Promotes a task's text into the first empty Top 3 Goals slot for today.
// If all 3 are already filled, asks you to clear one first rather than
// silently overwriting an existing priority.
async function promoteTaskToGoal(taskText) {
  const today = todayISO();
  const goals = await loadTopGoals(today);
  const emptySlot = goals.find(g => !g.text.trim());
  if (!emptySlot) {
    alert('All 3 Top Goal slots are full — clear one first.');
    return;
  }
  const { data: { user } } = await sb.auth.getUser();
  const { data: existing } = await sb.from('top_goals').select('id')
    .eq('log_date', today).eq('slot', emptySlot.slot).maybeSingle();
  if (existing) {
    await sb.from('top_goals').update({ text: taskText }).eq('id', existing.id);
  } else {
    await sb.from('top_goals').insert({ log_date: today, slot: emptySlot.slot, text: taskText, user_id: user?.id });
  }
  renderDailyTab();
}

function attachTaskListHandlers(tasks) {
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

  list.querySelectorAll('[data-task-priority]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.taskPriority;
      const task = tasks?.active?.find(t => t.id === id);
      if (task) await promoteTaskToGoal(task.text);
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

function parseFtmoCsv(text, account) {
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
      account,
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

async function importTradesFromCsv(file, statusEl, account) {
  statusEl.textContent = 'Reading file...';
  const text = await file.text();
  const parsed = parseFtmoCsv(text, account);
  if (!parsed.length) {
    statusEl.textContent = 'No valid trades found in that file.';
    return;
  }

  statusEl.textContent = `Found ${parsed.length} trades — importing (existing trades get refreshed too)...`;
  const { error } = await sb.from('trades').upsert(parsed, { onConflict: 'user_id,account,ticket' });
  if (error) {
    statusEl.textContent = `Import failed: ${error.message}`;
    return;
  }

  localStorage.setItem('trading_last_upload', new Date().toISOString());
  statusEl.textContent = `Imported/refreshed ${parsed.length} trades into the ${account} account.`;
  renderTradingOverview();
}

// ---------- Settings ----------

async function loadTradingSettings() {
  const { data } = await sb.from('trading_settings').select('*').limit(1);
  return data?.[0] || {
    account_size: 100000, account_size_10k: 10000, profit_target_pct: 10,
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

async function renderTradingOverview() {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading trading overview...</p>`;

  const user = await requireAuth();
  if (!user) return;

  const [settings, { data: allTradesRaw }] = await Promise.all([
    loadTradingSettings(),
    sb.from('trades').select('*')
  ]);
  const allTrades = allTradesRaw || [];
  const trades100k = allTrades.filter(t => t.account === '100k');
  const trades10k = allTrades.filter(t => t.account === '10k');

  const balanceFor = (accTrades, size) => size + accTrades.reduce((s, t) => s + netResult(t), 0);
  const size100k = Number(settings.account_size);
  const size10k = Number(settings.account_size_10k);
  const bal100k = balanceFor(trades100k, size100k);
  const bal10k = balanceFor(trades10k, size10k);
  const pnlPct100k = size100k ? ((bal100k - size100k) / size100k) * 100 : 0;
  const pnlPct10k = size10k ? ((bal10k - size10k) / size10k) * 100 : 0;
  const targetPct = Number(settings.profit_target_pct);

  // Trades under $5 net (either direction) are noise — spread/commission
  // wash, not a real win or loss — same rule as the account-detail page's
  // "This week" card, applied here too since this card carries that same
  // "This week" label.
  const MIN_TRADE_SIZE_FOR_STATS = 5;
  const thisWeek = getMondaySundayRange(0);
  // Trades this week — counted once. It's a copier setup (one trade
  // decision, mirrored to both accounts), so counting both would double it;
  // the 100k account's rows are used as the reference count.
  const thisWeekTrades100k = trades100k.filter(t => new Date(t.open_time) >= thisWeek.start && Math.abs(netResult(t)) >= MIN_TRADE_SIZE_FOR_STATS);
  const thisWeekTradesCount = thisWeekTrades100k.length;

  // Shared performance — pooled across both accounts (same trade decision,
  // not either account's dollar outcome) and scoped to this week, matching
  // the card's own label.
  const allTradesThisWeek = allTrades.filter(t => new Date(t.open_time) >= thisWeek.start && Math.abs(netResult(t)) >= MIN_TRADE_SIZE_FOR_STATS);
  const { winRate, medianRMultiple } = computeTradeStats(allTradesThisWeek);

  const lastUpload = localStorage.getItem('trading_last_upload');
  const lastUploadText = lastUpload ? new Date(lastUpload).toLocaleString() : 'Never uploaded yet';

  const progressPct = (pct) => Math.max(0, Math.min(100, targetPct ? (pct / targetPct) * 100 : 0));

  container.innerHTML = `
    <div style="border-left:2px solid var(--purple);padding:10px 14px;background:var(--purple-bg);border-radius:0 8px 8px 0;margin-bottom:12px;font-size:12px;color:var(--purple-light);line-height:1.7;font-style:italic;font-weight:500;">
      "Whatever you do, work heartily, as for the Lord and not for men." — Colossians 3:23
    </div>

    <div class="card">
      <p class="card-title">This week — shared across both accounts</p>
      <div class="stat-grid-3">
        <div class="stat-box"><div class="stat-box-value">${thisWeekTradesCount}</div><div class="stat-box-label">Trades this week</div></div>
        <div class="stat-box"><div class="stat-box-value ${winRate >= 50 ? 'g' : 'a'}">${winRate}%</div><div class="stat-box-label">Win rate</div></div>
        <div class="stat-box"><div class="stat-box-value">${medianRMultiple != null ? (medianRMultiple >= 0 ? '+' : '') + medianRMultiple.toFixed(2) + 'R' : '—'}</div><div class="stat-box-label">Median R-multiple</div></div>
      </div>
      <p class="card-meta" style="margin-top:10px;">Same trade decision mirrored to both accounts — reflects the decision itself, not either account's dollar result. Trades under $${MIN_TRADE_SIZE_FOR_STATS} net excluded.</p>
    </div>

    <div class="two-col">
      <div class="card" id="account-card-100k" style="cursor:pointer;border-left:2px solid var(--purple);">
        <p class="card-title">100K Account</p>
        <div style="font-size:var(--fs-xl);font-weight:700;letter-spacing:-.01em;color:${pnlPct100k >= 0 ? 'var(--green)' : 'var(--red)'};">$${Math.round(bal100k).toLocaleString()}</div>
        <div class="hero-sub">${pnlPct100k >= 0 ? '+' : ''}${pnlPct100k.toFixed(1)}% &middot; target ${targetPct}%</div>
        <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${progressPct(pnlPct100k)}%;background:${pnlPct100k >= 0 ? 'var(--green)' : 'var(--red)'};"></div></div>
        <p class="card-meta" style="margin-top:10px;">${trades100k.length} trades &middot; click to view full detail →</p>
      </div>
      <div class="card" id="account-card-10k" style="cursor:pointer;border-left:2px solid var(--purple);">
        <p class="card-title">10K Account</p>
        <div style="font-size:var(--fs-xl);font-weight:700;letter-spacing:-.01em;color:${pnlPct10k >= 0 ? 'var(--green)' : 'var(--red)'};">$${Math.round(bal10k).toLocaleString()}</div>
        <div class="hero-sub">${pnlPct10k >= 0 ? '+' : ''}${pnlPct10k.toFixed(1)}% &middot; target ${targetPct}%</div>
        <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${progressPct(pnlPct10k)}%;background:${pnlPct10k >= 0 ? 'var(--green)' : 'var(--red)'};"></div></div>
        <p class="card-meta" style="margin-top:10px;">${trades10k.length} trades &middot; click to view full detail →</p>
      </div>
    </div>

    <div class="card">
      <p class="card-title">Import trades</p>
      <div class="journal-field" style="margin-bottom:10px;max-width:220px;">
        <label>Account</label>
        <select id="csv-account-select">
          <option value="100k">100K account</option>
          <option value="10k">10K account</option>
        </select>
      </div>
      <div class="upload-row">
        <label class="file-input-btn">Upload FTMO CSV<input type="file" id="csv-input" accept=".csv" /></label>
        <span class="upload-status" id="upload-status">Last upload: ${lastUploadText}</span>
      </div>
    </div>

    <div id="discipline-section"><p class="loading-text">Loading discipline stats...</p></div>
  `;

  document.getElementById('account-card-100k')?.addEventListener('click', () => renderTradingAccountDetail('100k'));
  document.getElementById('account-card-10k')?.addEventListener('click', () => renderTradingAccountDetail('10k'));
  attachCsvUploadHandler();

  // Load discipline section async (doesn't block the main render)
  loadAndRenderDisciplineSection();
}

async function renderTradingAccountDetail(account) {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading trading data...</p>`;

  const user = await requireAuth();
  if (!user) return;

  const [settings, { data: tradesRaw }] = await Promise.all([
    loadTradingSettings(),
    sb.from('trades').select('*').eq('account', account).order('open_time', { ascending: true })
  ]);
  const trades = tradesRaw || [];

  const accountSize = account === '10k' ? Number(settings.account_size_10k) : Number(settings.account_size);
  const totalPnl = trades.reduce((sum, t) => sum + netResult(t), 0);
  const currentBalance = accountSize + totalPnl;
  const targetBalance = accountSize * (1 + Number(settings.profit_target_pct) / 100);
  const pnlPct = accountSize ? (totalPnl / accountSize) * 100 : 0;

  const { wins, losses, winRate, medianRMultiple } = computeTradeStats(trades);

  // ── THIS WEEK (Mon–Fri window) ──
  // Trades under $5 net (either direction) are treated as noise — spread/
  // commission wash, not a real win or loss — and excluded from the "This
  // week" card's stats only. thisWeekTradesRaw (unfiltered) still backs the
  // trade-edit panel so every trade, including tiny ones, stays editable.
  const MIN_TRADE_SIZE_FOR_STATS = 5;
  const thisWeek = getMondaySundayRange(0);
  const thisWeekTradesRaw = trades.filter(t => new Date(t.open_time) >= thisWeek.start);
  const thisWeekTrades = thisWeekTradesRaw.filter(t => Math.abs(netResult(t)) >= MIN_TRADE_SIZE_FOR_STATS);
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
  const byDowWins = [0, 0, 0, 0, 0, 0, 0];
  const byDowLosses = [0, 0, 0, 0, 0, 0, 0];
  const byHour = new Array(24).fill(0);
  trades.forEach(t => {
    const { hour, weekday } = serverTimeToLocalParts(new Date(t.open_time));
    byHour[hour]++;
    const dowIdx = dowNames.indexOf(weekday);
    if (dowIdx >= 0) {
      if (netResult(t) > 0) byDowWins[dowIdx]++;
      else byDowLosses[dowIdx]++;
    }
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

  const mondayStr = thisWeek.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fridayEnd = new Date(thisWeek.start); fridayEnd.setDate(fridayEnd.getDate() + 4);
  const fridayStr = fridayEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const weeklyOverride = settings.weekly_override || null;
  const displayPnl = weeklyOverride?.pnl != null ? Number(weeklyOverride.pnl) : thisWeekPnl;
  const displayTradesUsed = weeklyOverride?.trades != null ? Number(weeklyOverride.trades) : thisWeekTrades.length;
  const displayLosses = weeklyOverride?.losses != null ? Number(weeklyOverride.losses) : thisWeekLosses;
  const displayWinRate = weeklyOverride?.winRate != null ? Number(weeklyOverride.winRate) : (thisWeekTrades.length ? thisWeekStats.winRate : null);

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <button type="button" class="btn-secondary" id="back-to-overview-btn" style="background:var(--bg3);color:var(--text3);">← Overview</button>
      <span style="font-size:13px;font-weight:600;color:var(--text2);">${account === '10k' ? '10K Account' : '100K Account'}</span>
    </div>

    <div style="border-left:2px solid var(--purple);padding:10px 14px;background:var(--purple-bg);border-radius:0 8px 8px 0;margin-bottom:12px;font-size:12px;color:var(--purple-light);line-height:1.7;font-style:italic;font-weight:500;">
      "Whatever you do, work heartily, as for the Lord and not for men." — Colossians 3:23
    </div>

    ${renderHeroCard({
      currentBalance, pnlPct,
      profitTargetPct: Number(settings.profit_target_pct),
      weekStatus, weekStatusColor
    })}

    <div id="journal-section"><p class="loading-text">Loading trading journal...</p></div>

    <div class="card" style="border-left: 2px solid ${weekStatusColor};">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">This week — ${mondayStr} to ${fridayStr}</p>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11px; font-weight:500; color:${weekStatusColor};">${weekStatus}</span>
          <span class="settings-gear-btn" id="week-stats-settings-toggle" title="Correct these numbers">⚙️</span>
        </div>
      </div>
      <div style="background:${weekStatusBg}; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:${weekStatusColor}; font-weight:500;">${weekAlert}</div>
      <div class="card-meta" style="margin-bottom:10px;">Trades under $${MIN_TRADE_SIZE_FOR_STATS} net (spread/commission wash) are excluded from these stats.</div>
      ${weeklyOverride ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:11px;color:var(--amber);">
          <span>✏️ These numbers are manually overridden, not calculated from trades.</span>
          <span id="week-override-clear-btn" style="cursor:pointer;text-decoration:underline;white-space:nowrap;">Clear override</span>
        </div>
      ` : ''}
      <div class="stat-grid-4">
        <div class="stat-box">
          <div class="stat-box-value ${displayPnl >= 0 ? 'g' : 'r'}">${displayPnl >= 0 ? '+' : ''}$${displayPnl.toFixed(0)}</div>
          <div class="stat-box-label">P&amp;L this week</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${displayTradesUsed} / ${settings.max_trades_per_week}</div>
          <div class="stat-box-label">Trades used</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${displayLosses >= settings.max_losses_per_week ? 'r' : 'w'}">${displayLosses} / ${settings.max_losses_per_week}</div>
          <div class="stat-box-label">Losses</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value ${displayWinRate >= 50 ? 'g' : 'a'}">${displayWinRate != null ? displayWinRate + '%' : '—'}</div>
          <div class="stat-box-label">Win rate</div>
        </div>
      </div>

      <div id="week-stats-settings-panel" class="settings-panel" style="display:none;margin-top:12px;">
        <p class="card-title" style="margin-top:2px;">Correct this week's numbers</p>

        <div style="margin-bottom:14px;">
          <div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:6px;">Option 1 — fix the actual trade (recommended, updates everywhere)</div>
          ${thisWeekTradesRaw.length ? thisWeekTradesRaw.map(t => `
            <div class="card" style="background:var(--bg3);margin-bottom:6px;padding:10px;" data-trade-edit-row="${t.id}">
              <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text4);margin-bottom:6px;">
                <span style="font-weight:600;color:var(--text2);">${escapeHtml(t.symbol || '—')}</span>
                <span>${new Date(t.open_time).toLocaleDateString()}</span>
              </div>
              <div class="journal-grid-3">
                <div class="journal-field"><label>Profit</label><input type="number" step="any" data-trade-field="profit" value="${t.profit ?? 0}" /></div>
                <div class="journal-field"><label>Swap</label><input type="number" step="any" data-trade-field="swap" value="${t.swap ?? 0}" /></div>
                <div class="journal-field"><label>Commission</label><input type="number" step="any" data-trade-field="commission" value="${t.commission ?? 0}" /></div>
              </div>
              <button type="button" class="btn-secondary trade-edit-save-btn" data-trade-id="${t.id}" style="margin-top:8px;font-size:11px;">Save trade</button>
            </div>
          `).join('') : '<p class="card-meta">No trades this week yet.</p>'}
        </div>

        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:6px;">Option 2 — manual override (doesn't touch trade data)</div>
          <div class="journal-grid-2" style="margin-bottom:8px;">
            <div class="journal-field"><label>P&amp;L this week ($)</label><input type="number" step="any" id="override-pnl" value="${weeklyOverride?.pnl ?? ''}" /></div>
            <div class="journal-field"><label>Trades used</label><input type="number" step="1" id="override-trades" value="${weeklyOverride?.trades ?? ''}" /></div>
            <div class="journal-field"><label>Losses</label><input type="number" step="1" id="override-losses" value="${weeklyOverride?.losses ?? ''}" /></div>
            <div class="journal-field"><label>Win rate (%)</label><input type="number" step="any" id="override-winrate" value="${weeklyOverride?.winRate ?? ''}" /></div>
          </div>
          <button type="button" class="btn-secondary" id="week-override-save-btn">Save override</button>
        </div>
      </div>
    </div>

    <div class="stat-grid-3">
      <div class="card stat-box"><div class="stat-box-value ${winRate >= 50 ? 'g' : 'a'}">${winRate}%</div><div class="stat-box-label">Win rate (all-time)</div></div>
      <div class="card stat-box"><div class="stat-box-value">${trades.length}</div><div class="stat-box-label">Total trades</div></div>
      <div class="card stat-box"><div class="stat-box-value g">${winStreak}</div><div class="stat-box-label">Best win streak</div></div>
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
          <div class="settings-field"><label>Account size ($)</label><input type="text" name="${account === '10k' ? 'account_size_10k' : 'account_size'}" value="${accountSize}" /></div>
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
        <p class="card-title">Wins &amp; losses by day of week</p>
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
  `;

  document.getElementById('back-to-overview-btn')?.addEventListener('click', renderTradingOverview);
  attachTradingSettingsHandler();
  attachTradingSettingsToggle();
  attachWeekStatsSettingsHandlers();
  drawTradingCharts({ balancePoints, byInstrument, byDowWins, byDowLosses, dowNames, byHour });

  // Load trading journal section async (doesn't block the main render)
  loadAndRenderJournalSection({ account });
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

function attachWeekStatsSettingsHandlers() {
  const toggleBtn = document.getElementById('week-stats-settings-toggle');
  const panel = document.getElementById('week-stats-settings-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Option 1 — fix the actual trade
  document.querySelectorAll('.trade-edit-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('[data-trade-edit-row]');
      if (!row) return;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const fields = {};
      row.querySelectorAll('[data-trade-field]').forEach(input => {
        fields[input.dataset.tradeField] = parseFloat(input.value) || 0;
      });
      const { error } = await sb.from('trades').update(fields).eq('id', btn.dataset.tradeId);
      if (error) {
        alert('Could not save trade: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Save trade';
        return;
      }
      renderTradingAccountDetail(journalCurrentAccount);
    });
  });

  // Option 2 — manual override
  const saveOverrideBtn = document.getElementById('week-override-save-btn');
  if (saveOverrideBtn) {
    saveOverrideBtn.addEventListener('click', async () => {
      const pnl = document.getElementById('override-pnl').value;
      const tradesUsed = document.getElementById('override-trades').value;
      const losses = document.getElementById('override-losses').value;
      const winRate = document.getElementById('override-winrate').value;

      if (pnl === '' && tradesUsed === '' && losses === '' && winRate === '') {
        alert('Enter at least one value to override.');
        return;
      }

      const override = {
        pnl: pnl === '' ? null : parseFloat(pnl),
        trades: tradesUsed === '' ? null : parseInt(tradesUsed, 10),
        losses: losses === '' ? null : parseInt(losses, 10),
        winRate: winRate === '' ? null : parseFloat(winRate)
      };
      await saveTradingSettings({ weekly_override: override });
      renderTradingAccountDetail(journalCurrentAccount);
    });
  }

  const clearOverrideBtn = document.getElementById('week-override-clear-btn');
  if (clearOverrideBtn) {
    clearOverrideBtn.addEventListener('click', async () => {
      await saveTradingSettings({ weekly_override: null });
      renderTradingAccountDetail(journalCurrentAccount);
    });
  }
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
  const accountSelect = document.getElementById('csv-account-select');
  if (!input || !statusEl) return;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const account = accountSelect ? accountSelect.value : '100k';
    try {
      await importTradesFromCsv(file, statusEl, account);
    } catch (err) {
      statusEl.textContent = `Import error: ${err.message}`;
    }
  });
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Reads the live CSS custom properties so charts always match whichever
// theme (dark or light) is currently active, instead of hardcoding one
// theme's colors regardless of what's on screen.
function getThemeChartColors() {
  const cs = getComputedStyle(document.body);
  const v = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
  const accent = v('--purple-light', '#00D4FF');
  return {
    textColor: v('--text3', '#9CA3AF'),
    gridColor: v('--border2', '#1F2937'),
    accent,
    accentSoftRgba: hexToRgba(accent, 0.14),
    palette: [accent, v('--blue', '#378ADD'), v('--green', '#1D9E75'), v('--amber', '#EF9F27'), v('--red', '#E24B4A'), v('--purple', '#00D4FF'), v('--text3', '#9CA3AF')]
  };
}

function drawTradingCharts({ balancePoints, byInstrument, byDowWins, byDowLosses, dowNames, byHour }) {
  if (typeof Chart === 'undefined') return;

  const { textColor, gridColor, accent, accentSoftRgba, palette } = getThemeChartColors();
  const cs = getComputedStyle(document.body);
  const greenColor = cs.getPropertyValue('--green').trim() || '#1D9E75';
  const redColor = cs.getPropertyValue('--red').trim() || '#E24B4A';

  Object.values(TRADING_CHARTS).forEach(c => c?.destroy());

  const balanceEl = document.getElementById('balance-chart');
  if (balanceEl) {
    TRADING_CHARTS.balance = new Chart(balanceEl, {
      type: 'line',
      data: { labels: balancePoints.map(p => p.x), datasets: [{ data: balancePoints.map(p => p.y), borderColor: accent, backgroundColor: accentSoftRgba, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: accent }] },
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
      data: {
        labels: dowNames,
        datasets: [
          { label: 'Wins', data: byDowWins, backgroundColor: greenColor, borderRadius: 4 },
          { label: 'Losses', data: byDowLosses, backgroundColor: redColor, borderRadius: 4 }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 }, boxWidth: 10 } } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: textColor, font: { size: 10 }, precision: 0 }, grid: { color: gridColor } }
        },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  const hourEl = document.getElementById('hour-chart');
  if (hourEl) {
    TRADING_CHARTS.hour = new Chart(hourEl, {
      type: 'bar',
      data: { labels: Array.from({ length: 24 }, (_, i) => i + 'h'), datasets: [{ data: byHour, backgroundColor: palette[1], borderRadius: 3 }] },
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
        ${todaySession ? `<span style="font-size:11px;font-weight:500;color:var(--green);">✅ Logged — score: ${todaySession.discipline_score}%</span>` : '<span class="card-meta">Not logged yet — save a journal entry above, then "Proceed with discipline session"</span>'}
      </div>
      <div id="session-form-panel" style="display:none;">
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
// TRADING JOURNAL (inside Trading tab)
// ============================================

const JOURNAL_TAG_CATEGORIES = ['emotion', 'setup', 'timeframe'];

// Cache of active tags per category, loaded from `journal_tags`.
// Shape: { emotion: [{id,tag_name}], setup: [...], timeframe: [...] }
let journalTagsCache = { emotion: [], setup: [], timeframe: [] };

// Transient selection state for the currently-open "new entry" form.
// Keyed by field id (not category) since Emotion Before / Emotion After
// both draw from the same 'emotion' tag pool but need independent selections.
let journalFormSelections = {
  'jf-timeframe': [],
  'jf-emotion-before': [],
  'jf-setup': [],
  'jf-emotion-after': []
};
const JOURNAL_FIELD_TO_CATEGORY = {
  'jf-timeframe': 'timeframe',
  'jf-emotion-before': 'emotion',
  'jf-setup': 'setup',
  'jf-emotion-after': 'emotion'
};

async function loadJournalTags() {
  const { data } = await sb.from('journal_tags')
    .select('id, category, tag_name')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  const grouped = { emotion: [], setup: [], timeframe: [] };
  (data || []).forEach(row => {
    if (grouped[row.category]) grouped[row.category].push(row);
  });
  journalTagsCache = grouped;
}

async function addJournalTag(category, rawName) {
  const name = (rawName || '').trim();
  if (!name) return { ok: false, error: 'Enter a tag name.' };
  const exists = (journalTagsCache[category] || []).some(t => t.tag_name.toLowerCase() === name.toLowerCase());
  if (exists) return { ok: false, error: 'That tag already exists.' };
  const { error } = await sb.from('journal_tags').insert({
    category, tag_name: name, sort_order: (journalTagsCache[category] || []).length
  });
  if (error) return { ok: false, error: error.message };
  await loadJournalTags();
  return { ok: true };
}

async function deleteJournalTag(category, tagId) {
  // Soft-delete: keeps historical entries' text intact, just removes from picker.
  const { error } = await sb.from('journal_tags').update({ active: false }).eq('id', tagId);
  if (error) return { ok: false, error: error.message };
  await loadJournalTags();
  return { ok: true };
}

// ---------- Auto-calculated metrics ----------
// Mirrors the KB principle "deterministic JS handles every measurable field" —
// day-of-week, planned/actual R-multiple, P&L%, and Win/Loss/BE are all derived,
// never typed by hand.
function computeJournalMetrics(e) {
  const entryPrice = Number(e.entry_price);
  const stopLoss = Number(e.stop_loss);
  const takeProfit = e.take_profit != null && e.take_profit !== '' ? Number(e.take_profit) : null;
  const closePrice = e.close_price != null && e.close_price !== '' ? Number(e.close_price) : null;
  // 'Both' entries (copier trade) may have a different risk % per account —
  // use whichever matches the journal currently being viewed.
  const riskPct = (e.account === 'both' && journalCurrentAccount === '10k' && e.risk_percent_10k != null)
    ? Number(e.risk_percent_10k)
    : (e.risk_percent != null && e.risk_percent !== '' ? Number(e.risk_percent) : null);
  const isBuy = e.trade_type === 'BUY';

  const riskDistance = isBuy ? (entryPrice - stopLoss) : (stopLoss - entryPrice);

  let plannedR = null;
  if (takeProfit != null && riskDistance > 0) {
    const rewardDistance = isBuy ? (takeProfit - entryPrice) : (entryPrice - takeProfit);
    plannedR = rewardDistance / riskDistance;
  }

  let actualR = null;
  if (closePrice != null && riskDistance > 0) {
    const gainDistance = isBuy ? (closePrice - entryPrice) : (entryPrice - closePrice);
    actualR = gainDistance / riskDistance;
  }

  let pnlPercent = null;
  if (actualR != null && riskPct != null) pnlPercent = actualR * riskPct;

  let result = null;
  if (actualR != null) {
    result = Math.abs(actualR) < 0.05 ? 'BE' : (actualR > 0 ? 'WIN' : 'LOSS');
  }

  let dayOfWeek = null;
  if (e.entry_date) {
    dayOfWeek = new Date(e.entry_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
  }

  let duration = null;
  if (e.entry_time && e.close_time) {
    const [eh, em] = e.entry_time.split(':').map(Number);
    const [ch, cm] = e.close_time.split(':').map(Number);
    let mins = (ch * 60 + cm) - (eh * 60 + em);
    if (mins < 0) mins += 24 * 60; // assume overnight roll if close < entry
    const h = Math.floor(mins / 60), m = mins % 60;
    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return { dayOfWeek, plannedR, actualR, pnlPercent, result, duration };
}

// ---------- Tag picker widget ----------

function renderTagPicker(fieldId, label) {
  const category = JOURNAL_FIELD_TO_CATEGORY[fieldId];
  const options = journalTagsCache[category] || [];
  const selected = journalFormSelections[fieldId] || [];
  return `
    <div class="journal-field">
      <label>${escapeHtml(label)}</label>
      <div class="tag-picker" id="${fieldId}-picker" data-field="${fieldId}">
        ${options.map(t => `
          <span class="tag-chip ${selected.includes(t.tag_name) ? 'selected' : ''}" data-tag-name="${escapeHtml(t.tag_name)}">
            ${escapeHtml(t.tag_name)}
            <span class="tag-remove" data-tag-id="${t.id}" title="Remove from list">×</span>
          </span>
        `).join('')}
        <span class="tag-chip tag-add-toggle" id="${fieldId}-add-toggle" title="Add a new tag">+</span>
      </div>
      <div class="tag-add-row" id="${fieldId}-add-row" style="display:none;">
        <input type="text" id="${fieldId}-new-tag-input" placeholder="Add ${escapeHtml(label.toLowerCase())}..." />
        <button type="button" class="btn-secondary" id="${fieldId}-add-tag-btn">Add</button>
      </div>
    </div>
  `;
}

function attachTagPickerHandlers(fieldId) {
  const picker = document.getElementById(`${fieldId}-picker`);
  const category = JOURNAL_FIELD_TO_CATEGORY[fieldId];

  if (picker) {
    picker.querySelectorAll('.tag-chip:not(.tag-add-toggle)').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-remove')) return; // handled separately
        const name = chip.dataset.tagName;
        const sel = journalFormSelections[fieldId];
        const idx = sel.indexOf(name);
        if (idx >= 0) sel.splice(idx, 1); else sel.push(name);
        chip.classList.toggle('selected');
      });
    });
    picker.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tagId = btn.dataset.tagId;
        if (!confirm('Remove this tag from your picker? Past entries keep their text either way.')) return;
        const result = await deleteJournalTag(category, tagId);
        if (!result.ok) { alert(result.error); return; }
        rerenderJournalForm();
      });
    });
  }

  const addToggle = document.getElementById(`${fieldId}-add-toggle`);
  const addRow = document.getElementById(`${fieldId}-add-row`);
  const input = document.getElementById(`${fieldId}-new-tag-input`);
  if (addToggle && addRow) {
    addToggle.addEventListener('click', () => {
      addRow.style.display = addRow.style.display === 'none' ? 'flex' : 'none';
      if (addRow.style.display === 'flex' && input) input.focus();
    });
  }

  const addBtn = document.getElementById(`${fieldId}-add-tag-btn`);
  if (addBtn && input) {
    const submit = async () => {
      const result = await addJournalTag(category, input.value);
      if (!result.ok) { alert(result.error); return; }
      journalFormSelections[fieldId].push(input.value.trim());
      rerenderJournalForm();
    };
    addBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }
}

// ---------- Trade recommendations (auto-fill from FTMO CSV) ----------
// Standalone/manual entries are still the design — this never links a
// journal row to a trade row, it just offers the trade's own numbers as a
// one-click starting point so you're not retyping what the CSV already has.
let journalRecentTradesInfo = { trades: [], label: '' };
// Which account's journal is currently open — set by loadAndRenderJournalSection.
let journalCurrentAccount = '100k';

async function loadRecentTradesForJournal(account) {
  const { data } = await sb.from('trades').select('*').eq('account', account).order('open_time', { ascending: false }).limit(30);
  if (!data || !data.length) return { trades: [], label: '' };

  const localDate = (isoStr) => new Date(isoStr).toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
  const today = todayISO();
  const mostRecentDate = localDate(data[0].open_time);
  const targetDate = mostRecentDate;
  const dayTrades = data.filter(t => localDate(t.open_time) === targetDate);
  const label = targetDate === today ? "today's trades" : `last trading day — ${targetDate}`;
  return { trades: dayTrades, label };
}

function renderTradeRecommendations() {
  const { trades, label } = journalRecentTradesInfo;
  if (!trades.length) return '';
  return `
    <div class="journal-field" style="margin-bottom:16px;">
      <label>From your FTMO CSV — ${escapeHtml(label)} (click to auto-fill)</label>
      <div class="tag-picker">
        ${trades.map(t => {
          const isBuy = String(t.trade_type || '').toUpperCase().includes('SELL') ? false : true;
          const pnl = Number(t.profit || 0) + Number(t.swap || 0) + Number(t.commission || 0);
          return `
            <span class="tag-chip trade-recommend-chip" data-trade-id="${t.id}" style="cursor:pointer;">
              ${escapeHtml(t.symbol || '—')} ${isBuy ? 'BUY' : 'SELL'} &middot; ${t.open_price ?? '—'}
              <span style="color:${pnl >= 0 ? 'var(--green)' : 'var(--red)'};margin-left:4px;">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}</span>
            </span>`;
        }).join('')}
      </div>
    </div>
  `;
}

function attachTradeRecommendationHandlers() {
  const form = document.getElementById('journal-entry-form');
  if (!form) return;
  document.querySelectorAll('.trade-recommend-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const trade = journalRecentTradesInfo.trades.find(t => String(t.id) === chip.dataset.tradeId);
      if (!trade) return;

      const isBuy = String(trade.trade_type || '').toUpperCase().includes('SELL') ? false : true;
      const setVal = (name, val) => {
        const el = form.querySelector(`[name="${name}"]`);
        if (el && val != null && val !== '') el.value = val;
      };
      const timeOf = (isoStr) => isoStr ? new Date(isoStr).toTimeString().slice(0, 5) : '';

      setVal('entry_date', new Date(trade.open_time).toLocaleDateString('en-CA'));
      setVal('asset', trade.symbol);
      setVal('trade_type', isBuy ? 'BUY' : 'SELL');
      setVal('entry_time', timeOf(trade.open_time));
      setVal('close_time', timeOf(trade.close_time));
      setVal('entry_price', trade.open_price);
      setVal('stop_loss', trade.sl);
      setVal('take_profit', trade.tp);
      setVal('close_price', trade.close_price);

      chip.style.borderColor = 'var(--green)';
      chip.style.color = 'var(--green)';
    });
  });
}

function rerenderJournalForm() {
  const panel = document.getElementById('journal-form-panel');
  if (!panel) return;
  const prefill = journalEditingEntryId ? journalEntriesCache[journalEditingEntryId] : null;
  panel.innerHTML = renderJournalEntryForm(prefill);
  attachJournalFormHandlers();
}

// ---------- Entry form ----------

function renderJournalEntryForm(prefill = null) {
  const p = prefill || {};
  return `
    <form id="journal-entry-form">
      ${renderTradeRecommendations()}
      ${prefill ? `<div class="card-meta" style="margin-bottom:10px;">✏️ Continuing draft from ${escapeHtml(p.entry_date || '')} — save as draft again, or complete it below.</div>` : ''}
      <div class="journal-section-label">Setup</div>
      <div class="journal-grid-3">
        <div class="journal-field"><label>Date</label><input type="date" name="entry_date" value="${p.entry_date || todayISO()}" required /></div>
        <div class="journal-field"><label>Asset</label><input type="text" name="asset" placeholder="BTC, NAS100, GOLD..." value="${escapeHtml(p.asset || '')}" required /></div>
        <div class="journal-field"><label>Type</label>
          <select name="trade_type" required>
            <option value="BUY" ${p.trade_type === 'BUY' || !p.trade_type ? 'selected' : ''}>BUY</option>
            <option value="SELL" ${p.trade_type === 'SELL' ? 'selected' : ''}>SELL</option>
          </select>
        </div>
      </div>
      <div class="journal-grid-3" style="margin-top:10px;">
        <div class="journal-field">
          <label>Account</label>
          <select name="account" id="jf-account-select">
            <option value="100k" ${(p.account || journalCurrentAccount) === '100k' ? 'selected' : ''}>100K</option>
            <option value="10k" ${(p.account || journalCurrentAccount) === '10k' ? 'selected' : ''}>10K</option>
            <option value="both" ${p.account === 'both' ? 'selected' : ''}>Both (copier trade)</option>
          </select>
        </div>
        <div class="journal-field" id="jf-same-risk-wrap" style="display:${p.account === 'both' ? 'flex' : 'none'};">
          <label>Same risk on both?</label>
          <select id="jf-same-risk-select">
            <option value="yes" ${p.risk_percent_10k == null ? 'selected' : ''}>Yes</option>
            <option value="no" ${p.risk_percent_10k != null ? 'selected' : ''}>No, set separately</option>
          </select>
        </div>
        <div class="journal-field" id="jf-risk-10k-wrap" style="display:${p.account === 'both' && p.risk_percent_10k != null ? 'flex' : 'none'};">
          <label>Risk % — 10K account</label>
          <input type="number" step="0.01" name="risk_percent_10k" placeholder="3" value="${p.risk_percent_10k ?? ''}" />
        </div>
      </div>
      <div class="journal-grid-2" style="margin-top:10px;">
        <div class="journal-field"><label id="jf-risk-primary-label">Risk %</label><input type="number" step="0.01" name="risk_percent" placeholder="3" value="${p.risk_percent ?? ''}" required /></div>
        <div class="journal-field"><label>Entry time (optional)</label><input type="time" name="entry_time" value="${p.entry_time || ''}" /></div>
      </div>
      <div style="margin-top:10px;">${renderTagPicker('jf-timeframe', 'Timeframe')}</div>

      <div class="journal-section-label">Plan — before you entered</div>
      <div>${renderTagPicker('jf-emotion-before', 'Emotion before')}</div>
      <div style="margin-top:10px;">${renderTagPicker('jf-setup', 'Trade confirmation / setup')}</div>
      <div class="journal-field" style="margin-top:10px;">
        <label>TradingView links — before (one per line)</label>
        <textarea name="chart_links_before" placeholder="https://www.tradingview.com/x/...">${escapeHtml(p.chart_links_before || '')}</textarea>
      </div>

      <div class="journal-section-label">Execution</div>
      <div class="journal-grid-3">
        <div class="journal-field"><label>Entry price</label><input type="number" step="any" name="entry_price" value="${p.entry_price ?? ''}" required /></div>
        <div class="journal-field"><label>Stop loss</label><input type="number" step="any" name="stop_loss" value="${p.stop_loss ?? ''}" required /></div>
        <div class="journal-field"><label>Take profit (optional)</label><input type="number" step="any" name="take_profit" value="${p.take_profit ?? ''}" /></div>
      </div>
      <div class="journal-grid-2" style="margin-top:10px;">
        <div class="journal-field"><label>Close time (optional)</label><input type="time" name="close_time" value="${p.close_time || ''}" /></div>
        <div class="journal-field"><label>Close price (leave blank if still open)</label><input type="number" step="any" name="close_price" value="${p.close_price ?? ''}" /></div>
      </div>

      <div class="journal-section-label">Reflection — after the trade</div>
      <div>${renderTagPicker('jf-emotion-after', 'Emotion after')}</div>
      <div class="journal-field" style="margin-top:10px;">
        <label>Conclusion / lesson</label>
        <textarea name="conclusion_lesson" placeholder="What happened, what you'd do differently...">${escapeHtml(p.conclusion_lesson || '')}</textarea>
      </div>
      <div class="journal-field" style="margin-top:10px;">
        <label>TradingView links — after (one per line)</label>
        <textarea name="chart_links_after" placeholder="https://www.tradingview.com/x/...">${escapeHtml(p.chart_links_after || '')}</textarea>
      </div>

      <div id="journal-form-error" style="font-size:11px;color:var(--red);margin-top:8px;"></div>

      <div style="display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:0.5px solid var(--border2);">
        <button type="submit" class="btn-secondary">${prefill ? 'Save & complete' : 'Save entry'}</button>
        <button type="submit" formnovalidate class="btn-secondary" id="journal-save-draft-btn" style="background:var(--amber-bg);color:var(--amber);">Save as draft</button>
        <button type="button" class="btn-secondary" id="journal-form-cancel" style="background:var(--bg3);color:var(--text3);">Cancel</button>
      </div>
    </form>
  `;
}

// Tracks which existing draft (if any) is being resumed — null means the
// form will INSERT a new row on save, otherwise it UPDATEs this row.
let journalEditingEntryId = null;
// Full entry objects keyed by id, refreshed on every section render, so
// "Continue editing" can pull the complete row without a re-fetch.
let journalEntriesCache = {};

function resetJournalFormSelections() {
  journalFormSelections = { 'jf-timeframe': [], 'jf-emotion-before': [], 'jf-setup': [], 'jf-emotion-after': [] };
  journalEditingEntryId = null;
}

function loadFormSelectionsFromEntry(entry) {
  journalFormSelections = {
    'jf-timeframe': [...(entry.timeframe || [])],
    'jf-emotion-before': [...(entry.emotion_before || [])],
    'jf-setup': [...(entry.setup_confirmations || [])],
    'jf-emotion-after': [...(entry.emotion_after || [])]
  };
  journalEditingEntryId = entry.id;
}

function attachJournalFormHandlers() {
  ['jf-timeframe', 'jf-emotion-before', 'jf-setup', 'jf-emotion-after'].forEach(attachTagPickerHandlers);
  attachTradeRecommendationHandlers();

  const form = document.getElementById('journal-entry-form');
  const errorEl = document.getElementById('journal-form-error');
  const cancelBtn = document.getElementById('journal-form-cancel');

  const accountSelect = document.getElementById('jf-account-select');
  const sameRiskWrap = document.getElementById('jf-same-risk-wrap');
  const sameRiskSelect = document.getElementById('jf-same-risk-select');
  const risk10kWrap = document.getElementById('jf-risk-10k-wrap');
  const riskPrimaryLabel = document.getElementById('jf-risk-primary-label');

  const syncRiskFields = () => {
    const isBoth = accountSelect?.value === 'both';
    if (sameRiskWrap) sameRiskWrap.style.display = isBoth ? 'flex' : 'none';
    const isDifferent = isBoth && sameRiskSelect?.value === 'no';
    if (risk10kWrap) risk10kWrap.style.display = isDifferent ? 'flex' : 'none';
    if (riskPrimaryLabel) riskPrimaryLabel.textContent = isDifferent ? 'Risk % — 100K account' : 'Risk %';
    const risk10kInput = form?.querySelector('[name="risk_percent_10k"]');
    if (risk10kInput && !isDifferent) risk10kInput.value = '';
  };
  accountSelect?.addEventListener('change', syncRiskFields);
  sameRiskSelect?.addEventListener('change', syncRiskFields);

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetJournalFormSelections();
      const panel = document.getElementById('journal-form-panel');
      if (panel) panel.style.display = 'none';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.textContent = '';
      const isDraft = e.submitter?.id === 'journal-save-draft-btn';
      const fd = new FormData(form);
      const { data: { user } } = await sb.auth.getUser();

      const numOrNull = (name) => (fd.get(name) ? parseFloat(fd.get(name)) : null);

      const entry = {
        user_id: user?.id,
        status: isDraft ? 'draft' : 'complete',
        account: fd.get('account') || '100k',
        entry_date: fd.get('entry_date') || null,
        asset: (fd.get('asset') || '').trim().toUpperCase() || null,
        trade_type: fd.get('trade_type'),
        entry_time: fd.get('entry_time') || null,
        close_time: fd.get('close_time') || null,
        risk_percent: numOrNull('risk_percent'),
        risk_percent_10k: numOrNull('risk_percent_10k'),
        timeframe: journalFormSelections['jf-timeframe'],
        chart_links_before: (fd.get('chart_links_before') || '').trim() || null,
        emotion_before: journalFormSelections['jf-emotion-before'],
        setup_confirmations: journalFormSelections['jf-setup'],
        entry_price: numOrNull('entry_price'),
        stop_loss: numOrNull('stop_loss'),
        take_profit: numOrNull('take_profit'),
        close_price: numOrNull('close_price'),
        emotion_after: journalFormSelections['jf-emotion-after'],
        conclusion_lesson: (fd.get('conclusion_lesson') || '').trim() || null,
        chart_links_after: (fd.get('chart_links_after') || '').trim() || null
      };

      // Drafts only need a date to be findable later — everything else can
      // wait until the trade actually closes. Complete entries keep the
      // full original requirement.
      if (isDraft) {
        if (!entry.entry_date) {
          if (errorEl) errorEl.textContent = 'At least a date is needed to save a draft.';
          return;
        }
      } else if (!entry.asset || !entry.entry_date || entry.entry_price == null || entry.stop_loss == null || !entry.risk_percent) {
        if (errorEl) errorEl.textContent = 'Date, asset, entry price, stop loss, and risk % are required to mark this complete — or use "Save as draft" instead.';
        return;
      }

      const { error } = journalEditingEntryId
        ? await sb.from('trading_journal').update(entry).eq('id', journalEditingEntryId)
        : await sb.from('trading_journal').insert(entry);
      if (error) {
        if (errorEl) errorEl.textContent = 'Save failed: ' + error.message;
        return;
      }

      resetJournalFormSelections();
      const panel = document.getElementById('journal-form-panel');
      if (panel) panel.style.display = 'none';
      loadAndRenderJournalSection({ justSaved: !isDraft });
    });
  }
}

// ---------- History list ----------

function formatJournalLinks(text) {
  if (!text) return '<span class="card-meta">—</span>';
  return text.split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => `<a href="${escapeHtml(l)}" target="_blank" rel="noopener">${escapeHtml(l)}</a>`)
    .join('<br/>');
}

// ---------- Weekly compilation ----------
// Groups entries into Mon–Sun buckets (reusing the same week-math already used
// elsewhere in the app) so history reads as compiled weekly stats you can drill
// into, rather than one long flat list.
function groupJournalEntriesByWeek(entries) {
  const buckets = {}; // weekStartISO -> entries[]
  entries.forEach(e => {
    const monday = getMondayOfWeek(new Date(e.entry_date + 'T12:00:00'));
    const key = isoDate(monday);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(e);
  });
  return Object.keys(buckets)
    .sort((a, b) => b.localeCompare(a)) // most recent week first
    .map(weekStart => {
      const weekEntries = buckets[weekStart].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      return { weekStart, label: formatWeekRange(weekStart), entries: weekEntries, stats: computeJournalWeekStats(weekEntries) };
    });
}

function computeJournalWeekStats(weekEntries) {
  const complete = weekEntries.filter(e => e.status !== 'draft');
  let wins = 0, losses = 0, be = 0, netPnl = 0, closedCount = 0;
  complete.forEach(e => {
    const m = computeJournalMetrics(e);
    if (m.result === 'WIN') wins++;
    else if (m.result === 'LOSS') losses++;
    else if (m.result === 'BE') be++;
    if (m.pnlPercent != null) { netPnl += m.pnlPercent; closedCount++; }
  });
  const decided = wins + losses; // BE and open trades excluded from win-rate math
  const winRate = decided ? Math.round((wins / decided) * 100) : null;
  return { count: complete.length, wins, losses, be, winRate, netPnl, closedCount };
}

function renderJournalWeekHeader(group, isOpen) {
  const { label, stats } = group;
  const pnlColor = stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)';
  return `
    <div class="journal-week-header" data-week="${group.weekStart}">
      <span class="journal-week-chevron ${isOpen ? 'open' : ''}">▶</span>
      <span class="journal-week-range">${label}</span>
      <div class="journal-week-stats">
        <span>${stats.count} trade${stats.count !== 1 ? 's' : ''}</span>
        <span>${stats.winRate != null ? `<b>${stats.winRate}%</b> win rate` : '—'}</span>
        <span style="color:${pnlColor};"><b>${stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}%</b> net</span>
      </div>
    </div>
  `;
}

function renderJournalEntryRow(entry) {
  const isDraft = entry.status === 'draft';
  const m = computeJournalMetrics(entry);
  const badgeClass = m.result === 'WIN' ? 'win' : m.result === 'LOSS' ? 'loss' : m.result === 'BE' ? 'be' : '';
  const pnlText = m.pnlPercent != null ? `${m.pnlPercent >= 0 ? '+' : ''}${m.pnlPercent.toFixed(2)}%` : '—';
  const pnlColor = m.pnlPercent == null ? 'var(--text4)' : m.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)';
  const dateShort = (entry.entry_date || '').slice(5); // MM-DD, the week header already carries the year/range

  let statusBadge;
  if (isDraft) statusBadge = '<span class="journal-result-badge" style="background:var(--amber-bg);color:var(--amber);">📝 Draft</span>';
  else if (m.result) statusBadge = `<span class="journal-result-badge ${badgeClass}">${m.result}</span>`;
  else statusBadge = '<span class="card-meta">Open</span>';

  return `
    <div class="journal-entry-row" data-entry-id="${entry.id}">
      <div class="journal-row-grid">
        <span style="font-size:12px;color:var(--text2);">${dateShort || '—'}</span>
        <span style="font-size:11px;color:var(--text4);">${m.dayOfWeek ? m.dayOfWeek.slice(0, 3) : '—'}</span>
        <span style="font-size:12px;font-weight:500;color:var(--text2);">${escapeHtml(entry.asset || '—')}${entry.account === 'both' ? ' <span style="font-size:9px;color:var(--purple-light);font-weight:600;">BOTH</span>' : ''}</span>
        <span style="font-size:11px;color:var(--text3);">${entry.trade_type || '—'}</span>
        ${statusBadge}
        <span style="font-size:12px;font-weight:500;text-align:right;color:${pnlColor};">${pnlText}</span>
      </div>
      <div class="journal-entry-detail" id="journal-detail-${entry.id}">
        <div class="journal-grid-2">
          <div><b>Timeframe:</b> ${(entry.timeframe || []).join(', ') || '—'}</div>
          <div><b>Planned R:R:</b> ${m.plannedR != null ? '1:' + m.plannedR.toFixed(2) : '—'}</div>
          <div><b>Actual R:</b> ${m.actualR != null ? m.actualR.toFixed(2) + 'R' : '—'}</div>
          <div><b>Duration:</b> ${m.duration || '—'}</div>
          <div><b>Entry:</b> ${entry.entry_price ?? '—'}</div>
          <div><b>Stop loss:</b> ${entry.stop_loss ?? '—'}</div>
          <div><b>Take profit:</b> ${entry.take_profit ?? '—'}</div>
          <div><b>Close:</b> ${entry.close_price ?? '—'}</div>
          <div><b>Emotion before:</b> ${(entry.emotion_before || []).join(', ') || '—'}</div>
          <div><b>Emotion after:</b> ${(entry.emotion_after || []).join(', ') || '—'}</div>
        </div>
        <div style="margin-top:8px;"><b>Setup confirmations:</b> ${(entry.setup_confirmations || []).join(', ') || '—'}</div>
        <div style="margin-top:8px;"><b>Conclusion / lesson:</b><br/>${entry.conclusion_lesson ? escapeHtml(entry.conclusion_lesson) : '—'}</div>
        <div class="journal-links" style="margin-top:8px;"><b>Charts before:</b><br/>${formatJournalLinks(entry.chart_links_before)}</div>
        <div class="journal-links" style="margin-top:8px;"><b>Charts after:</b><br/>${formatJournalLinks(entry.chart_links_after)}</div>
        <div style="margin-top:10px;display:flex;gap:14px;align-items:center;">
          ${isDraft ? `<span class="journal-continue-btn" data-entry-id="${entry.id}" style="cursor:pointer;color:var(--amber);font-size:11px;font-weight:600;">✏️ Continue editing</span>` : ''}
          <span class="consistency-delete-btn journal-delete-btn" data-entry-id="${entry.id}" style="cursor:pointer;color:var(--red);font-size:11px;">Delete entry</span>
        </div>
      </div>
    </div>
  `;
}

function renderJournalWeekGroup(group, isOpen) {
  return `
    <div class="journal-week-group">
      ${renderJournalWeekHeader(group, isOpen)}
      <div class="journal-week-entries ${isOpen ? 'open' : ''}" id="journal-week-entries-${group.weekStart}">
        <div class="journal-row-grid journal-col-header">
          <span>Date</span><span>Day</span><span>Asset</span><span>Type</span><span>Result</span><span style="text-align:right;">P&amp;L</span>
        </div>
        ${group.entries.map(renderJournalEntryRow).join('')}
      </div>
    </div>
  `;
}

function attachJournalHistoryHandlers() {
  document.querySelectorAll('.journal-week-header').forEach(header => {
    header.addEventListener('click', () => {
      const week = header.dataset.week;
      const entriesEl = document.getElementById(`journal-week-entries-${week}`);
      const chevron = header.querySelector('.journal-week-chevron');
      if (entriesEl) entriesEl.classList.toggle('open');
      if (chevron) chevron.classList.toggle('open');
    });
  });
  document.querySelectorAll('.journal-entry-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('journal-delete-btn') || e.target.classList.contains('journal-continue-btn')) return;
      const id = row.dataset.entryId;
      const detail = document.getElementById(`journal-detail-${id}`);
      if (detail) detail.classList.toggle('open');
    });
  });
  document.querySelectorAll('.journal-continue-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entry = journalEntriesCache[btn.dataset.entryId];
      if (!entry) return;
      loadFormSelectionsFromEntry(entry);
      const panel = document.getElementById('journal-form-panel');
      if (panel) {
        panel.innerHTML = renderJournalEntryForm(entry);
        panel.style.display = 'block';
        attachJournalFormHandlers();
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  document.querySelectorAll('.journal-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this journal entry? This cannot be undone.')) return;
      const { error } = await sb.from('trading_journal').delete().eq('id', btn.dataset.entryId);
      if (error) { alert('Delete failed: ' + error.message); return; }
      loadAndRenderJournalSection();
    });
  });
}

function computeJournalOverallStats(entries) {
  const complete = entries.filter(e => e.status !== 'draft');
  let wins = 0, losses = 0, netPnl = 0;
  const rValues = [];
  complete.forEach(e => {
    const m = computeJournalMetrics(e);
    if (m.result === 'WIN') wins++;
    else if (m.result === 'LOSS') losses++;
    if (m.pnlPercent != null) netPnl += m.pnlPercent;
    if (m.actualR != null) rValues.push(m.actualR);
  });
  const decided = wins + losses;
  const winRate = decided ? Math.round((wins / decided) * 100) : null;
  const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
  return { total: complete.length, winRate, avgR, netPnl };
}

// ---------- Section orchestrator ----------

async function loadAndRenderJournalSection(opts = {}) {
  const el = document.getElementById('journal-section');
  if (!el) return;
  if (opts.account) journalCurrentAccount = opts.account;

  const [, { data: entriesRaw }, tradesInfo] = await Promise.all([
    loadJournalTags(),
    sb.from('trading_journal').select('*').or(`account.eq.${journalCurrentAccount},account.eq.both`).order('entry_date', { ascending: false }),
    loadRecentTradesForJournal(journalCurrentAccount)
  ]);
  journalRecentTradesInfo = tradesInfo;
  const entries = entriesRaw || [];
  journalEntriesCache = {};
  entries.forEach(e => { journalEntriesCache[e.id] = e; });
  resetJournalFormSelections();

  const weekGroups = groupJournalEntriesByWeek(entries);
  const overall = computeJournalOverallStats(entries);

  el.innerHTML = `
    ${opts.justSaved ? `
      <div class="card" style="border-left:2px solid var(--green);margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--green);font-weight:600;">✅ Journal entry saved.</span>
          <button type="button" class="btn-secondary" id="journal-proceed-discipline-btn">Proceed with discipline session →</button>
        </div>
      </div>
    ` : ''}
    <div class="card">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">Trading journal</p>
        <button type="button" class="btn-secondary" id="journal-new-toggle">+ New entry</button>
      </div>
      <div id="journal-form-panel" style="display:none;margin-bottom:14px;">
        ${renderJournalEntryForm()}
      </div>
      ${entries.length ? `
        <div class="stat-grid-4" style="margin-bottom:14px;">
          <div class="stat-box"><div class="stat-box-value">${overall.total}</div><div class="stat-box-label">Total trades</div></div>
          <div class="stat-box"><div class="stat-box-value ${overall.winRate != null && overall.winRate >= 50 ? 'g' : 'a'}">${overall.winRate != null ? overall.winRate + '%' : '—'}</div><div class="stat-box-label">Win rate</div></div>
          <div class="stat-box"><div class="stat-box-value ${overall.avgR != null && overall.avgR >= 0 ? 'g' : 'r'}">${overall.avgR != null ? (overall.avgR >= 0 ? '+' : '') + overall.avgR.toFixed(2) + 'R' : '—'}</div><div class="stat-box-label">Avg R-multiple</div></div>
          <div class="stat-box"><div class="stat-box-value ${overall.netPnl >= 0 ? 'g' : 'r'}">${overall.netPnl >= 0 ? '+' : ''}${overall.netPnl.toFixed(1)}%</div><div class="stat-box-label">Total P&amp;L</div></div>
        </div>
      ` : ''}
      <div id="journal-history-list">
        ${weekGroups.length
          ? weekGroups.map((g, i) => renderJournalWeekGroup(g, i === 0)).join('')
          : '<p class="empty-state">No journal entries yet — log your first trade above.</p>'}
      </div>
    </div>
  `;

  const proceedBtn = document.getElementById('journal-proceed-discipline-btn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', async () => {
      await renderTradingOverview();
      await loadAndRenderDisciplineSection(); // ensure it's actually rendered before we try to open it
      const sessionPanel = document.getElementById('session-form-panel');
      if (sessionPanel) sessionPanel.style.display = 'block';
      document.getElementById('discipline-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const toggleBtn = document.getElementById('journal-new-toggle');
  const panel = document.getElementById('journal-form-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  }
  attachJournalFormHandlers();
  attachJournalHistoryHandlers();
}

// ============================================
// FITNESS TAB
// ============================================

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
const CARDIO_TYPES = ['Running', 'Cycling', 'Boxing', 'Tennis'];
const STRENGTH_LIFTS = [
  { name: 'Bench press', unit: 'lb' },
  { name: 'Squat', unit: 'lb' },
  { name: 'Deadlift', unit: 'lb' },
  { name: 'Overhead press', unit: 'lb' },
  { name: 'Pull-ups', unit: 'reps' }
];
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Real weekly split — dowIndex matches getWeekDates()'s Mon-first ordering
// (0=Mon...6=Sun). Marking a day complete checks off every muscle listed
// here for that day's date in fitness_muscle_log; no new table needed —
// this just writes to the same per-muscle rows the old grid did, in bulk.
const WORKOUT_SCHEDULE = [
  { dowIndex: 0, day: 'Monday',    type: 'Push',    muscles: ['Chest', 'Triceps'] },
  { dowIndex: 1, day: 'Tuesday',   type: 'Pull',     muscles: ['Back', 'Biceps'] },
  { dowIndex: 3, day: 'Thursday',  type: 'Push',    muscles: ['Chest', 'Shoulders'] },
  { dowIndex: 4, day: 'Friday',    type: 'Leg Day', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
];

function renderWorkoutScheduleCard(muscleMap, thisWeekDates, todayStr) {
  const dayCards = WORKOUT_SCHEDULE.map(w => {
    const dayDate = thisWeekDates[w.dowIndex];
    const isComplete = w.muscles.every(m => muscleMap[`${m}-${dayDate}`]);
    const isToday = dayDate === todayStr;
    const isPast = dayDate < todayStr;
    const badge = isComplete
      ? '<span style="font-size:11px;font-weight:600;color:var(--green);">✅ Complete</span>'
      : isToday
        ? '<span style="font-size:11px;font-weight:600;color:var(--purple-light);">🔵 Today</span>'
        : isPast
          ? '<span style="font-size:11px;color:var(--text4);">Missed</span>'
          : '<span style="font-size:11px;color:var(--text4);">Upcoming</span>';

    return `
      <div class="card" style="margin-bottom:8px;${isComplete ? 'border-left:2px solid var(--green);' : isToday ? 'border-left:2px solid var(--purple);' : ''}" data-workout-day="${w.dowIndex}">
        <div class="card-header" style="margin-bottom:6px;">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">${w.day}</div>
            <div style="font-size:11px;color:var(--text4);">${dayDate}</div>
          </div>
          ${badge}
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--purple-light);margin-bottom:4px;">${w.type}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          ${w.muscles.map(m => `<span class="tag-chip" style="cursor:default;">${escapeHtml(m)}</span>`).join('')}
        </div>
        <button type="button" class="btn-secondary workout-complete-toggle" data-dow="${w.dowIndex}" data-date="${dayDate}"
          style="${isComplete ? 'background:var(--bg3);color:var(--text3);' : ''}">
          ${isComplete ? '↺ Undo' : '✓ Mark complete'}
        </button>
      </div>`;
  }).join('');

  const completedCount = WORKOUT_SCHEDULE.filter(w => {
    const dayDate = thisWeekDates[w.dowIndex];
    return w.muscles.every(m => muscleMap[`${m}-${dayDate}`]);
  }).length;
  const weeklyPct = Math.round((completedCount / WORKOUT_SCHEDULE.length) * 100);

  return `
    <div class="card">
      <p class="card-title">Weekly training</p>
      ${dayCards}
      <div style="margin-top:4px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px;">
          <span>Weekly completion</span>
          <span style="font-weight:600;color:${weeklyPct === 100 ? 'var(--green)' : 'var(--text2)'};">${completedCount} / ${WORKOUT_SCHEDULE.length} &middot; ${weeklyPct}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${weeklyPct}%;background:${weeklyPct === 100 ? 'var(--green)' : 'var(--purple)'};"></div></div>
      </div>
    </div>`;
}

async function toggleWorkoutDay(weekStart, dayDate, muscles, markComplete) {
  const userId = (await sb.auth.getUser()).data.user?.id;
  await Promise.all(muscles.map(async (muscle) => {
    const { data: existing } = await sb.from('fitness_muscle_log').select('id')
      .eq('week_start', weekStart).eq('muscle_group', muscle).eq('day_date', dayDate).maybeSingle();
    if (existing) {
      await sb.from('fitness_muscle_log').update({ trained: markComplete }).eq('id', existing.id);
    } else {
      await sb.from('fitness_muscle_log').insert({ week_start: weekStart, muscle_group: muscle, day_date: dayDate, trained: markComplete, user_id: userId });
    }
  }));
  await syncWorkoutDoneForDate(dayDate);
}

function attachWorkoutScheduleHandlers(weekStart) {
  document.querySelectorAll('.workout-complete-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const dow = Number(btn.dataset.dow);
      const dayDate = btn.dataset.date;
      const schedule = WORKOUT_SCHEDULE.find(w => w.dowIndex === dow);
      const isCurrentlyComplete = btn.textContent.trim().startsWith('↺');
      await toggleWorkoutDay(weekStart, dayDate, schedule.muscles, !isCurrentlyComplete);
      renderFitnessTab();
    });
  });
}
const WEIGHT_GOAL_LBS = 200;

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
    safeQuery(sb.from('fitness_photos').select('*').eq('week_start', thisWeek)),
    safeQuery(sb.from('fitness_daily_session').select('*').eq('session_date', today).limit(1)),
    safeQuery(sb.from('fitness_weight_log').select('progressive_overload,cheat_days').eq('week_start', thisWeek).limit(1))
  ]);

  const todayFitnessSession = todaySessionArr[0] || null;
  const weekData = weekDataArr[0] || {};
  const progressiveOverload = weekData.progressive_overload || false;
  const cheatDays = weekData.cheat_days || 0;

  // ── This week live stats (always reflect current state) ──
  const thisMuscleTrainingDays = new Set(muscleThis.filter(r => r.trained).map(r => r.day_date));
  const thisCardioDays   = new Set(cardioThis.filter(r => r.done).map(r => r.day_date));
  // "Days trained" counts any day with weight training OR cardio — cardio
  // sessions still get their own separate stat below, this just also
  // credits them toward the overall trained-days total.
  const thisTrainingDays = new Set([...thisMuscleTrainingDays, ...thisCardioDays]);
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

  // ── Weight & goal ──
  const weightGoalPct = currentWeight ? Math.min(100, (currentWeight / WEIGHT_GOAL_LBS) * 100) : 0;
  const weightToGo    = currentWeight ? Math.max(0, WEIGHT_GOAL_LBS - currentWeight) : null;

  // ── Photos ──
  // fitness-photos is a private bucket, so getPublicUrl() (used at upload
  // time previously) produced a URL that looks valid but 403s when the
  // <img> tag actually tries to load it — the upload silently "worked" but
  // the photo could never actually display. Signed URLs are the correct
  // access method for a private bucket; generated fresh on every render
  // (1 hour expiry) rather than stored, so they never go stale.
  let frontPhoto = photoRows.find(r => r.photo_type === 'front');
  let backPhoto  = photoRows.find(r => r.photo_type === 'back');
  await Promise.all([frontPhoto, backPhoto].filter(Boolean).map(async (photo) => {
    if (!photo.path) return;
    const { data: signedData } = await sb.storage.from('fitness-photos').createSignedUrl(photo.path, 3600);
    if (signedData?.signedUrl) photo.url = signedData.signedUrl;
  }));

  // ── Week status message ──
  let weekStatus, weekStatusColor;
  const scheduledDays = WORKOUT_SCHEDULE.length;
  if (thisTrainingDays.size >= scheduledDays) {
    weekStatus = `✅ Training goal hit — ${scheduledDays} days done`;
    weekStatusColor = 'var(--green)';
  } else if (thisTrainingDays.size >= Math.ceil(scheduledDays / 2)) {
    weekStatus = `💪 ${thisTrainingDays.size} of ${scheduledDays} days done — keep going`;
    weekStatusColor = 'var(--amber)';
  } else if (thisTrainingDays.size > 0) {
    weekStatus = `${thisTrainingDays.size} of ${scheduledDays} training days logged so far`;
    weekStatusColor = 'var(--text3)';
  } else {
    weekStatus = 'No training logged yet this week';
    weekStatusColor = 'var(--text4)';
  }

  // ── Render ──
  container.innerHTML = `

    <!-- Hero: weight progress toward goal -->
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <div class="hero-label">Current weight</div>
          <div class="hero-value">${currentWeight != null ? currentWeight + ' lb' : '—'}</div>
          <div class="hero-sub">${weightToGo != null ? `${weightToGo.toFixed(1)} lb to goal &middot; ${WEIGHT_GOAL_LBS} lb target` : `Goal: ${WEIGHT_GOAL_LBS} lb`}</div>
        </div>
        <span class="hero-status-pill" style="border:0.5px solid ${weekStatusColor};color:${weekStatusColor};">${weekStatus}</span>
      </div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${weightGoalPct}%;background:var(--purple-light);"></div></div>
      <div class="hero-progress-caption"><span>Progress to weight goal</span><span>${weightGoalPct.toFixed(0)}%</span></div>
    </div>

    <!-- This week live summary -->
    <div class="card" style="border-left: 2px solid ${weekStatusColor};">
      <div class="card-header">
        <p class="card-title" style="margin-bottom:0;">This week — ${formatWeekRange(thisWeek)}</p>
        <span style="font-size:11px; font-weight:500; color:${weekStatusColor};">${weekStatus}</span>
      </div>
      <div style="font-size:11px; color:var(--text4); margin-bottom:10px;">
        Live — updates as you check boxes below. Final snapshot locks in Sunday night.
      </div>
      <div class="stat-grid-3">
        <div class="stat-box"><div class="stat-box-value" style="color:${weekStatusColor};">${thisTrainingDays.size} / ${WORKOUT_SCHEDULE.length}</div><div class="stat-box-label">Days trained</div></div>
        <div class="stat-box"><div class="stat-box-value">${thisCardioDays.size}</div><div class="stat-box-label">Cardio sessions</div></div>
        <div class="stat-box"><div class="stat-box-value ${thisSleep7Count >= 5 ? 'g' : 'a'}">${thisSleep7Count} / 7</div><div class="stat-box-label">7h+ sleep days</div></div>
      </div>
    </div>

    ${renderWorkoutScheduleCard(muscleMap, thisWeekDates, today)}

    <!-- Cardio grid -->
    <div class="card">
      <p class="card-title">Cardio — this week</p>
      ${renderCardioGrid(cardioMap, thisWeekDates)}
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

  attachWorkoutScheduleHandlers(thisWeek);
  attachCardioGridHandlers(thisWeek);
  attachStrengthHandlers();
  attachWeightSleepHandlers(thisWeek, thisWeekDates);
  attachPhotoHandlers(thisWeek);
  attachFitnessSessionHandlers(thisWeek, weekData);
  updateFitnessScorePreview();

  // Load KPI stats section async
  loadAndRenderFitnessDiscipline(thisWeek);
}

// ── Grid renderers ──

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
      <label style="position:absolute;bottom:8px;right:8px;background:var(--purple);color:var(--purple-ink);border-radius:6px;padding:4px 10px;font-size:10px;font-weight:500;cursor:pointer;">
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
      await syncWorkoutDoneForDate(day_date);
    });
  });
}

// Cardio and weight training both count as "the workout" for the day —
// checking either one (or both) auto-reflects in Log today's session's
// "Workout completed as planned" instead of needing to check it a third
// time. Recomputed from scratch on every toggle (not just set-to-true) so
// unchecking the only activity of the day correctly flips it back off,
// while other still-completed activity keeps it on.
async function syncWorkoutDoneForDate(dayDate) {
  const [{ data: muscleRows }, { data: cardioRows }, { data: existingArr }] = await Promise.all([
    sb.from('fitness_muscle_log').select('trained').eq('day_date', dayDate).eq('trained', true).limit(1),
    sb.from('fitness_cardio_log').select('done').eq('day_date', dayDate).eq('done', true).limit(1),
    sb.from('fitness_daily_session').select('*').eq('session_date', dayDate).limit(1)
  ]);
  const anyActivity = (muscleRows && muscleRows.length > 0) || (cardioRows && cardioRows.length > 0);
  const existing = existingArr?.[0] || null;

  // Don't create a session row for a day nothing happened on and none existed.
  if (!existing && !anyActivity) return;

  const { data: { user } } = await sb.auth.getUser();
  const session = {
    session_date: dayDate,
    user_id: user?.id,
    workout_done: anyActivity,
    protein_done: existing?.protein_done || false,
    nutrition_done: existing?.nutrition_done || false,
    energy_rating: existing?.energy_rating ?? null,
  };
  session.discipline_score = calcFitnessDailyScore(session);
  await sb.from('fitness_daily_session').upsert(session, { onConflict: 'user_id,session_date' });
}

// Mirrors syncWorkoutDoneForDate — '160g protein' (checked from Daily tab's
// Consistency check, now the only place it's checkable) is the single
// source of truth for "Protein target reached", so it never needs to be
// separately re-checked in Log today's session.
async function syncProteinDoneForDate(dayDate) {
  const { data: proteinRow } = await sb.from('consistency_log').select('completed')
    .eq('log_date', dayDate).eq('item_name', '160g protein').maybeSingle();
  const proteinDone = proteinRow?.completed || false;

  const { data: existingArr } = await sb.from('fitness_daily_session').select('*').eq('session_date', dayDate).limit(1);
  const existing = existingArr?.[0] || null;

  if (!existing && !proteinDone) return;

  const { data: { user } } = await sb.auth.getUser();
  const session = {
    session_date: dayDate,
    user_id: user?.id,
    workout_done: existing?.workout_done || false,
    protein_done: proteinDone,
    nutrition_done: existing?.nutrition_done || false,
    energy_rating: existing?.energy_rating ?? null,
  };
  session.discipline_score = calcFitnessDailyScore(session);
  await sb.from('fitness_daily_session').upsert(session, { onConflict: 'user_id,session_date' });
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

      const label = e.target.closest('label');
      const originalContent = label ? label.innerHTML : null;
      if (label) label.innerHTML = '<div style="font-size:11px;color:var(--text4);padding:20px;text-align:center;">Uploading…</div>';

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${weekStart}/${photo_type}.${ext}`;
      const { error } = await sb.storage.from('fitness-photos').upload(path, file, { upsert: true });
      if (error) {
        console.error('Photo upload error:', error.message);
        alert(`Could not upload photo: ${error.message}`);
        if (label && originalContent) label.innerHTML = originalContent;
        return;
      }
      // Note: no getPublicUrl() here — fitness-photos is a private bucket,
      // so that would produce a URL that looks valid but never actually
      // loads. renderFitnessTab() generates a proper signed URL on each
      // render instead; this just needs to store the path.
      const { data: existing } = await sb.from('fitness_photos').select('id')
        .eq('week_start', weekStart).eq('photo_type', photo_type).maybeSingle();
      if (existing) {
        await sb.from('fitness_photos').update({ path }).eq('id', existing.id);
      } else {
        await sb.from('fitness_photos').insert({ week_start: weekStart, photo_type, path, user_id: (await sb.auth.getUser()).data.user?.id });
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

// Like calcChecklistGroupStats, but the expected item list varies per day
// (weekday vs weekend wake-time item) instead of being one fixed list.
async function calcMorningRoutineGroupStats() {
  const todayStr = todayISO();
  const startStr = addDaysISO(todayStr, -29);
  const { data } = await sb.from('morning_routine_log').select('log_date, item_name, completed')
    .gte('log_date', startStr).lte('log_date', todayStr);
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
    const expected = morningRoutineItemsForDate(d);
    const done = expected.filter(n => entry[n]).length;
    return done / expected.length;
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
    const expectedForDay = itemNames.filter(n => n !== 'Zinc' || isZincDay(d));
    if (!expectedForDay.length) return 1; // nothing was due that day — treat as fully compliant
    const done = expectedForDay.filter(n => {
      if (n === 'Gym') return entry[n] || walkedByDate[d];
      return entry[n];
    }).length;
    return done / expectedForDay.length;
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
    calcMorningRoutineGroupStats(),
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

// Goal 2 — FTMO Challenge Progress (the $100K challenge specifically)
async function computeTradingChallengeGoal() {
  const [settingsRes, tradesRes] = await Promise.all([
    sb.from('trading_settings').select('*').limit(1),
    sb.from('trades').select('open_time, profit, swap, commission').eq('account', '100k'),
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

// How much each priority tier counts toward the Overall score — critical
// goals move the needle 3x as much as medium ones, instead of every goal
// counting equally regardless of its priority badge.
const PRIORITY_WEIGHT = { critical: 3, high: 2, medium: 1, support: 1 };

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
  const weightOf = (id) => PRIORITY_WEIGHT[GOALS_META.find(m => m.id === id)?.priority] || 1;
  const weightSum = scored.reduce((s, g) => s + weightOf(g.id), 0);
  const overall_score = weightSum
    ? Math.round(scored.reduce((s, g) => s + (g.score || 0) * weightOf(g.id), 0) / weightSum)
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
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <div class="hero-label">2026 Goals — Overall</div>
          <div class="hero-value" style="color:${sc(overall_score)};">${overall_score}<span style="font-size:var(--fs-md);color:var(--text4);">%</span></div>
          <div class="hero-sub">${period==='weekly' ? weekLabel : monthLabel} &middot; updated ${cachedLabel}</div>
        </div>
        <div style="text-align:right;">
          <div style="display:flex;gap:4px;margin-bottom:8px;">
            <button onclick="renderGoalsUI(window._lastGoalsAnalysis,window._lastGoalsCachedAt,'weekly')"
              style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer;border:0.5px solid ${period==='weekly'?'var(--purple)':'var(--border)'};background:${period==='weekly'?'var(--purple)':'var(--bg2)'};color:${period==='weekly'?'var(--purple-ink)':'var(--text4)'};">
              This week
            </button>
            <button onclick="triggerGoalsAnalysis('monthly',false)"
              style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer;border:0.5px solid ${period==='monthly'?'var(--purple)':'var(--border)'};background:${period==='monthly'?'var(--purple)':'var(--bg2)'};color:${period==='monthly'?'var(--purple-ink)':'var(--text4)'};">
              This month
            </button>
          </div>
          <button class="btn-secondary" onclick="triggerGoalsAnalysis('${period}',true)" style="font-size:11px;">🔄 Refresh</button>
        </div>
      </div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${overall_score}%;background:${sc(overall_score)};"></div></div>
      <div class="hero-progress-caption"><span>${onTrack} on track &middot; ${atRisk} at risk &middot; ${6-onTrack-atRisk} no data</span><span>${overall_score}%</span></div>
    </div>

    ${summary ? `<div class="card" style="border-left:2px solid var(--purple);">
      <p class="card-title" style="margin-bottom:6px;">${period==='monthly'?'Monthly':'Weekly'} summary</p>
      <p style="font-size:var(--fs-sm);color:var(--purple-light);line-height:1.7;">${escapeHtml(summary)}</p>
    </div>` : ''}
    ${top_priority ? `<div class="card" style="border-left:2px solid var(--amber);">
      <p class="card-title" style="margin-bottom:6px;">Top priority this ${period==='monthly'?'month':'week'}</p>
      <p style="font-size:var(--fs-base);color:var(--amber);font-weight:600;">${escapeHtml(top_priority)}</p>
    </div>` : ''}

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

// ============================================
// EXPENSES TAB
// ============================================

const EXPENSE_CATEGORIES = [
  'Groceries', 'Restaurants', 'Subscriptions', 'Leisure/Entertainment',
  'Transport', 'Phone & Utilities', 'Health', 'Trading Expenses'
];

function firstOfMonthISO(d = new Date()) {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

async function renderExpensesTab() {
  const container = document.getElementById('tab-content');
  container.innerHTML = `<p class="loading-text">Loading expenses...</p>`;
  const user = await requireAuth();
  if (!user) return;

  const thisMonth = firstOfMonthISO();
  const monthLabel = new Date(thisMonth + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const twelveMonthsAgo = isoDate(new Date(new Date(thisMonth + 'T00:00:00').getFullYear(), new Date(thisMonth + 'T00:00:00').getMonth() - 11, 1));

  const [allCategoryRows, reviewRows, recentRows] = await Promise.all([
    safeQuery(sb.from('expense_by_category_monthly').select('*').gte('month', twelveMonthsAgo).order('month', { ascending: true })),
    safeQuery(sb.from('expense_log').select('*').eq('status', 'needs_review').order('created_at', { ascending: false })),
    safeQuery(sb.from('expense_log').select('*').eq('status', 'confirmed').order('expense_date', { ascending: false }).limit(20)),
  ]);

  const categoryRows = allCategoryRows.filter(r => r.month === thisMonth);
  const monthTotal = categoryRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const monthCount = categoryRows.reduce((s, r) => s + Number(r.transaction_count || 0), 0);
  const reviewCount = reviewRows.length;

  container.innerHTML = `
    <div class="hero-card">
      <div class="hero-top">
        <div>
          <div class="hero-label">${monthLabel}</div>
          <div class="hero-value">$${monthTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div class="hero-sub">${monthCount} transaction${monthCount !== 1 ? 's' : ''} logged this month</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
          <span class="hero-status-pill" style="border:0.5px solid ${reviewCount ? 'var(--amber)' : 'var(--green)'};color:${reviewCount ? 'var(--amber)' : 'var(--green)'};">${reviewCount ? `⚠️ ${reviewCount} need review` : '✓ All reviewed'}</span>
          <button class="btn-secondary" id="expense-add-btn">+ Add expense</button>
        </div>
      </div>
      <div id="expense-add-form-wrap"></div>
    </div>

    ${reviewCount ? `
      <div class="card" id="expense-review-card">
        <p class="card-title">Needs review</p>
        <div id="expense-review-list"></div>
      </div>
    ` : ''}

    <div class="two-col">
      <div class="card">
        <p class="card-title">${monthLabel} by category</p>
        <div class="chart-wrap-sm"><canvas id="expense-category-chart"></canvas></div>
      </div>
      <div class="card">
        <p class="card-title">Monthly trend</p>
        <div class="chart-wrap-sm"><canvas id="expense-trend-chart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <p class="card-title">Recent expenses</p>
      ${recentRows.length ? '<div class="chart-wrap-sm"><canvas id="expense-recent-chart"></canvas></div>' : ''}
      <div id="expense-recent-list" style="margin-top:10px;">
        ${recentRows.length ? recentRows.map(r => renderExpenseRow(r)).join('') : '<p class="empty-state">No confirmed expenses yet.</p>'}
      </div>
    </div>
  `;

  if (reviewCount) {
    const listEl = document.getElementById('expense-review-list');
    const duplicateOriginalIds = [...new Set(reviewRows.filter(r => r.duplicate_of).map(r => r.duplicate_of))];
    const originals = duplicateOriginalIds.length
      ? await safeQuery(sb.from('expense_log').select('id,vendor,amount,expense_date,currency').in('id', duplicateOriginalIds))
      : [];
    const originalsById = Object.fromEntries(originals.map(o => [o.id, o]));
    listEl.innerHTML = reviewRows.map(r => renderReviewRow(r, originalsById[r.duplicate_of])).join('');
    attachReviewRowHandlers(reviewRows);
  }

  renderExpenseCharts(categoryRows, allCategoryRows, recentRows);
  attachExpenseAddHandlers();
  attachRecentExpenseHandlers(recentRows);
}

// Edit button on any already-logged (confirmed) expense — reuses the same
// correction form/flow as the review queue's "Correct" action: inserts a
// new corrected row with corrects_id, marks the original superseded. No
// direct edit of amount/vendor/category ever happens on an existing row.
function attachRecentExpenseHandlers(recentRows) {
  document.querySelectorAll('.expense-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = recentRows.find(r => r.id === btn.dataset.id);
      if (row) openCorrectExpenseForm(row);
    });
  });
}

function renderExpenseRow(r) {
  const dateLabel = r.expense_date || '—';
  const amountLabel = r.amount != null ? `$${Number(r.amount).toFixed(2)} ${r.currency || ''}`.trim() : '—';
  return `
    <div>
      <div class="check-row">
        <span class="check-label" style="min-width:80px;color:var(--text4);">${dateLabel}</span>
        <span class="check-label" style="flex:1;">${escapeHtml(r.vendor || '(unknown vendor)')}</span>
        <span class="check-label" style="min-width:110px;color:var(--text3);">${escapeHtml(r.category || '—')}</span>
        <span class="check-label" style="min-width:90px;text-align:right;font-weight:500;">${amountLabel}</span>
        <span class="expense-edit-btn" data-id="${r.id}" title="Edit" style="cursor:pointer;color:var(--text4);font-size:12px;padding:2px 6px;">✏️</span>
      </div>
      <div id="expense-correct-form-${r.id}"></div>
    </div>
  `;
}

function renderReviewRow(r, original) {
  const amountLabel = r.amount != null ? `$${Number(r.amount).toFixed(2)} ${r.currency || ''}`.trim() : 'missing amount';

  if (r.duplicate_of) {
    const origLabel = original
      ? `${escapeHtml(original.vendor || '(unknown)')} — $${Number(original.amount).toFixed(2)} ${original.currency || ''} on ${original.expense_date}`
      : 'an existing entry';
    return `
      <div class="card" style="background:var(--amber-bg);border:0.5px solid var(--amber-border);margin-bottom:8px;" data-review-id="${r.id}">
        <div style="font-size:12px;font-weight:500;color:var(--text2);">⚠️ Possible duplicate</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;">New: ${escapeHtml(r.vendor || '(unknown vendor)')} — ${amountLabel} on ${r.expense_date || 'no date'}</div>
        <div style="font-size:11px;color:var(--text4);margin-top:2px;">Matches: ${origLabel}</div>
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button type="button" class="btn-secondary expense-delete-dup-btn" data-id="${r.id}" style="background:var(--red);">🗑 Delete this one</button>
          <button type="button" class="btn-secondary expense-keep-both-btn" data-id="${r.id}" style="background:var(--bg3);color:var(--text2);">Keep both — not a duplicate</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="card" style="background:var(--amber-bg);border:0.5px solid var(--amber-border);margin-bottom:8px;" data-review-id="${r.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text2);">${escapeHtml(r.vendor || '(unknown vendor)')} — ${amountLabel}</div>
          <div style="font-size:11px;color:var(--text4);margin-top:2px;">${r.expense_date || 'no date'} · ${escapeHtml(r.category || 'no category')}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn-secondary expense-confirm-btn" data-id="${r.id}" style="background:var(--green);">✓ Confirm</button>
          <button type="button" class="btn-secondary expense-correct-btn" data-id="${r.id}" style="background:var(--bg3);color:var(--text2);">✏️ Correct</button>
        </div>
      </div>
      <div id="expense-correct-form-${r.id}"></div>
    </div>
  `;
}

function attachReviewRowHandlers(reviewRows) {
  document.querySelectorAll('.expense-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { error } = await sb.from('expense_log').update({ status: 'confirmed' }).eq('id', btn.dataset.id);
      if (error) { alert('Could not confirm — try again.'); btn.disabled = false; return; }
      renderExpensesTab();
    });
  });

  document.querySelectorAll('.expense-correct-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = reviewRows.find(r => r.id === btn.dataset.id);
      if (row) openCorrectExpenseForm(row);
    });
  });

  // Duplicate resolution — only rows with duplicate_of set are ever deletable;
  // this relies entirely on the narrow DELETE policy in the database, not
  // just on this button existing.
  document.querySelectorAll('.expense-delete-dup-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Permanently delete this duplicate entry? This cannot be undone.')) return;
      btn.disabled = true;
      const { error } = await sb.from('expense_log').delete().eq('id', btn.dataset.id);
      if (error) { alert('Could not delete — try again.'); btn.disabled = false; return; }
      renderExpensesTab();
    });
  });

  document.querySelectorAll('.expense-keep-both-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { error } = await sb.from('expense_log').update({ status: 'confirmed', duplicate_of: null }).eq('id', btn.dataset.id);
      if (error) { alert('Could not update — try again.'); btn.disabled = false; return; }
      renderExpensesTab();
    });
  });
}

function openCorrectExpenseForm(row) {
  const wrap = document.getElementById(`expense-correct-form-${row.id}`);
  if (!wrap) return;
  if (wrap.innerHTML.trim()) { wrap.innerHTML = ''; return; } // toggle closed if already open

  wrap.innerHTML = `
    <form class="expense-correct-form" style="display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:10px;border-top:0.5px solid var(--amber-border);">
      <div class="settings-grid">
        <div class="settings-field"><label>Vendor</label><input type="text" name="vendor" value="${escapeHtml(row.vendor || '')}" /></div>
        <div class="settings-field"><label>Amount</label><input type="text" name="amount" value="${row.amount ?? ''}" /></div>
        <div class="settings-field"><label>Date</label><input type="date" name="expense_date" value="${row.expense_date || todayISO()}" /></div>
        <div class="settings-field">
          <label>Category</label>
          <select name="category" style="width:100%;background:var(--bg3);border:0.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:12px;color:var(--text2);">
            <option value="">—</option>
            ${EXPENSE_CATEGORIES.map(c => `<option value="${c}" ${row.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="submit" class="btn-secondary">Save correction</button>
      </div>
      <div class="expense-correct-error" style="font-size:11px;color:var(--red);"></div>
    </form>
  `;

  wrap.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errorEl = wrap.querySelector('.expense-correct-error');
    const amount = parseFloat(fd.get('amount'));
    if (!fd.get('vendor') || isNaN(amount) || amount <= 0 || !fd.get('expense_date') || !fd.get('category')) {
      errorEl.textContent = 'All fields are required, amount must be a positive number.';
      return;
    }
    await submitExpenseCorrection(row, {
      vendor: fd.get('vendor').trim(),
      amount,
      expense_date: fd.get('expense_date'),
      category: fd.get('category'),
      currency: row.currency || 'CAD',
    });
  });
}

async function submitExpenseCorrection(original, corrected) {
  const { data: inserted, error: insertError } = await sb.from('expense_log').insert({
    ...corrected,
    source: 'manual_correction',
    status: 'confirmed',
    corrects_id: original.id,
  }).select().single();

  if (insertError) { alert('Could not save correction — try again.'); return; }

  const { error: updateError } = await sb.from('expense_log').update({ status: 'superseded' }).eq('id', original.id);
  if (updateError) console.error('Could not mark original superseded:', updateError.message);

  renderExpensesTab();
}

function attachExpenseAddHandlers() {
  const btn = document.getElementById('expense-add-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const wrap = document.getElementById('expense-add-form-wrap');
    if (wrap.innerHTML.trim()) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <form id="expense-manual-form" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:0.5px solid var(--border2);">
        <div class="settings-grid">
          <div class="settings-field"><label>Vendor</label><input type="text" name="vendor" required /></div>
          <div class="settings-field"><label>Amount</label><input type="text" name="amount" required /></div>
          <div class="settings-field"><label>Date</label><input type="date" name="expense_date" value="${todayISO()}" required /></div>
          <div class="settings-field">
            <label>Category</label>
            <select name="category" required style="width:100%;background:var(--bg3);border:0.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:12px;color:var(--text2);">
              <option value="">—</option>
              ${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="submit" class="btn-secondary">Add expense</button>
        </div>
        <div id="expense-manual-error" style="font-size:11px;color:var(--red);"></div>
      </form>
    `;
    document.getElementById('expense-manual-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errorEl = document.getElementById('expense-manual-error');
      const amount = parseFloat(fd.get('amount'));
      if (!fd.get('vendor') || isNaN(amount) || amount <= 0) {
        errorEl.textContent = 'Enter a vendor and a valid amount.';
        return;
      }
      const { error } = await sb.from('expense_log').insert({
        vendor: fd.get('vendor').trim(),
        amount,
        expense_date: fd.get('expense_date'),
        category: fd.get('category') || null,
        currency: 'CAD',
        source: 'manual',
        status: 'confirmed',
      });
      if (error) { errorEl.textContent = 'Could not save — try again.'; return; }
      renderExpensesTab();
    });
  });
}

const EXPENSE_CHARTS = {};

// Fixed color per category — used by both charts so "Transport" is always
// the same color whether you're looking at this month's doughnut or the
// 12-month trend.
const CATEGORY_COLORS = {
  'Groceries': '#6366F1',
  'Restaurants': '#378ADD',
  'Subscriptions': '#1D9E75',
  'Leisure/Entertainment': '#EF9F27',
  'Transport': '#E24B4A',
  'Phone & Utilities': '#8B5CF6',
  'Health': '#94A3B8',
  'Trading Expenses': '#F6BF26',
};

function renderExpenseCharts(categoryRows, allCategoryRows, recentRows) {
  Object.values(EXPENSE_CHARTS).forEach(c => c?.destroy());

  const { textColor, gridColor } = getThemeChartColors();

  const catEl = document.getElementById('expense-category-chart');
  if (catEl && categoryRows.length) {
    EXPENSE_CHARTS.category = new Chart(catEl, {
      type: 'doughnut',
      data: {
        labels: categoryRows.map(r => r.category || 'Uncategorized'),
        datasets: [{
          data: categoryRows.map(r => Number(r.total_amount || 0)),
          backgroundColor: categoryRows.map(r => CATEGORY_COLORS[r.category] || '#888888')
        }]
      },
      options: {
        plugins: {
          legend: { position: 'right', labels: { color: textColor, font: { size: 10 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}` } }
        },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  // Stacked bar — one segment per category per month, instead of a single
  // combined total, so you can see the composition of spending over time.
  const trendEl = document.getElementById('expense-trend-chart');
  if (trendEl && allCategoryRows.length) {
    const months = [...new Set(allCategoryRows.map(r => r.month))].sort();
    const categoriesPresent = EXPENSE_CATEGORIES.filter(cat =>
      allCategoryRows.some(r => r.category === cat && Number(r.total_amount) > 0)
    );

    EXPENSE_CHARTS.trend = new Chart(trendEl, {
      type: 'bar',
      data: {
        labels: months.map(m => new Date(m + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })),
        datasets: categoriesPresent.map(cat => ({
          label: cat,
          data: months.map(m => Number(allCategoryRows.find(r => r.month === m && r.category === cat)?.total_amount || 0)),
          backgroundColor: CATEGORY_COLORS[cat] || '#888888',
        }))
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 9 }, boxWidth: 8, padding: 8 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: textColor, font: { size: 10 }, callback: v => '$' + v }, grid: { color: gridColor } }
        },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  // One bar per category (summed across the recent transactions), not one
  // bar per individual transaction.
  const recentEl = document.getElementById('expense-recent-chart');
  if (recentEl && recentRows && recentRows.length) {
    const totalsByCategory = {};
    recentRows.forEach(r => {
      const cat = r.category || 'Uncategorized';
      totalsByCategory[cat] = (totalsByCategory[cat] || 0) + Number(r.amount || 0);
    });
    const categories = Object.keys(totalsByCategory).sort((a, b) => totalsByCategory[b] - totalsByCategory[a]);

    EXPENSE_CHARTS.recent = new Chart(recentEl, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          data: categories.map(c => totalsByCategory[c]),
          backgroundColor: categories.map(c => CATEGORY_COLORS[c] || '#888888'),
          borderRadius: 4,
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `$${ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 })}` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: textColor, font: { size: 10 }, callback: v => '$' + v }, grid: { color: gridColor } }
        },
        responsive: true, maintainAspectRatio: false
      }
    });
  }
}

// ---------- Topbar status strip ----------
// Mirrors the exact same completion logic as the Daily tab (same zinc-day
// filtering, same tables) so the numbers shown here always agree with what
// the Daily tab itself shows — this is supplementary, not a second source
// of truth.
async function loadTopbarStatus() {
  const el = document.getElementById('topbar-status');
  if (!el) return;
  try {
    const today = todayISO();
    const rawItems = await loadConsistencyItems();
    const items = isZincDay(today) ? rawItems : rawItems.filter(r => r.item_name !== 'Zinc');
    const itemNames = items.map(r => r.item_name);

    const [{ data: goalsData }, { data: logData }, { data: fitnessSession }] = await Promise.all([
      sb.from('top_goals').select('completed').eq('log_date', today),
      sb.from('consistency_log').select('item_name, completed').eq('log_date', today),
      sb.from('fitness_daily_session').select('id').eq('session_date', today).limit(1)
    ]);

    const goalsDone = (goalsData || []).filter(g => g.completed).length;
    const doneNames = new Set((logData || []).filter(r => r.completed).map(r => r.item_name));
    const habitsDone = itemNames.filter(n => doneNames.has(n)).length;
    const gymLogged = (fitnessSession || []).length > 0;

    el.innerHTML = `
      <span>🎯 ${goalsDone}/3 Top Goals</span>
      <span class="tb-status-sep">·</span>
      <span>✅ ${habitsDone}/${itemNames.length} Habits</span>
      <span class="tb-status-sep">·</span>
      <span>${gymLogged ? '💪 Gym logged' : '💪 Gym pending'}</span>
    `;
  } catch (err) {
    // Supplementary status strip — fail silently rather than show an error in the header
  }
}

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
    const savedTab = localStorage.getItem('os_active_tab');
    switchTab(TAB_RENDERERS[savedTab] ? savedTab : 'daily');
    loadTopbarStatus();
  } catch (err) {
    const el = document.getElementById('tab-content');
    if (el) el.innerHTML = `<div class="card"><p class="card-title" style="color:var(--red)">Startup failed</p><p class="empty-state">${escapeHtmlSafe(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', initApp);
