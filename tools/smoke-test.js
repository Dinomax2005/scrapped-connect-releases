#!/usr/bin/env node
/* Lately — dependency-free smoke test for local account and feed flows. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

const rootDir = path.join(__dirname, '..');
const appSource = fs.readFileSync(path.join(rootDir, 'src', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'src', 'styles.css'), 'utf8');
const configSource = fs.readFileSync(path.join(rootDir, 'src', 'config.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(rootDir, 'src', 'sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'manifest.webmanifest'), 'utf8'));

assert.match(html, /href="styles\.css"/);
assert.match(html, /src="config\.js"/);
assert.match(html, /src="cloud\.js"/);
assert.match(html, /src="app\.js"/);
assert.match(serviceWorker, /'\.\/config\.js', '\.\/cloud\.js'/);
assert.doesNotMatch(configSource, /sb_secret_|service_role/i, 'the browser config must not contain a Supabase secret key');
assert.doesNotMatch(html, /core\.js|views-team\.js|views-work\.js/);
assert.equal(manifest.short_name, 'Lately');
assert.match(css, /@media \(max-width: 760px\)/);
new vm.Script(appSource, { filename: 'src/app.js' });

const storage = new Map();
const listeners = {};
const appRoot = { innerHTML: '' };
const modalRoot = {
  innerHTML: '',
  querySelector() { return null; }
};
const toastItems = [];
const toastRegion = { appendChild(item) { toastItems.push(item); } };
const document = {
  title: '',
  addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
  getElementById(id) {
    if (id === 'app') return appRoot;
    if (id === 'modal-root') return modalRoot;
    if (id === 'toast-region') return toastRegion;
    return null;
  },
  createElement() {
    return {
      className: '', textContent: '',
      classList: { add() {} },
      setAttribute() {}, remove() {}
    };
  }
};

class FakeFormData {
  constructor(form) { this.values = form.values || {}; }
  get(name) { return Object.prototype.hasOwnProperty.call(this.values, name) ? this.values[name] : null; }
}
class FakeFormElement { constructor(id, values, dataset = {}) { this.id = id; this.values = values; this.dataset = dataset; } querySelector() { return { disabled: false }; } reset() {} }

const window = {
  document,
  crypto: webcrypto,
  isSecureContext: true,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  addEventListener() {},
  setTimeout() {},
  confirm() { return true; }
};

const context = vm.createContext({
  window, document, navigator: {}, console, TextEncoder,
  FormData: FakeFormData,
  HTMLFormElement: FakeFormElement,
  HTMLInputElement: class HTMLInputElement {},
  HTMLImageElement: class HTMLImageElement {},
  URL, Blob, Intl, Date, Map, Set, Array, String, Number, Boolean, Object, Math, RegExp, Error, Promise,
  Uint8Array, JSON, parseInt, setTimeout() {}
});

vm.runInContext(appSource, context, { filename: 'src/app.js' });
assert.match(appRoot.innerHTML, /Come on in\./, 'fresh visits should show account creation');
assert.match(appRoot.innerHTML, /Create your account/);

function dispatchSubmit(id, values, dataset = {}) {
  const form = new FakeFormElement(id, values, dataset);
  const event = { target: form, preventDefault() {} };
  return listeners.submit[0](event);
}

function dispatchAction(action, values = {}) {
  const actionElement = { dataset: { action, ...values } };
  const target = {
    closest(selector) {
      if (selector === '[data-action]') return actionElement;
      return null;
    }
  };
  const event = { target, preventDefault() {} };
  listeners.click[0](event);
}

(async () => {
  await dispatchSubmit('auth-form', {
    name: 'Riley Stone', username: 'rileystone', email: 'riley@example.com',
    password: 'correct-horse-42', confirm: 'correct-horse-42'
  });

  const app = window.Lately;
  assert.ok(app, 'the browser app should expose its runtime');
  let state = app.getState();
  const user = state.data.users.find((entry) => entry.username === 'rileystone');
  assert.ok(user, 'signup should create a local account');
  assert.ok(user.passwordHash && user.passwordSalt, 'the account should store a salted password hash');
  assert.notEqual(user.passwordHash, 'correct-horse-42', 'plain-text passwords must not be stored');
  assert.equal(storage.get(app._sessionKey), user.id, 'signup should start a session');
  assert.match(appRoot.innerHTML, /Good to see you, Riley\./, 'signup should open the feed');
  assert.match(appRoot.innerHTML, /What’s on your mind/);

  const firstSamplePost = state.data.posts[0];
  dispatchAction('like-post', { postId: firstSamplePost.id });
  assert.ok(firstSamplePost.likes.includes(user.id), 'liking should update the local post');
  dispatchAction('toggle-follow', { userId: 'sample-mara' });
  assert.ok(state.data.follows[user.id].includes('sample-mara'), 'following should update the local profile graph');
  dispatchAction('save-post', { postId: firstSamplePost.id });
  assert.ok(state.data.saved[user.id].includes(firstSamplePost.id), 'saving should add a post to the saved list');

  await dispatchSubmit('composer-form', { body: 'First post from my new account. #hello' });
  state = app.getState();
  assert.equal(state.data.posts[0].body, 'First post from my new account. #hello', 'the composer should publish a post');
  assert.equal(state.data.posts[0].authorId, user.id);

  dispatchAction('open-comments', { postId: firstSamplePost.id });
  assert.match(modalRoot.innerHTML, /Replies/, 'the reply dialog should open');
  await dispatchSubmit('comment-form', { comment: 'I want to remember this too.' }, { postId: firstSamplePost.id });
  assert.ok(firstSamplePost.comments.some((comment) => comment.body === 'I want to remember this too.'), 'a reply should be saved on its post');

  dispatchAction('my-profile');
  dispatchAction('edit-profile');
  assert.match(modalRoot.innerHTML, /Edit your profile/, 'profile editing should open a dialog');
  await dispatchSubmit('profile-form', { name: 'Riley Stone', bio: 'Collecting small things worth remembering.' });
  assert.equal(user.bio, 'Collecting small things worth remembering.', 'profile edits should persist');

  const viewAction = { dataset: { view: 'settings' } };
  listeners.click[0]({
    target: { closest(selector) { return selector === '[data-view]' ? viewAction : null; } },
    preventDefault() {}
  });
  assert.match(appRoot.innerHTML, /Your account lives in this browser\./, 'settings should explain local-only storage');
  assert.match(appRoot.innerHTML, /Export my data/);
  const oldHash = user.passwordHash;
  await dispatchSubmit('password-form', { current: 'correct-horse-42', password: 'another-good-pass-8', confirm: 'another-good-pass-8' });
  assert.notEqual(user.passwordHash, oldHash, 'changing the password should update the stored hash');
  assert.equal(app.utilities.escapeHtml('<script>'), '&lt;script&gt;', 'rendered text should be escaped');
  assert.equal(app.utilities.safeImageUrl('javascript:alert(1)'), '', 'unsafe image URLs should be rejected');

  dispatchAction('logout');
  assert.match(appRoot.innerHTML, /Good to have you back\./, 'logout should return to sign-in');
  await dispatchSubmit('auth-form', { identifier: 'rileystone', password: 'another-good-pass-8' });
  assert.equal(storage.get(app._sessionKey), user.id, 'the account should sign in again by username');
  assert.match(appRoot.innerHTML, /Good to see you, Riley\./);

  console.log('Lately smoke test passed: signup, salted password storage, feed, likes, follows, saved posts, posting, replies, profile edits, password change, logout, and login.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
