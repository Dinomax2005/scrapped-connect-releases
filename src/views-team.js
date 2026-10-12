/* ============================================================================
 * SCRAPPED Connect — Accounts, Reranking & Rank Hierarchy
 * ==========================================================================*/

const Team = {
  filter: '',
  rankFilter: 'all',

  render() {
    const canManage = Auth.can('manageAccounts');
    const canRerank = Auth.can('rerankDevs');
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    const users = Store.data.users
      .slice()
      .filter(u => Team.rankFilter === 'all' || u.rankId === Team.rankFilter)
      .filter(u => {
        if (!Team.filter) return true;
        const q = Team.filter.toLowerCase();
        return (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)
          || (u.title || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ra = Auth.rank(a).level, rb = Auth.rank(b).level;
        return rb - ra || (a.displayName || '').localeCompare(b.displayName || '');
      });

    const lb = Analytics.leaderboard();
    const posOf = (id) => { const r = lb.find(x => x.user.id === id); return r ? r.position : '—'; };

    return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:8px;align-items:center">
        <div class="search-box" style="width:250px">
          <span class="search-box-icon">🔍</span>
          <input type="text" id="team-search" placeholder="Filter accounts…" value="${Utils.esc(Team.filter)}"
            oninput="Team.filter=this.value; App.render(true)" />
        </div>
        <select class="form-select" style="width:190px" onchange="Team.rankFilter=this.value; App.render()">
          <option value="all">All ranks (${Store.data.users.length})</option>
          ${ranks.map(r => `<option value="${r.id}" ${Team.rankFilter === r.id ? 'selected' : ''}>${Utils.esc(r.name)} (${Store.data.users.filter(u => u.rankId === r.id).length})</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px">
        ${canRerank ? `<button class="btn btn-secondary btn-sm" onclick="Team.openBulkRerank()">🔀 Bulk Rerank</button>` : ''}
        ${canManage ? `<button class="btn btn-primary btn-sm" onclick="Team.openCreateAccount()">➕ Create Account</button>` : ''}
      </div>
    </div>

    ${!canManage ? `<div class="card" style="margin-bottom:16px;border-color:var(--warning);background:var(--warning-soft)">
      <div style="font-size:13px">⚠️ Your rank (<strong>${Utils.esc(Auth.rank(Auth.current()).name)}</strong>) has read-only access to accounts. Ask the Founder to change your rank.</div>
    </div>` : ''}

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th style="width:60px">#</th><th>Developer</th><th>Rank</th><th>Title / Role</th>
          <th style="width:110px">Score</th><th style="width:150px">Rank Position</th>
          <th style="width:120px">Status</th><th style="width:230px">Actions</th>
        </tr></thead>
        <tbody>
          ${users.length ? users.map((u, i) => {
            const r = Auth.rank(u);
            const score = (lb.find(x => x.user.id === u.id) || {}).score || 0;
            const isSelf = u.id === Auth.currentUserId();
            return `<tr>
              <td style="color:var(--text-muted);font-weight:700">${i + 1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar-circle" style="background:${u.color};width:34px;height:34px;font-size:12px">${Utils.initials(u.displayName)}</div>
                  <div>
                    <div style="font-weight:700;display:flex;align-items:center;gap:6px">${Utils.esc(u.displayName)}
                      ${isSelf ? '<span class="pill pill-accent" style="font-size:9.5px;padding:1px 6px">YOU</span>' : ''}
                      ${Auth.rank(u).level >= 7 ? '<span class="pill pill-warning" style="font-size:9.5px;padding:1px 6px">FOUNDER</span>' : ''}
                    </div>
                    <div style="font-size:11.5px;color:var(--text-muted)">@${Utils.esc(u.username)} · ${u.loginCount || 0} logins · ${Utils.timeAgo(u.lastLoginAt)}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="pill" style="background:${r.color}22;color:${r.color};border-color:${r.color}55;font-weight:700">${Utils.esc(r.name)}</span>
                <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px">LVL ${r.level} · ${r.tier}</div>
              </td>
              <td><div style="font-size:12.5px">${Utils.esc(u.title || u.role || '—')}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${(u.skills || []).slice(0, 3).map(s => Utils.esc(s)).join(' · ') || 'no skills tagged'}</div></td>
              <td><span style="font-weight:800;color:var(--accent)">${score}</span>
                  <div style="font-size:10.5px;color:var(--text-muted)">${u.xp || 0} bonus XP</div></td>
              <td>
                ${canRerank ? `<select class="form-select" style="padding:5px 8px;font-size:12px" onchange="Team.rerank('${u.id}', this.value)">
                  ${ranks.map(rr => `<option value="${rr.id}" ${rr.id === u.rankId ? 'selected' : ''}>${Utils.esc(rr.name)}</option>`).join('')}
                </select>` : `<span style="font-size:12px;color:var(--text-muted)">#${posOf(u.id)}</span>`}
              </td>
              <td>
                <span class="pill ${u.active ? 'pill-success' : 'pill-danger'}">${u.active ? '● Active' : '○ Disabled'}</span>
                ${u.mustChangePassword ? '<div style="font-size:10.5px;color:var(--warning);margin-top:4px">temp password</div>' : ''}
              </td>
              <td>
                <div style="display:flex;gap:5px;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-xs" onclick="Team.openProfile('${u.id}')">Profile</button>
                  ${canManage ? `<button class="btn btn-secondary btn-xs" onclick="Team.openEditAccount('${u.id}')">Edit</button>` : ''}
                  ${canManage && !isSelf ? `<button class="btn btn-secondary btn-xs" onclick="Team.resetPassword('${u.id}')">Reset PW</button>` : ''}
                  ${Auth.can('manageAccounts') && !isSelf ? `<button class="btn btn-secondary btn-xs" onclick="Team.toggleActive('${u.id}')">${u.active ? 'Disable' : 'Enable'}</button>` : ''}
                  <button class="btn btn-secondary btn-xs" onclick="App.impersonate('${u.id}')" title="Preview the app exactly as this developer sees it">👁️ View as</button>
                  ${canManage && !isSelf ? `<button class="btn btn-danger btn-xs" onclick="Team.deleteAccount('${u.id}')">Delete</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="8" style="text-align:center;padding:38px;color:var(--text-muted)">
            No accounts match this filter. ${canManage ? 'Create the first developer account to get started.' : ''}</td></tr>`}
        </tbody>
      </table>
    </div>

    <div style="margin-top:20px" class="card">
      <div class="card-header"><div class="card-title">🕒 Account Activity Log</div>
        <button class="btn btn-secondary btn-xs" onclick="App.exportActivityLog()">Export Log</button></div>
      ${Widgets.activity(10)}
    </div>`;
  },

  openCreateAccount(prefill) {
    if (!Auth.can('manageAccounts')) return Toast.show('⛔ Your rank cannot create accounts.', 'danger');
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    const nextLevel = Math.min(...ranks.map(r => r.level)) === 1 ? 3 : 2;
    const defaultRank = ranks.find(r => r.level === nextLevel) || ranks[ranks.length - 1];
    const p = prefill || {};
    Modal.open(`
      <div class="modal-header"><div class="modal-title">➕ Create Developer Account</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Display name *</label>
            <input class="form-input" id="na-name" value="${Utils.esc(p.displayName || '')}" placeholder="Alex Kovács" /></div>
          <div class="form-group"><label class="form-label">Username (login) *</label>
            <input class="form-input" id="na-username" value="${Utils.esc(p.username || '')}" placeholder="alex.dev" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email (optional)</label>
            <input class="form-input" id="na-email" placeholder="alex@scrapped.studio" /></div>
          <div class="form-group"><label class="form-label">Job title</label>
            <input class="form-input" id="na-title" placeholder="Gameplay Programmer" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Starting rank *</label>
            <select class="form-select" id="na-rank">
              ${ranks.map(r => `<option value="${r.id}" ${p.rankId === r.id || (!p.rankId && r.id === defaultRank.id) ? 'selected' : ''}>${Utils.esc(r.name)} — ${r.tier} (LVL ${r.level})</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Skills (comma separated)</label>
            <input class="form-input" id="na-skills" placeholder="C++, Unity, Shaders" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Temporary password *</label>
            <input class="form-input" id="na-password" type="text" value="${Utils.esc(p.password || App.randomPassword())}" /></div>
          <div class="form-group"><label class="form-label">Confirm password *</label>
            <input class="form-input" id="na-password2" type="text" value="${Utils.esc(p.password || '')}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Security question (for password recovery)</label>
          <div class="form-row">
            <input class="form-input" id="na-secq" placeholder="Question" value="${Utils.esc(p.secQ || 'What is your team code name?')}" />
            <input class="form-input" id="na-seca" placeholder="Answer" />
          </div></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px">
          <input type="checkbox" id="na-mustchange" checked /> Force password change on first login</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px">
          <input type="checkbox" id="na-audit" checked /> Log this account creation to studio activity</label>
      </div>
      <div class="modal-footer">
        <span style="font-size:11.5px;color:var(--text-muted)">Accounts are stored locally on this device (and synced if GitHub sync is on).</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="Team.createAccount()">Create Account</button>
        </div>
      </div>`);
    const pw = document.getElementById('na-password');
    pw.addEventListener('input', () => {
      const c = document.getElementById('na-password2');
      if (!c.value || c.dataset.auto !== 'false') { c.value = pw.value; }
    });
    document.getElementById('na-password2').addEventListener('input', function () { this.dataset.auto = 'false'; });
  },

  async createAccount(isFounderBootstrap) {
    const displayName = document.getElementById('na-name').value.trim();
    const username = document.getElementById('na-username').value.trim().toLowerCase();
    const pw = document.getElementById('na-password').value;
    const pw2 = document.getElementById('na-password2').value;
    if (!displayName) return Toast.show('⚠️ Display name is required.', 'warning');
    if (!username || username.length < 3) return Toast.show('⚠️ Username must be at least 3 characters.', 'warning');
    if (Store.data.users.some(u => u.username === username)) return Toast.show('⚠️ That username already exists.', 'danger');
    if (!pw || pw.length < 6) return Toast.show('⚠️ Password must be at least 6 characters.', 'warning');
    if (pw !== pw2) return Toast.show('⚠️ Passwords do not match.', 'warning');

    const user = await Auth.createUser({
      displayName, username,
      email: document.getElementById('na-email').value.trim(),
      title: document.getElementById('na-title').value.trim(),
      rankId: document.getElementById('na-rank').value,
      skills: document.getElementById('na-skills').value.split(',').map(s => s.trim()).filter(Boolean),
      password: pw,
      securityAnswers: [{ q: document.getElementById('na-secq').value.trim(), answer: document.getElementById('na-seca').value.trim() }],
      mustChangePassword: document.getElementById('na-mustchange').checked
    });
    Modal.close();
    Toast.show(`✅ Account @${Utils.esc(username)} created as ${Utils.esc(Auth.rank(user).name)}.`, 'success');
    if (!isFounderBootstrap) App.render();
    return user;
  },

  openEditAccount(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    Modal.open(`
      <div class="modal-header"><div class="modal-title">✏️ Edit @${Utils.esc(u.username)}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Display name</label><input class="form-input" id="ea-name" value="${Utils.esc(u.displayName)}" /></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ea-email" value="${Utils.esc(u.email || '')}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Job title</label><input class="form-input" id="ea-title" value="${Utils.esc(u.title || '')}" /></div>
          <div class="form-group"><label class="form-label">Role label</label><input class="form-input" id="ea-role" value="${Utils.esc(u.role || '')}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Rank</label>
            <select class="form-select" id="ea-rank">
              ${ranks.map(r => `<option value="${r.id}" ${r.id === u.rankId ? 'selected' : ''}>${Utils.esc(r.name)} (LVL ${r.level})</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Bonus XP</label><input class="form-input" id="ea-xp" type="number" value="${u.xp || 0}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Skills</label><input class="form-input" id="ea-skills" value="${Utils.esc((u.skills || []).join(', '))}" /></div>
        <div class="form-group"><label class="form-label">Founder notes (private)</label>
          <textarea class="form-textarea" id="ea-notes">${Utils.esc(u.notes || '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Team.saveAccount('${u.id}')">Save Changes</button>
      </div>`);
  },

  saveAccount(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    const oldRank = u.rankId;
    u.displayName = document.getElementById('ea-name').value.trim() || u.displayName;
    u.email = document.getElementById('ea-email').value.trim();
    u.title = document.getElementById('ea-title').value.trim();
    u.role = document.getElementById('ea-role').value.trim();
    u.rankId = document.getElementById('ea-rank').value;
    u.xp = parseInt(document.getElementById('ea-xp').value, 10) || 0;
    u.skills = document.getElementById('ea-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    u.notes = document.getElementById('ea-notes').value;
    Store.save();
    if (oldRank !== u.rankId) {
      Log.add('account.rerank', `Moved @${u.username} to ${Auth.rank(u).name}`);
      Toast.show(`🔀 @${Utils.esc(u.username)} reranked to ${Utils.esc(Auth.rank(u).name)}.`, 'success');
    } else {
      Log.add('account.update', `Updated @${u.username}`);
      Toast.show('✅ Account updated.', 'success');
    }
    Modal.close();
    App.render();
  },

  rerank(userId, rankId) {
    if (!Auth.can('rerankDevs')) return Toast.show('⛔ Your rank cannot rerank developers.', 'danger');
    const u = Auth.user(userId);
    if (!u) return;
    const old = Auth.rank(u);
    u.rankId = rankId;
    const nu = Auth.rank(u);
    Store.save();
    Log.add('account.rerank', `Reranked @${u.username}: ${old.name} → ${nu.name}`);
    Toast.show(`🔀 @${Utils.esc(u.username)}: ${Utils.esc(old.name)} → <strong>${Utils.esc(nu.name)}</strong>`, 'success');
    App.render();
  },

  openBulkRerank() {
    if (!Auth.can('rerankDevs')) return Toast.show('⛔ Your rank cannot rerank developers.', 'danger');
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🔀 Bulk Rerank Developers</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
          Select developers and move them all to one rank at once. Rank changes are logged to studio activity and affect
          permissions, dashboard visibility and the ranking board.</p>
        <div class="form-group"><label class="form-label">Move selected accounts to rank</label>
          <select class="form-select" id="bulk-rank">
            ${ranks.map(r => `<option value="${r.id}">${Utils.esc(r.name)} (LVL ${r.level})</option>`).join('')}
          </select></div>
        <div style="max-height:260px;overflow:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px">
          ${Store.data.users.map(u => {
            const r = Auth.rank(u);
            const locked = r.level >= 7;
            return `<label style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:12.5px${locked ? ';opacity:0.55' : ''}">
              <input type="checkbox" class="bulk-user" value="${u.id}" ${locked ? 'disabled' : ''} />
              <div class="avatar-circle" style="width:24px;height:24px;font-size:10px;background:${u.color}">${Utils.initials(u.displayName)}</div>
              <span style="flex:1">${Utils.esc(u.displayName)} <span style="color:var(--text-muted)">@${Utils.esc(u.username)}</span></span>
              <span class="pill" style="background:${r.color}22;color:${r.color};border-color:${r.color}55">${Utils.esc(r.name)}</span>
              ${locked ? '<span class="pill pill-warning" style="font-size:10px">LOCKED</span>' : ''}
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Team.applyBulkRerank()">Apply Rerank</button>
      </div>`);
  },

  applyBulkRerank() {
    const target = document.getElementById('bulk-rank').value;
    const ids = Array.from(document.querySelectorAll('.bulk-user:checked')).map(c => c.value);
    if (!ids.length) return Toast.show('⚠️ Select at least one developer.', 'warning');
    let n = 0, skipped = 0;
    ids.forEach(id => {
      const u = Auth.user(id);
      if (!u || u.rankId === target) return;
      if (Auth.rank(u).level >= 7) { skipped++; return; }  // the Founder rank is locked
      u.rankId = target; n++;
    });
    Store.save();
    if (skipped) Toast.show(`⛔ ${skipped} Founder account(s) skipped — the owner rank is locked.`, 'warning');
    Log.add('account.bulkrerank', `Bulk reranked ${n} developer(s) to ${Auth.rank({ rankId: target }).name}`);
    Modal.close();
    Toast.show(`🔀 ${n} developer(s) reranked.`, 'success');
    App.render();
  },

  async resetPassword(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    const temp = App.randomPassword();
    await Auth.changePassword(userId, temp);
    u.mustChangePassword = true;
    Store.save();
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🔑 Temporary Password</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:13px;margin-bottom:12px">Give this temporary password to <strong>@${Utils.esc(u.username)}</strong>. They will be asked to set a new password at next sign-in.</p>
        <div class="code-block" style="font-size:19px;text-align:center;padding:18px">${Utils.esc(temp)}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.copyText('${Utils.esc(temp)}')">📋 Copy</button>
        <button class="btn btn-primary" onclick="Modal.close()">Done</button>
      </div>`);
  },

  toggleActive(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    u.active = !u.active;
    Store.save();
    Log.add('account.toggle', `${u.active ? 'Enabled' : 'Disabled'} account @${u.username}`);
    Toast.show(`${u.active ? '✅ Account enabled' : '⛔ Account disabled'}: @${Utils.esc(u.username)}`, u.active ? 'success' : 'warning');
    App.render();
  },

  deleteAccount(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    if (Auth.rank(u).level >= 7) return Toast.show('⛔ The Founder account cannot be deleted.', 'danger');
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🗑️ Delete @${Utils.esc(u.username)}?</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:13px">This permanently removes the account, its rank assignment and login access from this workspace.
        Tasks and bugs they were assigned stay, but become unassigned.</p>
        <div class="code-block">@${Utils.esc(u.username)} · ${Utils.esc(u.displayName)} · ${Utils.esc(Auth.rank(u).name)}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-danger" onclick="Team.confirmDelete('${u.id}')">Delete Permanently</button>
      </div>`);
  },

  confirmDelete(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    Store.data.users = Store.data.users.filter(x => x.id !== userId);
    Store.data.tasks.forEach(t => { if (t.assigneeId === userId) t.assigneeId = null; });
    Store.data.bugs.forEach(b => { if (b.assigneeId === userId) b.assigneeId = null; });
    Store.save();
    Log.add('account.delete', `Deleted account @${u.username}`);
    Modal.close();
    Toast.show('🗑️ Account deleted.', 'warning');
    App.render();
  },

  openProfile(userId) {
    const u = Auth.user(userId);
    if (!u) return;
    const r = Auth.rank(u);
    const lb = Analytics.leaderboard().find(x => x.user.id === u.id) || { position: '—', done: 0, bugs: 0, snips: 0, score: 0 };
    const tasks = Store.data.tasks.filter(t => t.assigneeId === u.id);
    const bugs = Store.data.bugs.filter(b => b.assigneeId === u.id);
    Modal.open(`
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="avatar-circle" style="width:46px;height:46px;font-size:17px;background:${u.color}">${Utils.initials(u.displayName)}</div>
          <div>
            <div class="modal-title">${Utils.esc(u.displayName)}</div>
            <div style="font-size:12px;color:${r.color};font-weight:700">${Utils.esc(r.name)} · LVL ${r.level} · ${r.tier}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
          <div class="card" style="padding:12px;text-align:center"><div class="kpi-value" style="font-size:20px;color:var(--accent)">#${lb.position}</div><div class="kpi-subtext">Rank position</div></div>
          <div class="card" style="padding:12px;text-align:center"><div class="kpi-value" style="font-size:20px;color:var(--success)">${lb.done}</div><div class="kpi-subtext">Tasks done</div></div>
          <div class="card" style="padding:12px;text-align:center"><div class="kpi-value" style="font-size:20px;color:var(--danger)">${lb.bugs}</div><div class="kpi-subtext">Bugs fixed</div></div>
          <div class="card" style="padding:12px;text-align:center"><div class="kpi-value" style="font-size:20px;color:var(--accent-secondary)">${lb.score}</div><div class="kpi-subtext">Total score</div></div>
        </div>
        <div class="form-row">
          <div><div class="form-label">Username</div><div style="font-size:13px;margin-bottom:10px">@${Utils.esc(u.username)}</div>
            <div class="form-label">Email</div><div style="font-size:13px;margin-bottom:10px">${Utils.esc(u.email || '—')}</div>
            <div class="form-label">Job title</div><div style="font-size:13px;margin-bottom:10px">${Utils.esc(u.title || '—')}</div>
            <div class="form-label">Skills</div><div style="font-size:13px;margin-bottom:10px">${(u.skills || []).map(s => `<span class="pill pill-accent" style="margin:2px">${Utils.esc(s)}</span>`).join('') || '—'}</div>
          </div>
          <div><div class="form-label">Account created</div><div style="font-size:13px;margin-bottom:10px">${Utils.fmtDate(u.createdAt)}</div>
            <div class="form-label">Last login</div><div style="font-size:13px;margin-bottom:10px">${u.lastLoginAt ? Utils.fmtDateTime(u.lastLoginAt) : 'never'} (${u.loginCount || 0} total)</div>
            <div class="form-label">Open work</div><div style="font-size:13px;margin-bottom:10px">${tasks.filter(t => t.status !== 'Done').length} tasks · ${bugs.filter(b => b.status !== 'Closed').length} bugs</div>
            <div class="form-label">Permissions</div><div style="font-size:12px">${Object.keys(r.perms || {}).filter(k => r.perms[k]).map(k => `<span class="pill pill-success" style="margin:2px">${k}</span>`).join('') || 'read-only'}</div>
          </div>
        </div>
        ${Auth.can('manageAccounts') && u.notes ? `<div class="form-group" style="margin-top:14px"><label class="form-label">Founder notes</label><div class="code-block" style="white-space:pre-wrap">${Utils.esc(u.notes)}</div></div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
        ${Auth.can('manageAccounts') ? `<button class="btn btn-primary" onclick="Modal.close(); Team.openEditAccount('${u.id}')">Edit Account</button>` : ''}
      </div>`);
  }
};

/* -------------------------------------------------------- rank hierarchy UI */
const Ranks = {
  render() {
    const canManage = Auth.can('manageRanks');
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    const users = Store.data.users;
    const permKeys = ['manageAccounts', 'rerankDevs', 'manageRanks', 'createDashboards', 'manageTasks', 'manageSprints', 'manageBugs', 'editCodeVault', 'viewAllDashboards', 'manageSync', 'manageReleases'];

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:15px;font-weight:800">👑 Rank Hierarchy & Permissions</div>
        <div style="font-size:12.5px;color:var(--text-secondary)">Highest authority at the top. Level 7 = Founder (you). Lower levels see fewer dashboards and tools.</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="Ranks.reseed()">♻️ Restore Default Ranks</button>
        ${canManage ? `<button class="btn btn-primary btn-sm" onclick="Ranks.openEditor()">➕ New Rank</button>` : ''}
      </div>
    </div>

    ${ranks.map(r => {
      const members = users.filter(u => u.rankId === r.id);
      return `<div class="rank-tier-row" style="border-left:4px solid ${r.color}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="pill" style="background:${r.color}22;color:${r.color};border-color:${r.color}55;font-size:12.5px;font-weight:800">LVL ${r.level}</span>
            <div>
              <div style="font-weight:800;font-size:14.5px">${Utils.esc(r.name)} <span style="font-size:11px;color:var(--text-muted);font-weight:600">${Utils.esc(r.tier)}</span></div>
              <div style="font-size:12px;color:var(--text-secondary)">${Utils.esc(r.description || '')}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="pill pill-info">${members.length} member${members.length === 1 ? '' : 's'}</span>
            ${canManage && r.level < 7 ? `<button class="btn btn-secondary btn-xs" onclick="Ranks.openEditor('${r.id}')">Edit</button>
            <button class="btn btn-secondary btn-xs" onclick="Ranks.shift('${r.id}',1)">↑</button>
            <button class="btn btn-secondary btn-xs" onclick="Ranks.shift('${r.id}',-1)">↓</button>
            <button class="btn btn-danger btn-xs" onclick="Ranks.remove('${r.id}')">Delete</button>` : ''}
            ${r.level >= 7 ? '<span class="pill pill-warning">OWNER — locked</span>' : ''}
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${permKeys.map(k => `<span class="pill ${r.perms[k] ? 'pill-success' : ''}" style="${r.perms[k] ? '' : 'background:var(--bg-base);color:var(--text-muted);border-color:var(--border-subtle)'}">${r.perms[k] ? '✓' : '✕'} ${k}</span>`).join('')}
        </div>
        <div class="rank-dev-chips">
          ${members.length ? members.map(u => `
            <div class="rank-dev-chip">
              <div class="avatar-circle" style="width:26px;height:26px;font-size:10px;background:${u.color}">${Utils.initials(u.displayName)}</div>
              <div>
                <div style="font-size:12.5px;font-weight:700">${Utils.esc(u.displayName)}</div>
                <div style="font-size:10.5px;color:var(--text-muted)">@${Utils.esc(u.username)}</div>
              </div>
              ${Auth.can('rerankDevs') && r.level < 7 ? `<button class="btn btn-secondary btn-xs" onclick="Team.openProfile('${u.id}')">Manage</button>` : ''}
            </div>`).join('') : '<span style="font-size:12px;color:var(--text-muted)">No members assigned to this rank.</span>'}
        </div>
      </div>`;
    }).join('')}

    <div class="card" style="margin-top:8px">
      <div class="card-header"><div class="card-title">🎓 Promotion Helper</div></div>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
        Developers ranked by total score (tasks closed, bugs fixed, snippets + bonus XP). Promote the top performers directly from here.
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>#</th><th>Developer</th><th>Current Rank</th><th>Closed</th><th>Bugs</th><th>Snippets</th><th>Score</th><th>Suggested Action</th></tr></thead>
          <tbody>
            ${Analytics.leaderboard().map(row => {
              const nextRank = Store.data.ranks.slice().sort((a, b) => a.level - b.level).find(r => r.level === row.rank.level + 1);
              const promote = row.score > 150 && nextRank && nextRank.level < 7;
              return `<tr>
                <td style="font-weight:700">#${row.position}</td>
                <td><strong>${Utils.esc(row.user.displayName)}</strong> <span style="color:var(--text-muted)">@${Utils.esc(row.user.username)}</span></td>
                <td><span class="pill" style="background:${row.rank.color}22;color:${row.rank.color};border-color:${row.rank.color}55">${Utils.esc(row.rank.name)}</span></td>
                <td>${row.done}</td><td>${row.bugs}</td><td>${row.snips}</td>
                <td style="font-weight:800;color:var(--accent)">${row.score}</td>
                <td>${promote && Auth.can('rerankDevs')
                  ? `<button class="btn btn-success btn-xs" onclick="Team.rerank('${row.user.id}','${nextRank.id}')">⬆ Promote to ${Utils.esc(nextRank.name)}</button>`
                  : '<span style="color:var(--text-muted);font-size:12px">Keep building</span>'}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">No developers yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  openEditor(rankId) {
    if (!Auth.can('manageRanks')) return Toast.show('⛔ Your rank cannot edit the hierarchy.', 'danger');
    const r = rankId ? Store.data.ranks.find(x => x.id === rankId) : null;
    const permKeys = ['manageAccounts', 'rerankDevs', 'manageRanks', 'createDashboards', 'manageTasks', 'manageSprints', 'manageBugs', 'editCodeVault', 'viewAllDashboards', 'manageSync', 'manageReleases'];
    Modal.open(`
      <div class="modal-header"><div class="modal-title">${r ? '✏️ Edit Rank' : '➕ Create Rank'}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Rank name</label><input class="form-input" id="rk-name" value="${r ? Utils.esc(r.name) : ''}" placeholder="Technical Artist" /></div>
          <div class="form-group"><label class="form-label">Tier label</label><input class="form-input" id="rk-tier" value="${r ? Utils.esc(r.tier) : ''}" placeholder="ART" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Level (2-6)</label><input class="form-input" id="rk-level" type="number" min="1" max="6" value="${r ? r.level : 3}" /></div>
          <div class="form-group"><label class="form-label">Colour</label><input class="form-input" id="rk-color" type="color" value="${r ? r.color : '#3b82f6'}" style="height:38px;padding:4px" /></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="rk-desc">${r ? Utils.esc(r.description || '') : ''}</textarea></div>
        <div class="form-group"><label class="form-label">Permissions</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px">
            ${permKeys.map(k => `<label style="display:flex;align-items:center;gap:8px;font-size:12.5px">
              <input type="checkbox" class="rk-perm" value="${k}" ${r && r.perms[k] ? 'checked' : ''} /> ${k}</label>`).join('')}
          </div></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Ranks.save('${r ? r.id : ''}')">${r ? 'Save Rank' : 'Create Rank'}</button>
      </div>`);
  },

  save(rankId) {
    const name = document.getElementById('rk-name').value.trim();
    if (!name) return Toast.show('⚠️ Rank name is required.', 'warning');
    const perms = {};
    ['manageAccounts', 'rerankDevs', 'manageRanks', 'createDashboards', 'manageTasks', 'manageSprints', 'manageBugs', 'editCodeVault', 'viewAllDashboards', 'manageSync', 'manageReleases'].forEach(k => {
      perms[k] = !!document.querySelector(`.rk-perm[value="${k}"]:checked`);
    });
    const payload = {
      name,
      tier: document.getElementById('rk-tier').value.trim().toUpperCase() || 'CUSTOM',
      level: Math.max(1, Math.min(6, parseInt(document.getElementById('rk-level').value, 10) || 3)),
      color: document.getElementById('rk-color').value,
      description: document.getElementById('rk-desc').value.trim(),
      perms
    };
    if (rankId) {
      const r = Store.data.ranks.find(x => x.id === rankId);
      Object.assign(r, payload);
      Log.add('rank.update', `Updated rank "${payload.name}"`);
      Toast.show('✅ Rank updated.', 'success');
    } else {
      Store.data.ranks.push(Object.assign({ id: Utils.uid('rank') }, payload));
      Log.add('rank.create', `Created rank "${payload.name}"`);
      Toast.show(`👑 Rank "${Utils.esc(name)}" created.`, 'success');
    }
    Store.save();
    Modal.close();
    App.render();
  },

  shift(rankId, dir) {
    const ranks = Store.data.ranks.slice().sort((a, b) => b.level - a.level);
    const i = ranks.findIndex(r => r.id === rankId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ranks.length) return;
    if (ranks[i].level >= 7 || ranks[j].level >= 7) return Toast.show('⛔ The Founder rank position is locked.', 'warning');
    const a = ranks[i], b = ranks[j];
    const tmp = a.level; a.level = b.level; b.level = tmp;
    Store.save();
    Log.add('rank.reorder', `Reordered "${a.name}" and "${b.name}"`);
    App.render();
  },

  remove(rankId) {
    const r = Store.data.ranks.find(x => x.id === rankId);
    if (!r) return;
    if (r.level >= 7) return Toast.show('⛔ The Founder rank cannot be deleted.', 'danger');
    const members = Store.data.users.filter(u => u.rankId === rankId);
    if (members.length) return Toast.show(`⚠️ Move the ${members.length} member(s) to another rank first.`, 'warning');
    Store.data.ranks = Store.data.ranks.filter(x => x.id !== rankId);
    Store.save();
    Log.add('rank.delete', `Deleted rank "${r.name}"`);
    Toast.show('🗑️ Rank deleted.', 'warning');
    App.render();
  },

  reseed() {
    if (!Auth.can('manageRanks')) return Toast.show('⛔ Your rank cannot restore ranks.', 'danger');
    Modal.open(`
      <div class="modal-header"><div class="modal-title">♻️ Restore Default Ranks</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body"><p style="font-size:13px">This restores the seven default SCRAPPED studio ranks and re-assigns every developer by keeping the
      closest matching level. Custom ranks are removed. Accounts themselves are not deleted.</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Ranks.doReseed()">Restore Defaults</button>
      </div>`);
  },

  doReseed() {
    const defaults = JSON.parse(JSON.stringify(DEFAULTS.ranks));
    const byLevel = {};
    defaults.forEach(r => { byLevel[r.level] = r.id; });
    Store.data.users.forEach(u => {
      const cur = Auth.rank(u);
      if (!cur) { u.rankId = byLevel[1]; return; }
      let lvl = cur.level;
      while (lvl > 1 && !byLevel[lvl]) lvl--;
      if (!byLevel[lvl]) lvl = 1;
      u.rankId = byLevel[lvl];
    });
    Store.data.ranks = defaults;
    Store.save();
    Log.add('rank.reseed', 'Restored default rank hierarchy');
    Modal.close();
    Toast.show('♻️ Default ranks restored.', 'success');
    App.render();
  }
};
