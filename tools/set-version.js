#!/usr/bin/env node
/* Keeps the in-app version banner in sync with package.json.
 * Wired to the npm "version" lifecycle, so `npm version patch|minor|major`
 * + `git push --follow-tags` is all it takes to ship an update. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const corePath = path.join(root, 'src', 'core.js');
let core = fs.readFileSync(corePath, 'utf8');

const versionPattern = /const APP_VERSION = '[^']*';/;
if (!versionPattern.test(core)) {
  console.error('set-version: APP_VERSION constant not found in src/core.js');
  process.exit(1);
}
core = core.replace(versionPattern, `const APP_VERSION = '${version}';`);
fs.writeFileSync(corePath, core);

// Keep the web manifest cache name in step with the release as well.
const swPath = path.join(root, 'src', 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE = 'scrapped-connect-v[^']*';/, `const CACHE = 'scrapped-connect-v${version}';`);
fs.writeFileSync(swPath, sw);

console.log(`SCRAPPED Connect version set to ${version} (src/core.js + src/sw.js)`);
