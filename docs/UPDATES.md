# Updates

Lately is a static website/PWA. Pushing an update to the active deployment branch runs `.github/workflows/deploy-pages.yml`, which publishes the contents of `src/` and the refreshed `lately-website.zip` to GitHub Pages. The service worker checks the app shell on the next visit.

Live site: <https://dinomax2005.github.io/scrapped-connect-releases/>. Download: <https://dinomax2005.github.io/scrapped-connect-releases/lately-website.zip>.

The Electron auto-updater and release workflow in this repository were written for the earlier SCRAPPED Connect desktop tool. They are retained as legacy files and do not describe a supported Lately desktop release.
