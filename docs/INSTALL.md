# Installing SCRAPPED Connect

Three ways to get the studio running. Pick one per machine.

## A. Installable web app (PWA)

1. Open the host link (for example `https://<your-host>/`).
2. Click the **Install** icon in the address bar (Chrome/Edge) or
   *Menu → Apps → Install this site as an app*.
3. SCRAPPED Connect opens in its own window and keeps working offline.

Data is stored in that browser profile. Use the bottom-right
**📥 Download Setup .EXE** button or *Serverless Sync* to move between devices.

## B. Windows desktop app (recommended)

1. Go to `https://github.com/Dinomax2005/scrapped-connect-releases/releases`.
2. Download **`SCRAPPED-Connect-Setup.exe`** from the newest release.
3. Run it. The setup wizard:
   * lets you choose the install folder,
   * shows the SCRAPPED Connect setup guide,
   * creates Start-menu and desktop shortcuts,
   * asks whether to launch the app when it finishes,
   * on uninstall asks whether to keep your studio data.
4. The app then updates itself from this repository — no manual re-installs.

If no release exists yet, open
`https://github.com/Dinomax2005/scrapped-connect-releases/actions/workflows/build-windows.yml`
and press **Run workflow**. When it finishes, the release and the installer appear automatically.

## C. Portable ZIP

* Download `SCRAPPED-Connect-Portable.zip` from Releases, or from a running host at
  `/download/SCRAPPED-Connect-Portable.zip`.
* Unpack anywhere and either:
  * double-click `src/index.html` (runs the full app straight from disk), or
  * run `node server.js` and open `http://localhost:3000` (also serves the download
    endpoints and lets other machines on your network use the app).

## After installing

1. Let the **Setup Wizard** create the workspace and your Founder account.
2. *Accounts & Rerank → Create Account* for every developer.
3. *Rank Hierarchy* to tune what each rank can do.
4. *Company Dashboards* to build the views your studio actually needs.
5. *Serverless Sync* if you want every workstation to share one workspace.
