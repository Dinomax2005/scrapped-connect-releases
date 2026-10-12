# Updates & releases

SCRAPPED Connect ships its own updater. There is no update server — **GitHub Releases is the
update feed.**

## How a client updates itself

1. On launch (and whenever you press *Check for Updates*) the app reads
   `https://api.github.com/repos/Dinomax2005/scrapped-connect-releases/releases`, ignoring drafts.
2. The newest stable tag is compared with the installed version.
3. If it is newer:
   * **Desktop app** — downloads `SCRAPPED-Connect-Setup.exe` from the release, runs it
     (the NSIS installer upgrades in place) and restarts the app. Studio data is untouched.
   * **Web/PWA** — clears the service-worker cache and reloads the newest build.
4. In *Updater & Setup .EXE* you can enable **install updates automatically**.

## Publishing a new version

```bash
# 1. bump the version (single source of truth)
npm version patch        # or minor / major  → commits + creates tag vX.Y.Z

# 2. push the tag — GitHub Actions does the rest
git push --follow-tags
```

The **Build Windows Installer & Publish Release** workflow then:

1. installs Electron + electron-builder on a Windows runner,
2. builds `release/SCRAPPED-Connect-Setup.exe` (NSIS wizard) and the portable build,
3. attaches both to a GitHub release for that tag with auto-generated notes.

Every installed copy of SCRAPPED Connect — Founder and developers alike — sees the new
release and updates itself. No manual downloads, no uninstall first.

## Preview a build without releasing

Actions → *Build Windows Installer & Publish Release* → **Run workflow**. The installers
appear under the run's *Artifacts* and no release is published.

## Version rules

* Tags must look like `v1.0.0`, `v1.2.3` — they are compared component by component.
* Bump `package.json` (and the app banner) so the comparison is meaningful.
* Use draft releases for testing: drafts are ignored by the updater.
