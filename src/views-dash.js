/* ============================================================================
 * SCRAPPED Connect — Company Dashboards View + Widget Engine
 * ==========================================================================*/

const Widgets = {
  computeMetric(metric) {
    const d = Store.data;
    const ts = Analytics.taskStats();
    const bs = Analytics.bugStats();
    const ss = Analytics.sprintStats();
    const cv = Analytics.codeVaultStats();
    const lb = Analytics.leaderboard();
    const workload = Analytics.workload();
    switch (metric) {
      case 'developers':
        return { label: 'Active Developers', value: d.users.filter(u => u.active).length, sub: `${d.ranks.length} ranks · ${d.users.length} total accounts`, icon: '👥', color: 'var(--accent)' };
      case 'open-tasks':
        return { label: 'Open Tasks', value: ts.total - ts.done, sub: `${ts.done} of ${ts.total} completed`, icon: '📋', color: 'var(--info)' };
      case 'open-bugs':
        return { label: 'Open Bugs', value: bs.open, sub: `${bs.critical} critical`, icon: '🐛', color: bs.critical > 0 ? 'var(--danger)' : 'var(--success)' };
      case 'sprint-status':
        return { label: 'Active Sprints', value: ss.active, sub: ss.activeList.length ? ss.activeList.map(s => s.name).join(', ') : 'No sprint running', icon: '🚀', color: 'var(--accent-secondary)' };
      case 'tasks-done-7d': {
        const cutoff = Date.now() - 7 * 864e5;
        const done = d.tasks.filter(t => t.status === 'Done' && t.completedAt && new Date(t.completedAt).getTime() > cutoff).length;
        return { label: 'Tasks Shipped (7d)', value: done, sub: 'Closed in the last 7 days', icon: '📈', color: 'var(--success)' };
      }
      case 'completion-rate':
        return { label: 'Completion Rate', value: ts.completion + '%', sub: `${ts.done}/${ts.total} tasks`, icon: '✅', color: 'var(--success)' };
      case 'workload-avg':
        return { label: 'Avg. Workload', value: workload.length ? (workload.reduce((a, b) => a + b.load, 0) / workload.length).toFixed(1) : '0', sub: 'Open items per developer', icon: '⚖️', color: 'var(--warning)' };
      case 'snippets':
        return { label: 'Code Vault', value: cv.total, sub: `${Object.keys(cv.languages).length} languages`, icon: '💻', color: 'var(--accent)' };
      case 'sprint-progress': {
        const active = ss.activeList[0];
        if (!active) return { label: 'Sprint Progress', value: '—', sub: 'No active sprint', icon: '🚀', color: 'var(--text-muted)' };
        const p = Widgets.sprintProgress(active);
        return { label: 'Sprint Progress', value: p + '%', sub: active.name, icon: '🚀', color: 'var(--accent-secondary)' };
      }
      case 'blockers':
        return { label: 'Blockers', value: d.bugs.filter(b => b.severity === 'Critical' && b.status !== 'Closed' && b.status !== 'Verified').length, sub: 'Critical open bugs', icon: '🚨', color: 'var(--danger)' };
      case 'review-queue':
        return { label: 'Code Review Queue', value: d.tasks.filter(t => t.status === 'Code Review').length, sub: 'Pull requests awaiting review', icon: '👀', color: 'var(--warning)' };
      case 'release-version':
        return { label: 'Studio Build', value: 'v' + APP_VERSION, sub: Updater.info.updateAvailable ? `v${Updater.info.latestVersion} available` : 'Newest build installed', icon: '📦', color: Updater.info.updateAvailable ? 'var(--warning)' : 'var(--success)' };
      default:
        return { label: metric, value: '—', sub: '', icon: '•', color: 'var(--accent)' };
    }
  },

  sprintProgress(sprint) {
    const tasks = Store.data.tasks.filter(t => sprint.taskIds && sprint.taskIds.includes(t.id));
    if (!tasks.length) return 0;
    return Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100);
  },

  barChart(metric) {
    const ts = Analytics.taskStats();
    const bs = Analytics.bugStats();
    let rows = [];
    if (metric === 'task-status') {
      rows = [['Backlog', ts.backlog], ['To Do', ts.todo], ['In Progress', ts.progress], ['Code Review', ts.review], ['Done', ts.done]];
    } else if (metric === 'bug-status') {
      const statuses = ['New', 'Triaged', 'Fixing', 'In Review', 'Closed'];
      rows = statuses.map(s => [s, Store.data.bugs.filter(b => b.status === s).length]);
    } else if (metric === 'bug-severity') {
      rows = ['Critical', 'High', 'Medium', 'Low'].map(s => [s, Store.data.bugs.filter(b => b.severity === s).length]);
    } else if (metric === 'workload') {
      rows = Analytics.workload().slice(0, 8).map(w => [w.user.displayName, w.load]);
    } else if (metric === 'rank-distribution') {
      rows = Store.data.ranks.slice().sort((a, b) => b.level - a.level)
        .map(r => [r.name, Store.data.users.filter(u => u.rankId === r.id && u.active).length]);
    }
    const max = Math.max(1, ...rows.map(r => r[1]));
    const total = rows.reduce((a, b) => a + b[1], 0) || 1;
    return rows.map(([label, value]) => {
      const pct = Math.round((value / max) * 100);
      const share = Math.round((value / total) * 100);
      return `
        <div style="margin-bottom:11px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px">
            <span style="font-weight:600">${Utils.esc(label)}</span>
            <span style="color:var(--text-secondary)">${value}${metric === 'workload' ? '' : ` · ${share}%`}</span>
          </div>
          <div class="progress-track" style="height:9px">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
  },

  leaderboard(limit) {
    const rows = Analytics.leaderboard().slice(0, limit || 10);
    if (!rows.length) return `<div style="color:var(--text-muted);font-size:13px">No developers yet. Create accounts from <strong>Accounts &amp; Rerank</strong>.</div>`;
    const medal = (p) => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : `#${p}`;
    return `<div style="display:flex;flex-direction:column;gap:9px">` + rows.map(r => `
      <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md)">
        <span style="font-weight:800;min-width:32px;font-size:13px">${medal(r.position)}</span>
        <div class="avatar-circle" style="width:30px;height:30px;font-size:11px;background:${r.user.color}">${Utils.initials(r.user.displayName)}</div>
        <div style="flex:1;overflow:hidden">
          <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(r.user.displayName)}</div>
          <div style="font-size:11px;color:${r.rank ? r.rank.color : 'var(--text-muted)'};font-weight:700">${r.rank ? Utils.esc(r.rank.name) : '—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:var(--accent)">${r.score}</div>
          <div style="font-size:10.5px;color:var(--text-muted)">${r.done}✔ ${r.bugs}🐛</div>
        </div>
      </div>`).join('') + `</div>`;
  },

  list(metric, limit) {
    const lim = limit || 6;
    let items = [];
    if (metric === 'critical-bugs') {
      items = Store.data.bugs.filter(b => b.severity === 'Critical' && b.status !== 'Closed')
        .map(b => ({ title: b.title, sub: `${b.status} · ${Utils.timeAgo(b.createdAt)}`, pill: '<span class="pill pill-danger">CRITICAL</span>' }));
    } else if (metric === 'unassigned-tasks') {
      items = Store.data.tasks.filter(t => !t.assigneeId && t.status !== 'Done')
        .map(t => ({ title: t.title, sub: `${t.status} · ${t.priority} priority`, pill: '<span class="pill pill-warning">UNASSIGNED</span>' }));
    } else if (metric === 'blockers') {
      items = Store.data.bugs.filter(b => b.status !== 'Closed' && (b.severity === 'Critical' || b.severity === 'High'))
        .map(b => ({ title: b.title, sub: `${b.severity} · ${b.status}`, pill: '<span class="pill pill-danger">BLOCKER</span>' }));
    }
    if (!items.length) return `<div style="color:var(--text-muted);font-size:13px">Nothing here — the board is clear. 🎉</div>`;
    return items.slice(0, lim).map(i => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="overflow:hidden">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(i.title)}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${Utils.esc(i.sub)}</div>
        </div>${i.pill}
      </div>`).join('');
  },

  progressList(metric) {
    if (metric === 'sprints') {
      const sprints = Store.data.sprints.slice().sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      if (!sprints.length) return `<div style="color:var(--text-muted);font-size:13px">No sprints planned yet.</div>`;
      return sprints.map(s => {
        const p = Widgets.sprintProgress(s);
        return `<div style="margin-bottom:13px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px">
            <span><strong>${Utils.esc(s.name)}</strong> <span class="pill ${s.status === 'Active' ? 'pill-success' : s.status === 'Completed' ? 'pill-info' : 'pill-warning'}" style="margin-left:6px">${s.status}</span></span>
            <span style="color:var(--text-secondary)">${p}%</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>
        </div>`;
      }).join('');
    }
    return '';
  },

  activity(limit) {
    const acts = Store.data.activity.slice(0, limit || 8);
    if (!acts.length) return `<div style="color:var(--text-muted);font-size:13px">No activity recorded yet.</div>`;
    return acts.map(a => `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
        <span style="color:var(--accent);font-size:13px;font-weight:700">•</span>
        <div style="flex:1">
          <div style="font-size:12.5px"><strong>${Utils.esc(a.actorName)}</strong> ${Utils.esc(a.detail)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${Utils.esc(a.action)} · ${Utils.timeAgo(a.ts)}</div>
        </div>
      </div>`).join('');
  },

  render(widget, dashboard) {
    const span = widget.span || 6;
    const cls = `widget-span-${span}`;
    let body = '';
    if (widget.type === 'kpi-row') {
      const cols = widget.items.map(m => Widgets.computeMetric(m));
      return `<div class="${cls}" style="display:grid;grid-template-columns:repeat(${Math.min(cols.length, 4)},1fr);gap:14px">
        ${cols.map(c => `
          <div class="card" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted)">${Utils.esc(c.sub ? c.label : c.label)}</div>
              <span style="font-size:17px">${c.icon}</span>
            </div>
            <div class="kpi-value" style="color:${c.color}">${Utils.esc(String(c.value))}</div>
            <div class="kpi-subtext">${Utils.esc(c.sub)}</div>
          </div>`).join('')}
      </div>`;
    }
    if (widget.type === 'leaderboard') body = Widgets.leaderboard(widget.limit);
    else if (widget.type === 'bar-chart') body = Widgets.barChart(widget.metric);
    else if (widget.type === 'list') body = Widgets.list(widget.metric, widget.limit);
    else if (widget.type === 'progress-list') body = Widgets.progressList(widget.metric);
    else if (widget.type === 'recent-activity') body = Widgets.activity(widget.limit);
    else if (widget.type === 'text-note') body = `<div style="font-size:13px;color:var(--text-secondary);white-space:pre-wrap">${Utils.esc(widget.text || '')}</div>`;
    else body = `<div style="color:var(--text-muted);font-size:13px">Unknown widget type: ${Utils.esc(widget.type)}</div>`;

    return `<div class="card ${cls}">
      <div class="card-header">
        <div class="card-title">${Utils.esc(widget.title || 'Widget')}</div>
        ${Auth.can('createDashboards') && !dashboard.system ? `<button class="btn btn-secondary btn-xs" onclick="Dashboards.removeWidget('${dashboard.id}','${widget.id}')">✕ Remove</button>` : ''}
      </div>
      ${body}
    </div>`;
  }
};

const Dashboards = {
  currentId: null,
  editing: false,

  /**
   * Dashboards this user may open.
   * An explicit rank list in `visibility` is authoritative — only the studio
   * owner (level 7) and trusted managers may look at a dashboard that was
   * restricted away from their own rank.
   */
  visible() {
    const user = Auth.current();
    const rank = Auth.rank(user);
    const isOwner = !!rank && (rank.level >= 7 || (rank.perms && rank.perms.manageAccounts && rank.perms.createDashboards));
    return Store.data.dashboards
      .filter(d => {
        if (d.visibility === 'all' || !d.visibility) return true;
        if (isOwner) return true;
        if (Array.isArray(d.visibility)) return d.visibility.includes(rank ? rank.id : null);
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  get(id) { return Store.data.dashboards.find(d => d.id === id) || null; },

  ensureSelection() {
    const list = Dashboards.visible();
    if (!list.length) { Dashboards.currentId = null; return null; }
    if (!list.some(d => d.id === Dashboards.currentId)) Dashboards.currentId = list[0].id;
    return Dashboards.get(Dashboards.currentId);
  },

  removeWidget(dashId, widgetId) {
    const d = Dashboards.get(dashId);
    if (!d) return;
    d.widgets = d.widgets.filter(w => w.id !== widgetId);
    Store.save();
    Log.add('dashboard.widget.remove', `Removed a widget from "${d.name}"`);
    App.render();
  },

  moveWidget(dashId, widgetId, dir) {
    const d = Dashboards.get(dashId);
    if (!d) return;
    const i = d.widgets.findIndex(w => w.id === widgetId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.widgets.length) return;
    const tmp = d.widgets[i];
    d.widgets[i] = d.widgets[j];
    d.widgets[j] = tmp;
    Store.save();
    App.render();
  },

  render() {
    const list = Dashboards.visible();
    const canBuild = Auth.can('createDashboards');

    if (!Store.data.dashboards.length) {
      return `<div class="card" style="text-align:center;padding:48px">
        <div style="font-size:42px;margin-bottom:12px">📊</div>
        <div class="card-title" style="justify-content:center;font-size:18px;margin-bottom:8px">No dashboards yet</div>
        <div style="color:var(--text-secondary);max-width:520px;margin:0 auto 18px">
          Dashboards show live studio metrics computed straight from your local SCRAPPED Connect workspace.
          ${canBuild ? 'Create your first one — or load the three built-in SCRAPPED studio templates.' : 'Ask the Founder to create one for your rank.'}
        </div>
        ${canBuild ? `<div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary" onclick="Dashboards.createTemplate()">⚡ Load Studio Templates</button>
          <button class="btn btn-secondary" onclick="Dashboards.openBuilder()">➕ Build From Scratch</button>
        </div>` : ''}
      </div>`;
    }

    const dash = Dashboards.ensureSelection();
    if (!dash) return `<div class="card" style="padding:40px;text-align:center">You do not have access to any dashboard for your rank yet.</div>`;

    const tabs = list.map(d => `
      <button class="dashboard-tab ${d.id === dash.id ? 'active' : ''}" onclick="Dashboards.select('${d.id}')">
        <span>${d.icon || '📊'}</span> ${Utils.esc(d.name)}
        ${d.system ? '<span class="pill pill-accent" style="font-size:9.5px;padding:1px 6px">BUILT-IN</span>' : ''}
      </button>`).join('');

    const widgets = (dash.widgets || []).map(w => `<!-- widget:${w.id} -->
      ${Widgets.render(w, dash)}`).join('') ||
      `<div class="card widget-span-12" style="text-align:center;color:var(--text-muted);padding:36px">
        This dashboard is empty.${canBuild ? ' Use <strong>Edit Layout</strong> to add widgets.' : ''}
      </div>`;

    return `
    <div class="dashboard-tabs-bar">
      <div class="dashboard-tab-group">${tabs}
        ${canBuild ? `<button class="btn btn-secondary btn-sm" onclick="Dashboards.openBuilder()">➕ New Dashboard</button>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="App.exportDashboardCSV('${dash.id}')">📤 Export CSV</button>
        ${canBuild ? `<button class="btn btn-primary btn-sm" onclick="Dashboards.openWidgetPicker('${dash.id}')">🧩 Add Widget</button>` : ''}
        ${canBuild ? `<button class="btn btn-secondary btn-sm" onclick="Dashboards.openDashboardSettings('${dash.id}')">⚙️ Dashboard Settings</button>` : ''}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:16px;font-weight:800">${dash.icon || ''} ${Utils.esc(dash.name)}</div>
        <div style="font-size:12.5px;color:var(--text-secondary)">${Utils.esc(dash.description || '')}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="pill pill-info">${dash.visibility === 'all' ? 'Visible to all ranks' : 'Restricted visibility'}</span>
        <span class="pill pill-success">● Live local data</span>
      </div>
    </div>

    <div class="widgets-grid">${widgets}</div>`;
  },

  select(id) {
    Dashboards.currentId = id;
    App.render();
  },

  createTemplate() {
    if (!Auth.can('createDashboards')) return Toast.show('⛔ Your rank cannot create dashboards.', 'danger');
    Store.data.dashboards = buildTemplateDashboards();
    Store.save();
    Log.add('dashboard.templates', 'Loaded the three built-in SCRAPPED studio dashboard templates');
    Toast.show('⚡ Studio dashboard templates loaded.', 'success');
    App.render();
  },

  openBuilder() {
    if (!Auth.can('createDashboards')) return Toast.show('⛔ Your rank cannot create dashboards.', 'danger');
    const rankOptions = Store.data.ranks.map(r =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 0">
        <input type="checkbox" class="dash-vis-rank" value="${r.id}" checked /> ${Utils.esc(r.name)} <span class="pill" style="background:${r.color}22;color:${r.color};border-color:${r.color}55">${r.tier}</span>
      </label>`).join('');
    const widgetChoices = [
      ['kpi-row', '📈 KPI Stat Row'], ['leaderboard', '👑 Developer Ranking Board'],
      ['bar-chart', '📊 Bar Chart'], ['progress-list', '🚀 Sprint Progress'],
      ['list', '📋 Issue List'], ['recent-activity', '🕒 Activity Feed'],
      ['text-note', '📝 Text / Announcement Note']
    ];
    Modal.open(`
      <div class="modal-header"><div class="modal-title">➕ Build a Company Dashboard</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Dashboard name</label>
            <input class="form-input" id="dash-name" placeholder="e.g. QA & Bug Health" /></div>
          <div class="form-group"><label class="form-label">Icon (emoji)</label>
            <input class="form-input" id="dash-icon" value="📊" maxlength="4" /></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label>
          <input class="form-input" id="dash-desc" placeholder="What this dashboard is for" /></div>
        <div class="form-group"><label class="form-label">Who can see it</label>
          <select class="form-select" id="dash-visibility" onchange="document.getElementById('dash-rank-box').style.display = this.value==='ranks'?'block':'none'">
            <option value="all">Everyone in the studio</option>
            <option value="ranks">Only selected ranks</option>
            <option value="private">Only me</option>
          </select></div>
        <div class="form-group" id="dash-rank-box" style="display:none">
          <label class="form-label">Allowed ranks</label>
          <div style="max-height:170px;overflow:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px">${rankOptions}</div>
        </div>
        <div class="form-group"><label class="form-label">Start with widgets</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${widgetChoices.map(w => `<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 0">
              <input type="checkbox" class="dash-widget-choice" value="${w[0]}" /> ${w[1]}</label>`).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Dashboards.saveBuilder()">Create Dashboard</button>
      </div>`);
  },

  saveBuilder() {
    const name = document.getElementById('dash-name').value.trim();
    if (!name) return Toast.show('⚠️ Give the dashboard a name.', 'warning');
    const visMode = document.getElementById('dash-visibility').value;
    let visibility = 'all';
    if (visMode === 'ranks') {
      visibility = Array.from(document.querySelectorAll('.dash-vis-rank:checked')).map(c => c.value);
      if (!visibility.length) visibility = ['all'];
    } else if (visMode === 'private') {
      visibility = [Auth.rank(Auth.current()).id];
    }
    const chosen = Array.from(document.querySelectorAll('.dash-widget-choice:checked')).map(c => c.value);
    const widgets = chosen.map(t => Dashboards.blankWidget(t, name));
    if (!widgets.length) widgets.push(Dashboards.blankWidget('kpi-row', name));

    const dash = {
      id: Utils.uid('dash'),
      name,
      icon: document.getElementById('dash-icon').value.trim() || '📊',
      description: document.getElementById('dash-desc').value.trim(),
      visibility,
      system: false,
      createdBy: Auth.currentUserId(),
      createdAt: Utils.now(),
      order: Store.data.dashboards.length,
      widgets
    };
    Store.data.dashboards.push(dash);
    Dashboards.currentId = dash.id;
    Store.save();
    Log.add('dashboard.create', `Created dashboard "${name}"`);
    Modal.close();
    Toast.show(`📊 Dashboard "${Utils.esc(name)}" created.`, 'success');
    App.render();
  },

  blankWidget(type, dashName) {
    const base = { id: Utils.uid('w'), type, span: 6, title: '' };
    switch (type) {
      case 'kpi-row': return Object.assign(base, { span: 12, title: 'Key Metrics', items: ['developers', 'open-tasks', 'open-bugs', 'sprint-status'] });
      case 'leaderboard': return Object.assign(base, { span: 6, title: 'Developer Ranking', limit: 8 });
      case 'bar-chart': return Object.assign(base, { span: 6, title: 'Task Pipeline', metric: 'task-status' });
      case 'progress-list': return Object.assign(base, { span: 6, title: 'Sprint Progress', metric: 'sprints' });
      case 'list': return Object.assign(base, { span: 6, title: 'Critical Bugs', metric: 'critical-bugs' });
      case 'recent-activity': return Object.assign(base, { span: 6, title: 'Recent Activity', limit: 8 });
      case 'text-note': return Object.assign(base, { span: 12, title: 'Announcement', text: `Note for ${dashName || 'the team'}` });
      default: return base;
    }
  },

  openWidgetPicker(dashId) {
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🧩 Add Widget</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Widget type</label>
          <select class="form-select" id="w-type">
            <option value="kpi-row">📈 KPI Stat Row</option>
            <option value="leaderboard">👑 Developer Ranking Board</option>
            <option value="bar-chart">📊 Bar Chart</option>
            <option value="progress-list">🚀 Sprint Progress List</option>
            <option value="list">📋 Issue List</option>
            <option value="recent-activity">🕒 Activity Feed</option>
            <option value="text-note">📝 Text / Announcement</option>
          </select></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Title</label>
            <input class="form-input" id="w-title" placeholder="Widget title" /></div>
          <div class="form-group"><label class="form-label">Width</label>
            <select class="form-select" id="w-span">
              <option value="12">Full width</option>
              <option value="8">Two thirds</option>
              <option value="6" selected>Half</option>
              <option value="4">One third</option>
              <option value="3">Quarter</option>
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">Data source / metric</label>
          <select class="form-select" id="w-metric">
            <option value="task-status">Task pipeline by status</option>
            <option value="workload">Developer workload</option>
            <option value="bug-status">Bugs by status</option>
            <option value="bug-severity">Bugs by severity</option>
            <option value="rank-distribution">Accounts per rank</option>
            <option value="critical-bugs">Critical bug list</option>
            <option value="unassigned-tasks">Unassigned task list</option>
            <option value="sprints">Sprint progress</option>
          </select></div>
        <div class="form-group"><label class="form-label">Note text (only for text widget)</label>
          <textarea class="form-textarea" id="w-text" placeholder="Announcement text..."></textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Dashboards.addWidget('${dashId}')">Add Widget</button>
      </div>`);
  },

  addWidget(dashId) {
    const dash = Dashboards.get(dashId);
    if (!dash) return;
    const type = document.getElementById('w-type').value;
    const w = Dashboards.blankWidget(type, dash.name);
    w.title = document.getElementById('w-title').value.trim() || w.title;
    w.span = parseInt(document.getElementById('w-span').value, 10) || 6;
    w.metric = document.getElementById('w-metric').value;
    if (type === 'text-note') w.text = document.getElementById('w-text').value;
    dash.widgets.push(w);
    Store.save();
    Log.add('dashboard.widget.add', `Added a ${type} widget to "${dash.name}"`);
    Modal.close();
    Toast.show('🧩 Widget added.', 'success');
    App.render();
  },

  openDashboardSettings(dashId) {
    const dash = Dashboards.get(dashId);
    if (!dash) return;
    Modal.open(`
      <div class="modal-header"><div class="modal-title">⚙️ ${Utils.esc(dash.name)} — Settings</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="ds-name" value="${Utils.esc(dash.name)}" /></div>
          <div class="form-group"><label class="form-label">Icon</label><input class="form-input" id="ds-icon" value="${Utils.esc(dash.icon || '📊')}" maxlength="4" /></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="ds-desc" value="${Utils.esc(dash.description || '')}" /></div>
        <div class="form-group"><label class="form-label">Visibility</label>
          <select class="form-select" id="ds-visibility">
            <option value="all" ${dash.visibility === 'all' ? 'selected' : ''}>Everyone</option>
            <option value="ranks" ${Array.isArray(dash.visibility) ? 'selected' : ''}>Selected ranks</option>
          </select></div>
        <div class="form-group"><label class="form-label">Allowed ranks (when "selected ranks")</label>
          <div style="max-height:150px;overflow:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px">
            ${Store.data.ranks.map(r => `<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:4px 0">
              <input type="checkbox" class="ds-rank" value="${r.id}" ${Array.isArray(dash.visibility) && dash.visibility.includes(r.id) ? 'checked' : ''} /> ${Utils.esc(r.name)}</label>`).join('')}
          </div></div>
        <div class="form-group"><label class="form-label">Widget order</label>
          ${dash.widgets.map(w => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
            <span style="font-size:12.5px">${Utils.esc(w.title || w.type)}</span>
            <span><button class="btn btn-secondary btn-xs" onclick="Dashboards.moveWidget('${dash.id}','${w.id}',-1)">↑</button>
            <button class="btn btn-secondary btn-xs" onclick="Dashboards.moveWidget('${dash.id}','${w.id}',1)">↓</button></span>
          </div>`).join('')}</div>
      </div>
      <div class="modal-footer">
        ${dash.system ? '<span style="font-size:12px;color:var(--text-muted)">Built-in dashboard</span>' : `<button class="btn btn-danger" onclick="Dashboards.delete('${dash.id}')">Delete Dashboard</button>`}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="Dashboards.saveSettings('${dash.id}')">Save Changes</button>
        </div>
      </div>`);
  },

  saveSettings(dashId) {
    const dash = Dashboards.get(dashId);
    if (!dash) return;
    dash.name = document.getElementById('ds-name').value.trim() || dash.name;
    dash.icon = document.getElementById('ds-icon').value.trim() || dash.icon;
    dash.description = document.getElementById('ds-desc').value.trim();
    if (document.getElementById('ds-visibility').value === 'all') dash.visibility = 'all';
    else {
      const picked = Array.from(document.querySelectorAll('.ds-rank:checked')).map(c => c.value);
      dash.visibility = picked.length ? picked : 'all';
    }
    Store.save();
    Log.add('dashboard.update', `Updated dashboard "${dash.name}"`);
    Modal.close();
    Toast.show('✅ Dashboard updated.', 'success');
    App.render();
  },

  delete(dashId) {
    const dash = Dashboards.get(dashId);
    if (!dash) return;
    Store.data.dashboards = Store.data.dashboards.filter(d => d.id !== dashId);
    Store.save();
    Log.add('dashboard.delete', `Deleted dashboard "${dash.name}"`);
    Modal.close();
    Toast.show('🗑️ Dashboard deleted.', 'warning');
    App.render();
  }
};
