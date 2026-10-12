/* ============================================================================
 * SCRAPPED Connect — Setup Wizard, Serverless Sync, Updater & Settings
 * ==========================================================================*/

const Wizard = {
  step: 1,
  totalSteps: 6,
  draft: null,

  start(force) {
    if (Store.data.meta.initialized && !force) return;
    // A shared workspace must not let a junior re-run setup and mint themselves an owner account.
    const alreadySetUp = Store.data.meta.initialized && Store.data.users.length > 0;
    if (alreadySetUp && force && !Auth.can('manageAccounts')) {
      Toast.show('⛔ Only the Founder (or a manager rank) can re-run the Setup Wizard in a live workspace.', 'danger', 4500);
      return;
    }
    Wizard.step = 1;
    Wizard.draft = {
      studioName: Store.data.settings.studioName || 'SCRAPPED studio',
      logoLetter: Store.data.settings.logoLetter || 'S',
      founderName: '',
      founderUsername: '',
      founderEmail: '',
      password: App.randomPassword(12),
      confirm: '',
      secQ: 'What is our internal studio codename for the engine?',
      secA: '',
      enableTemplates: true,
      seedDemo: false,
      syncMode: 'later',
      syncRepo: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      syncBranch: 'connect-data',
      syncPath: 'data/scrapped-connect.json',
      syncToken: ''
    };
    if (!Wizard.draft.confirm) Wizard.draft.confirm = Wizard.draft.password;
    Wizard.render();
    document.getElementById('setup-wizard-backdrop').classList.remove('hidden');
  },

  close() {
    document.getElementById('setup-wizard-backdrop').classList.add('hidden');
  },

  capture() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    const c = (id) => { const el = document.getElementById(id); return el ? el.checked : undefined; };
    const d = Wizard.draft;
    switch (Wizard.step) {
      case 1:
        d.studioName = g('wz-studio') || d.studioName;
        d.logoLetter = (g('wz-logo') || d.logoLetter).slice(0, 2).toUpperCase();
        break;
      case 2:
        d.founderName = g('wz-name') || d.founderName;
        d.founderUsername = (g('wz-username') || d.founderUsername || '').toLowerCase();
        d.founderEmail = g('wz-email') || d.founderEmail;
        d.password = g('wz-pass') || d.password;
        d.confirm = g('wz-pass2') || d.confirm;
        break;
      case 3:
        d.secQ = g('wz-secq') || d.secQ;
        d.secA = g('wz-seca') || d.secA;
        break;
      case 4:
        d.syncMode = g('wz-syncmode') || d.syncMode;
        d.syncRepo = g('wz-repo') || d.syncRepo;
        d.syncBranch = g('wz-branch') || d.syncBranch;
        d.syncPath = g('wz-path') || d.syncPath;
        d.syncToken = g('wz-token') || d.syncToken;
        break;
      case 5:
        d.enableTemplates = c('wz-templates');
        d.seedDemo = c('wz-demo');
        break;
      default: break;
    }
  },

  next() { Wizard.capture(); if (Wizard.step < Wizard.totalSteps) { Wizard.step++; Wizard.render(); } },
  back() { Wizard.capture(); if (Wizard.step > 1) { Wizard.step--; Wizard.render(); } },

  render() {
    const d = Wizard.draft || {};
    const steps = ['Studio', 'Founder', 'Recovery', 'Cloud Sync', 'Content', 'Finish'];
    const stepper = `<div class="wizard-steps">
      ${steps.map((s, i) => `<div class="wizard-step-pill ${Wizard.step === i + 1 ? 'active' : (Wizard.step > i + 1 ? 'done' : '')}">
        <span>${Wizard.step > i + 1 ? '✓' : (i + 1)}</span> ${s}</div>`).join('')}
    </div>`;

    let body = '', footer = '';

    if (Wizard.step === 1) {
      body = `
        <div style="text-align:center;margin-bottom:20px">
          <div class="brand-logo" style="width:64px;height:64px;font-size:31px;margin:0 auto 12px;border-radius:16px">${Utils.esc(d.logoLetter || 'S')}</div>
          <div style="font-size:20px;font-weight:800">Welcome to SCRAPPED Connect</div>
          <div style="font-size:13px;color:var(--text-secondary);max-width:520px;margin:6px auto 0">
            Your serverless studio operating system — accounts, ranks, dashboards, tasks, sprints, bugs and your code vault,
            all stored locally on your machine with optional GitHub team sync.
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Studio name</label>
            <input class="form-input" id="wz-studio" value="${Utils.esc(d.studioName || '')}" /></div>
          <div class="form-group"><label class="form-label">Logo initials</label>
            <input class="form-input" id="wz-logo" maxlength="2" value="${Utils.esc(d.logoLetter || 'S')}" /></div>
        </div>
        <div class="card" style="background:var(--bg-elevated)">
          <div style="font-size:12.5px;color:var(--text-secondary)">
            <strong style="color:var(--text-primary)">No server required.</strong> SCRAPPED Connect runs entirely on this device.
            Nothing is sent anywhere unless you switch on GitHub sync in step 4 — then your team's workspace is stored in
            your own private GitHub repository.
          </div>
        </div>`;
      footer = `<span style="font-size:12px;color:var(--text-muted)">Step 1 of ${Wizard.totalSteps}</span>
        <button class="btn btn-primary" onclick="Wizard.next()">Let's go →</button>`;

    } else if (Wizard.step === 2) {
      const existing = Store.data.users.length;
      body = `
        ${existing ? `<div class="card" style="background:var(--warning-soft);border-color:rgba(245,158,11,.4);margin-bottom:14px;font-size:12.5px">
          ⚠️ This workspace already has <strong>${existing} account${existing === 1 ? '' : 's'}</strong>.
          Finishing the wizard adds <strong>another owner-level account</strong> — use it only for recovery or a second studio lead.
          Dashboards, tasks and existing accounts are kept.
        </div>` : ''}
        <div style="margin-bottom:16px">
          <div style="font-size:16px;font-weight:800">👑 Create the Founder account</div>
          <div style="font-size:12.5px;color:var(--text-secondary)">
            The first account created becomes the <strong>Founder</strong> — full control over every account, rank, dashboard and release.
            You can create all other developer accounts after setup.
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Your name *</label>
            <input class="form-input" id="wz-name" value="${Utils.esc(d.founderName || '')}" placeholder="Your display name" /></div>
          <div class="form-group"><label class="form-label">Founder username *</label>
            <input class="form-input" id="wz-username" value="${Utils.esc(d.founderUsername || '')}" placeholder="founder" /></div>
        </div>
        <div class="form-group"><label class="form-label">Email (optional)</label>
          <input class="form-input" id="wz-email" value="${Utils.esc(d.founderEmail || '')}" placeholder="you@scrapped.studio" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Master password * (min 6 chars)</label>
            <input class="form-input" id="wz-pass" type="text" value="${Utils.esc(d.password || '')}" /></div>
          <div class="form-group"><label class="form-label">Confirm password *</label>
            <input class="form-input" id="wz-pass2" type="text" value="${Utils.esc(d.confirm || d.password || '')}" /></div>
        </div>
        <div class="card" style="background:var(--bg-elevated);font-size:12px;color:var(--text-secondary)">
          🔐 Passwords are hashed with PBKDF2-SHA256 (120,000 iterations) and never stored in plain text.
          Keep the master password safe — <strong>it cannot be recovered</strong>, though your security question in the next step can reset it.
        </div>`;
      footer = `<div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Wizard.back()">← Back</button>
          <button class="btn btn-secondary" onclick="Wizard.draft.password=App.randomPassword(12);Wizard.draft.confirm=Wizard.draft.password;Wizard.render()">🎲 Generate strong password</button>
        </div>
        <button class="btn btn-primary" onclick="Wizard.next()">Continue →</button>`;

    } else if (Wizard.step === 3) {
      body = `
        <div style="margin-bottom:16px">
          <div style="font-size:16px;font-weight:800">🛟 Account recovery</div>
          <div style="font-size:12.5px;color:var(--text-secondary)">
            Because there is no server, recovery happens locally. Set a security question only you can answer.
          </div>
        </div>
        <div class="form-group"><label class="form-label">Security question</label>
          <input class="form-input" id="wz-secq" value="${Utils.esc(d.secQ || '')}" /></div>
        <div class="form-group"><label class="form-label">Secret answer</label>
          <input class="form-input" id="wz-seca" value="${Utils.esc(d.secA || '')}" placeholder="Only you know this" /></div>
        <div class="card" style="background:var(--bg-elevated);font-size:12px;color:var(--text-secondary)">
          Answers are stored as salted HMAC hashes — they can verify you, never expose your secret.
          You can also export an encrypted-style backup of the whole workspace at any time from
          <strong>Updater &amp; Setup .EXE → Workspace Backup</strong>.
        </div>`;
      footer = `<button class="btn btn-secondary" onclick="Wizard.back()">← Back</button>
        <button class="btn btn-primary" onclick="Wizard.next()">Continue →</button>`;

    } else if (Wizard.step === 4) {
      body = `
        <div style="margin-bottom:16px">
          <div style="font-size:16px;font-weight:800">☁️ Serverless team sync (optional)</div>
          <div style="font-size:12.5px;color:var(--text-secondary)">
            Want your developers to share one workspace without renting a server? Point SCRAPPED Connect at a private
            GitHub repository — it becomes your free datastore.
          </div>
        </div>
        <div class="form-group"><label class="form-label">Sync mode</label>
          <select class="form-select" id="wz-syncmode">
            <option value="local" ${d.syncMode === 'local' ? 'selected' : ''}>Local only — everything stays on this device</option>
            <option value="github" ${d.syncMode === 'github' ? 'selected' : ''}>GitHub sync — share the workspace with my team (recommended)</option>
          </select></div>
        <div id="wz-sync-fields">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Repository (owner/name)</label>
              <input class="form-input" id="wz-repo" value="${Utils.esc(d.syncRepo || '')}" /></div>
            <div class="form-group"><label class="form-label">Branch</label>
              <input class="form-input" id="wz-branch" value="${Utils.esc(d.syncBranch || '')}" /></div>
          </div>
          <div class="form-group"><label class="form-label">Data file path</label>
            <input class="form-input" id="wz-path" value="${Utils.esc(d.syncPath || '')}" /></div>
          <div class="form-group"><label class="form-label">GitHub token (fine-grained, Contents: read &amp; write on that repo)</label>
            <input class="form-input" id="wz-token" type="password" value="${Utils.esc(d.syncToken || '')}" placeholder="github_pat_…" /></div>
          <div class="card" style="background:var(--bg-elevated);font-size:12px;color:var(--text-secondary)">
            🔑 Create the token at <strong>github.com → Settings → Developer settings → Fine-grained tokens</strong>.
            Give it <em>Contents: Read and write</em> on your studio repo only. The token never leaves your device, and it is
            stripped out of the synced workspace file so teammates never receive it.
          </div>
        </div>`;
      footer = `<button class="btn btn-secondary" onclick="Wizard.back()">← Back</button>
        <button class="btn btn-secondary" onclick="Wizard.draft.syncMode='local';Wizard.next()">Skip for now</button>
        <button class="btn btn-primary" onclick="Wizard.next()">Continue →</button>`;

    } else if (Wizard.step === 5) {
      body = `
        <div style="margin-bottom:16px">
          <div style="font-size:16px;font-weight:800">📊 Bootstrap your studio</div>
          <div style="font-size:12.5px;color:var(--text-secondary)">Choose what SCRAPPED Connect should prepare for you.</div>
        </div>
        <label style="display:flex;gap:11px;align-items:flex-start;padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:10px">
          <input type="checkbox" id="wz-templates" ${d.enableTemplates !== false ? 'checked' : ''} style="margin-top:3px" />
          <div><div style="font-weight:700;font-size:13.5px">Create the three studio dashboards</div>
            <div style="font-size:12px;color:var(--text-secondary)">Company Overview, Developer Productivity and Release Readiness — live metric widgets you can customise or extend.</div></div>
        </label>
        <label style="display:flex;gap:11px;align-items:flex-start;padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:10px">
          <input type="checkbox" id="wz-demo" ${d.seedDemo ? 'checked' : ''} style="margin-top:3px" />
          <div><div style="font-weight:700;font-size:13.5px">Add sample team accounts &amp; work items</div>
            <div style="font-size:12px;color:var(--text-secondary)">Two demo developers, a sprint, tasks, a bug and a code snippet so you can see how everything behaves. Delete them anytime.</div></div>
        </label>
        <div class="card" style="background:var(--bg-elevated);font-size:12px;color:var(--text-secondary)">
          You will land on <strong>Company Dashboards</strong> and can create real developer accounts from
          <strong>Accounts &amp; Rerank</strong> at any moment.
        </div>`;
      footer = `<button class="btn btn-secondary" onclick="Wizard.back()">← Back</button>
        <button class="btn btn-primary" onclick="Wizard.next()">Continue →</button>`;

    } else if (Wizard.step === 6) {
      body = `
        <div style="text-align:center;margin-bottom:8px">
          <div style="font-size:40px">🎉</div>
          <div style="font-size:19px;font-weight:800;margin-top:6px">Ready to launch ${Utils.esc(d.studioName || '')}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:6px">Review your setup — everything is editable later in the app.</div>
        </div>
        <div class="card" style="background:var(--bg-elevated)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:12.5px">
            <div><span style="color:var(--text-muted)">Studio</span><br><strong>${Utils.esc(d.studioName || '')}</strong></div>
            <div><span style="color:var(--text-muted)">Founder account</span><br><strong>${Utils.esc(d.founderName || '')} (@${Utils.esc(d.founderUsername || '')})</strong></div>
            <div><span style="color:var(--text-muted)">Rank granted</span><br><strong style="color:var(--accent)">👑 Founder — FULL ACCESS (LVL 7)</strong></div>
            <div><span style="color:var(--text-muted)">Team sync</span><br><strong>${d.syncMode === 'github' ? 'GitHub — ' + Utils.esc(d.syncRepo || '') : 'Local only'}</strong></div>
            <div><span style="color:var(--text-muted)">Dashboards</span><br><strong>${d.enableTemplates !== false ? '3 studio templates' : 'none yet'}</strong></div>
            <div><span style="color:var(--text-muted)">Auto-updates</span><br><strong>Enabled — checks GitHub releases</strong></div>
          </div>
        </div>
        <div style="margin-top:14px;font-size:12.5px;color:var(--text-secondary)">
          <strong style="color:var(--text-primary)">Next:</strong> install the desktop app with the Windows setup file so the
          auto-updater and local file storage work best.
        </div>`;
      footer = `<button class="btn btn-secondary" onclick="Wizard.back()">← Back</button>
        <button class="btn btn-primary" onclick="Wizard.finish()">🚀 Launch SCRAPPED Connect</button>`;
    }

    document.getElementById('setup-wizard-card').innerHTML = `
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:11px">
          <div class="brand-logo" style="width:34px;height:34px;font-size:16px;border-radius:9px">${Utils.esc(d.logoLetter || 'S')}</div>
          <div>
            <div class="modal-title">SCRAPPED Connect Setup Wizard</div>
            <div style="font-size:11.5px;color:var(--text-muted)">Serverless studio setup · v${APP_VERSION}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Wizard.close()">✕</button>
      </div>
      <div class="modal-body">${stepper}${body}</div>
      <div class="modal-footer">${footer}</div>`;
  },

  async finish() {
    const d = Wizard.draft;
    if (!d.founderName || !d.founderUsername) { Wizard.step = 2; Wizard.render(); return Toast.show('⚠️ Founder name and username are required.', 'warning'); }
    if (!d.password || d.password.length < 6) { Wizard.step = 2; Wizard.render(); return Toast.show('⚠️ Choose a master password with at least 6 characters.', 'warning'); }
    if (d.password !== d.confirm) { Wizard.step = 2; Wizard.render(); return Toast.show('⚠️ Passwords do not match.', 'warning'); }

    Store.data.settings.studioName = d.studioName || 'SCRAPPED studio';
    Store.data.settings.logoLetter = (d.logoLetter || 'S').toUpperCase();

    // Founder account — the very first account in the workspace.
    const founder = await Auth.createUser({
      displayName: d.founderName,
      username: d.founderUsername,
      email: d.founderEmail,
      title: 'Founder & Studio Owner',
      role: 'Owner',
      rankId: Store.data.ranks.find(r => r.level === 7).id,
      password: d.password,
      securityAnswers: [{ q: d.secQ, answer: d.secA }],
      mustChangePassword: false,
      xp: 0
    });
    Auth.setSession(founder.id);
    App.state.impersonateId = null;

    if (d.enableTemplates !== false && !Store.data.dashboards.length) {
      Store.data.dashboards = buildTemplateDashboards();
    }

    if (d.seedDemo) {
      await Wizard.seedDemoData();
    }

    if (d.syncMode === 'github' && d.syncRepo && d.syncToken) {
      Store.data.sync = Object.assign(Store.data.sync, {
        enabled: true, mode: 'github', repo: d.syncRepo.trim(), branch: (d.syncBranch || 'connect-data').trim(),
        path: (d.syncPath || 'data/scrapped-connect.json').trim(), token: d.syncToken.trim(), autoPush: true
      });
      Store.data.settings.autoSync = true;
    }

    Store.data.meta.initialized = true;
    Log.add('studio.setup', `Studio workspace initialised — Founder @${founder.username} created`);
    Store.save();
    Sync.startAuto();
    if (Store.data.sync.enabled) Sync.push({ silent: true });

    Wizard.close();
    Toast.show('🎉 Workspace ready — welcome, Founder!', 'success', 4500);
    App.state.view = 'dashboards';
    App.render();
    setTimeout(() => Updater.check({ notify: false }), 1200);
  },

  async seedDemoData() {
    const juniorRank = Store.data.ranks.find(r => r.level === 2).id;
    const devRank = Store.data.ranks.find(r => r.level === 3).id;
    const mk = async (name, username, rankId, title, skills) => Auth.createUser({
      displayName: name, username, rankId, title, skills, password: 'scrapped-demo', email: '', securityAnswers: [], xp: 60
    });
    const a = await mk('Nova Varga', 'nova.dev', devRank, 'Gameplay Programmer', ['C#', 'Unity', 'Physics']);
    const b = await mk('Kai Mercer', 'kai.tech', juniorRank, 'Junior Tools Programmer', ['Python', 'C++', 'Editor tooling']);

    const tasks = [
      { title: 'Wall-run velocity clamp', status: 'In Progress', priority: 'High', assigneeId: a.id, tags: ['movement'], estimate: 6 },
      { title: 'Boss phase 2 attack pattern', status: 'To Do', priority: 'Urgent', assigneeId: a.id, tags: ['combat', 'boss'], estimate: 12 },
      { title: 'Editor: level lighting baker', status: 'Backlog', priority: 'Medium', assigneeId: b.id, tags: ['tools'], estimate: 8 },
      { title: 'Save system migration', status: 'Code Review', priority: 'High', assigneeId: b.id, tags: ['backend'], estimate: 5 },
      { title: 'Menu navigation polish', status: 'Done', priority: 'Low', assigneeId: a.id, tags: ['ui'], estimate: 3 }
    ].map(t => Object.assign({
      id: Utils.uid('task'), reporterId: Auth.currentUserId(), description: 'Sample work item created by the setup wizard.',
      sprintId: null, dashboardId: null, createdAt: Utils.now(), movedAt: Utils.now(),
      completedAt: t.status === 'Done' ? Utils.now() : null
    }, t));
    Store.data.tasks.push(...tasks);

    const sprint = {
      id: Utils.uid('sprint'), name: 'Sprint 1 — Vertical Slice',
      goal: 'Playable combat slice with one full boss fight and stable saves.',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      status: 'Active', taskIds: tasks.slice(0, 4).map((t) => t.id), createdAt: Utils.now(), createdBy: Auth.currentUserId()
    };
    Store.data.sprints.push(sprint);
    tasks.slice(0, 4).forEach(t => { t.sprintId = sprint.id; });

    Store.data.bugs.push({
      id: Utils.uid('bug'), title: 'Character clips through east wall on Level 3',
      description: 'During the wall-run tutorial the player capsule tunnels through geometry.',
      steps: '1. Load Level 3\n2. Sprint into the east wall\n3. Clip through', severity: 'Critical', status: 'Triaged',
      assigneeId: a.id, reporterId: b.id, build: 'v' + APP_VERSION, environment: 'Windows 11 · Steam build',
      createdAt: Utils.now()
    }, {
      id: Utils.uid('bug'), title: 'Boss health bar stays full after phase transition',
      description: 'HUD does not update until the next damage tick.',
      steps: '1. Damage boss to 50%\n2. Watch health bar', severity: 'Medium', status: 'New',
      assigneeId: null, reporterId: a.id, build: 'v' + APP_VERSION, environment: 'Windows 11',
      createdAt: Utils.now()
    });

    Store.data.snippets.push({
      id: Utils.uid('snip'), title: 'Frame-rate independent movement clamp', language: 'C#',
      description: 'Shared SCRAPPED helper used by all locomotion abilities.',
      code: 'public Vector3 ClampVelocity(Vector3 v, float maxSpeed) {\n    var flat = new Vector3(v.x, 0f, v.z);\n    if (flat.magnitude > maxSpeed) {\n        flat = flat.normalized * maxSpeed;\n    }\n    return flat + Vector3.up * v.y;\n}',
      tags: ['movement', 'physics'], authorId: a.id, createdAt: Utils.now(), updatedAt: Utils.now()
    });
    Store.save({ skipSync: true });
  }
};

/* ------------------------------------------------------------------ SYNC UI */
const SystemViews = {
  renderSync() {
    const c = Store.data.sync;
    const status = Sync.status;
    const color = status.state === 'ok' ? 'var(--success)' : status.state === 'error' ? 'var(--danger)' : status.state === 'syncing' ? 'var(--accent)' : 'var(--text-muted)';
    const lastPush = c.lastPushAt ? Utils.fmtDateTime(c.lastPushAt) : 'never';
    const lastPull = c.lastPullAt ? Utils.fmtDateTime(c.lastPullAt) : 'never';

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">
      <div class="card"><div class="kpi-subtext">Sync mode</div><div class="kpi-value" style="font-size:19px">${c.enabled ? '☁️ GitHub' : '💾 Local only'}</div>
        <div class="kpi-subtext">${c.enabled ? Utils.esc(c.repo) : 'No server, no accounts online'}</div></div>
      <div class="card"><div class="kpi-subtext">Connection</div>
        <div class="kpi-value" style="font-size:19px;color:${color}">${Utils.esc(status.message)}</div>
        <div class="kpi-subtext">${status.at ? 'checked ' + Utils.timeAgo(status.at) : 'not tested yet'}</div></div>
      <div class="card"><div class="kpi-subtext">Last push</div><div class="kpi-value" style="font-size:17px">${Utils.esc(lastPush)}</div>
        <div class="kpi-subtext">rev ${Store.data.meta.revision}</div></div>
      <div class="card"><div class="kpi-subtext">Last pull</div><div class="kpi-value" style="font-size:17px">${Utils.esc(lastPull)}</div>
        <div class="kpi-subtext">${Store.data.users.length} accounts · ${Store.data.tasks.length} tasks</div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">☁️ Serverless Team Sync</div>
        <span class="pill ${c.enabled ? 'pill-success' : ''}" ${c.enabled ? '' : 'style="background:var(--bg-base);color:var(--text-secondary)"'}>${c.enabled ? 'ENABLED' : 'DISABLED'}</span></div>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px">
        SCRAPPED Connect uses <strong>your own GitHub repository</strong> as the shared datastore instead of a paid server.
        Every account, rank, dashboard, task, bug and snippet is committed to one JSON file on a branch of your choosing —
        your developers simply point their copy at the same repo and token.
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Repository (owner/name)</label>
          <input class="form-input" id="sy-repo" value="${Utils.esc(c.repo || '')}" /></div>
        <div class="form-group"><label class="form-label">Branch</label>
          <input class="form-input" id="sy-branch" value="${Utils.esc(c.branch || '')}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Data file path in repo</label>
        <input class="form-input" id="sy-path" value="${Utils.esc(c.path || '')}" /></div>
      <div class="form-group"><label class="form-label">Fine-grained personal access token (Contents: read &amp; write)</label>
        <input class="form-input" id="sy-token" type="password" value="${Utils.esc(c.token || '')}" placeholder="github_pat_…" /></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:8px">
        <input type="checkbox" id="sy-enabled" ${c.enabled ? 'checked' : ''} /> Enable GitHub team sync</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:8px">
        <input type="checkbox" id="sy-autopush" ${c.autoPush !== false ? 'checked' : ''} /> Auto-push workspace changes (debounced 3.5s)</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:14px">
        <input type="checkbox" id="sy-autopull" ${c.autoPull !== false ? 'checked' : ''} /> Auto-pull every
        <input class="form-input" id="sy-interval" type="number" min="1" max="120" value="${c.syncEveryMinutes || 5}" style="width:70px;display:inline-block;padding:3px 8px" /> minutes
      </label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="SystemViews.saveSync()">💾 Save Sync Settings</button>
        <button class="btn btn-secondary btn-sm" onclick="SystemViews.testSync()">🔌 Test Connection</button>
        <button class="btn btn-secondary btn-sm" onclick="Sync.push()">⬆ Push Now</button>
        <button class="btn btn-secondary btn-sm" onclick="Sync.pull()">⬇ Pull Now</button>
        <button class="btn btn-danger btn-sm" onclick="SystemViews.disableSync()">⛔ Disable Sync</button>
      </div>
      <div id="sy-test-result" style="margin-top:12px"></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🔑 How to create the token</div></div>
        <ol style="font-size:12.5px;color:var(--text-secondary);padding-left:18px;line-height:1.9">
          <li>Open <strong>github.com/settings/personal-access-tokens/new</strong></li>
          <li>Token name: <span class="pill pill-accent">SCRAPPED Connect</span></li>
          <li>Repository access: only <strong>${Utils.esc(c.repo || 'your studio repo')}</strong></li>
          <li>Permissions → Repository → <strong>Contents: Read and write</strong></li>
          <li>Generate, copy, paste it here and press <strong>Test Connection</strong></li>
        </ol>
        <div class="code-block" style="margin-top:10px">Token stays local · stripped from synced payload</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">👥 Onboarding a developer</div></div>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px">Each developer installs the same .exe, then in <em>Serverless Sync</em> uses these values:</div>
        <div class="code-block">repo:   ${Utils.esc(c.repo || 'owner/name')}
branch: ${Utils.esc(c.branch || 'connect-data')}
path:   ${Utils.esc(c.path || 'data/scrapped-connect.json')}
token:  &lt;shared read/write token&gt;</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:10px">
          They press <strong>Pull Now</strong> to receive the studio workspace, then log in with the account you created for them.
        </div>
      </div>
    </div>`;
  },

  saveSync() {
    const c = Store.data.sync;
    c.repo = document.getElementById('sy-repo').value.trim();
    c.branch = document.getElementById('sy-branch').value.trim() || 'connect-data';
    c.path = document.getElementById('sy-path').value.trim() || 'data/scrapped-connect.json';
    c.token = document.getElementById('sy-token').value.trim();
    c.enabled = document.getElementById('sy-enabled').checked;
    c.autoPush = document.getElementById('sy-autopush').checked;
    c.autoPull = document.getElementById('sy-autopull').checked;
    c.syncEveryMinutes = parseInt(document.getElementById('sy-interval').value, 10) || 5;
    c.mode = c.enabled ? 'github' : 'local';
    Store.save({ skipSync: true });
    Sync.startAuto();
    Log.add('sync.config', c.enabled ? `GitHub sync enabled for ${c.repo}` : 'GitHub sync disabled');
    Toast.show('✅ Sync settings saved.', 'success');
    App.render();
  },

  async testSync() {
    const box = document.getElementById('sy-test-result');
    box.innerHTML = `<div class="pill pill-info">⏳ Testing connection…</div>`;
    const res = await Sync.test({
      repo: document.getElementById('sy-repo').value.trim(),
      branch: document.getElementById('sy-branch').value.trim(),
      token: document.getElementById('sy-token').value.trim()
    });
    if (res.ok) {
      box.innerHTML = `<div class="card" style="background:var(--success-soft);border-color:rgba(16,185,129,0.35)">
        <div style="font-size:13px"><strong>✅ ${Utils.esc(res.message)}</strong></div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:5px">
          Default branch: ${Utils.esc(res.defaultBranch)} · ${res.private ? 'private repo' : 'public repo'} ·
          ${res.canWrite ? 'write access ✓' : '⚠️ read-only token'}${res.branchOk ? '' : ` · ⚠️ ${Utils.esc(res.branchNote)}`}
        </div></div>`;
    } else {
      box.innerHTML = `<div class="card" style="background:var(--danger-soft);border-color:rgba(239,68,68,0.35)">
        <div style="font-size:13px"><strong>❌ Connection failed</strong></div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:5px">${Utils.esc(res.message)}</div></div>`;
    }
  },

  disableSync() {
    Store.data.sync.enabled = false;
    Store.data.sync.mode = 'local';
    Sync.stopAuto();
    Store.save({ skipSync: true });
    Sync.setStatus('idle', 'Local only');
    Toast.show('⛔ GitHub sync disabled — workspace stays on this device.', 'warning');
    App.render();
  },

  renderUpdater() {
    const u = Updater.info;
    const asset = Updater.pickInstallerAsset();
    const desktop = Updater.isDesktop();
    const statusColor = u.error ? 'var(--danger)' : u.updateAvailable ? 'var(--warning)' : 'var(--success)';
    const statusText = u.error ? 'Check failed' : u.updateAvailable ? 'Update available' : 'Up to date';

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">
      <div class="card"><div class="kpi-subtext">Installed version</div><div class="kpi-value" style="font-size:22px">v${APP_VERSION}</div>
        <div class="kpi-subtext">${desktop ? '🖥️ Desktop build' : '🌐 Web build'}</div></div>
      <div class="card"><div class="kpi-subtext">GitHub latest</div><div class="kpi-value" style="font-size:22px">${u.latestVersion ? 'v' + Utils.esc(u.latestVersion) : '—'}</div>
        <div class="kpi-subtext">${u.publishedAt ? Utils.fmtDate(u.publishedAt) : 'never checked'}</div></div>
      <div class="card"><div class="kpi-subtext">Update status</div><div class="kpi-value" style="font-size:19px;color:${statusColor}">${statusText}</div>
        <div class="kpi-subtext">${u.lastChecked ? 'checked ' + Utils.timeAgo(u.lastChecked) : 'press Check for Updates'}</div></div>
      <div class="card"><div class="kpi-subtext">Release channel</div><div class="kpi-value" style="font-size:19px">Stable</div>
        <div class="kpi-subtext">${GITHUB_OWNER}/${GITHUB_REPO}</div></div>
    </div>

    ${u.updateAvailable ? `
    <div class="card" style="border-color:var(--warning);background:linear-gradient(90deg,rgba(245,158,11,0.12),transparent);margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <div style="font-size:15px;font-weight:800">🚀 SCRAPPED Connect v${Utils.esc(u.latestVersion)} is ready</div>
          <div style="font-size:12.5px;color:var(--text-secondary);margin:6px 0 10px">
            ${u.latestName ? Utils.esc(u.latestName) + ' · ' : ''}published ${Utils.timeAgo(u.publishedAt)}
          </div>
          ${u.latestNotes ? `<div class="code-block" style="max-height:180px;overflow:auto;white-space:pre-wrap">${Utils.esc(String(u.latestNotes).slice(0, 1500))}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:230px">
          ${asset ? `<div style="font-size:12px;color:var(--text-secondary)">Installer: <strong>${Utils.esc(asset.name)}</strong>${asset.size ? ` · ${Utils.bytes(asset.size)}` : ''}</div>` : ''}
          <button class="btn btn-primary" onclick="Updater.apply()">${desktop ? '⚡ Download & Install Automatically' : '⚡ Update Now (refresh web build)'}</button>
          ${asset ? `<button class="btn btn-secondary" onclick="App.openExternal('${Utils.esc(asset.url)}')">📥 Download Installer Manually</button>` : ''}
          ${u.htmlUrl ? `<button class="btn btn-secondary" onclick="App.openExternal('${Utils.esc(u.htmlUrl)}')">🌐 View Release on GitHub</button>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">🔄 Auto-Updater</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px">
          <input type="checkbox" ${Store.data.settings.autoUpdateCheck ? 'checked' : ''} onchange="Store.data.settings.autoUpdateCheck=this.checked;Store.save();Toast.show(this.checked?'✅ Auto update checks enabled':'⛔ Auto update checks disabled')" />
          Check for updates on launch</label></div>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
        SCRAPPED Connect reads the newest release from
        <strong>github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases</strong> and compares it with your installed build.
        ${desktop
          ? 'In the desktop app the updater downloads the new release, replaces the local files and restarts the app automatically.'
          : 'In the web build the updater clears the local cache and reloads the newest build instantly.'}
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:12px">
        <input type="checkbox" ${Store.data.settings.autoUpdateApply ? 'checked' : ''} onchange="Store.data.settings.autoUpdateApply=this.checked;Store.save()" />
        Install updates automatically without asking (recommended for studio workstations)
      </label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="Updater.check({notify:true})">${u.checking ? '⏳ Checking…' : '🔍 Check for Updates'}</button>
        <button class="btn btn-secondary btn-sm" onclick="Updater.apply()">⚡ Restart &amp; Update Now</button>
        ${desktop ? `<button class="btn btn-secondary btn-sm" onclick="window.ScrappedDesktop.openDataFolder()">📁 Open Data Folder</button>
        <button class="btn btn-secondary btn-sm" onclick="window.ScrappedDesktop.relaunch()">♻️ Relaunch App</button>` : ''}
      </div>
      ${u.error ? `<div class="card" style="margin-top:12px;background:var(--danger-soft);border-color:rgba(239,68,68,0.35);font-size:12.5px">
        ⚠️ Last check failed: ${Utils.esc(u.error)}<br>
        <span style="color:var(--text-muted)">If no release exists yet, publish one — instructions are below.</span></div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">📥 Windows Setup — SCRAPPED-Connect-Setup.exe</div></div>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
          The setup wizard installer boots the app, runs the first-time setup and wires the auto-updater to your GitHub releases.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="App.downloadInstaller('setup')">📥 Download Setup .EXE</button>
          <button class="btn btn-secondary btn-sm" onclick="App.downloadInstaller('portable')">🗜️ Download Portable .ZIP</button>
        </div>
        <div class="code-block" style="margin-top:12px">Reinstall / update anytime:
run the new setup → it upgrades in place and keeps your data.</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📦 Publishing a new release (updater feed)</div></div>
        <ol style="font-size:12.5px;color:var(--text-secondary);padding-left:18px;line-height:1.85">
          <li>Bump <code style="font-family:var(--font-mono)">version</code> in the app + build the installer</li>
          <li>Create a GitHub release tagged <code style="font-family:var(--font-mono)">v1.0.1</code></li>
          <li>Attach <code style="font-family:var(--font-mono)">SCRAPPED-Connect-Setup.exe</code> (or the portable zip)</li>
          <li>Publish — every installed app updates automatically</li>
        </ol>
        <div class="code-block">gh release create v1.0.1 \\
  release/SCRAPPED-Connect-Setup.exe \\
  --title "SCRAPPED Connect 1.0.1" --notes "What's new…"</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">💾 Workspace Backup &amp; Restore</div></div>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
        Export the entire studio workspace (accounts, ranks, dashboards, tasks, sprints, bugs, vault) as one JSON file.
        Import it on another machine to move your studio without any server.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="Store.exportFile()">📤 Export Workspace</button>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">
          📥 Import Workspace<input type="file" accept="application/json" style="display:none" onchange="App.importWorkspace(this)" /></label>
        <button class="btn btn-danger btn-sm" onclick="App.factoryReset()">🧨 Reset Workspace</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">🧩 System Information</div>
        <span class="pill pill-accent">v${APP_VERSION}</span></div>
      <div style="font-size:12.5px;color:var(--text-secondary);display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>Runtime: <strong>${Utils.esc(desktop ? 'Desktop (Electron)' : 'Browser / PWA')}</strong></div>
        <div>Device ID: <strong style="font-family:var(--font-mono)">${Utils.esc(Store.data.meta.deviceId)}</strong></div>
        <div>Workspace created: <strong>${Utils.fmtDate(Store.data.meta.createdAt)}</strong></div>
        <div>Data revision: <strong>#${Store.data.meta.revision}</strong></div>
        <div>Accounts: <strong>${Store.data.users.length}</strong></div>
        <div>Storage: <strong>${Utils.bytes((localStorage.getItem(DATA_KEY) || '').length)}</strong></div>
        <div>Sync: <strong>${Store.data.sync.enabled ? 'GitHub — ' + Utils.esc(Store.data.sync.repo) : 'Local only'}</strong></div>
        <div>Security: <strong>${Crypto.hasSubtle() ? 'WebCrypto PBKDF2 ✓' : 'JS PBKDF2 fallback'}</strong></div>
      </div>
    </div>`;
  },

  renderSettings() {
    const s = Store.data.settings;
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🏢 Studio Identity</div></div>
        <div class="form-group"><label class="form-label">Studio name</label>
          <input class="form-input" id="st-studio" value="${Utils.esc(s.studioName)}" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Logo initials</label>
            <input class="form-input" id="st-logo" maxlength="2" value="${Utils.esc(s.logoLetter)}" /></div>
          <div class="form-group"><label class="form-label">Tagline</label>
            <input class="form-input" id="st-tagline" value="${Utils.esc(s.studioTagline || '')}" /></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="SystemViews.saveSettings()">Save Identity</button>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">⭐ Ranking Rules (XP)</div></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">XP per task closed</label>
            <input class="form-input" id="st-xp-task" type="number" min="0" value="${s.xpPerTaskClosed}" /></div>
          <div class="form-group"><label class="form-label">XP per bug fixed</label>
            <input class="form-input" id="st-xp-bug" type="number" min="0" value="${s.xpPerBugFixed}" /></div>
        </div>
        <div class="form-group"><label class="form-label">XP per code snippet</label>
          <input class="form-input" id="st-xp-snip" type="number" min="0" value="${s.xpPerSnippet}" /></div>
        <button class="btn btn-primary btn-sm" onclick="SystemViews.saveSettings()">Save Ranking Rules</button>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">👤 My Account</div></div>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
          Signed in as <strong>${Utils.esc((Auth.realUser() || {}).displayName || '—')}</strong>
          (@${Utils.esc((Auth.realUser() || {}).username || '')}) ·
          <span class="pill" style="background:${Auth.rank().color}22;color:${Auth.rank().color};border-color:${Auth.rank().color}55">${Utils.esc(Auth.rank().name)}</span>
        </div>
        <div class="form-group"><label class="form-label">New password</label>
          <input class="form-input" id="st-newpass" type="password" placeholder="min 6 characters" /></div>
        <div class="form-group"><label class="form-label">Confirm new password</label>
          <input class="form-input" id="st-newpass2" type="password" /></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="SystemViews.changeOwnPassword()">🔐 Change Password</button>
          <button class="btn btn-secondary btn-sm" onclick="App.logout()">🚪 Sign Out</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🧙‍♂️ Setup &amp; Danger Zone</div></div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <button class="btn btn-secondary btn-sm" onclick="App.openSetupWizard(true)">🧙‍♂️ Re-run Setup Wizard</button>
          <button class="btn btn-secondary btn-sm" onclick="Store.exportFile()">📤 Export Workspace JSON</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer">📥 Import Workspace JSON
            <input type="file" accept="application/json" style="display:none" onchange="App.importWorkspace(this)" /></label>
          <button class="btn btn-danger btn-sm" onclick="App.factoryReset()">🧨 Factory Reset (delete everything)</button>
        </div>
      </div>
    </div>`;
  },

  saveSettings() {
    const s = Store.data.settings;
    if (document.getElementById('st-studio')) {
      s.studioName = document.getElementById('st-studio').value.trim() || 'SCRAPPED studio';
      s.logoLetter = (document.getElementById('st-logo').value.trim() || 'S').toUpperCase();
      s.studioTagline = document.getElementById('st-tagline').value.trim();
    }
    if (document.getElementById('st-xp-task')) {
      s.xpPerTaskClosed = parseInt(document.getElementById('st-xp-task').value, 10) || 0;
      s.xpPerBugFixed = parseInt(document.getElementById('st-xp-bug').value, 10) || 0;
      s.xpPerSnippet = parseInt(document.getElementById('st-xp-snip').value, 10) || 0;
    }
    Store.save();
    Toast.show('✅ Settings saved.', 'success');
    App.render();
  },

  async changeOwnPassword() {
    const p1 = document.getElementById('st-newpass').value;
    const p2 = document.getElementById('st-newpass2').value;
    if (!p1 || p1.length < 6) return Toast.show('⚠️ Password must be at least 6 characters.', 'warning');
    if (p1 !== p2) return Toast.show('⚠️ Passwords do not match.', 'warning');
    await Auth.changePassword(Auth.currentUserId(), p1);
    Toast.show('🔐 Password changed.', 'success');
    App.render();
  }
};
