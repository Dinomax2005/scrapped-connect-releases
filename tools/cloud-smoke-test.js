#!/usr/bin/env node
/* Lately — deterministic tests for the browser-side Supabase adapter. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const cloudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud.js'), 'utf8');
const storage = new Map();
const calls = [];
const userId = '00000000-0000-4000-8000-000000000001';
const sampleId = '00000000-0000-4000-8000-000000000002';
const user = { id: userId, email: 'riley@example.com', user_metadata: { username: 'rileystone' } };

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => status === 204 ? '' : JSON.stringify(data) };
}

async function fakeFetch(url, options = {}) {
  const address = String(url);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body = options.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) {} }
  calls.push({ address, method, headers, body });

  if (address.includes('/auth/v1/signup') || address.includes('/auth/v1/token?grant_type=password')) {
    return response({ user, access_token: 'access-token-123', refresh_token: 'refresh-token-123', token_type: 'bearer', expires_in: 3600 });
  }
  if (address.includes('/auth/v1/token?grant_type=refresh_token')) {
    return response({ user, access_token: 'refreshed-access-token', refresh_token: 'refreshed-token', expires_in: 3600 });
  }
  if (address.includes('/auth/v1/user')) return response(user);
  if (address.includes('/auth/v1/logout') || address.includes('/auth/v1/recover')) return response({});

  if (address.includes('/rest/v1/profiles?select=id&username=')) return response([]);
  if (address.includes('/rest/v1/profiles?select=id,username')) {
    return response([
      { id: userId, username: 'rileystone', display_name: 'Riley Stone', bio: '', avatar_url: null, color: '#728878', is_sample: false, sample_followers: 0, created_at: '2026-10-01T12:00:00.000Z' },
      { id: sampleId, username: 'mara.voss', display_name: 'Mara Voss', bio: 'Bakes on weekends.', avatar_url: null, color: '#bd8267', is_sample: true, sample_followers: 12, created_at: '2026-09-01T12:00:00.000Z' }
    ]);
  }
  if (address.includes('/rest/v1/posts?select=')) {
    return response([{ id: 'post-sample-1', author_id: sampleId, body: 'A small morning.', image_url: null, image_alt: '', created_at: '2026-10-17T08:00:00.000Z' }]);
  }
  if (address.includes('/rest/v1/post_likes?select=')) return response([{ post_id: 'post-sample-1', user_id: sampleId }]);
  if (address.includes('/rest/v1/post_comments?select=')) return response([]);
  if (address.includes('/rest/v1/follows?select=')) return response([]);
  if (address.includes('/rest/v1/saved_posts?select=')) return response([]);
  if (address.includes('/rest/v1/notifications?select=')) return response([]);
  if (address.includes('/storage/v1/object/list/post-media')) return response([]);
  if (address.includes('/storage/v1/object/post-media/')) return response({}, 204);
  if (address.includes('/rest/v1/')) return response({}, method === 'POST' ? 201 : 204);

  throw new Error(`Unexpected mock request: ${method} ${address}`);
}

const window = {
  LATELY_CONFIG: {
    supabaseUrl: 'https://example-project.supabase.co',
    supabasePublishableKey: 'sb_publishable_test_public_key'
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  location: { origin: 'https://lately.example', pathname: '/', search: '', hash: '' },
  history: { replaceState() {} }
};
const context = vm.createContext({
  window,
  document: { title: 'Lately' },
  fetch: fakeFetch,
  crypto: webcrypto,
  URLSearchParams,
  Blob,
  Uint8Array,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date,
  JSON,
  String,
  Number,
  Error,
  Promise,
  console
});

(async () => {
  vm.runInContext(cloudSource, context, { filename: 'src/cloud.js' });
  const cloud = window.LatelyCloud;
  assert.equal(cloud.configured, true, 'a publishable key should enable cloud mode');

  assert.equal(await cloud.checkUsername('rileystone'), true);
  let request = calls.at(-1);
  assert.equal(request.headers.apikey, 'sb_publishable_test_public_key');
  assert.equal(Object.hasOwn(request.headers, 'Authorization'), false, 'anonymous REST requests must not send the publishable key as a bearer token');

  const signup = await cloud.signUp({ email: user.email, password: 'strong-password-8', username: 'rileystone', displayName: 'Riley Stone', color: '#728878' });
  assert.equal(signup.session.user.id, userId);
  request = calls.find((entry) => entry.address.includes('/auth/v1/signup'));
  assert.equal(request.headers.apikey, 'sb_publishable_test_public_key');
  assert.equal(Object.hasOwn(request.headers, 'Authorization'), false, 'signup should use the public API key only');
  assert.equal(request.body.data.username, 'rileystone');

  const data = await cloud.loadData();
  assert.equal(data.users.length, 2);
  assert.equal(data.users[0].email, user.email);
  assert.equal(data.posts[0].likes[0], sampleId);
  assert.deepEqual(Array.from(data.saved[userId]), []);

  await cloud.toggleFollow(userId, sampleId, false);
  request = calls.at(-1);
  assert.equal(request.method, 'POST');
  assert.equal(request.body.follower_id, userId);
  assert.equal(request.headers.Authorization, 'Bearer access-token-123');

  await cloud.toggleLike('post-sample-1', userId, false);
  assert.equal(calls.at(-1).body.user_id, userId);
  await cloud.toggleSaved('post-sample-1', userId, false);
  assert.equal(calls.at(-1).body.post_id, 'post-sample-1');
  await cloud.addComment('post-sample-1', userId, 'A kind reply.');
  assert.equal(calls.at(-1).body.body, 'A kind reply.');
  await cloud.updateProfile({ userId, displayName: 'Riley S.', bio: 'Here for the small things.', photo: null });
  assert.equal(calls.at(-1).body.display_name, 'Riley S.');
  await cloud.markNotificationsRead(userId);
  assert.equal(calls.at(-1).method, 'PATCH');

  await cloud.createPost({ body: 'A note from Riley.', image: null, imageAlt: '' });
  request = calls.at(-1);
  assert.equal(request.body.author_id, userId);
  assert.equal(request.body.body, 'A note from Riley.');

  await cloud.requestPasswordReset(user.email);
  assert.ok(calls.some((entry) => entry.address.includes('/auth/v1/recover?')));
  await cloud.setPassword('another-strong-password-9');
  assert.ok(calls.some((entry) => entry.address.endsWith('/auth/v1/user') && entry.method === 'PUT'));

  await cloud.signOut();
  window.location.hash = '#access_token=callback-access&refresh_token=callback-refresh&expires_in=3600&type=recovery';
  const restored = await cloud.restoreFromUrl();
  assert.equal(restored.type, 'recovery', 'recovery links should be distinguished from ordinary sign-in callbacks');
  assert.equal(restored.session.user.id, userId);
  assert.ok(calls.some((entry) => entry.address.endsWith('/auth/v1/user') && entry.headers.Authorization === 'Bearer callback-access'));

  await cloud.deleteOwnAccount();
  assert.equal(cloud.getUserId(), null, 'deleting an account should clear its local auth session');
  assert.equal(storage.has('lately.supabase.session.v1'), false);

  console.log('Lately cloud smoke test passed: public-key headers, signup, session mapping, shared reads, follow mutation, posting, password recovery/update, and account deletion.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
