/* ============================================================================
 * SCRAPPED Connect — Auto-Updater
 * Reads the newest release from GitHub Releases of Dinomax2005/scrapped-connect-releases,
 * downloads the Windows installer and silently upgrades the installed copy.
 * No SCRAPPED server is involved — GitHub itself is the update feed.
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');

const OWNER = 'Dinomax2005';
const REPO = 'scrapped-connect-releases';
const RELEASES_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=30`;
const RELEASES_PAGE = `https://github.com/${OWNER}/${REPO}/releases`;

function parseVersion(v) {
  return String(v || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'SCRAPPED-Connect-Updater', 'Accept': 'application/vnd.github+json' },
      timeout: 20000
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`GitHub responded ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Update check timed out')); });
    req.on('error', reject);
  });
}

/** Streams a file to disk following GitHub's redirect to the asset CDN. */
function download(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl, depth) => {
      if (depth > 6) return reject(new Error('Too many redirects while downloading the update'));
      https.get(currentUrl, { headers: { 'User-Agent': 'SCRAPPED-Connect-Updater' }, timeout: 60000 }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return follow(res.headers.location, depth + 1);
        }
        if (res.statusCode >= 400) { res.resume(); return reject(new Error(`Download failed with status ${res.statusCode}`)); }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const out = fs.createWriteStream(dest);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress) onProgress(total ? Math.round((received / total) * 100) : 0, received, total);
        });
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve(dest)));
        out.on('error', reject);
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url, 0);
  });
}

function pickAsset(release) {
  const assets = (release && release.assets) || [];
  const patterns = [/setup.*\.exe$/i, /installer.*\.exe$/i, /\.exe$/i, /portable.*\.zip$/i, /\.zip$/i];
  for (const re of patterns) {
    const found = assets.find((a) => re.test(a.name));
    if (found) return found;
  }
  return null;
}

const autoUpdater = {
  /** Checks GitHub for a newer release. Never throws — returns { ok, error }. */
  async check(opts) {
    const options = opts || {};
    const currentVersion = options.currentVersion || '0.0.0';
    try {
      const releases = await httpGetJson(RELEASES_API);
      const list = Array.isArray(releases) ? releases.filter((r) => !r.draft && !r.prerelease) : [];
      if (!list.length) {
        return { ok: true, updateAvailable: false, currentVersion, latestVersion: currentVersion, notes: '', message: 'No published releases yet.' };
      }
      list.sort((a, b) => compareVersions(b.tag_name, a.tag_name));
      const latest = list[0];
      const latestVersion = String(latest.tag_name || '').replace(/^v/i, '');
      const available = compareVersions(latestVersion, currentVersion) > 0;
      const asset = pickAsset(latest);
      return {
        ok: true,
        updateAvailable: available,
        currentVersion,
        latestVersion,
        latestName: latest.name || latest.tag_name,
        notes: latest.body || '',
        publishedAt: latest.published_at,
        htmlUrl: latest.html_url || RELEASES_PAGE,
        prerelease: !!latest.prerelease,
        assets: (latest.assets || []).map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url, downloads: a.download_count })),
        asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size } : null
      };
    } catch (err) {
      return { ok: false, error: err.message, currentVersion, releasesUrl: RELEASES_PAGE };
    }
  },

  /** Downloads and installs the newest release, then restarts the app. */
  async apply(opts) {
    const options = opts || {};
    const { app } = require('electron');
    const info = options.release || await autoUpdater.check({ currentVersion: app.getVersion() });
    if (!info.ok) return { ok: false, error: info.error, releaseUrl: RELEASES_PAGE };
    if (!info.updateAvailable) return { ok: false, error: 'Already running the newest version.', releaseUrl: RELEASES_PAGE };
    if (!info.asset) return { ok: false, error: 'The newest release has no downloadable installer yet.', releaseUrl: info.htmlUrl };

    const tmpDir = path.join(os.tmpdir(), `scrapped-update-${info.latestVersion}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const target = path.join(tmpDir, info.asset.name);

    try {
      await download(info.asset.url, target, options.onProgress);
    } catch (err) {
      return { ok: false, error: err.message, releaseUrl: info.htmlUrl };
    }

    const exePath = process.execPath;
    const isExe = /\.exe$/i.test(info.asset.name);

    if (isExe) {
      // A proper installer: run it hidden and let it upgrade in place, then relaunch.
      const escapedTarget = target.replace(/"/g, '""');
      await new Promise((resolve) => setTimeout(resolve, 400));
      const child = spawn(target, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
      setTimeout(() => { app.relaunch(); app.exit(0); }, 1200);
      return { ok: true, installed: target, version: info.latestVersion, mode: 'installer', note: `Running ${escapedTarget}` };
    }

    // No installer asset — fall back to the release page so the user can update manually.
    return { ok: false, error: `Release asset "${info.asset.name}" is not a Windows installer.`, releaseUrl: info.htmlUrl };
  }
};

module.exports = { autoUpdater, compareVersions, RELEASES_PAGE, OWNER, REPO };
