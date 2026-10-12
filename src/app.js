/* ============================================================================
 * SCRAPPED Connect — Application Shell, Router & Bootstrap
 * ==========================================================================*/

const App = {
  state: {
    view: 'dashboards',
    impersonateId: null,
    focusMode: false,
    search: ''
  },

  viewTitles: {
    dashboards: 'Company Dashboards',
    team: 'Accounts & Reranking',
    ranks: 'Rank Hierarchy & Permissions',
    tasks: 'Task & Kanban Board',
    sprints: 'Sprints & Studio Roadmap',
    bugs: 'Bug & Issue Tracker',
    codevault: 'SCRAPPED Code Vault',
    sync: 'Serverless Team Sync',
    updater: 'Updater & Setup .EXE',
    settings: 'Studio Settings',
    profile: 'My Developer Profile'
  },

  /* ------------------------------------------------------------- bootstrap */
  async init() {
    Store.load();

    // Desktop shell keeps the workspace in a real file — prefer it when available.
    if (window.ScrappedDesktop && window.ScrappedDesktop.loadState) {
      try {
        const persisted = await window.ScrappedDesktop.loadState();
        if (persisted && persisted.meta) Store.replaceAll(persisted, { silent: true });
        if (window.ScrappedDesktop.setVersion) window.ScrappedDesktop.setVersion(APP_VERSION);
      } catch (e) { console.warn('Desktop state load failed', e); }
    }

    App.renderChrome();

    if (!Store.data.meta.initialized) {
      App.renderLockedShell(true);
      Wizard.start();
      return;
    }

    const session = Auth.currentUserId();
    if (!session || !Auth.user(session)) {
      App.renderLockedShell(false);
      return;
    }

    Sync.startAuto();
    App.render();

    if (Store.data.settings.autoUpdateCheck) {
      setTimeout(() => Updater.check({ notify: false }), 900);
    }
    setTimeout(() => {
      if (Store.data.sync.enabled && Store.data.sync.autoPull !== false) Sync.pull({ silent: true });
    }, 2200);
  },

  renderChrome() {
    const s = Store.data.settings;
    document.getElementById('sidebar-studio-name').textContent = s.studioName || 'SCRAPPED studio';
    document.getElementById('brand-logo-icon').textContent = (s.logoLetter || 'S').toUpperCase();
    document.getElementById('sidebar-version-label').textContent = 'v' + APP_VERSION;
    document.title = `${s.studioName || 'SCRAPPED studio'} — SCRAPPED Connect v${APP_VERSION}`;
    App.renderUpdateBanner();
    App.renderUpdatePill();
  },

  /* ------------------------------------------------------- login / locking */
  renderLockedShell(setupMode) {
    const user = Auth.realUser();
    const vp = document.getElementById('main-viewport');
    document.getElementById('current-user-name').textContent = 'Locked';
    document.getElementById('current-user-rank').textContent = 'Sign in required';
    document.getElementById('current-user-avatar').textContent = '🔒';
    document.getElementById('topbar-title').textContent = setupMode ? 'Setup Required' : 'Sign In';

    vp.innerHTML = setupMode ? `
      <div class="card" style="max-width:620px;margin:60px auto;text-align:center;padding:40px">
        <div class="brand-logo" style="width:70px;height:70px;font-size:34px;margin:0 auto 16px;border-radius:18px">S</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">Welcome to SCRAPPED Connect</div>
        <div style="color:var(--text-secondary);margin-bottom:20px">
          Run the setup wizard to create your studio workspace and your Founder account —
          the first account always becomes the studio owner.
        </div>
        <button class="btn btn-primary" onclick="Wizard.start(true)">🧙‍♂️ Start Setup Wizard</button>
      </div>` : `
      <div style="max-width:420px;margin:70px auto">
        <div class="card" style="padding:28px">
          <div class="brand-logo" style="width:56px;height:56px;font-size:26px;margin:0 auto 14px;border-radius:14px">${Utils.esc((Store.data.settings.logoLetter || 'S').toUpperCase())}</div>
          <div style="text-align:center;font-size:19px;font-weight:800;margin-bottom:4px">${Utils.esc(Store.data.settings.studioName)}</div>
          <div style="text-align:center;font-size:12.5px;color:var(--text-secondary);margin-bottom:20px">
            ${Store.data.users.length} account${Store.data.users.length === 1 ? '' : 's'} in this workspace · v${APP_VERSION}
          </div>
          <div class="form-group"><label class="form-label">Username</label>
            <input class="form-input" id="login-username" placeholder="your username" autocomplete="username" /></div>
          <div class="form-group"><label class="form-label">Password</label>
            <input class="form-input" id="login-password" type="password" placeholder="••••••••" autocomplete="current-password"
              onkeydown="if(event.key==='Enter') App.doLogin()" /></div>
          <div id="login-error" style="display:none;margin-bottom:12px" class="pill pill-danger"></div>
          <button class="btn btn-primary" style="width:100%" onclick="App.doLogin()">🔓 Sign In</button>
          <div style="text-align:center;margin-top:14px">
            <button class="btn btn-secondary btn-sm" onclick="App.openRecovery()">🛟 Forgot password?</button>
          </div>
          <div style="margin-top:18px;font-size:11.5px;color:var(--text-muted);text-align:center">
            ${Store.data.sync.enabled ? '☁️ GitHub team sync enabled — press Pull in the sidebar to fetch the newest workspace.' : '💾 Local workspace — no server involved.'}
          </div>
        </div>
        <div style="text-align:center;margin-top:14px">
          <button class="btn btn-secondary btn-sm" onclick="Wizard.start(true)">🧙‍♂️ Re-run Setup Wizard</button>
        </div>
      </div>`;
  },

  async doLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const res = await Auth.login(username, password);
    if (!res.ok) {
      errBox.style.display = 'inline-flex';
      errBox.textContent = '⚠️ ' + res.error;
      return;
    }
    if (Store.data.sync.enabled && Store.data.sync.autoPull !== false) Sync.pull({ silent: true });
    Toast.show(`👋 Welcome back, ${Utils.esc(res.user.displayName)}!`, 'success');
    App.render();
  },

  openRecovery() {
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🛟 Password Recovery</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px">
          No server means recovery is local: answer the security question set when the account was created, then choose a new password.</p>
        <div class="form-group"><label class="form-label">Username</label>
          <input class="form-input" id="rec-username" placeholder="your username" /></div>
        <div class="form-group"><label class="form-label">Security answer</label>
          <input class="form-input" id="rec-answer" placeholder="your secret answer" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">New password</label>
            <input class="form-input" id="rec-pass1" type="password" /></div>
          <div class="form-group"><label class="form-label">Confirm</label>
            <input class="form-input" id="rec-pass2" type="password" /></div>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted)">
          The Founder can always reset any developer password from <strong>Accounts &amp; Rerank → Reset PW</strong>.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="App.doRecovery()">Reset Password</button>
      </div>`);
  },

  async doRecovery() {
    const username = document.getElementById('rec-username').value.trim().toLowerCase();
    const answer = document.getElementById('rec-answer').value;
    const p1 = document.getElementById('rec-pass1').value;
    const p2 = document.getElementById('rec-pass2').value;
    const user = Store.data.users.find(u => u.username === username);
    if (!user) return Toast.show('⚠️ No such account.', 'warning');
    if (!user.securityAnswers || !user.securityAnswers.length) return Toast.show('⚠️ This account has no security question — ask the Founder to reset it.', 'warning');
    if (p1.length < 6) return Toast.show('⚠️ New password must be at least 6 characters.', 'warning');
    if (p1 !== p2) return Toast.show('⚠️ Passwords do not match.', 'warning');
    const hash = await Crypto.hashAnswer(answer);
    const match = user.securityAnswers.some(qa => qa.a === hash);
    if (!match) return Toast.show('❌ Security answer is incorrect.', 'danger');
    await Auth.changePassword(user.id, p1);
    Modal.close();
    Toast.show('🔐 Password reset — you can sign in now.', 'success');
  },

  /* ---------------------------------------------------------------- router */
  navigate(view) {
    App.state.view = view;
    App.render();
  },

  render(preserveFocus) {
    App.renderChrome();
    const real = Auth.realUser();
    if (!real && Store.data.meta.initialized) { App.renderLockedShell(false); return; }

    const user = Auth.current();
    const rank = Auth.rank(user);
    if (user) {
      document.getElementById('current-user-name').textContent = user.displayName;
      document.getElementById('current-user-rank').textContent = `${rank.name} · ${Analytics.leaderboard().find(r => r.user.id === user.id) ? '#' + Analytics.leaderboard().find(r => r.user.id === user.id).position : '—'} on board`;
      const av = document.getElementById('current-user-avatar');
      av.textContent = Utils.initials(user.displayName);
      av.style.background = user.color;
    }

    document.querySelectorAll('#sidebar-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === App.state.view);
    });
    document.getElementById('topbar-title').textContent = App.viewTitles[App.state.view] || 'SCRAPPED Connect';

    const imp = document.getElementById('impersonation-banner');
    if (App.state.impersonateId && Auth.user(App.state.impersonateId)) {
      imp.classList.remove('hidden');
      document.getElementById('impersonation-target-name').textContent = Auth.user(App.state.impersonateId).displayName;
    } else imp.classList.add('hidden');

    App.renderBadges();

    const vp = document.getElementById('main-viewport');
    const scrollTop = vp.scrollTop;
    let html = '';
    switch (App.state.view) {
      case 'dashboards': html = Dashboards.render(); break;
      case 'team': html = Team.render(); break;
      case 'ranks': html = Ranks.render(); break;
      case 'tasks': html = Work.renderTasks(); break;
      case 'sprints': html = Work.renderSprints(); break;
      case 'bugs': html = Work.renderBugs(); break;
      case 'codevault': html = Work.renderVault(); break;
      case 'sync': html = SystemViews.renderSync(); break;
      case 'updater': html = SystemViews.renderUpdater(); break;
      case 'settings': html = SystemViews.renderSettings(); break;
      case 'profile': html = App.renderProfile(); break;
      default: html = Dashboards.render();
    }
    vp.innerHTML = html;
    if (preserveFocus) {
      const s = document.getElementById('team-search');
      if (s) { s.focus(); }
      vp.scrollTop = scrollTop;
    }
  },

  renderProfile() {
    const me = Auth.current();
    const rank = Auth.rank(me);
    const lb = Analytics.leaderboard().find(r => r.user.id === me.id) || { position: '—', score: 0, done: 0, bugs: 0, snips: 0 };
    const myTasks = Store.data.tasks.filter(t => t.assigneeId === me.id);
    const myBugs = Store.data.bugs.filter(b => b.assigneeId === me.id);
    const mySnips = Store.data.snippets.filter(s => s.authorId === me.id);
    return `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div class="avatar-circle" style="width:70px;height:70px;font-size:26px;background:${me.color}">${Utils.initials(me.displayName)}</div>
        <div style="flex:1;min-width:220px">
          <div style="font-size:20px;font-weight:800">${Utils.esc(me.displayName)}</div>
          <div style="font-size:13px;color:${rank.color};font-weight:700">${Utils.esc(rank.name)} · LVL ${rank.level} · ${rank.tier}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">@${Utils.esc(me.username)} · ${Utils.esc(me.title || 'Developer')} · joined ${Utils.fmtDate(me.createdAt)}</div>
          <div style="margin-top:8px">${(me.skills || []).map(s => `<span class="pill pill-accent" style="margin:2px">${Utils.esc(s)}</span>`).join('')}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          <div class="card" style="padding:12px;text-align:center;min-width:110px"><div class="kpi-value" style="font-size:22px;color:var(--accent)">#${lb.position}</div><div class="kpi-subtext">Board rank</div></div>
          <div class="card" style="padding:12px;text-align:center;min-width:110px"><div class="kpi-value" style="font-size:22px">${lb.score}</div><div class="kpi-subtext">Total score</div></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
      <div class="card"><div class="kpi-subtext">My tasks</div><div class="kpi-value">${myTasks.length}</div><div class="kpi-subtext">${myTasks.filter(t => t.status !== 'Done').length} still open</div></div>
      <div class="card"><div class="kpi-subtext">My bugs</div><div class="kpi-value">${myBugs.length}</div><div class="kpi-subtext">${myBugs.filter(b => b.status === 'Closed').length} closed</div></div>
      <div class="card"><div class="kpi-subtext">Snippets</div><div class="kpi-value">${mySnips.length}</div><div class="kpi-subtext">in the Code Vault</div></div>
      <div class="card"><div class="kpi-subtext">Bonus XP</div><div class="kpi-value">${me.xp || 0}</div><div class="kpi-subtext">awarded by the studio</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">📋 My Open Work</div></div>
      ${myTasks.filter(t => t.status !== 'Done').length ? myTasks.filter(t => t.status !== 'Done').map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-subtle)">
          <div><div style="font-weight:600;font-size:13px;cursor:pointer" onclick="Work.openTaskModal('${t.id}')">${Utils.esc(t.title)}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${Utils.esc(t.status)} · ${Utils.esc(t.priority)} priority</div></div>
          <span class="pill pill-info">${(t.tags || []).slice(0, 2).map(Utils.esc).join(' · ') || 'task'}</span>
        </div>`).join('') : '<div style="color:var(--text-muted);font-size:13px">Nothing assigned right now. 🎉</div>'}
    </div>`;
  },

  renderBadges() {
    const map = {
      'badge-team': Store.data.users.length,
      'badge-ranks': Store.data.ranks.length,
      'badge-tasks': Store.data.tasks.filter(t => t.status !== 'Done').length,
      'badge-sprints': Store.data.sprints.filter(s => s.status === 'Active').length,
      'badge-bugs': Analytics.bugStats().open,
      'badge-codevault': Store.data.snippets.length,
      'badge-updater': 'v' + APP_VERSION
    };
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
    App.renderSyncBadge();
  },

  renderSyncBadge() {
    const el = document.getElementById('badge-sync');
    if (!el) return;
    if (!Store.data.sync.enabled) { el.textContent = 'Local'; return; }
    const st = Sync.status.state;
    el.textContent = st === 'ok' ? 'Synced' : st === 'syncing' ? '…' : st === 'error' ? 'Error' : 'Cloud';
    el.style.background = st === 'error' ? 'var(--danger)' : st === 'ok' ? 'var(--success)' : '';
    el.style.color = (st === 'error' || st === 'ok') ? '#fff' : '';
  },

  renderUpdatePill() {
    const el = document.getElementById('topbar-update-pill');
    if (!el) return;
    const u = Updater.info;
    if (u.checking) { el.className = 'pill pill-info'; el.innerHTML = '⏳ Checking GitHub…'; return; }
    if (u.updateAvailable) {
      el.className = 'pill pill-warning';
      el.innerHTML = `🚀 Update v${Utils.esc(u.latestVersion)} available — click to install`;
    } else if (u.error) {
      el.className = 'pill pill-danger';
      el.innerHTML = `⚠️ Update check failed — click to retry`;
    } else {
      el.className = 'pill pill-success';
      el.innerHTML = `✓ Up to date (v${APP_VERSION})`;
    }
  },

  renderUpdateBanner() {
    const el = document.getElementById('github-update-banner');
    if (!el) return;
    const u = Updater.info;
    if (!u.updateAvailable) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    document.getElementById('update-banner-title').textContent = `SCRAPPED Connect v${u.latestVersion} is available!`;
    document.getElementById('update-banner-desc').textContent =
      `You are on v${APP_VERSION}. ${u.latestName ? u.latestName + ' — ' : ''}the updater can install it for you.`;
  },

  triggerAutoUpdate() { Updater.apply(); },
  checkForGitHubUpdates(notify) { Updater.check({ notify: notify !== false }); },

  /* ------------------------------------------------------ account switching */
  openSwitchAccountModal() {
    const users = Store.data.users.slice().sort((a, b) => Auth.rank(b).level - Auth.rank(a).level);
    const current = Auth.realUser();
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🔐 Switch Account</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
          Sign in as another developer (their password is required), or preview the app through their permissions.
        </div>
        ${users.map(u => {
          const r = Auth.rank(u);
          const isMe = current && current.id === u.id;
          return `<div style="display:flex;align-items:center;gap:11px;padding:10px;border:1px solid ${isMe ? 'var(--accent)' : 'var(--border-subtle)'};border-radius:var(--radius-md);margin-bottom:8px">
            <div class="avatar-circle" style="width:34px;height:34px;font-size:12px;background:${u.color}">${Utils.initials(u.displayName)}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">${Utils.esc(u.displayName)} ${isMe ? '<span class="pill pill-accent" style="font-size:9.5px">CURRENT</span>' : ''}</div>
              <div style="font-size:11.5px;color:${r.color}">@${Utils.esc(u.username)} · ${Utils.esc(r.name)}</div>
            </div>
            <div style="display:flex;gap:6px">
              ${Auth.can('manageAccounts') && !isMe && u.active ? `<button class="btn btn-secondary btn-xs" onclick="App.impersonate('${u.id}')">👁️ Preview as</button>` : ''}
              ${!isMe ? `<button class="btn btn-secondary btn-xs" onclick="App.signInAs('${u.id}')">Sign in</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
        <button class="btn btn-danger" onclick="App.logout()">🚪 Sign Out</button>
      </div>`);
  },

  signInAs(userId) {
    Modal.close();
    const u = Auth.user(userId);
    if (!u) return;
    App.state.impersonateId = null;
    document.getElementById('main-viewport').innerHTML = `
      <div style="max-width:400px;margin:50px auto">
        <div class="card" style="padding:26px">
          <div style="text-align:center;margin-bottom:16px">
            <div class="avatar-circle" style="width:54px;height:54px;font-size:20px;margin:0 auto 10px;background:${u.color}">${Utils.initials(u.displayName)}</div>
            <div style="font-weight:800;font-size:17px">${Utils.esc(u.displayName)}</div>
            <div style="font-size:12.5px;color:var(--text-secondary)">@${Utils.esc(u.username)} · ${Utils.esc(Auth.rank(u).name)}</div>
          </div>
          <div class="form-group"><label class="form-label">Password</label>
            <input class="form-input" id="su-password" type="password" onkeydown="if(event.key==='Enter') App.confirmSignIn('${u.id}')" /></div>
          <div id="su-error" style="display:none;margin-bottom:10px" class="pill pill-danger"></div>
          <button class="btn btn-primary" style="width:100%" onclick="App.confirmSignIn('${u.id}')">Sign In</button>
          <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:8px" onclick="App.render()">Cancel</button>
        </div>
      </div>`;
    setTimeout(() => { const el = document.getElementById('su-password'); if (el) el.focus(); }, 50);
  },

  async confirmSignIn(userId) {
    const u = Auth.user(userId);
    const pw = document.getElementById('su-password').value;
    const ok = await Crypto.verifyPassword(pw, u.salt, u.passwordHash);
    if (!ok) {
      const e = document.getElementById('su-error');
      e.style.display = 'inline-flex'; e.textContent = '⚠️ Incorrect password.';
      return;
    }
    Auth.setSession(u.id);
    u.lastLoginAt = Utils.now();
    u.loginCount = (u.loginCount || 0) + 1;
    App.state.impersonateId = null;
    Log.add('auth.login', `${u.username} signed in`);
    Store.save({ skipSync: true });
    if (Store.data.sync.enabled && Store.data.sync.autoPull !== false) Sync.pull({ silent: true });
    Modal.close();
    Toast.show(`👋 Signed in as ${Utils.esc(u.displayName)}.`, 'success');
    App.state.view = 'dashboards';
    App.render();
  },

  impersonate(userId) {
    if (!Auth.can('manageAccounts') && userId !== Auth.currentUserId()) {
      return Toast.show('⛔ Only managers can preview as another developer.', 'danger');
    }
    App.state.impersonateId = userId;
    Modal.close();
    const u = Auth.user(userId);
    Toast.show(`👁️ Previewing as <strong>${Utils.esc(u.displayName)}</strong> (${Utils.esc(Auth.rank(u).name)}).`, 'accent', 4000);
    App.state.view = 'dashboards';
    // Visibility of the current dashboard may differ for their rank.
    Dashboards.currentId = null;
    App.render();
  },

  exitImpersonation() {
    App.state.impersonateId = null;
    Dashboards.currentId = null;
    Toast.show('↩️ Returned to your own account.', 'success');
    App.render();
  },

  logout() {
    const u = Auth.realUser();
    if (u) Log.add('auth.logout', `${u.username} signed out`);
    Store.save({ skipSync: true });
    Auth.logout();
    Modal.close();
    Dashboards.currentId = null;
    App.renderLockedShell(false);
    Toast.show('👋 Signed out.', 'info');
  },

  /* ------------------------------------------------------------- utilities */
  openSetupWizard(force) { Wizard.start(!!force); },

  randomPassword(len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let out = '';
    const n = len || 10;
    for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  },

  /** Opens links safely in every runtime: browser tab, desktop shell or file:// copy. */
  openExternal(url) {
    if (window.ScrappedDesktop && window.ScrappedDesktop.openExternal) {
      window.ScrappedDesktop.openExternal(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Gives the user the Windows installer wherever the app is running:
   * the local host serves it (or redirects to the GitHub release asset), the desktop build
   * opens the release page, and a file:// copy falls back to GitHub.
   */
  downloadInstaller(kind) {
    const file = kind === 'portable' ? 'SCRAPPED-Connect-Portable.zip' : 'SCRAPPED-Connect-Setup.exe';
    const canUseHost = location.protocol === 'http:' || location.protocol === 'https:';
    if (canUseHost && !(window.ScrappedDesktop && window.ScrappedDesktop.isDesktop)) {
      Toast.show(`📥 Downloading ${Utils.esc(file)}…`, 'accent');
      const a = document.createElement('a');
      a.href = `/download/${file}`;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const asset = Updater.pickInstallerAsset();
    const url = (kind === 'portable' && asset) ? asset.url
      : `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    if (kind !== 'portable' && Updater.isDesktop() && window.ScrappedDesktop.checkUpdate) {
      Toast.show('🔄 Asking the updater for the newest installer…', 'accent');
      Updater.check({ notify: true });
      return;
    }
    App.openExternal(url);
  },

  copyText(text) {
    const value = String(text || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(
        () => Toast.show('📋 Copied to clipboard.', 'success'),
        () => App.copyFallback(value)
      );
    } else App.copyFallback(value);
  },

  copyFallback(value) {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); Toast.show('📋 Copied to clipboard.', 'success'); }
    catch (e) { Toast.show('⚠️ Copy failed — select the text manually.', 'warning'); }
    ta.remove();
  },

  handleGlobalSearch(value) {
    const q = (value || '').trim().toLowerCase();
    App.state.search = q;
    if (!q) return;
    const inTeam = Store.data.users.filter(u => (u.displayName + u.username + (u.title || '')).toLowerCase().includes(q));
    const inTasks = Store.data.tasks.filter(t => (t.title + (t.description || '')).toLowerCase().includes(q));
    const inBugs = Store.data.bugs.filter(b => (b.title + (b.description || '')).toLowerCase().includes(q));
    const inSnips = Store.data.snippets.filter(s => (s.title + (s.description || '') + (s.code || '')).toLowerCase().includes(q));
    const total = inTeam.length + inTasks.length + inBugs.length + inSnips.length;

    Modal.open(`
      <div class="modal-header"><div class="modal-title">🔍 Results for "${Utils.esc(value)}"</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        ${total === 0 ? '<div style="color:var(--text-muted);font-size:13px">No matches found in accounts, tasks, bugs or snippets.</div>' : ''}
        ${inTeam.length ? `<div class="nav-section-label" style="padding-left:0">Accounts (${inTeam.length})</div>
          ${inTeam.map(u => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer"
            onclick="Modal.close(); Team.openProfile('${u.id}')">
            <div class="avatar-circle" style="width:28px;height:28px;font-size:11px;background:${u.color}">${Utils.initials(u.displayName)}</div>
            <div><div style="font-size:13px;font-weight:700">${Utils.esc(u.displayName)}</div>
            <div style="font-size:11px;color:var(--text-muted)">@${Utils.esc(u.username)} · ${Utils.esc(Auth.rank(u).name)}</div></div></div>`).join('')}` : ''}
        ${inTasks.length ? `<div class="nav-section-label" style="padding-left:0">Tasks (${inTasks.length})</div>
          ${inTasks.slice(0, 8).map(t => `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer" onclick="Modal.close(); Work.openTaskModal('${t.id}')">
            <div style="font-size:13px;font-weight:600">${Utils.esc(t.title)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${Utils.esc(t.status)} · ${Utils.esc(t.priority)}</div></div>`).join('')}` : ''}
        ${inBugs.length ? `<div class="nav-section-label" style="padding-left:0">Bugs (${inBugs.length})</div>
          ${inBugs.slice(0, 8).map(b => `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer" onclick="Modal.close(); Work.openBugModal('${b.id}')">
            <div style="font-size:13px;font-weight:600">${Utils.esc(b.title)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${Utils.esc(b.severity)} · ${Utils.esc(b.status)}</div></div>`).join('')}` : ''}
        ${inSnips.length ? `<div class="nav-section-label" style="padding-left:0">Code Vault (${inSnips.length})</div>
          ${inSnips.slice(0, 8).map(s => `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer" onclick="Modal.close(); Work.openSnippetModal('${s.id}')">
            <div style="font-size:13px;font-weight:600">${Utils.esc(s.title)} <span class="pill pill-accent" style="font-size:10px">${Utils.esc(s.language)}</span></div></div>`).join('')}` : ''}
      </div>`);
  },

  /** Saves a generated file, falling back to a data URL when blob URLs are unavailable. */
  downloadFile(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'text/plain' });
      const url = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(blob) : null;
      const a = document.createElement('a');
      a.href = url || `data:${mime || 'text/plain'};charset=utf-8,${encodeURIComponent(String(content))}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) {
      Toast.show('⚠️ Download blocked by the browser: ' + Utils.esc(e.message), 'warning');
      return false;
    }
  },

  exportDashboardCSV(dashId) {
    const dash = Dashboards.get(dashId);
    if (!dash) return;
    const lb = Analytics.leaderboard();
    const rows = [['Position', 'Developer', 'Username', 'Rank', 'Level', 'Tasks closed', 'Bugs fixed', 'Snippets', 'Score']];
    lb.forEach(r => rows.push([r.position, r.user.displayName, r.user.username, r.rank.name, r.rank.level, r.done, r.bugs, r.snips, r.score]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const name = `scrapped-${dash.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (App.downloadFile(name, csv, 'text/csv;charset=utf-8')) Toast.show('📤 Dashboard exported as CSV.', 'success');
  },

  exportActivityLog() {
    const rows = [['When', 'Actor', 'Action', 'Detail']];
    Store.data.activity.forEach(a => rows.push([a.ts, a.actorName, a.action, a.detail]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (App.downloadFile(`scrapped-activity-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')) {
      Toast.show('📤 Activity log exported.', 'success');
    }
  },

  importWorkspace(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !parsed.meta || !parsed.users) throw new Error('Not a SCRAPPED Connect workspace file.');
        const preservedSync = Store.data.sync;
        Store.replaceAll(parsed, { silent: true });
        Store.data.sync = Object.assign(Store.data.sync, { token: preservedSync.token, enabled: preservedSync.enabled, repo: preservedSync.repo || Store.data.sync.repo, branch: preservedSync.branch || Store.data.sync.branch });
        Store.save({ skipSync: true });
        Toast.show(`📥 Workspace imported — ${Store.data.users.length} accounts, ${Store.data.tasks.length} tasks.`, 'success', 5000);
        App.render();
      } catch (e) {
        Toast.show(`❌ Import failed: ${Utils.esc(e.message)}`, 'danger');
      }
    };
    reader.readAsText(file);
    input.value = '';
  },

  factoryReset() {
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🧨 Factory Reset</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:13px;margin-bottom:12px">This deletes <strong>every account, rank, dashboard, task, sprint, bug and snippet</strong> in this workspace and returns SCRAPPED Connect to a fresh install. This cannot be undone — export a backup first.</p>
        <div class="code-block">accounts: ${Store.data.users.length} · dashboards: ${Store.data.dashboards.length} · tasks: ${Store.data.tasks.length} · bugs: ${Store.data.bugs.length}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-danger" onclick="App.confirmFactoryReset()">Delete Everything</button>
      </div>`);
  },

  confirmFactoryReset() {
    const deviceId = Store.data.meta.deviceId;
    Store.data = Store.blank();
    Store.data.meta.deviceId = deviceId;
    Auth.setSession(null);
    Store.save({ skipSync: true });
    Modal.close();
    Toast.show('🧨 Workspace reset — run the setup wizard to start again.', 'warning', 5000);
    App.renderLockedShell(true);
    Wizard.start(true);
  },

  /* --------------------------------------------------------- global events */
  /** Registers the offline service worker so the studio works with no server and no internet. */
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            Toast.show('🔄 A newer build is ready — the updater will apply it on the next restart.', 'accent', 6000);
          }
        });
      });
    }).catch(() => { /* offline support is optional */ });
  },

  bindGlobalEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (Modal.isOpen) Modal.close();
        const wiz = document.getElementById('setup-wizard-backdrop');
        if (wiz && !wiz.classList.contains('hidden') && Store.data.meta.initialized) Wizard.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const s = document.getElementById('global-search-input');
        if (s) s.focus();
      }
    });
    window.addEventListener('online', () => Toast.show('🌐 Back online — sync resumes.', 'success'));
    window.addEventListener('offline', () => Toast.show('📴 Offline — SCRAPPED Connect keeps working locally.', 'warning'));
    window.addEventListener('beforeunload', (e) => {
      if (Store.data && Store.data.sync && Store.data.sync.enabled && Store.data.sync.autoPush) return undefined;
      return undefined;
    });
  },

  desktopBridge() {
    if (!window.ScrappedDesktop) return;
    window.ScrappedDesktop.onUpdateStatus((payload) => {
      if (payload && payload.message) Toast.show(payload.message, payload.type || 'accent');
      if (payload && payload.version) Updater.info.latestVersion = payload.version;
    });
  }
};

/* ------------------------------------------------------------------- boot */
window.addEventListener('DOMContentLoaded', () => {
  App.bindGlobalEvents();
  App.desktopBridge();
  App.registerServiceWorker();
  App.init().catch(err => {
    console.error(err);
    Toast.show('❌ Startup error: ' + Utils.esc(err.message), 'danger', 8000);
  });
});
