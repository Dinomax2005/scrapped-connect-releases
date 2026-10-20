#!/usr/bin/env node
/* ============================================================================
 * SCRAPPED Connect — zero-dependency local host
 *
 *  1. Serves the installable web build (PWA) straight from ./src
 *  2. Provides /download/... endpoints that always give you something real:
 *       - SCRAPPED-Connect-Setup.exe  -> newest Windows installer from GitHub Releases
 *       - SCRAPPED-Connect-Portable.zip -> on-the-fly ZIP of the whole app
 *  3. Proxies the GitHub release feed at /api/updates for the in-app updater
 *
 * Nothing to install: plain Node.js, no dependencies, no SCRAPPED server.
 * ==========================================================================*/
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OWNER = 'Dinomax2005';
const REPO = 'scrapped-connect-releases';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.map': 'application/json; charset=utf-8'
};

/* --------------------------------------------------------- GitHub releases */
let releaseCache = { at: 0, data: null };

function fetchReleases() {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=20`, {
      headers: { 'User-Agent': 'SCRAPPED-Connect-Host', 'Accept': 'application/vnd.github+json' },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`GitHub API responded ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('GitHub API timeout')));
    req.on('error', reject);
  });
}

function compareVersions(a, b) {
  const pa = String(a || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function appVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; }
  catch (e) { return '1.0.0'; }
}

async function getReleases(force) {
  const fresh = Date.now() - releaseCache.at < 60 * 1000;
  if (!force && fresh && releaseCache.data) return releaseCache.data;
  try {
    const data = await fetchReleases();
    releaseCache = { at: Date.now(), data };
    return data;
  } catch (err) {
    return releaseCache.data || { error: err.message };
  }
}

function pickAsset(release, patterns) {
  const assets = (release && release.assets) || [];
  for (const re of patterns) {
    const found = assets.find((a) => re.test(a.name));
    if (found) return found;
  }
  return null;
}

/* ------------------------------------------------- minimal STORE zip writer */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

/** Builds a valid .zip (no compression) from a list of {name, data} entries. */
function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);   // UTF-8 names
    local.writeUInt16LE(0, 8);        // stored
    local.writeUInt16LE(0, 10);       // time
    local.writeUInt16LE(0x2821, 12);  // date (2000-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x2821, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  });

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([Buffer.concat(chunks), centralBuf, end]);
}

function collectFiles(dir, base, out) {
  const skip = new Set(['node_modules', '.git', 'release', 'dist', 'out', '.github']);
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (skip.has(entry.name)) return;
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) collectFiles(full, rel, out);
    else if (entry.isFile()) {
      const stat = fs.statSync(full);
      if (stat.size < 8 * 1024 * 1024) out.push({ name: `SCRAPPED-Connect/${rel}`, data: fs.readFileSync(full) });
    }
  });
  return out;
}

function buildPortableZip() {
  const entries = collectFiles(ROOT, '', []);
  entries.push({
    name: 'SCRAPPED-Connect/START-HERE.txt',
    data: Buffer.from([
      'SCRAPPED Connect — portable web build',
      '=====================================',
      '',
      'No server required. Choose one:',
      '',
      '1) WINDOWS DESKTOP APP (recommended)',
      '   Download the installer from:',
      '   https://github.com/Dinomax2005/scrapped-connect-releases/releases',
      '   Run SCRAPPED-Connect-Setup.exe — it installs the app, builds your',
      '   shortcuts and keeps itself updated automatically.',
      '',
      '2) RUN THIS FOLDER DIRECTLY',
      '   Double-click src/index.html — the whole studio suite runs offline',
      '   in the browser (Edge/Chrome) with local storage.',
      '',
      '3) HOST IT FOR YOUR TEAM',
      '   With Node.js installed run:   node server.js',
      '   then open http://localhost:3000  (or use the printed network URL',
      '   so every developer on the LAN can use it).',
      '',
      'The first account you create with the Setup Wizard becomes the studio',
      'Founder with full control over accounts, ranks and dashboards.',
      ''
    ].join('\r\n'), 'utf8')
  });
  return buildZip(entries);
}

/* ------------------------------------------------------------------ helpers */
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Cache-Control': 'no-cache' }, headers || {}));
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    send(res, 200, data, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  });
}

function htmlPage(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — SCRAPPED Connect</title>
  <style>
    body{margin:0;background:#090a0f;color:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{max-width:680px;background:#11131c;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:34px}
    h1{font-size:22px;margin:0 0 10px}
    p{font-size:14px;line-height:1.65;color:#9ca3af}
    a.btn{display:inline-block;margin:6px 8px 0 0;padding:11px 17px;border-radius:10px;background:#8b5cf6;color:#fff;
      text-decoration:none;font-weight:600;font-size:13.5px}
    a.alt{background:#171a26;border:1px solid rgba(255,255,255,.14);color:#f3f4f8}
    code{background:#07080c;padding:2px 6px;border-radius:5px;font-size:13px}
    .logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);
      display:flex;align-items:center;justify-content:center;font-weight:900;font-size:26px;margin-bottom:16px}
  </style></head><body><div class="card"><div class="logo">S</div>${body}</div></body></html>`;
}

/* -------------------------------------------------------------- HTTP server */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const version = appVersion();

  // CORS: the desktop build and the preview host both talk to these endpoints.
  if (req.method === 'OPTIONS') {
    return send(res, 204, '', {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
  }

  if (pathname === '/health' || pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, app: 'Lately', version, uptime: process.uptime() }), { 'Content-Type': 'application/json' });
  }

  if (pathname === '/api/updates' || pathname === '/api/update') {
    const releases = await getReleases(url.searchParams.has('force'));
    const list = Array.isArray(releases) ? releases.filter((r) => !r.draft) : [];
    list.sort((a, b) => compareVersions(b.tag_name, a.tag_name));
    const latest = list[0] || null;
    const installer = latest ? pickAsset(latest, [/setup.*\.exe$/i, /installer.*\.exe$/i, /\.exe$/i]) : null;
    const portable = latest ? pickAsset(latest, [/portable.*\.exe$/i]) : null;
    const payload = {
      ok: !releases.error,
      error: releases.error || null,
      currentVersion: version,
      latestVersion: latest ? String(latest.tag_name || '').replace(/^v/i, '') : version,
      updateAvailable: latest ? compareVersions(latest.tag_name, version) > 0 : false,
      releaseName: latest ? (latest.name || latest.tag_name) : null,
      notes: latest ? (latest.body || '') : '',
      publishedAt: latest ? latest.published_at : null,
      htmlUrl: latest ? latest.html_url : `https://github.com/${OWNER}/${REPO}/releases`,
      installer: installer ? { name: installer.name, size: installer.size, downloads: installer.download_count, url: `/download/${installer.name}` } : null,
      portable: portable ? { name: portable.name, size: portable.size, url: `/download/${portable.name}` } : null,
      assets: latest ? (latest.assets || []).map((a) => ({ name: a.name, size: a.size, downloads: a.download_count, url: a.browser_download_url })) : []
    };
    return send(res, 200, JSON.stringify(payload, null, 2), { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  }

  if (pathname === '/lately-website.zip' || pathname === '/download/lately-website.zip') {
    const websiteZip = path.join(ROOT, 'lately-website.zip');
    if (!fs.existsSync(websiteZip)) return send(res, 404, 'Website bundle has not been built yet.', { 'Content-Type': 'text/plain; charset=utf-8' });
    return fs.readFile(websiteZip, (error, data) => {
      if (error) return send(res, 500, 'Could not read the website bundle.', { 'Content-Type': 'text/plain; charset=utf-8' });
      return send(res, 200, data, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="lately-website.zip"' });
    });
  }

  if (pathname.startsWith('/download/')) {
    const wanted = pathname.replace('/download/', '');
    const releases = await getReleases(false);
    const list = Array.isArray(releases) ? releases.filter((r) => !r.draft) : [];
    list.sort((a, b) => compareVersions(b.tag_name, a.tag_name));
    const latest = list[0] || null;
    const allAssets = list.flatMap((r) => (r.assets || []).map((a) => ({ release: r, asset: a })));

    // 1) Exact asset name match from any release
    const exact = allAssets.find((x) => x.asset.name.toLowerCase() === wanted.toLowerCase());
    if (exact) {
      return send(res, 302, '', {
        'Location': exact.asset.browser_download_url,
        'Content-Disposition': `attachment; filename="${exact.asset.name}"`
      });
    }

    // 2) Friendly aliases
    if (/setup|installer|\.exe$/i.test(wanted)) {
      const installer = latest ? pickAsset(latest, [/setup.*\.exe$/i, /installer.*\.exe$/i, /\.exe$/i]) : null;
      if (installer) {
        return send(res, 302, '', {
          'Location': installer.browser_download_url,
          'Content-Disposition': `attachment; filename="${installer.name}"`
        });
      }
      return send(res, 200, htmlPage('Windows installer', `
        <h1>🚀 The Windows installer is being prepared</h1>
        <p>SCRAPPED Connect builds its <code>SCRAPPED-Connect-Setup.exe</code> with GitHub Actions and publishes it to
        <strong>GitHub Releases</strong>. No release exists on this repository yet, so there is nothing to download here at the moment.</p>
        <p><strong>What you can do right now:</strong></p>
        <p>
          <a class="btn" href="/download/SCRAPPED-Connect-Portable.zip" download>🗜️ Download the Portable ZIP</a>
          <a class="btn alt" href="https://github.com/${OWNER}/${REPO}/actions/workflows/build-windows.yml" target="_blank" rel="noreferrer">⚙️ Open the build workflow</a>
        </p>
        <p style="margin-top:18px">Run the <em>Build Windows Installer</em> workflow (Actions → Run workflow) or push a tag like
        <code>v1.0.0</code> — the release, the installer and the auto-update feed appear automatically, and every installed
        copy of SCRAPPED Connect will then update itself.</p>
        <p><a class="btn alt" href="/">← Back to SCRAPPED Connect</a></p>`), { 'Content-Type': 'text/html; charset=utf-8' });
    }

    if (/zip$/i.test(wanted)) {
      const zipAsset = allAssets.find((x) => /\.zip$/i.test(x.asset.name));
      if (zipAsset) {
        return send(res, 302, '', {
          'Location': zipAsset.asset.browser_download_url,
          'Content-Disposition': `attachment; filename="${zipAsset.asset.name}"`
        });
      }
      try {
        const zip = buildPortableZip();
        return send(res, 200, zip, {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="SCRAPPED-Connect-Portable.zip"',
          'Content-Length': zip.length
        });
      } catch (err) {
        return send(res, 500, `Could not build the portable package: ${err.message}`, { 'Content-Type': 'text/plain' });
      }
    }

    return send(res, 404, 'Unknown download', { 'Content-Type': 'text/plain' });
  }

  if (pathname === '/install' || pathname === '/setup') {
    return send(res, 302, '', { 'Location': '/download/SCRAPPED-Connect-Setup.exe' });
  }

  // ---- static web app
  let rel = pathname === '/' ? '/index.html' : pathname;
  const target = path.join(SRC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(SRC)) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return sendFile(res, target);

  // SPA-style fallback for deep links inside the web build
  return sendFile(res, path.join(SRC, 'index.html'));
});

server.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log('');
  console.log('  Lately — social app preview  v' + appVersion());
  console.log('  ─────────────────────────────────────────────');
  console.log('   Local:    http://localhost:' + PORT);
  if (lan.length) console.log('   Network:  http://' + lan[0] + ':' + PORT + '   (preview only; deploy over HTTPS for accounts)');
  console.log('');
});
