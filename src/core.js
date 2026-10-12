/* ============================================================================
 * SCRAPPED Connect — Core Engine
 * Serverless Studio Management, Developer Ranking & Programming Organizer
 * Copyright (c) SCRAPPED studio. All rights reserved.
 * ==========================================================================*/

const APP_VERSION = '1.0.2';
const DATA_KEY = 'scrapped-connect-db-v1';
const DEVICE_SESSION_KEY = 'scrapped-connect-session-v1';
const GITHUB_OWNER = 'Dinomax2005';
const GITHUB_REPO = 'scrapped-connect-releases';
const GITHUB_API = 'https://api.github.com';

/* ------------------------------------------------------------------ utils */
const Utils = {
  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  },
  now() { return new Date().toISOString(); },
  fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  },
  fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return Utils.fmtDate(iso);
  },
  esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },
  colorFor(seed) {
    const palette = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a855f7'];
    let h = 0;
    const s = String(seed || 'x');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  },
  compareVersions(a, b) {
    const pa = String(a || '0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  },
  bytes(n) {
    if (n === undefined || n === null) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
};

/* -------------------------------------------------- SHA-256 / PBKDF2 (JS) 
 * Used when window.crypto.subtle is unavailable (e.g. running from file://).
 * -------------------------------------------------------------------------*/
const JSHash = (() => {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(bytes) {
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length;
    const withPad = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    withPad.set(bytes);
    withPad[l] = 0x80;
    const bitLenHi = Math.floor((l * 8) / 0x100000000);
    const bitLenLo = (l * 8) >>> 0;
    const dv = new DataView(withPad.buffer);
    dv.setUint32(withPad.length - 8, bitLenHi);
    dv.setUint32(withPad.length - 4, bitLenLo);

    const w = new Uint32Array(64);
    for (let off = 0; off < withPad.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, h[i]);
    return out;
  }

  function hmac(key, msg) {
    let k = key;
    if (k.length > 64) k = sha256(k);
    const kp = new Uint8Array(64);
    kp.set(k);
    const o = new Uint8Array(64), i = new Uint8Array(64);
    for (let n = 0; n < 64; n++) {
      o[n] = kp[n] ^ 0x5c;
      i[n] = kp[n] ^ 0x36;
    }
    const inner = sha256(concat(i, msg));
    return sha256(concat(o, inner));
  }

  function concat(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  function pbkdf2(password, salt, iterations, dkLen = 32) {
    const enc = new TextEncoder();
    const pw = enc.encode(password);
    const s = enc.encode(salt);
    const blocks = Math.ceil(dkLen / 32);
    const out = new Uint8Array(blocks * 32);
    for (let b = 1; b <= blocks; b++) {
      const idx = new Uint8Array([(b >>> 24) & 255, (b >>> 16) & 255, (b >>> 8) & 255, b & 255]);
      let u = hmac(pw, concat(s, idx));
      const acc = u.slice();
      for (let it = 1; it < iterations; it++) {
        u = hmac(pw, u);
        for (let j = 0; j < 32; j++) acc[j] ^= u[j];
      }
      out.set(acc, (b - 1) * 32);
    }
    return out.slice(0, dkLen);
  }

  return { sha256, hmac, pbkdf2 };
})();

const Crypto = {
  hasSubtle() {
    return typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.isSecureContext !== false;
  },
  toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  randomHex(n = 16) {
    const arr = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
    else for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
    return Crypto.toHex(arr);
  },
  async hashPassword(password, salt) {
    const iterations = Crypto.hasSubtle() ? 120000 : 8000;
    if (Crypto.hasSubtle()) {
      try {
        const enc = new TextEncoder();
        const key = await window.crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await window.crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' }, key, 256);
        return `pbkdf2$${iterations}$${Crypto.toHex(bits)}`;
      } catch (e) { /* fall through to JS implementation */ }
    }
    const bits = JSHash.pbkdf2(password, salt, iterations, 32);
    return `pbkdf2js$${iterations}$${Crypto.toHex(bits)}`;
  },
  async verifyPassword(password, salt, stored) {
    if (!stored) return false;
    const [scheme, iters] = stored.split('$');
    if (scheme === 'pbkdf2' && Crypto.hasSubtle()) {
      try {
        const enc = new TextEncoder();
        const key = await window.crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await window.crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(salt), iterations: parseInt(iters, 10) || 120000, hash: 'SHA-256' }, key, 256);
        return `pbkdf2$${iters}$${Crypto.toHex(bits)}` === stored;
      } catch (e) { return false; }
    }
    const bits = JSHash.pbkdf2(password, salt, parseInt(iters, 10) || 8000, 32);
    return `${scheme}$${iters}$${Crypto.toHex(bits)}` === stored;
  },
  async hashAnswer(answer) {
    const normalized = String(answer || '').trim().toLowerCase();
    return JSHash.hmac(new TextEncoder().encode('scrapped-recovery'), new TextEncoder().encode(normalized))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  }
};

/* ------------------------------------------------------------ default data */
const DEFAULTS = {
  ranks: [
    { id: 'rank_founder', name: 'Founder', level: 7, tier: 'OWNER', color: '#8b5cf6', description: 'Studio owner. Full control over accounts, ranks, dashboards, releases and sync.', perms: { manageAccounts: true, rerankDevs: true, manageRanks: true, createDashboards: true, manageTasks: true, manageSprints: true, manageBugs: true, editCodeVault: true, viewAllDashboards: true, manageSync: true, manageReleases: true } },
    { id: 'rank_director', name: 'Studio Director', level: 6, tier: 'EXEC', color: '#a855f7', description: 'Runs day-to-day operations. Can manage accounts, dashboards and all work items.', perms: { manageAccounts: true, rerankDevs: false, manageRanks: false, createDashboards: true, manageTasks: true, manageSprints: true, manageBugs: true, editCodeVault: true, viewAllDashboards: true, manageSync: false, manageReleases: false } },
    { id: 'rank_lead', name: 'Lead Developer', level: 5, tier: 'LEAD', color: '#06b6d4', description: 'Technical lead. Owns architecture, reviews and sprint planning.', perms: { manageAccounts: false, rerankDevs: true, manageRanks: false, createDashboards: true, manageTasks: true, manageSprints: true, manageBugs: true, editCodeVault: true, viewAllDashboards: true, manageSync: false, manageReleases: true } },
    { id: 'rank_senior', name: 'Senior Developer', level: 4, tier: 'SENIOR', color: '#10b981', description: 'Experienced developer. Mentors juniors and handles complex features.', perms: { manageAccounts: false, rerankDevs: false, manageRanks: false, createDashboards: false, manageTasks: true, manageSprints: false, manageBugs: true, editCodeVault: true, viewAllDashboards: true, manageSync: false, manageReleases: false } },
    { id: 'rank_dev', name: 'Developer', level: 3, tier: 'CORE', color: '#3b82f6', description: 'Core contributor working on assigned tasks and sprints.', perms: { manageAccounts: false, rerankDevs: false, manageRanks: false, createDashboards: false, manageTasks: false, manageSprints: false, manageBugs: true, editCodeVault: true, viewAllDashboards: true, manageSync: false, manageReleases: false } },
    { id: 'rank_junior', name: 'Junior Developer', level: 2, tier: 'JUNIOR', color: '#f59e0b', description: 'Early career developer learning the codebase on guided tasks.', perms: { manageAccounts: false, rerankDevs: false, manageRanks: false, createDashboards: false, manageTasks: false, manageSprints: false, manageBugs: true, editCodeVault: false, viewAllDashboards: true, manageSync: false, manageReleases: false } },
    { id: 'rank_trainee', name: 'Trainee / Intern', level: 1, tier: 'TRAINEE', color: '#64748b', description: 'Onboarding member. Read access with guided onboarding checklists.', perms: { manageAccounts: false, rerankDevs: false, manageRanks: false, createDashboards: false, manageTasks: false, manageSprints: false, manageBugs: false, editCodeVault: false, viewAllDashboards: false, manageSync: false, manageReleases: false } }
  ],
  settings: {
    studioName: 'SCRAPPED studio',
    studioTagline: 'Serverless Studio OS',
    logoLetter: 'S',
    autoUpdateCheck: true,
    autoUpdateApply: false,
    autoSync: true,
    syncEveryMinutes: 5,
    impersonateEnabled: true,
    xpPerTaskClosed: 25,
    xpPerBugFixed: 15,
    xpPerSnippet: 5
  }
};

const Store = {
  data: null,
  _saveTimer: null,

  blank() {
    return {
      meta: {
        schemaVersion: 1,
        appVersion: APP_VERSION,
        createdAt: Utils.now(),
        updatedAt: Utils.now(),
        initialized: false,
        revision: 0,
        deviceId: Crypto.randomHex(8)
      },
      users: [],
      ranks: JSON.parse(JSON.stringify(DEFAULTS.ranks)),
      dashboards: [],
      tasks: [],
      sprints: [],
      bugs: [],
      snippets: [],
      activity: [],
      sync: { enabled: false, repo: `${GITHUB_OWNER}/${GITHUB_REPO}`, branch: 'connect-data', path: 'data/scrapped-connect.json', token: '', lastPushAt: null, lastPullAt: null, mode: 'manual' },
      settings: JSON.parse(JSON.stringify(DEFAULTS.settings))
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Store.data = Store.migrate(parsed);
        return Store.data;
      }
    } catch (e) { console.warn('SCRAPPED: failed to load store', e); }
    Store.data = Store.blank();
    return Store.data;
  },

  migrate(data) {
    const base = Store.blank();
    const merged = Object.assign({}, base, data);
    merged.meta = Object.assign({}, base.meta, data.meta || {});
    merged.settings = Object.assign({}, base.settings, data.settings || {});
    merged.sync = Object.assign({}, base.sync, data.sync || {});
    merged.ranks = (data.ranks && data.ranks.length) ? data.ranks : base.ranks;
    ['users', 'dashboards', 'tasks', 'sprints', 'bugs', 'snippets', 'activity'].forEach(k => {
      if (!Array.isArray(merged[k])) merged[k] = [];
    });
    merged.meta.schemaVersion = 1;

    // Repair sprint task links (older/imported workspaces may hold task objects
    // instead of ids) and drop links whose task no longer exists.
    const taskIds = new Set(merged.tasks.map((t) => t.id));
    merged.sprints.forEach((sprint) => {
      const raw = Array.isArray(sprint.taskIds) ? sprint.taskIds : [];
      sprint.taskIds = raw
        .map((entry) => (entry && typeof entry === 'object') ? entry.id : entry)
        .filter((id) => typeof id === 'string' && taskIds.has(id));
    });
    merged.tasks.forEach((task) => {
      if (task.sprintId && !merged.sprints.some((sp) => sp.id === task.sprintId)) task.sprintId = null;
    });
    return merged;
  },

  save(opts) {
    const options = opts || {};
    Store.data.meta.updatedAt = Utils.now();
    Store.data.meta.revision = (Store.data.meta.revision || 0) + 1;
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(Store.data));
    } catch (e) {
      Toast.show('⚠️ Storage full — data could not be saved locally.', 'danger');
    }
    if (window.ScrappedDesktop && window.ScrappedDesktop.persist) {
      clearTimeout(Store._saveTimer);
      Store._saveTimer = setTimeout(() => { window.ScrappedDesktop.persist(Store.data); }, 400);
    }
    if (!options.skipSync && Store.data.sync && Store.data.sync.enabled && Store.data.sync.autoPush !== false) {
      Sync.schedulePush();
    }
  },

  replaceAll(newData, opts) {
    Store.data = Store.migrate(newData);
    localStorage.setItem(DATA_KEY, JSON.stringify(Store.data));
    if (window.ScrappedDesktop && window.ScrappedDesktop.persist) window.ScrappedDesktop.persist(Store.data);
    if (!(opts && opts.silent)) App.render();
  },

  exportFile() {
    const payload = JSON.stringify(Store.data, null, 2);
    const name = `scrapped-connect-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    if (typeof App !== 'undefined' && App.downloadFile) App.downloadFile(name, payload, 'application/json');
  }
};

/* ------------------------------------------------------ permissions & auth */
const Auth = {
  currentUserId() {
    try { return localStorage.getItem(DEVICE_SESSION_KEY); } catch (e) { return null; }
  },
  setSession(id) {
    try {
      if (id) localStorage.setItem(DEVICE_SESSION_KEY, id);
      else localStorage.removeItem(DEVICE_SESSION_KEY);
    } catch (e) { /* ignore */ }
  },
  user(id) {
    return Store.data.users.find(u => u.id === (id || Auth.currentUserId())) || null;
  },
  current() {
    if (App.state.impersonateId) return Auth.user(App.state.impersonateId);
    return Auth.user(Auth.currentUserId());
  },
  realUser() { return Auth.user(Auth.currentUserId()); },
  rank(user) {
    const u = user || Auth.current();
    if (!u) return null;
    return Store.data.ranks.find(r => r.id === u.rankId) || Store.data.ranks[Store.data.ranks.length - 1];
  },
  rankOf(userId) {
    const u = Auth.user(userId);
    return Auth.rank(u);
  },
  isFounder() {
    const u = Auth.current();
    return !!u && Store.data.ranks.find(r => r.id === u.rankId && r.level === 7);
  },
  can(perm, user) {
    if (App.state.impersonateId) user = Auth.user(App.state.impersonateId);
    const u = user || Auth.current();
    if (!u) return false;
    if (!u.active) return false;
    const rank = Auth.rank(u);
    if (!rank) return false;
    if (rank.level >= 7) return true;
    return !!(rank.perms && rank.perms[perm]);
  },
  highestRank() {
    return Store.data.ranks.slice().sort((a, b) => b.level - a.level)[0];
  },
  async createUser(payload) {
    const salt = Crypto.randomHex(16);
    const passwordHash = await Crypto.hashPassword(payload.password, salt);
    const answers = [];
    for (const qa of (payload.securityAnswers || [])) {
      if (qa && qa.answer) answers.push({ q: qa.q, a: await Crypto.hashAnswer(qa.answer) });
    }
    const user = {
      id: Utils.uid('usr'),
      username: String(payload.username || '').trim().toLowerCase(),
      displayName: payload.displayName || payload.username,
      email: payload.email || '',
      title: payload.title || '',
      role: payload.role || 'Developer',
      rankId: payload.rankId,
      skills: payload.skills || [],
      color: Utils.colorFor(payload.username || Utils.uid('c')),
      salt, passwordHash,
      securityAnswers: answers,
      xp: payload.xp || 0,
      active: payload.active !== false,
      mustChangePassword: !!payload.mustChangePassword,
      createdAt: Utils.now(),
      createdBy: Auth.currentUserId(),
      lastLoginAt: null,
      loginCount: 0,
      notes: payload.notes || ''
    };
    Store.data.users.push(user);
    Store.save();
    Log.add('account.create', `Created account "${user.username}" (${Auth.rank(user).name})`);
    return user;
  },
  async changePassword(userId, newPassword) {
    const user = Auth.user(userId);
    if (!user) return false;
    user.salt = Crypto.randomHex(16);
    user.passwordHash = await Crypto.hashPassword(newPassword, user.salt);
    user.mustChangePassword = false;
    Store.save();
    Log.add('account.password', `Password updated for "${user.username}"`);
    return true;
  },
  async login(username, password) {
    const user = Store.data.users.find(u => u.username === String(username || '').trim().toLowerCase());
    if (!user) return { ok: false, error: 'No account found with that username.' };
    if (!user.active) return { ok: false, error: 'That account has been deactivated by the Founder.' };
    const ok = await Crypto.verifyPassword(password, user.salt, user.passwordHash);
    if (!ok) return { ok: false, error: 'Incorrect password.' };
    user.lastLoginAt = Utils.now();
    user.loginCount = (user.loginCount || 0) + 1;
    Auth.setSession(user.id);
    App.state.impersonateId = null;
    Log.add('auth.login', `${user.username} signed in`);
    Store.save({ skipSync: true });
    return { ok: true, user };
  },
  logout() {
    Auth.setSession(null);
    App.state.impersonateId = null;
  }
};

const Log = {
  add(action, detail) {
    Store.data.activity.unshift({
      id: Utils.uid('act'),
      ts: Utils.now(),
      actorId: Auth.currentUserId(),
      actorName: (Auth.realUser() || {}).displayName || 'System',
      action, detail
    });
    if (Store.data.activity.length > 400) Store.data.activity.length = 400;
  }
};

/* -------------------------------------------------------------- UI helpers */
const Toast = {
  show(message, type = 'accent', ms = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    if (type === 'danger') el.style.borderColor = 'var(--danger)';
    if (type === 'success') el.style.borderColor = 'var(--success)';
    if (type === 'warning') el.style.borderColor = 'var(--warning)';
    el.innerHTML = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, ms);
  }
};

const Modal = {
  open(html, opts) {
    const options = opts || {};
    const backdrop = document.getElementById('action-modal-backdrop');
    const card = document.getElementById('action-modal-card');
    if (options.size === 'lg') card.classList.add('modal-lg');
    else card.classList.remove('modal-lg');
    card.innerHTML = html;
    backdrop.classList.remove('hidden');
  },
  close() {
    document.getElementById('action-modal-backdrop').classList.add('hidden');
  },
  get isOpen() {
    return !document.getElementById('action-modal-backdrop').classList.contains('hidden');
  }
};

/* ============================================================ SYNC ENGINE
 * Serverless team sync through a GitHub repository (Contents API).
 * No SCRAPPED server is required: GitHub acts as the shared datastore.
 * ========================================================================*/
const Sync = {
  _pushTimer: null,
  _interval: null,
  status: { state: 'idle', message: 'Local only', at: null, revision: null },

  cfg() { return Store.data.sync || {}; },
  isConfigured() {
    const c = Sync.cfg();
    if (!c.repo || !c.token) return false;
    if (c.mode === 'github' || c.enabled) return true;
    return false;
  },
  headers() {
    const token = (Sync.cfg().token || '').trim();
    const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },
  setStatus(state, message) {
    Sync.status = { state, message, at: Utils.now() };
    App.renderSyncBadge();
  },
  schedulePush() {
    const c = Sync.cfg();
    if (!c.enabled || !c.token) return;
    clearTimeout(Sync._pushTimer);
    Sync._pushTimer = setTimeout(() => { Sync.push({ silent: true }); }, 3500);
  },
  startAuto() {
    clearInterval(Sync._interval);
    const c = Sync.cfg();
    if (!c.enabled || !c.token) return;
    const mins = Math.max(1, parseInt(c.syncEveryMinutes, 10) || 5);
    Sync._interval = setInterval(() => { Sync.pull({ silent: true }); }, mins * 60000);
  },
  stopAuto() { clearInterval(Sync._interval); },

  async api(path, opts) {
    const options = opts || {};
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: options.method || 'GET',
      headers: Object.assign(Sync.headers(), options.body ? { 'Content-Type': 'application/json' } : {}),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = { raw: text }; }
    if (!res.ok) {
      const msg = (json && json.message) ? json.message : `GitHub API error ${res.status}`;
      throw new Error(`${msg}${res.status === 401 ? ' (check your token)' : ''}`);
    }
    return json;
  },

  /** Test the token / repo / branch combination without writing anything. */
  async test(cfg) {
    const c = Object.assign({}, Sync.cfg(), cfg || {});
    const repo = (c.repo || '').trim();
    const branch = (c.branch || 'main').trim();
    const token = (c.token || '').trim();
    const preserved = Store.data.sync;
    Store.data.sync = Object.assign({}, c);
    try {
      const repoInfo = await Sync.api(`/repos/${repo}`);
      let branchOk = false, branchNote = '';
      try {
        await Sync.api(`/repos/${repo}/branches/${encodeURIComponent(branch)}`);
        branchOk = true;
      } catch (e) {
        branchNote = `branch "${branch}" does not exist yet (it will be created on first push)`;
      }
      const perms = repoInfo.permissions || {};
      const canWrite = !!(perms.push || perms.admin || perms.maintain);
      return {
        ok: true, repo: repoInfo.full_name, private: !!repoInfo.private,
        defaultBranch: repoInfo.default_branch, branchOk, branchNote,
        canWrite, authenticated: !!token,
        message: `Connected to ${repoInfo.full_name}${canWrite ? '' : ' (read-only token)'}`
      };
    } catch (e) {
      return { ok: false, message: e.message };
    } finally {
      Store.data.sync = preserved;
    }
  },

  async ensureBranch(branch) {
    const repo = Sync.cfg().repo;
    try { await Sync.api(`/repos/${repo}/branches/${encodeURIComponent(branch)}`); return true; }
    catch (e) {
      try {
        const info = await Sync.api(`/repos/${repo}`);
        const base = info.default_branch || 'main';
        const ref = await Sync.api(`/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
        await Sync.api(`/repos/${repo}/git/refs`, {
          method: 'POST',
          body: { ref: `refs/heads/${branch}`, sha: ref.object.sha }
        });
        return true;
      } catch (e2) {
        throw new Error(`Could not create branch "${branch}": ${e2.message}`);
      }
    }
  },

  async remoteMeta() {
    const c = Sync.cfg();
    try {
      const file = await Sync.api(`/repos/${c.repo}/contents/${c.path}?ref=${encodeURIComponent(c.branch)}`);
      const content = decodeURIComponent(escape(atob(String(file.content || '').replace(/\n/g, ''))));
      const parsed = JSON.parse(content);
      return { sha: file.sha, data: parsed, size: file.size, updatedAt: (file.commit && file.commit.committer && file.commit.committer.date) || null };
    } catch (e) {
      if (/Not Found|404/i.test(e.message)) return null;
      throw e;
    }
  },

  async pull(opts) {
    const options = opts || {};
    const c = Sync.cfg();
    if (!c.enabled || !c.token) { Toast.show('⚠️ Serverless sync is not configured yet.', 'warning'); return; }
    Sync.setStatus('syncing', 'Pulling from GitHub…');
    try {
      const remote = await Sync.remoteMeta();
      if (!remote) {
        Sync.setStatus('idle', 'No remote workspace yet');
        if (!options.silent) Toast.show('☁️ No remote workspace found — push first to create it.');
        return;
      }
      const localRev = Store.data.meta.revision || 0;
      const remoteRev = remote.data.meta ? remote.data.meta.revision || 0 : 0;
      const localUpdated = new Date(Store.data.meta.updatedAt).getTime();
      const remoteUpdated = new Date(remote.data.meta.updatedAt).getTime();
      if (remoteUpdated > localUpdated) {
        const preservedSync = Store.data.sync;
        const preservedSession = Auth.currentUserId();
        Store.replaceAll(remote.data);
        Store.data.sync = preservedSync;
        Store.data.meta.revision = Math.max(localRev, remoteRev);
        Sync.cfg().lastPullAt = Utils.now();
        Store.save({ skipSync: true });
        if (preservedSession && Store.data.users.some(u => u.id === preservedSession)) Auth.setSession(preservedSession);
        Sync.setStatus('ok', 'Up to date with GitHub');
        if (!options.silent) Toast.show(`✅ Pulled studio workspace from GitHub (rev ${remoteRev}).`, 'success');
      } else {
        Sync.cfg().lastPullAt = Utils.now();
        Sync.setStatus('ok', 'Up to date with GitHub');
        if (!options.silent) Toast.show('✅ Already up to date with GitHub.');
      }
      App.render();
    } catch (e) {
      Sync.setStatus('error', e.message);
      Toast.show(`❌ Pull failed: ${Utils.esc(e.message)}`, 'danger');
    }
  },

  async push(opts) {
    const options = opts || {};
    const c = Sync.cfg();
    if (!c.enabled || !c.token) { if (!options.silent) Toast.show('⚠️ Serverless sync is not configured yet.', 'warning'); return; }
    Sync.setStatus('syncing', 'Pushing to GitHub…');
    try {
      await Sync.ensureBranch(c.branch);
      let existing = null;
      try { existing = await Sync.api(`/repos/${c.repo}/contents/${c.path}?ref=${encodeURIComponent(c.branch)}`); }
      catch (e) { existing = null; }

      // Never upload the raw token inside the shared workspace payload.
      const payloadData = JSON.parse(JSON.stringify(Store.data));
      if (payloadData.sync) payloadData.sync.token = '';
      payloadData.meta.updatedAt = Utils.now();
      const json = JSON.stringify(payloadData, null, 2);
      const body = {
        message: `SCRAPPED Connect sync — rev ${payloadData.meta.revision} (${new Date().toISOString()})`,
        content: btoa(unescape(encodeURIComponent(json))),
        branch: c.branch
      };
      if (existing && existing.sha) body.sha = existing.sha;

      const res = await Sync.api(`/repos/${c.repo}/contents/${c.path}`, { method: 'PUT', body });
      Sync.cfg().lastPushAt = Utils.now();
      Sync.setStatus('ok', `Pushed rev ${payloadData.meta.revision}`);
      Store.save({ skipSync: true });
      if (!options.silent) Toast.show('☁️ Studio workspace pushed to GitHub.', 'success');
      return res;
    } catch (e) {
      Sync.setStatus('error', e.message);
      Toast.show(`❌ Push failed: ${Utils.esc(e.message)}`, 'danger');
    }
  }
};

/* ========================================================= UPDATER ENGINE
 * Checks the public GitHub Releases of Dinomax2005/scrapped-connect-releases
 * and installs newer builds automatically.
 * ========================================================================*/
const Updater = {
  info: {
    latestVersion: null, latestName: null, latestNotes: null, publishedAt: null,
    assets: [], htmlUrl: null, updateAvailable: false, checking: false, lastChecked: null,
    error: null, downloadProgress: 0, state: 'idle', prerelease: false
  },

  isDesktop() { return !!window.ScrappedDesktop; },

  async check(opts) {
    const options = opts || {};
    Updater.info.checking = true;
    Updater.info.error = null;
    App.renderUpdatePill();
    try {
      if (Updater.isDesktop() && window.ScrappedDesktop.checkUpdate) {
        const res = await window.ScrappedDesktop.checkUpdate({ force: true });
        if (res && res.ok) {
          Updater.info.latestVersion = res.latestVersion;
          Updater.info.latestName = res.latestName;
          Updater.info.latestNotes = res.notes || null;
          Updater.info.publishedAt = res.publishedAt || null;
          Updater.info.htmlUrl = res.htmlUrl || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
          Updater.info.assets = res.assets || [];
          Updater.info.updateAvailable = !!res.updateAvailable;
        } else if (res && res.error) {
          Updater.info.error = res.error;
        }
      } else {
        const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`, {
          headers: { 'Accept': 'application/vnd.github+json' }
        });
        if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
        const releases = await res.json();
        const stable = releases.find(r => !r.draft);
        if (!stable) {
          Updater.info.error = null;
          Updater.info.updateAvailable = false;
          Updater.info.latestVersion = APP_VERSION;
        } else {
          const latest = Utils.compareVersions(stable.tag_name, APP_VERSION) >= 0 ? stable
            : releases.filter(r => !r.draft).sort((a, b) => Utils.compareVersions(b.tag_name, a.tag_name))[0];
          Updater.info.latestVersion = String(latest.tag_name || '').replace(/^v/i, '');
          Updater.info.latestName = latest.name || latest.tag_name;
          Updater.info.latestNotes = latest.body || '';
          Updater.info.publishedAt = latest.published_at;
          Updater.info.htmlUrl = latest.html_url;
          Updater.info.assets = (latest.assets || []).map(a => ({ name: a.name, size: a.size, url: a.browser_download_url, downloads: a.download_count }));
          Updater.info.updateAvailable = Utils.compareVersions(Updater.info.latestVersion, APP_VERSION) > 0;
        }
      }
      Updater.info.lastChecked = Utils.now();
    } catch (e) {
      Updater.info.error = e.message || String(e);
    } finally {
      Updater.info.checking = false;
      App.renderUpdatePill();
      App.renderUpdateBanner();
      if (App.state.view === 'updater') App.render();
      if (options.notify) {
        if (Updater.info.error) Toast.show(`⚠️ Update check failed: ${Utils.esc(Updater.info.error)}`, 'warning');
        else if (Updater.info.updateAvailable) Toast.show(`🚀 Version ${Utils.esc(Updater.info.latestVersion)} is available on GitHub!`, 'accent', 5000);
        else Toast.show('✅ You are running the newest SCRAPPED Connect build.', 'success');
      }
      if (Updater.info.updateAvailable && Store.data.settings.autoUpdateApply) Updater.apply();
    }
  },

  async apply() {
    if (!Updater.info.updateAvailable) { Toast.show('✅ No update available.'); return; }
    Updater.info.state = 'downloading';
    if (App.state.view === 'updater') App.render();
    if (Updater.isDesktop() && window.ScrappedDesktop.applyUpdate) {
      try {
        const res = await window.ScrappedDesktop.applyUpdate({ version: Updater.info.latestVersion });
        if (res && res.ok) {
          Toast.show('🚀 Update downloaded — SCRAPPED Connect is restarting…', 'success', 6000);
        } else {
          Toast.show(`⚠️ Update failed: ${Utils.esc((res && res.error) || 'unknown error')}`, 'danger');
        }
      } catch (e) {
        Toast.show(`⚠️ Update failed: ${Utils.esc(e.message)}`, 'danger');
      }
    } else {
      // Web / PWA build: refresh from the network and let the service worker take the new build.
      Toast.show('🔄 Downloading newest web build…', 'accent');
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.update()));
        }
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (e) { /* ignore */ }
      setTimeout(() => { window.location.reload(); }, 800);
    }
  },

  pickInstallerAsset() {
    const assets = Updater.info.assets || [];
    const order = [/setup.*\.exe$/i, /installer.*\.exe$/i, /\.exe$/i, /portable.*\.zip$/i, /\.zip$/i];
    for (const re of order) {
      const found = assets.find(a => re.test(a.name));
      if (found) return found;
    }
    return assets[0] || null;
  }
};

/* ==================================================== analytics / reporting */
const Analytics = {
  activeUsers() {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
    return Store.data.users.filter(u => u.active && u.lastLoginAt && new Date(u.lastLoginAt).getTime() > cutoff);
  },
  taskStats() {
    const t = Store.data.tasks;
    const by = (s) => t.filter(x => x.status === s).length;
    return {
      total: t.length, backlog: by('Backlog'), todo: by('To Do'), progress: by('In Progress'),
      review: by('Code Review'), done: by('Done'),
      completion: t.length ? Math.round((by('Done') / t.length) * 100) : 0
    };
  },
  bugStats() {
    const b = Store.data.bugs;
    const open = b.filter(x => x.status !== 'Closed' && x.status !== 'Verified').length;
    const critical = b.filter(x => x.severity === 'Critical' && x.status !== 'Closed').length;
    return { total: b.length, open, critical, resolved: b.length - open };
  },
  sprintStats() {
    const s = Store.data.sprints;
    const active = s.filter(x => x.status === 'Active');
    return { total: s.length, active: active.length, activeList: active, planned: s.filter(x => x.status === 'Planned').length, completed: s.filter(x => x.status === 'Completed').length };
  },
  workload() {
    return Store.data.users.filter(u => u.active).map(u => {
      const assigned = Store.data.tasks.filter(t => t.assigneeId === u.id && t.status !== 'Done').length;
      const openBugs = Store.data.bugs.filter(b => b.assigneeId === u.id && b.status !== 'Closed').length;
      return { user: u, assigned, openBugs, load: assigned + openBugs };
    }).sort((a, b) => b.load - a.load);
  },
  leaderboard() {
    return Store.data.users
      .filter(u => u.active)
      .map(u => {
        const done = Store.data.tasks.filter(t => t.assigneeId === u.id && t.status === 'Done').length;
        const bugs = Store.data.bugs.filter(b => b.assigneeId === u.id && (b.status === 'Closed' || b.status === 'Verified')).length;
        const snips = Store.data.snippets.filter(s => s.authorId === u.id).length;
        const rank = Auth.rank(u);
        const score = (done * (Store.data.settings.xpPerTaskClosed || 25))
          + (bugs * (Store.data.settings.xpPerBugFixed || 15))
          + (snips * (Store.data.settings.xpPerSnippet || 5))
          + (u.xp || 0);
        return { user: u, rank, done, bugs, snips, score, level: rank ? rank.level : 1 };
      })
      .sort((a, b) => b.score - a.score || b.level - a.level)
      .map((row, i) => Object.assign(row, { position: i + 1 }));
  },
  codeVaultStats() {
    const s = Store.data.snippets;
    const langs = {};
    s.forEach(x => { langs[x.language || 'Other'] = (langs[x.language || 'Other'] || 0) + 1; });
    return { total: s.length, languages: langs };
  }
};

/* ==================================================== dashboard templates */
const Templates = {
  'company-overview': {
    name: 'Company Overview', icon: '📊',
    description: 'Studio-wide delivery health, active developers and sprint signals.',
    widgets: [
      { type: 'kpi-row', span: 12, items: ['developers', 'open-tasks', 'open-bugs', 'sprint-status'] },
      { type: 'bar-chart', span: 6, title: 'Task Pipeline', metric: 'task-status' },
      { type: 'leaderboard', span: 6, title: 'Developer Ranking', limit: 6 },
      { type: 'recent-activity', span: 6, title: 'Recent Studio Activity', limit: 8 },
      { type: 'list', span: 6, title: 'Critical Bugs', metric: 'critical-bugs' }
    ]
  },
  'dev-productivity': {
    name: 'Developer Productivity', icon: '⚡',
    description: 'Throughput, workload distribution and rank progression per developer.',
    widgets: [
      { type: 'kpi-row', span: 12, items: ['tasks-done-7d', 'completion-rate', 'workload-avg', 'snippets'] },
      { type: 'leaderboard', span: 8, title: 'Full Ranking Board', limit: 20 },
      { type: 'bar-chart', span: 4, title: 'Workload Distribution', metric: 'workload' },
      { type: 'bar-chart', span: 6, title: 'Bug Resolution', metric: 'bug-status' },
      { type: 'list', span: 6, title: 'Unassigned Work', metric: 'unassigned-tasks' }
    ]
  },
  'release-readiness': {
    name: 'Release Readiness', icon: '🚀',
    description: 'Sprint burndown, blocker bugs and code vault health for shipping.',
    widgets: [
      { type: 'kpi-row', span: 12, items: ['sprint-progress', 'blockers', 'review-queue', 'release-version'] },
      { type: 'progress-list', span: 6, title: 'Sprint Progress', metric: 'sprints' },
      { type: 'bar-chart', span: 6, title: 'Bugs by Severity', metric: 'bug-severity' },
      { type: 'list', span: 12, title: 'Release Blockers', metric: 'blockers' }
    ]
  }
};

function buildTemplateDashboards() {
  const out = [];
  Object.keys(Templates).forEach((key, i) => {
    const t = Templates[key];
    out.push({
      id: `dash_${key.replace(/-/g, '_')}`,
      key,
      name: t.name,
      icon: t.icon,
      description: t.description,
      visibility: 'all',
      system: true,
      createdBy: Auth.currentUserId(),
      createdAt: Utils.now(),
      widgets: t.widgets.map((w) => Object.assign({ id: Utils.uid('w') }, JSON.parse(JSON.stringify(w)))),
      order: i
    });
  });
  return out;
}
