/* ============================================================================
 * SCRAPPED Connect — Programming Suite (Tasks, Sprints, Bugs, Code Vault)
 * ==========================================================================*/

const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const BUG_STATUSES = ['New', 'Triaged', 'Fixing', 'In Review', 'Closed'];
const LANGUAGES = ['C#', 'C++', 'Lua', 'Python', 'JavaScript', 'TypeScript', 'GLSL/HLSL', 'Rust', 'GDScript', 'Java', 'Kotlin', 'Swift', 'SQL', 'Bash', 'Other'];

const Work = {
  taskFilterAssignee: 'all',
  taskFilterPriority: 'all',
  bugFilterStatus: 'all',
  vaultFilterLang: 'all',
  vaultSearch: '',

  priorityPill(p) {
    const map = { Urgent: 'pill-danger', High: 'pill-warning', Medium: 'pill-info', Low: '' };
    const cls = map[p] || '';
    return `<span class="pill ${cls}" ${cls ? '' : 'style="background:var(--bg-base);color:var(--text-secondary);border-color:var(--border-subtle)"'}>${Utils.esc(p)}</span>`;
  },

  userChip(userId, size) {
    const u = Auth.user(userId);
    const s = size || 24;
    if (!u) return `<span style="font-size:11.5px;color:var(--text-muted)">Unassigned</span>`;
    return `<span style="display:inline-flex;align-items:center;gap:6px">
      <span class="avatar-circle" style="width:${s}px;height:${s}px;font-size:${Math.round(s / 2.6)}px;background:${u.color}">${Utils.initials(u.displayName)}</span>
      <span style="font-size:12px">${Utils.esc(u.displayName)}</span></span>`;
  },

  /* ------------------------------------------------------------ TASKS VIEW */
  renderTasks() {
    const ranks = Auth.can('manageTasks');
    let tasks = Store.data.tasks.slice();
    if (Work.taskFilterAssignee !== 'all') tasks = tasks.filter(t => t.assigneeId === Work.taskFilterAssignee);
    if (Work.taskFilterPriority !== 'all') tasks = tasks.filter(t => t.priority === Work.taskFilterPriority);

    const cols = STATUSES.map(status => {
      const col = tasks.filter(t => t.status === status);
      return `<div class="kanban-col" ondragover="event.preventDefault()" ondrop="Work.dropTask(event,'${status}')">
        <div class="kanban-col-header">
          <span>${Utils.esc(status)} <span style="color:var(--text-muted);font-weight:600">(${col.length})</span></span>
          <button class="btn btn-secondary btn-xs" onclick="Work.openTaskModal(null,'${status}')">＋</button>
        </div>
        ${col.map(t => Work.taskCard(t)).join('') || `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:16px 0">empty</div>`}
      </div>`;
    }).join('');

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select class="form-select" style="width:200px" onchange="Work.taskFilterAssignee=this.value; App.render()">
          <option value="all">All developers</option>
          ${Store.data.users.map(u => `<option value="${u.id}" ${Work.taskFilterAssignee === u.id ? 'selected' : ''}>${Utils.esc(u.displayName)}</option>`).join('')}
        </select>
        <select class="form-select" style="width:170px" onchange="Work.taskFilterPriority=this.value; App.render()">
          <option value="all">All priorities</option>
          ${PRIORITIES.map(p => `<option value="${p}" ${Work.taskFilterPriority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <span class="pill pill-info">${tasks.length} tasks · ${tasks.filter(t => t.status === 'Done').length} done</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Work.openTaskModal()">➕ New Task</button>
    </div>
    <div class="kanban-board">${cols}</div>
    <div class="card" style="margin-top:16px;font-size:12.5px;color:var(--text-secondary)">
      💡 Drag any card between columns to change status. Moving a card to <strong>Done</strong> awards ${Store.data.settings.xpPerTaskClosed} XP to the assignee and updates every ranking board instantly.
    </div>`;
  },

  taskCard(t) {
    const sprint = Store.data.sprints.find(s => (s.taskIds || []).includes(t.id));
    return `<div class="task-card" draggable="true" ondragstart="Work.dragTask(event,'${t.id}')" onclick="Work.openTaskModal('${t.id}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div class="task-title">${Utils.esc(t.title)}</div>
        ${Work.priorityPill(t.priority)}
      </div>
      ${t.description ? `<div class="task-desc">${Utils.esc(t.description)}</div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        ${Work.userChip(t.assigneeId)}
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${(t.tags || []).slice(0, 2).map(tag => `<span class="pill pill-accent" style="font-size:10px;padding:1px 6px">${Utils.esc(tag)}</span>`).join('')}
          ${sprint ? `<span class="pill pill-info" style="font-size:10px;padding:1px 6px">🚀 ${Utils.esc(sprint.name)}</span>` : ''}
        </div>
      </div>
    </div>`;
  },

  dragTask(ev, id) { ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'move'; },

  dropTask(ev, status) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    const t = Store.data.tasks.find(x => x.id === id);
    if (!t || t.status === status) return;
    Work.setStatus(t, status);
  },

  setStatus(task, status) {
    const prev = task.status;
    task.status = status;
    task.movedAt = Utils.now();
    if (status === 'Done' && prev !== 'Done') {
      task.completedAt = Utils.now();
      const u = Auth.user(task.assigneeId);
      if (u) {
        const xp = Store.data.settings.xpPerTaskClosed || 25;
        u.xp = (u.xp || 0) + xp;
        Toast.show(`✅ Task done — <strong>${Utils.esc(u.displayName)}</strong> earned +${xp} XP.`, 'success');
      }
    }
    if (status !== 'Done' && prev === 'Done') task.completedAt = null;
    Log.add('task.status', `Moved task "${task.title}" to ${status}`);
    Store.save();
    App.render();
  },

  openTaskModal(taskIdOrNull, presetStatus) {
    const t = taskIdOrNull ? Store.data.tasks.find(x => x.id === taskIdOrNull) : null;
    const assignees = Store.data.users.filter(u => u.active);
    Modal.open(`
      <div class="modal-header"><div class="modal-title">${t ? '✏️ Task' : '➕ New Task'}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Title *</label>
          <input class="form-input" id="tk-title" value="${t ? Utils.esc(t.title) : ''}" placeholder="Implement dash-dodge ability" /></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea class="form-textarea" id="tk-desc" placeholder="Acceptance criteria, notes, links…">${t ? Utils.esc(t.description || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="tk-status">
              ${STATUSES.map(s => `<option value="${s}" ${(t ? t.status : presetStatus) === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select class="form-select" id="tk-priority">
              ${PRIORITIES.map(p => `<option value="${p}" ${t && t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Assignee</label>
            <select class="form-select" id="tk-assignee">
              <option value="">— Unassigned —</option>
              ${assignees.map(u => `<option value="${u.id}" ${t && t.assigneeId === u.id ? 'selected' : ''}>${Utils.esc(u.displayName)} · ${Utils.esc(Auth.rank(u).name)}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Sprint</label>
            <select class="form-select" id="tk-sprint">
              <option value="">— No sprint —</option>
              ${Store.data.sprints.map(s => `<option value="${s.id}" ${t && t.sprintId === s.id ? 'selected' : ''}>${Utils.esc(s.name)} (${s.status})</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Estimate (hours)</label>
            <input class="form-input" id="tk-estimate" type="number" min="0" step="0.5" value="${t ? t.estimate || 0 : 0}" /></div>
          <div class="form-group"><label class="form-label">Tags (comma separated)</label>
            <input class="form-input" id="tk-tags" value="${t ? Utils.esc((t.tags || []).join(', ')) : ''}" placeholder="gameplay, netcode" /></div>
        </div>
        <div class="form-group"><label class="form-label">Linked dashboard</label>
          <select class="form-select" id="tk-dashboard">
            <option value="">— none —</option>
            ${Store.data.dashboards.map(d => `<option value="${d.id}" ${t && t.dashboardId === d.id ? 'selected' : ''}>${d.icon || ''} ${Utils.esc(d.name)}</option>`).join('')}
          </select></div>
        ${t ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:6px">
          Created ${Utils.fmtDateTime(t.createdAt)} by ${Utils.esc((Auth.user(t.reporterId) || {}).displayName || 'unknown')} · last moved ${Utils.timeAgo(t.movedAt)}</div>` : ''}
      </div>
      <div class="modal-footer">
        ${t ? `<button class="btn btn-danger" onclick="Work.deleteTask('${t.id}')">Delete</button>` : '<span></span>'}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="Work.saveTask('${t ? t.id : ''}')">${t ? 'Save Task' : 'Create Task'}</button>
        </div>
      </div>`);
  },

  saveTask(taskId) {
    const title = document.getElementById('tk-title').value.trim();
    if (!title) return Toast.show('⚠️ Task title is required.', 'warning');
    const data = {
      title,
      description: document.getElementById('tk-desc').value.trim(),
      status: document.getElementById('tk-status').value,
      priority: document.getElementById('tk-priority').value,
      assigneeId: document.getElementById('tk-assignee').value || null,
      sprintId: document.getElementById('tk-sprint').value || null,
      estimate: parseFloat(document.getElementById('tk-estimate').value) || 0,
      tags: document.getElementById('tk-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      dashboardId: document.getElementById('tk-dashboard').value || null
    };
    if (taskId) {
      const t = Store.data.tasks.find(x => x.id === taskId);
      const wasDone = t.status === 'Done';
      Object.assign(t, data);
      if (data.status === 'Done' && !wasDone) { t.completedAt = Utils.now(); const u = Auth.user(t.assigneeId); if (u) u.xp = (u.xp || 0) + (Store.data.settings.xpPerTaskClosed || 25); }
      if (data.status !== 'Done') t.completedAt = null;
      t.movedAt = Utils.now();
      Log.add('task.update', `Updated task "${t.title}"`);
      Toast.show('✅ Task saved.', 'success');
    } else {
      const t = Object.assign({
        id: Utils.uid('task'), reporterId: Auth.currentUserId(), createdAt: Utils.now(), movedAt: Utils.now(), completedAt: null
      }, data);
      Store.data.tasks.push(t);
      if (t.sprintId) {
        const s = Store.data.sprints.find(x => x.id === t.sprintId);
        if (s) { s.taskIds = s.taskIds || []; s.taskIds.push(t.id); }
      }
      Log.add('task.create', `Created task "${t.title}"`);
      Toast.show('📋 Task created.', 'success');
    }
    Store.save();
    Modal.close();
    App.render();
  },

  deleteTask(taskId) {
    const t = Store.data.tasks.find(x => x.id === taskId);
    if (!t) return;
    Store.data.tasks = Store.data.tasks.filter(x => x.id !== taskId);
    Store.data.sprints.forEach(s => { if (s.taskIds) s.taskIds = s.taskIds.filter(id => id !== taskId); });
    Store.save();
    Log.add('task.delete', `Deleted task "${t.title}"`);
    Modal.close();
    Toast.show('🗑️ Task deleted.', 'warning');
    App.render();
  },

  /* ----------------------------------------------------------- SPRINTS VIEW */
  renderSprints() {
    const sprints = Store.data.sprints.slice().sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    const active = sprints.filter(s => s.status === 'Active');
    const roadmap = Store.data.sprints.slice().sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:8px">
        <span class="pill pill-success">${active.length} active</span>
        <span class="pill pill-warning">${sprints.filter(s => s.status === 'Planned').length} planned</span>
        <span class="pill pill-info">${sprints.filter(s => s.status === 'Completed').length} completed</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Work.openSprintModal()">➕ New Sprint</button>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><div class="card-title">🗺️ Studio Roadmap</div></div>
      ${roadmap.length ? `
      <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:6px">
        ${roadmap.map(s => {
          const p = Widgets.sprintProgress(s);
          return `<div style="min-width:265px;background:var(--bg-elevated);border:1px solid ${s.status === 'Active' ? 'var(--accent)' : 'var(--border-subtle)'};border-radius:var(--radius-md);padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <strong style="font-size:13.5px">${Utils.esc(s.name)}</strong>
              <span class="pill ${s.status === 'Active' ? 'pill-success' : s.status === 'Completed' ? 'pill-info' : 'pill-warning'}">${s.status}</span>
            </div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:8px">${Utils.fmtDate(s.startDate)} → ${Utils.fmtDate(s.endDate)}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;min-height:34px">${Utils.esc(s.goal || '')}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:6px">
              <span>${(s.taskIds || []).length} tasks</span><span>${p}%</span>
            </div>
          </div>`;
        }).join('')}
      </div>` : '<div style="color:var(--text-muted);font-size:13px">No sprints yet — create the first milestone to start planning releases.</div>'}
    </div>

    ${sprints.map(s => {
      const tasks = Store.data.tasks.filter(t => (s.taskIds || []).includes(t.id) || t.sprintId === s.id);
      const p = Widgets.sprintProgress(s);
      const done = tasks.filter(t => t.status === 'Done').length;
      return `<div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <div class="card-title">🚀 ${Utils.esc(s.name)}
            <span class="pill ${s.status === 'Active' ? 'pill-success' : s.status === 'Completed' ? 'pill-info' : 'pill-warning'}">${s.status}</span>
            <span style="font-size:11.5px;color:var(--text-muted);font-weight:500">${Utils.fmtDate(s.startDate)} → ${Utils.fmtDate(s.endDate)}</span>
          </div>
          <div style="display:flex;gap:6px">
            ${s.status !== 'Active' ? `<button class="btn btn-success btn-xs" onclick="Work.setSprintStatus('${s.id}','Active')">▶ Start</button>` : `<button class="btn btn-secondary btn-xs" onclick="Work.setSprintStatus('${s.id}','Completed')">✔ Complete</button>`}
            <button class="btn btn-secondary btn-xs" onclick="Work.openSprintModal('${s.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="Work.deleteSprint('${s.id}')">Delete</button>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${Utils.esc(s.goal || 'No goal set.')}</div>
        <div class="progress-track" style="margin-bottom:10px"><div class="progress-fill" style="width:${p}%"></div></div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${done}/${tasks.length} tasks complete · ${p}%</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${tasks.length ? tasks.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;background:var(--bg-elevated);border-radius:var(--radius-md);font-size:12.5px">
              <div style="display:flex;align-items:center;gap:9px;overflow:hidden">
                <span style="color:${t.status === 'Done' ? 'var(--success)' : 'var(--text-muted)'}">${t.status === 'Done' ? '✔' : '○'}</span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="Work.openTaskModal('${t.id}')">${Utils.esc(t.title)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                ${Work.priorityPill(t.priority)}
                ${Work.userChip(t.assigneeId, 22)}
              </div>
            </div>`).join('') : `<div style="font-size:12px;color:var(--text-muted)">No tasks linked to this sprint yet.</div>`}
        </div>
      </div>`;
    }).join('') || `<div class="card" style="text-align:center;padding:44px">
      <div style="font-size:38px;margin-bottom:10px">🚀</div>
      <div style="font-weight:700;margin-bottom:6px">No sprints yet</div>
      <div style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Plan your first SCRAPPED studio sprint to group tasks into a milestone.</div>
      <button class="btn btn-primary" onclick="Work.openSprintModal()">Create First Sprint</button>
    </div>`}`;
  },

  openSprintModal(sprintId) {
    const s = sprintId ? Store.data.sprints.find(x => x.id === sprintId) : null;
    const today = new Date().toISOString().slice(0, 10);
    const inTwoWeeks = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    Modal.open(`
      <div class="modal-header"><div class="modal-title">${s ? '✏️ Sprint' : '➕ New Sprint'}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Sprint name *</label>
          <input class="form-input" id="sp-name" value="${s ? Utils.esc(s.name) : ''}" placeholder="Sprint 4 — Combat Polish" /></div>
        <div class="form-group"><label class="form-label">Goal / milestone</label>
          <textarea class="form-textarea" id="sp-goal" placeholder="What ships at the end of this sprint?">${s ? Utils.esc(s.goal || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Start date</label>
            <input class="form-input" id="sp-start" type="date" value="${s ? (s.startDate || today) : today}" /></div>
          <div class="form-group"><label class="form-label">End date</label>
            <input class="form-input" id="sp-end" type="date" value="${s ? (s.endDate || inTwoWeeks) : inTwoWeeks}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" id="sp-status">
            ${['Planned', 'Active', 'Completed', 'On Hold'].map(st => `<option value="${st}" ${s && s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Tasks in this sprint</label>
          <div style="max-height:210px;overflow:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px">
            ${Store.data.tasks.length ? Store.data.tasks.map(t => `<label style="display:flex;align-items:center;gap:9px;font-size:12.5px;padding:5px 0">
              <input type="checkbox" class="sp-task" value="${t.id}" ${s && (s.taskIds || []).includes(t.id) ? 'checked' : ''} />
              <span style="flex:1">${Utils.esc(t.title)}</span>
              <span class="pill" style="font-size:10px;padding:1px 6px;background:var(--bg-base);color:var(--text-secondary)">${t.status}</span>
            </label>`).join('') : '<span style="font-size:12px;color:var(--text-muted)">No tasks available — create tasks on the Kanban board first.</span>'}
          </div></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Work.saveSprint('${s ? s.id : ''}')">${s ? 'Save Sprint' : 'Create Sprint'}</button>
      </div>`);
  },

  saveSprint(sprintId) {
    const name = document.getElementById('sp-name').value.trim();
    if (!name) return Toast.show('⚠️ Sprint name is required.', 'warning');
    const taskIds = Array.from(document.querySelectorAll('.sp-task:checked')).map(c => c.value);
    const data = {
      name,
      goal: document.getElementById('sp-goal').value.trim(),
      startDate: document.getElementById('sp-start').value,
      endDate: document.getElementById('sp-end').value,
      status: document.getElementById('sp-status').value,
      taskIds
    };
    if (sprintId) {
      const s = Store.data.sprints.find(x => x.id === sprintId);
      Object.assign(s, data);
      Log.add('sprint.update', `Updated sprint "${s.name}"`);
      Toast.show('✅ Sprint saved.', 'success');
    } else {
      Store.data.sprints.push(Object.assign({ id: Utils.uid('sprint'), createdAt: Utils.now(), createdBy: Auth.currentUserId() }, data));
      Log.add('sprint.create', `Created sprint "${name}"`);
      Toast.show('🚀 Sprint created.', 'success');
    }
    Store.data.tasks.forEach(t => {
      if (taskIds.includes(t.id)) {
        const s = Store.data.sprints.find(x => x.id === sprintId) || Store.data.sprints[Store.data.sprints.length - 1];
        t.sprintId = s ? s.id : null;
      } else if (t.sprintId === sprintId) t.sprintId = null;
    });
    Store.save();
    Modal.close();
    App.render();
  },

  setSprintStatus(sprintId, status) {
    const s = Store.data.sprints.find(x => x.id === sprintId);
    if (!s) return;
    s.status = status;
    Store.save();
    Log.add('sprint.status', `Sprint "${s.name}" is now ${status}`);
    Toast.show(`🚀 ${Utils.esc(s.name)} → ${status}`, 'success');
    App.render();
  },

  deleteSprint(sprintId) {
    const s = Store.data.sprints.find(x => x.id === sprintId);
    if (!s) return;
    Store.data.sprints = Store.data.sprints.filter(x => x.id !== sprintId);
    Store.data.tasks.forEach(t => { if (t.sprintId === sprintId) t.sprintId = null; });
    Store.save();
    Log.add('sprint.delete', `Deleted sprint "${s.name}"`);
    Toast.show('🗑️ Sprint deleted.', 'warning');
    App.render();
  },

  /* -------------------------------------------------------------- BUGS VIEW */
  renderBugs() {
    let bugs = Store.data.bugs.slice();
    if (Work.bugFilterStatus !== 'all') bugs = bugs.filter(b => b.status === Work.bugFilterStatus);
    bugs.sort((a, b) => {
      const sev = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0) || (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const bs = Analytics.bugStats();

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">
      <div class="card"><div class="kpi-subtext">Total reported</div><div class="kpi-value">${bs.total}</div></div>
      <div class="card"><div class="kpi-subtext">Open</div><div class="kpi-value" style="color:var(--warning)">${bs.open}</div></div>
      <div class="card"><div class="kpi-subtext">Critical open</div><div class="kpi-value" style="color:var(--danger)">${bs.critical}</div></div>
      <div class="card"><div class="kpi-subtext">Resolved</div><div class="kpi-value" style="color:var(--success)">${bs.resolved}</div></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <select class="form-select" style="width:200px" onchange="Work.bugFilterStatus=this.value; App.render()">
        <option value="all">All statuses</option>
        ${BUG_STATUSES.map(s => `<option value="${s}" ${Work.bugFilterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-sm" onclick="Work.openBugModal()">🐛 Report Bug</button>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Bug</th><th>Severity</th><th>Status</th><th>Assignee</th><th>Reporter</th><th>Age</th><th style="width:200px">Actions</th></tr></thead>
        <tbody>
        ${bugs.length ? bugs.map(b => `
          <tr>
            <td>
              <div style="font-weight:700">${Utils.esc(b.title)}</div>
              <div style="font-size:11.5px;color:var(--text-muted);max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.esc(b.description || '')}</div>
            </td>
            <td><span class="pill ${b.severity === 'Critical' ? 'pill-danger' : b.severity === 'High' ? 'pill-warning' : b.severity === 'Medium' ? 'pill-info' : ''}" ${b.severity === 'Low' ? 'style="background:var(--bg-base);color:var(--text-secondary)"' : ''}>${Utils.esc(b.severity)}</span></td>
            <td><select class="form-select" style="padding:4px 8px;font-size:12px" onchange="Work.setBugStatus('${b.id}',this.value)">
              ${BUG_STATUSES.map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td>${Work.userChip(b.assigneeId, 22)}</td>
            <td style="font-size:12px;color:var(--text-secondary)">${Utils.esc((Auth.user(b.reporterId) || {}).displayName || 'Unknown')}</td>
            <td style="font-size:12px;color:var(--text-muted)">${Utils.timeAgo(b.createdAt)}</td>
            <td><div style="display:flex;gap:5px">
              <button class="btn btn-secondary btn-xs" onclick="Work.openBugModal('${b.id}')">Edit</button>
              <button class="btn btn-success btn-xs" onclick="Work.setBugStatus('${b.id}','Closed')">Close</button>
              <button class="btn btn-danger btn-xs" onclick="Work.deleteBug('${b.id}')">Delete</button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;padding:34px;color:var(--text-muted)">
            No bugs reported. Playtesting going well. 🎉</td></tr>`}
        </tbody>
      </table>
    </div>`;
  },

  openBugModal(bugId) {
    const b = bugId ? Store.data.bugs.find(x => x.id === bugId) : null;
    Modal.open(`
      <div class="modal-header"><div class="modal-title">${b ? '✏️ Bug Report' : '🐛 Report Bug'}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Title *</label>
          <input class="form-input" id="bg-title" value="${b ? Utils.esc(b.title) : ''}" placeholder="Player clips through wall on Level 3" /></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea class="form-textarea" id="bg-desc" placeholder="What happens, expected behaviour, logs…">${b ? Utils.esc(b.description || '') : ''}</textarea></div>
        <div class="form-group"><label class="form-label">Steps to reproduce</label>
          <textarea class="form-textarea" id="bg-steps" placeholder="1. Load Level 3&#10;2. Sprint into east wall&#10;3. Clip through">${b ? Utils.esc(b.steps || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Severity</label>
            <select class="form-select" id="bg-severity">${SEVERITIES.map(s => `<option value="${s}" ${b && b.severity === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="bg-status">${BUG_STATUSES.map(s => `<option value="${s}" ${b && b.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Assignee (dev fixing it)</label>
            <select class="form-select" id="bg-assignee"><option value="">— Unassigned —</option>
              ${Store.data.users.filter(u => u.active).map(u => `<option value="${u.id}" ${b && b.assigneeId === u.id ? 'selected' : ''}>${Utils.esc(u.displayName)}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Build / version found in</label>
            <input class="form-input" id="bg-build" value="${b ? Utils.esc(b.build || '') : 'v' + APP_VERSION}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Platform / environment</label>
          <input class="form-input" id="bg-env" value="${b ? Utils.esc(b.environment || '') : 'Windows 11 · Steam build'}" /></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Work.saveBug('${b ? b.id : ''}')">${b ? 'Save Bug' : 'File Bug Report'}</button>
      </div>`);
  },

  saveBug(bugId) {
    const title = document.getElementById('bg-title').value.trim();
    if (!title) return Toast.show('⚠️ Bug title is required.', 'warning');
    const data = {
      title,
      description: document.getElementById('bg-desc').value.trim(),
      steps: document.getElementById('bg-steps').value.trim(),
      severity: document.getElementById('bg-severity').value,
      status: document.getElementById('bg-status').value,
      assigneeId: document.getElementById('bg-assignee').value || null,
      build: document.getElementById('bg-build').value.trim(),
      environment: document.getElementById('bg-env').value.trim()
    };
    if (bugId) {
      const b = Store.data.bugs.find(x => x.id === bugId);
      const wasOpen = b.status !== 'Closed';
      Object.assign(b, data);
      if (data.status === 'Closed' && wasOpen) {
        const u = Auth.user(b.assigneeId);
        if (u) u.xp = (u.xp || 0) + (Store.data.settings.xpPerBugFixed || 15);
      }
      Log.add('bug.update', `Updated bug "${b.title}"`);
      Toast.show('✅ Bug updated.', 'success');
    } else {
      Store.data.bugs.push(Object.assign({
        id: Utils.uid('bug'), reporterId: Auth.currentUserId(), createdAt: Utils.now()
      }, data));
      Log.add('bug.create', `Reported bug "${title}" (${data.severity})`);
      Toast.show('🐛 Bug filed.', 'success');
    }
    Store.save();
    Modal.close();
    App.render();
  },

  setBugStatus(bugId, status) {
    const b = Store.data.bugs.find(x => x.id === bugId);
    if (!b) return;
    const wasOpen = b.status !== 'Closed';
    b.status = status;
    if (status === 'Closed') {
      b.resolvedAt = Utils.now();
      if (wasOpen) {
        const u = Auth.user(b.assigneeId);
        if (u) {
          const xp = Store.data.settings.xpPerBugFixed || 15;
          u.xp = (u.xp || 0) + xp;
          Toast.show(`🐛 Bug closed — <strong>${Utils.esc(u.displayName)}</strong> earned +${xp} XP.`, 'success');
        } else Toast.show('🐛 Bug closed.', 'success');
      }
    }
    Log.add('bug.status', `Bug "${b.title}" → ${status}`);
    Store.save();
    App.render();
  },

  deleteBug(bugId) {
    const b = Store.data.bugs.find(x => x.id === bugId);
    if (!b) return;
    Store.data.bugs = Store.data.bugs.filter(x => x.id !== bugId);
    Store.save();
    Log.add('bug.delete', `Deleted bug "${b.title}"`);
    Toast.show('🗑️ Bug deleted.', 'warning');
    App.render();
  },

  /* ------------------------------------------------------- CODE VAULT VIEW */
  renderVault() {
    const canEdit = Auth.can('editCodeVault');
    let snips = Store.data.snippets.slice();
    if (Work.vaultFilterLang !== 'all') snips = snips.filter(s => s.language === Work.vaultFilterLang);
    if (Work.vaultSearch) {
      const q = Work.vaultSearch.toLowerCase();
      snips = snips.filter(s => (s.title + s.code + (s.description || '') + (s.tags || []).join('')).toLowerCase().includes(q));
    }
    snips.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    const cv = Analytics.codeVaultStats();

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="search-box" style="width:250px">
          <span class="search-box-icon">🔍</span>
          <input type="text" placeholder="Search snippets…" value="${Utils.esc(Work.vaultSearch)}" oninput="Work.vaultSearch=this.value; App.render(true)" />
        </div>
        <select class="form-select" style="width:180px" onchange="Work.vaultFilterLang=this.value; App.render()">
          <option value="all">All languages (${cv.total})</option>
          ${LANGUAGES.map(l => `<option value="${l}" ${Work.vaultFilterLang === l ? 'selected' : ''}>${l} (${cv.languages[l] || 0})</option>`).join('')}
        </select>
      </div>
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="Work.openSnippetModal()">➕ New Snippet</button>` : '<span class="pill pill-warning">Read-only rank</span>'}
    </div>

    ${snips.length ? snips.map(s => `
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <div>
            <div class="card-title">💻 ${Utils.esc(s.title)}
              <span class="pill pill-accent">${Utils.esc(s.language || 'Other')}</span></div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">
              by ${Utils.esc((Auth.user(s.authorId) || {}).displayName || 'unknown')} · updated ${Utils.timeAgo(s.updatedAt || s.createdAt)}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-xs" onclick="App.copyText(decodeURIComponent('${encodeURIComponent(s.code || '')}'))">📋 Copy</button>
            ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="Work.openSnippetModal('${s.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="Work.deleteSnippet('${s.id}')">Delete</button>` : ''}
          </div>
        </div>
        ${s.description ? `<div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px">${Utils.esc(s.description)}</div>` : ''}
        <div class="code-block" style="max-height:320px;overflow:auto">${Utils.esc((s.code || '').slice(0, 4000))}${(s.code || '').length > 4000 ? '\n… (truncated in preview)' : ''}</div>
        <div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">
          ${(s.tags || []).map(t => `<span class="pill pill-info" style="font-size:10.5px">${Utils.esc(t)}</span>`).join('')}
        </div>
      </div>`).join('') : `<div class="card" style="text-align:center;padding:44px">
        <div style="font-size:38px;margin-bottom:10px">💻</div>
        <div style="font-weight:700;margin-bottom:6px">The Code Vault is empty</div>
        <div style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;max-width:460px;margin-left:auto;margin-right:auto">
          Store reusable SCRAPPED code — shaders, combat helpers, netcode utilities, level tooling. Every snippet you add earns XP and is available to the whole studio.</div>
        ${canEdit ? `<button class="btn btn-primary" onclick="Work.openSnippetModal()">Add First Snippet</button>` : ''}
      </div>`}`;
  },

  openSnippetModal(snippetId) {
    const s = snippetId ? Store.data.snippets.find(x => x.id === snippetId) : null;
    Modal.open(`
      <div class="modal-header"><div class="modal-title">${s ? '✏️ Snippet' : '💻 New Code Snippet'}</div>
        <button class="btn btn-secondary btn-sm" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Title *</label>
            <input class="form-input" id="sn-title" value="${s ? Utils.esc(s.title) : ''}" placeholder="Wall-run velocity clamp" /></div>
          <div class="form-group"><label class="form-label">Language</label>
            <select class="form-select" id="sn-lang">
              ${LANGUAGES.map(l => `<option value="${l}" ${s && s.language === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label>
          <input class="form-input" id="sn-desc" value="${s ? Utils.esc(s.description || '') : ''}" placeholder="What it does and where to use it" /></div>
        <div class="form-group"><label class="form-label">Code *</label>
          <textarea class="form-textarea" id="sn-code" style="font-family:var(--font-mono);font-size:12.5px;min-height:220px" placeholder="// your code here">${s ? Utils.esc(s.code || '') : ''}</textarea></div>
        <div class="form-group"><label class="form-label">Tags (comma separated)</label>
          <input class="form-input" id="sn-tags" value="${s ? Utils.esc((s.tags || []).join(', ')) : ''}" placeholder="movement, physics" /></div>
      </div>
      <div class="modal-footer">
        <span style="font-size:11.5px;color:var(--text-muted)">Adding a snippet awards ${Store.data.settings.xpPerSnippet} XP to the author.</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button class="btn btn-primary" onclick="Work.saveSnippet('${s ? s.id : ''}')">${s ? 'Save Snippet' : 'Add to Vault'}</button>
        </div>
      </div>`);
  },

  saveSnippet(snippetId) {
    const title = document.getElementById('sn-title').value.trim();
    const code = document.getElementById('sn-code').value;
    if (!title) return Toast.show('⚠️ Snippet title is required.', 'warning');
    if (!code.trim()) return Toast.show('⚠️ Snippet code cannot be empty.', 'warning');
    const data = {
      title, code,
      language: document.getElementById('sn-lang').value,
      description: document.getElementById('sn-desc').value.trim(),
      tags: document.getElementById('sn-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: Utils.now()
    };
    if (snippetId) {
      const s = Store.data.snippets.find(x => x.id === snippetId);
      Object.assign(s, data);
      Log.add('vault.update', `Updated snippet "${s.title}"`);
      Toast.show('✅ Snippet saved.', 'success');
    } else {
      Store.data.snippets.push(Object.assign({ id: Utils.uid('snip'), authorId: Auth.currentUserId(), createdAt: Utils.now() }, data));
      const me = Auth.current();
      if (me) me.xp = (me.xp || 0) + (Store.data.settings.xpPerSnippet || 5);
      Log.add('vault.create', `Added snippet "${title}" to the Code Vault`);
      Toast.show('💻 Snippet added to the SCRAPPED Code Vault.', 'success');
    }
    Store.save();
    Modal.close();
    App.render();
  },

  deleteSnippet(snippetId) {
    const s = Store.data.snippets.find(x => x.id === snippetId);
    if (!s) return;
    Store.data.snippets = Store.data.snippets.filter(x => x.id !== snippetId);
    Store.save();
    Log.add('vault.delete', `Deleted snippet "${s.title}"`);
    Toast.show('🗑️ Snippet deleted.', 'warning');
    App.render();
  }
};
