# SCRAPPED Connect

**The serverless studio operating system for [SCRAPPED studio](https://github.com/Dinomax2005).**
Accounts, rank hierarchy, developer ranking, custom company dashboards, tasks, sprints,
bugs and a shared code vault — **with no server to run, and no monthly bill.**

- 🧙‍♂️ **Six-step Setup Wizard** — creates the workspace and makes *your* first account the **Founder** (level 7 owner).
- 👥 **Account management** — create, edit, disable and delete developer accounts; the Founder controls everything.
- 👑 **Rank hierarchy & reranking** — 7 default SCRAPPED ranks with editable permissions, plus bulk rerank, promotion helper and a live ranking board.
- 📊 **Company dashboards** — three built-in studio dashboards plus a widget builder (KPI rows, charts, ranking boards, activity feeds, notes) with rank-restricted visibility.
- 💻 **Programming suite** — Kanban task board, sprint roadmap, bug/issue tracker with severities, and the SCRAPPED Code Vault.
- ☁️ **Serverless team sync** — optional GitHub-repo-as-a-database so every workstation shares one workspace without hosting anything.
- 🔄 **Auto-updater** — checks the GitHub releases of this repository and updates the installed app automatically.
- 📴 **Offline-first** — a PWA + desktop app that keeps working with no internet; data lives in local storage and a real file on disk.

---

## 1. Install it

### Option A — Live web app (fastest, no install)

Open the studio link that was shared with you, then use your browser's
**Install app** button (Chrome/Edge address bar) to pin it as a desktop app.
Everything runs locally in your browser — the PWA service worker makes it work offline.

### Option B — Windows desktop app (recommended for your workstation)

1. Open **Releases** → [`Dinomax2005/scrapped-connect-releases`](https://github.com/Dinomax2005/scrapped-connect-releases/releases)
2. Download **`SCRAPPED-Connect-Setup.exe`**
3. Run it — the setup wizard installs the app, creates your shortcuts and enables the auto-updater.

> The installer is produced automatically by the **Build Windows Installer** GitHub Actions
> workflow (`.github/workflows/build-windows.yml`). Every developer downloads the same file.

### Option C — Portable ZIP

Download `SCRAPPED-Connect-Portable.zip` (from Releases, or from the running host at
`/download/SCRAPPED-Connect-Portable.zip`) and either run `src/index.html` directly or
start the tiny local host:

```bash
node server.js          # then open http://localhost:3000
```

---

## 2. First run — the Setup Wizard

The wizard appears the first time the app starts and walks through:

| Step | What it does |
| --- | --- |
| 1. Studio | Studio name + logo initials used across the UI |
| 2. Founder | Creates **your** account — the *first* account always becomes the **Founder (level 7)** with full permissions |
| 3. Recovery | Security question so the master password can be reset locally (no server needed) |
| 4. Cloud Sync | Optional GitHub sync so your team shares one workspace |
| 5. Content | Creates the three studio dashboards and (optionally) sample accounts/work items |
| 6. Finish | You land on **Company Dashboards** as the Founder |

Afterwards, everything is editable in-app: **Studio Settings**, **Accounts & Rerank**,
**Rank Hierarchy**, and the dashboard builder.

---

## 3. Running the studio

| Area | Where | Highlights |
| --- | --- | --- |
| Company Dashboards | Sidebar → *Company Dashboards* | 3 built-in templates + custom dashboards, widgets, CSV export |
| Accounts | *Accounts & Rerank* | Create/edit accounts, temp passwords, disable, delete, activity log |
| Reranking | *Accounts & Rerank* / *Rank Hierarchy* | Per-dev rerank, bulk rerank, promotion helper, permission matrix |
| Tasks | *Task & Kanban Board* | Drag & drop across Backlog → Done, priority, tags, estimates |
| Sprints | *Sprints & Roadmap* | Milestones, progress bars, task linking, status transitions |
| Bugs | *Bug & Issue Tracker* | Severity, statuses, reproduction steps, build/environment |
| Code Vault | *SCRAPPED Code Vault* | Shared snippets by language, tags, copy-to-clipboard |
| Sync | *Serverless Sync* | GitHub repo as datastore, push/pull, connection tester |
| Updates | *Updater & Setup .EXE* | Version check, one-click update, backup/restore, release publishing guide |

**Ranking:** closing a task, fixing a bug or adding a snippet awards XP
(configurable in *Studio Settings*). The leaderboard, rank positions and the promotion
helper all recompute instantly. Only the Founder can change *who* holds which rank.

---

## 4. Serverless team sync (optional)

No server, no hosting: **your own GitHub repository is the database.**

1. Open *Serverless Sync* → paste `owner/repo`, a branch, the data path and a
   **fine-grained personal access token** with *Contents: Read and write*.
2. Press **Test Connection**, then **Push Now** to create the shared workspace.
3. Each developer installs the same app, enters the same repo/branch/path/token and presses
   **Pull Now** — then logs in with the account you created for them.

The token stays on each machine and is stripped from the synced payload, so teammates never
receive your credentials. See [`docs/TEAM-SYNC.md`](docs/TEAM-SYNC.md).

---

## 5. Updates

* Updater & Setup .EXE → **Check for Updates** reads the newest release from this repository.
* Desktop build: downloads `SCRAPPED-Connect-Setup.exe`, runs it and restarts automatically — studio data is preserved.
* Web/PWA build: clears the cache and reloads the newest build.
* Publish a new version by pushing a tag: `npm version patch && git push --follow-tags`
  → GitHub Actions builds the installer, attaches it to the release, and every installed
  copy updates itself.

Details: [`docs/UPDATES.md`](docs/UPDATES.md).

---

## 6. Development

```bash
node server.js                      # local host + download endpoints (no dependencies)
npm install                         # only needed for desktop builds
npm run dev                         # launch the Electron desktop shell
npm run build:win                   # build release/SCRAPPED-Connect-Setup.exe
npx electron-builder --win --publish never --config electron-builder.yml
npm install --no-save jsdom && node tools/smoke-test.js   # headless app test suite
```

### Project structure

```
src/                    web/PWA app (also the renderer inside the desktop shell)
  core.js               store, crypto/PBKDF2, permissions, sync engine, updater engine
  views-dash.js         dashboards + widget system
  views-team.js         accounts, reranking, rank hierarchy
  views-work.js         tasks, sprints, bugs, code vault
  views-system.js       setup wizard, sync UI, updater UI, settings
  app.js                shell, router, auth screens, bootstrap
desktop/                Electron main process, preload bridge, GitHub auto-updater
build/                  icon, NSIS extras, installer setup guide
server.js               zero-dependency local host: web build + /download + /api/updates
electron-builder.yml    Windows packaging (NSIS setup wizard + portable build)
tools/smoke-test.js     headless end-to-end test of the whole app
```

### Security notes

* Passwords are hashed with **PBKDF2-SHA256** (120,000 iterations via WebCrypto, JS fallback for `file://`).
* Security answers are stored as salted HMAC hashes.
* The GitHub token never leaves the device and is removed from the synced workspace file.
* All rendering escapes user input (`Utils.esc`) to prevent HTML injection.

---

© SCRAPPED studio — built for organizing, ranking and shipping together.
