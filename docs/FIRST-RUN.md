# First run — the Setup Wizard, step by step

The wizard opens automatically when no workspace exists (and can be re-run any time from
the sidebar 🧙‍♂️ button or *Studio Settings → Re-run Setup Wizard*).

### Step 1 — Studio
Studio name and logo initials. Shown in the sidebar, the sign-in screen and the window title.

### Step 2 — Founder account
**The first account created is always the Founder.** That account receives the locked
level-7 owner rank: every permission, every dashboard, full account and rank control,
release management and sync configuration.

* Passwords are hashed with PBKDF2-SHA256 before they touch storage.
* Use the 🎲 button for a generated strong master password and store it safely.
* "Force password change on first login" is available when you create *other* accounts.

### Step 3 — Recovery
Set a security question. If you ever forget the master password, the sign-in screen's
**Forgot password?** flow verifies the hashed answer and lets you set a new one — locally,
because there is no server to email you.

### Step 4 — Cloud sync (optional)
Choose **Local only** or **GitHub sync**. GitHub sync turns one of your own repositories
into the shared datastore so the whole studio edits the same workspace. You can always
enable it later in *Serverless Sync*.

### Step 5 — Content
* **Studio dashboards** – Company Overview, Developer Productivity, Release Readiness.
* **Sample data** – two demo developers, a sprint with tasks, two bugs and a snippet, so you
  can see ranking, progress bars and boards in action. Delete them once you add real people.

### Step 6 — Finish
Review the summary and press **🚀 Launch SCRAPPED Connect**. You land on Company Dashboards
as the Founder, and the updater runs its first GitHub release check in the background.

## Right after setup

| Do this | Where |
| --- | --- |
| Create developer accounts | Accounts & Rerank → ➕ Create Account |
| Adjust what a rank can do | Rank Hierarchy → Edit |
| Move a developer to another rank | Accounts & Rerank → rank dropdown, or 🔀 Bulk Rerank |
| See who is performing | Rank Hierarchy → 🎓 Promotion Helper, or the leaderboard widget |
| Build a new dashboard | Company Dashboards → ➕ New Dashboard |
| Share the workspace | Serverless Sync → token + Push Now |
| Install the desktop app | Trackbar / sidebar → 📥 Download Setup .EXE |
