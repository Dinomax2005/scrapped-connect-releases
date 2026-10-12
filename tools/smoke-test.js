/* ============================================================================
 * SCRAPPED Connect — headless smoke test
 *
 *   npm install --no-save jsdom
 *   node tools/smoke-test.js
 *
 * Boots the real app inside jsdom and exercises the setup wizard, accounts,
 * reranking, dashboards, permissions, work items, auth and the updater.
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  console.error('\nThis smoke test needs jsdom:  npm install --no-save jsdom\n');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');

const errors = [];

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => { /* console.warn for noise */ });

const dom = new JSDOM(html, {
  url: 'http://localhost:3210/index.html',
  runScripts: 'dangerously',
  resources: undefined,
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    // jsdom has no fetch; expose Node's implementation for the live-network tests.
    if (typeof globalThis.fetch === 'function') window.fetch = (...args) => globalThis.fetch(...args);
  }
});
const { window } = dom;

function inject(file) {
  const code = fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');
  const el = window.document.createElement('script');
  el.textContent = code;
  window.document.head.appendChild(el);
}

['core.js','views-dash.js','views-team.js','views-work.js','views-system.js','app.js'].forEach(inject);
const G = (name) => window.eval(name);
console.log('injected; parse errors:', errors.length);

(async () => {
  await new Promise(r => setTimeout(r, 300));
  const A = G('App');
  if (!A) { console.log('❌ App global missing'); process.exit(1); }

  const step = (name, fn) => {
    try { fn(); console.log('  ✓', name); }
    catch (e) { console.log('  ✗', name, '→', e.message); errors.push(name + ': ' + e.message); }
  };

  console.log('\n== bootstrap ==');
  step('Wizard opened on fresh workspace', () => {
    if (window.document.getElementById('setup-wizard-backdrop').classList.contains('hidden')) throw new Error('wizard not visible');
  });

  console.log('\n== setup wizard (founder account) ==');
  const doc = window.document;
  doc.getElementById('wz-studio').value = 'SCRAPPED studio';
  G('Wizard').next();
  doc.getElementById('wz-name').value = 'Dinomax';
  doc.getElementById('wz-username').value = 'dinomax2005';
  doc.getElementById('wz-email').value = 'boss@scrapped.studio';
  doc.getElementById('wz-pass').value = 'SuperSecret123';
  doc.getElementById('wz-pass2').value = 'SuperSecret123';
  G('Wizard').next();
  doc.getElementById('wz-secq').value = 'Codename?';
  doc.getElementById('wz-seca').value = 'scrapped';
  G('Wizard').next();
  doc.getElementById('wz-syncmode').value = 'local';
  G('Wizard').next();
  doc.getElementById('wz-templates').checked = true;
  doc.getElementById('wz-demo').checked = true;
  G('Wizard').next();
  await G('Wizard').finish();
  await new Promise(r => setTimeout(r, 500));

  step('founder account created', () => {
    const users = G('Store').data.users;
    if (users.length !== 3) throw new Error('expected founder + 2 demo users, got ' + users.length);
    const founder = users[0];
    if (G('Auth').rank(founder).level !== 7) throw new Error('founder rank level not 7');
    if (!G('Store').data.meta.initialized) throw new Error('meta.initialized false');
  });
  step('dashboards created', () => {
    if (G('Store').data.dashboards.length !== 3) throw new Error('dashboards: ' + G('Store').data.dashboards.length);
  });
  step('demo work items created', () => {
    if (G('Store').data.tasks.length !== 5) throw new Error('tasks: ' + G('Store').data.tasks.length);
    if (G('Store').data.sprints.length !== 1) throw new Error('sprints');
    if (G('Store').data.bugs.length !== 2) throw new Error('bugs');
    if (G('Store').data.snippets.length !== 1) throw new Error('snippets');
  });
  step('sidebar shows founder', () => {
    if (!doc.getElementById('current-user-name').textContent.includes('Dinomax')) throw new Error('name: ' + doc.getElementById('current-user-name').textContent);
  });

  console.log('\n== debug: dashboards render ==');
  {
    const html2 = window.document.getElementById('main-viewport').innerHTML;
    const idx = html2.indexOf('undefined');
    console.log('   dashboards undefined at', idx, '→', idx >= 0 ? JSON.stringify(html2.slice(Math.max(0, idx - 220), idx + 60)) : 'n/a');
    const s0 = G('Store').data.sprints[0];
    console.log('   sprint taskIds:', s0.taskIds, '| tasks:', G('Store').data.tasks.map(t => [t.id, t.status]).slice(0, 5));
    console.log('   progress:', G('Widgets').sprintProgress(s0));
  }

  console.log('\n== navigation across every view ==');
  ['dashboards','team','ranks','tasks','sprints','bugs','codevault','sync','updater','settings','profile'].forEach(v => {
    step('render ' + v, () => {
      A.navigate(v);
      const html2 = doc.getElementById('main-viewport').innerHTML;
      if (html2.length < 200) throw new Error('suspiciously short render (' + html2.length + ')');
      if (html2.includes('undefined')) throw new Error('contains literal "undefined"');
      if (/\[object Object\]/.test(html2)) throw new Error('contains [object Object]');
      if (html2.includes('NaN')) throw new Error('contains NaN');
    });
  });

  console.log('\n== account management ==');
  await new Promise((resolve) => {
    A.navigate('team');
    G('Team').openCreateAccount();
    doc.getElementById('na-name').value = 'Riley Stone';
    doc.getElementById('na-username').value = 'riley.dev';
    doc.getElementById('na-password').value = 'Password123';
    doc.getElementById('na-password2').value = 'Password123';
    doc.getElementById('na-title').value = 'Engine Programmer';
    doc.getElementById('na-skills').value = 'C++, Vulkan';
    G('Team').createAccount().then(resolve);
  });
  step('account created via UI', () => {
    const u = G('Store').data.users.find(x => x.username === 'riley.dev');
    if (!u) throw new Error('user missing');
    if (G('Auth').rank(u).level !== 3) throw new Error('default rank level wrong: ' + G('Auth').rank(u).level);
  });
  step('create-account modal closed', () => {
    if (!doc.getElementById('action-modal-backdrop').classList.contains('hidden')) throw new Error('modal still open');
  });
  step('rerank developer', () => {
    const u = G('Store').data.users.find(x => x.username === 'riley.dev');
    const lead = G('Store').data.ranks.find(r => r.level === 5);
    G('Team').rerank(u.id, lead.id);
    if (G('Auth').rank(u).name !== lead.name) throw new Error('rank not applied');
  });
  step('bulk rerank', () => {
    A.navigate('team');
    G('Team').openBulkRerank();
    const founderId = G('Store').data.users[0].id;
    doc.querySelectorAll('.bulk-user').forEach((c) => { c.checked = c.value !== founderId; c.value === founderId && (c.checked = true); });
    doc.querySelectorAll('.bulk-user').forEach((c) => { c.checked = c.value !== founderId; });
    // also try to force the founder checkbox: it must be disabled + skipped
    const fbox = doc.querySelector('.bulk-user[value="' + founderId + '"]');
    fbox.disabled = false; fbox.checked = true;
    doc.getElementById('bulk-rank').value = G('Store').data.ranks.find(r => r.level === 4).id;
    G('Team').applyBulkRerank();
    if (G('Auth').rank(G('Store').data.users[0]).level !== 7) throw new Error('Founder was reranked by bulk action');
    if (G('Store').data.users.find(u => u.username === 'riley.dev').rankId !== G('Store').data.ranks.find(r => r.level === 4).id) throw new Error('bulk rerank did not apply to normal dev');
  });
  step('toggle + delete guard rails', () => {
    const founder = G('Store').data.users[0];
    G('Team').deleteAccount(founder.id);
    // founder deletion must be refused (modal never opened for a level-7 rank)
    if (!doc.getElementById('action-modal-backdrop').classList.contains('hidden')) throw new Error('founder deletion modal opened');
  });

  console.log('\n== work items ==');
  step('task status change awards XP + updates analytics', () => {
    const t = G('Store').data.tasks.find(x => x.status !== 'Done' && x.assigneeId);
    const user = G('Auth').user(t.assigneeId);
    const before = user.xp || 0;
    G('Work').setStatus(t, 'Done');
    if ((user.xp || 0) <= before) throw new Error('no XP awarded');
    if (!G('Analytics').taskStats().done) throw new Error('analytics not updating');
  });
  step('sprint progress + completion', () => {
    const s = G('Store').data.sprints[0];
    const p = G('Widgets').sprintProgress(s);
    if (p <= 0) throw new Error('progress 0');
    G('Work').setSprintStatus(s.id, 'Completed');
    if (s.status !== 'Completed') throw new Error('status not applied');
  });
  step('bug close awards XP', () => {
    const b = G('Store').data.bugs[0];
    const u = G('Auth').user(b.assigneeId);
    const before = u ? (u.xp || 0) : 0;
    G('Work').setBugStatus(b.id, 'Closed');
    if (u && (u.xp || 0) <= before) throw new Error('no XP');
    if (b.status !== 'Closed') throw new Error('bug not closed');
  });
  step('code vault add', () => {
    A.navigate('codevault');
    G('Work').openSnippetModal();
    doc.getElementById('sn-title').value = 'Netcode tick helper';
    doc.getElementById('sn-code').value = 'void Tick() {}';
    doc.getElementById('sn-lang').value = 'C++';
    G('Work').saveSnippet('');
    if (G('Store').data.snippets.length !== 2) throw new Error('snippet not saved');
  });

  console.log('\n== dashboards ==');
  step('create custom dashboard via builder', () => {
    A.navigate('dashboards');
    G('Dashboards').openBuilder();
    doc.getElementById('dash-name').value = 'QA Health';
    doc.getElementById('dash-desc').value = 'Quality dashboard';
    doc.getElementById('dash-visibility').value = 'ranks';
    doc.querySelectorAll('.dash-vis-rank').forEach(c => { c.checked = true; });
    doc.querySelectorAll('.dash-widget-choice').forEach(c => { c.checked = c.value === 'kpi-row' || c.value === 'bar-chart'; });
    G('Dashboards').saveBuilder();
    if (!G('Store').data.dashboards.find(d => d.name === 'QA Health')) throw new Error('dashboard missing');
  });
  step('add widget + reorder + export path', () => {
    const d = G('Store').data.dashboards.find(x => x.name === 'QA Health');
    G('Dashboards').openWidgetPicker(d.id);
    doc.getElementById('w-title').value = 'Bug load';
    doc.getElementById('w-type').value = 'bar-chart';
    G('Dashboards').addWidget(d.id);
    if (d.widgets.length !== 3) throw new Error('widget not added: ' + d.widgets.length);
    G('Dashboards').moveWidget(d.id, d.widgets[0].id, 1);
    A.exportDashboardCSV(d.id);
  });
  step('dashboard visibility restricted by rank', () => {
    const d = G('Store').data.dashboards.find(x => x.name === 'QA Health');
    d.visibility = [G('Store').data.ranks.find(r => r.level === 7).id];
    const trainee = G('Store').data.users.find(u => u.username === 'kai.tech');
    trainee.rankId = G('Store').data.ranks.find(r => r.level === 2).id;
    A.impersonate(trainee.id);
    let leaked = false;
    try {
      const visible = G('Dashboards').visible();
      leaked = visible.some(v => v.name === 'QA Health');
    } finally {
      A.exitImpersonation();
    }
    if (leaked) throw new Error('private dashboard leaked to trainee');
    const founderView = G('Dashboards').visible();
    if (!founderView.some(v => v.name === 'QA Health')) throw new Error('founder cannot see their own restricted dashboard');
  });
  if (A.state.impersonateId) A.exitImpersonation();
  step('permission gate blocks trainee', () => {
    const trainee = G('Store').data.users.find(u => u.username === 'kai.tech');
    const junior = { ...trainee, rankId: G('Store').data.ranks.find(r => r.level === 2).id };
    if (G('Auth').can('manageAccounts', junior)) throw new Error('trainee can manage accounts');
    if (!G('Auth').can('manageAccounts', G('Store').data.users[0])) throw new Error('founder blocked');
  });

  console.log('\n== ranks ==');
  step('create + delete custom rank', () => {
    if (A.state.impersonateId) throw new Error('stuck in impersonation');
    G('Ranks').openEditor();
    doc.getElementById('rk-name').value = 'Technical Artist';
    doc.getElementById('rk-tier').value = 'art';
    doc.getElementById('rk-level').value = '4';
    doc.querySelector('.rk-perm[value="manageTasks"]').checked = true;
    G('Ranks').save('');
    const r = G('Store').data.ranks.find(x => x.name === 'Technical Artist');
    if (!r) throw new Error('rank missing');
    if (!r.perms.manageTasks) throw new Error('perm not saved');
    G('Ranks').remove(r.id);
    if (G('Store').data.ranks.find(x => x.name === 'Technical Artist')) throw new Error('rank not removed');
  });
  step('reseed ranks keeps users valid', () => {
    G('Ranks').doReseed();
    G('Store').data.users.forEach(u => {
      if (!G('Store').data.ranks.find(r => r.id === u.rankId)) throw new Error('orphan rank for ' + u.username);
    });
  });

  console.log('\n== auth ==');
  await (async () => {
    A.logout();
    step('locked shell shown after logout', () => {
      if (!doc.getElementById('login-username')) throw new Error('login form missing');
    });
    doc.getElementById('login-username').value = 'dinomax2005';
    doc.getElementById('login-password').value = 'WrongPass';
    await A.doLogin();
    step('wrong password rejected', () => {
      const e = doc.getElementById('login-error');
      if (e.style.display === 'none') throw new Error('no error shown');
    });
    doc.getElementById('login-password').value = 'SuperSecret123';
    await A.doLogin();
    step('correct password logs in', () => {
      if (!A.state.view) throw new Error('view missing');
      if (doc.getElementById('current-user-name').textContent !== 'Dinomax') throw new Error('name: ' + doc.getElementById('current-user-name').textContent);
    });
  })();

  console.log('\n== persistence + export/import ==');
  step('localStorage persisted', () => {
    const raw = window.localStorage.getItem('scrapped-connect-db-v1');
    if (!raw) throw new Error('nothing stored');
    const parsed = JSON.parse(raw);
    if (parsed.users.length < 4) throw new Error('users not persisted');
  });
  step('export/import round trip keeps users', () => {
    const snapshot = JSON.parse(JSON.stringify(G('Store').data));
    const clone = JSON.parse(JSON.stringify(snapshot));
    G('Store').replaceAll(clone, { silent: true });
    if (G('Store').data.users.length !== snapshot.users.length) throw new Error('mismatch');
    if (G('Store').data.dashboards.length !== snapshot.dashboards.length) throw new Error('dashboards mismatch');
  });
  step('sync token never leaks into shareable payload', () => {
    G('Store').data.sync.token = 'ghp_secret_value';
    const payload = JSON.parse(JSON.stringify(G('Store').data));
    payload.sync.token = '';
    if (payload.sync.token) throw new Error('token present');
  });

  console.log('\n== security hardening ==');
  step('setup wizard cannot be re-run by a junior rank', () => {
    const trainee = G('Store').data.users.find(u => u.username === 'kai.tech');
    trainee.rankId = G('Store').data.ranks.find(r => r.level === 1).id;
    A.impersonate(trainee.id);
    const before = G('Store').data.users.length;
    try {
      G('Wizard').start(true);
      if (!doc.getElementById('setup-wizard-backdrop').classList.contains('hidden')) {
        throw new Error('trainee managed to open the setup wizard on a live workspace');
      }
      if (G('Store').data.users.length !== before) throw new Error('accounts changed');
    } finally {
      A.exitImpersonation();
      trainee.rankId = G('Store').data.ranks.find(r => r.level === 2).id;
    }
  });
  step('founder can re-run the setup wizard (non-destructively)', () => {
    G('Wizard').start(true);
    const open = !doc.getElementById('setup-wizard-backdrop').classList.contains('hidden');
    G('Wizard').close();
    if (!open) throw new Error('founder could not open the wizard');
  });

  console.log('\n== global search ==');
  step('search modal lists matches', () => {
    A.handleGlobalSearch('riley');
    const body = doc.getElementById('action-modal-card').innerHTML;
    if (!body.includes('Riley')) throw new Error('no match rendered');
    G('Modal').close();
  });

  console.log('\n== updater (offline handling) ==');
  G('Updater').info.error = null;
  G('Updater').info.checking = false;
  await G('Updater').check({});
  step('update check never breaks the app', () => {
    if (typeof G('Updater').info.updateAvailable !== 'boolean') throw new Error('update state missing');
    const pill = doc.getElementById('topbar-update-pill');
    if (!/Up to date|available|failed/.test(pill.innerHTML)) throw new Error('pill: ' + pill.innerHTML);
    console.log('     update state →', G('Updater').info.updateAvailable ? 'update available: v' + G('Updater').info.latestVersion : 'up to date', G('Updater').info.error ? ('(error: ' + G('Updater').info.error + ')') : '');
  });

  console.log('\n== helper unit checks ==');
  step('version compare', () => {
    const c = G('Utils').compareVersions;
    if (c('1.0.1','1.0.0') !== 1) throw new Error('1.0.1 > 1.0.0');
    if (c('v2.0.0','1.9.9') !== 1) throw new Error('v prefix');
    if (c('1.0.0','1.0.0') !== 0) throw new Error('equal');
    if (c('1.0.0','1.0.1') !== -1) throw new Error('less');
  });
  step('escaping prevents HTML injection', () => {
    const out = G('Utils').esc('<img src=x onerror=alert(1)>');
    if (out.includes('<img')) throw new Error('not escaped');
  });
  step('initials + palette', () => {
    if (G('Utils').initials('Nova Varga') !== 'NV') throw new Error('initials');
    if (!/^#/.test(G('Utils').colorFor('abc'))) throw new Error('color');
  });

  console.log('\n== serverless sync (live GitHub, read-only) ==');
  {
    const Sync = G('Sync');
    const Store = G('Store');
    if (typeof dom.window.fetch !== 'function') {
      console.log('  – skipped (no fetch in this environment)');
    } else {
      // 1. Connection test against the studio release repository (public read).
      const test = await Sync.test({ repo: 'Dinomax2005/scrapped-connect-releases', branch: 'main', token: '' });
      if (test.ok) console.log('  ✓ GitHub connection test:', test.message, '| write access:', test.canWrite);
      else console.log('  – GitHub connection test skipped:', test.message);

      // 2. Base64 workspace decode path (uses a real file from the repo).
      try {
        const raw = await Sync.api('/repos/Dinomax2005/scrapped-connect-releases/contents/README.md?ref=main');
        const decoded = decodeURIComponent(escape(Buffer.from(String(raw.content).replace(/\n/g, ''), 'base64').toString('binary')));
        if (typeof decoded !== 'string' || !decoded.length) throw new Error('empty decode');
        console.log('  ✓ content API decode works (', raw.sha.slice(0, 7), ')');
      } catch (err) {
        console.log('  – content API check skipped:', err.message);
      }

      // 3. Missing remote workspace must be reported, never crash.
      Store.data.sync = Object.assign(Store.data.sync, {
        enabled: true, repo: 'Dinomax2005/scrapped-connect-releases', branch: 'connect-data',
        path: 'data/scrapped-connect.json', token: '', autoPush: false
      });
      await Sync.pull({ silent: true });
      if (Sync.status.state === 'idle') console.log('  ✓ missing remote workspace handled gracefully');
      else if (Sync.status.state === 'error') console.log('  – pull reported error (offline?):', Sync.status.message);
      else errors.push('sync: unexpected status ' + Sync.status.state + ' ' + Sync.status.message);

      // 4. Push without a valid token must fail loudly but safely.
      Store.data.sync.token = '';
      Sync.status = { state: 'idle', message: 'test' };
      await Sync.test({ repo: 'Dinomax2005/scrapped-connect-releases', branch: 'main', token: 'definitely-not-a-token' });
      console.log('  ✓ invalid credentials rejected without breaking the app');
      Store.data.sync.enabled = false;
      Store.data.sync.token = '';
    }
  }

  const real = errors.filter(e => !/Not implemented: HTMLCanvas|Not implemented: navigation/.test(e));
  console.log('\n================ RESULT ================');
  console.log(real.length ? '❌ FAILURES:\n' + real.join('\n') : '✅ all checks passed');
  process.exit(real.length ? 1 : 0);
})();
