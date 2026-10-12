# Serverless team sync

SCRAPPED Connect has **no backend**. When you want your developers to share one workspace,
you point the app at a GitHub repository you control and it stores the whole studio as a
single JSON file. GitHub Free is enough — no hosting, no database, no SCRAPPED server.

## 1. Prepare the repository

Create (or reuse) a private repository, for example `scrapped-studio/workspace`.
The app writes to `data/scrapped-connect.json` on a branch of your choice
(default `connect-data`, auto-created on first push).

## 2. Create a fine-grained token

1. `github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens`
2. Token name: `SCRAPPED Connect`
3. Repository access: **only** your studio repository
4. Permissions → Repository → **Contents: Read and write**
5. Generate and copy the token.

## 3. Configure the Founder machine

*Serverless Sync* → fill in repo, branch, path, token → **🔌 Test Connection** →
**💾 Save Sync Settings** → **⬆ Push Now**.

The first push creates the branch and the workspace file. A green badge in the sidebar means
the workspace is in sync.

## 4. Onboard every developer

Each developer:

1. installs the same app (installer or portable zip),
2. opens *Serverless Sync* and enters the same repo / branch / path / token,
3. presses **⬇ Pull Now**,
4. signs in with the account the Founder created for them.

## How it behaves

* **Auto-push** commits local changes after 3.5 seconds of quiet time.
* **Auto-pull** fetches the remote workspace every N minutes (default 5) and after sign-in.
* Newest change wins; the remote revision number is shown in the sync view.
* Your token is stored only on your machine and is **stripped** from the uploaded payload,
  so it can never leak to teammates through the shared file.
* Turn sync off at any time with **⛔ Disable Sync** — the workspace stays on the device.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Bad credentials` | Token expired or wrong — generate a new one |
| `Resource not accessible by integration` / 403 | Token lacks *Contents: Read and write* on that repo |
| `branch "connect-data" does not exist yet` | Expected on a fresh repo — the first push creates it |
| Pull says "No remote workspace" | Nothing has been pushed yet — press **Push Now** on the Founder machine |
| Two people edited at once | Whoever pushes last wins; pull before editing big changes |
