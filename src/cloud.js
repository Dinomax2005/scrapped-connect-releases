/* Lately's browser-safe Supabase client (publishable key only). */
(() => {
  'use strict';

  const config = window.LATELY_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
  const SESSION_KEY = 'lately.supabase.session.v1';
  let session = null;
  let refreshInFlight = null;

  function currentSessionUserId() {
    return session && session.user ? session.user.id : null;
  }

  function normalizeSession(payload) {
    const value = payload && payload.session ? payload.session : payload;
    if (!value || !value.access_token || !value.user) return null;
    const lifetime = Number(value.expires_in || 3600);
    const expiresAt = Number(value.expires_at || (Date.now() / 1000 + lifetime));
    return {
      access_token: value.access_token,
      refresh_token: value.refresh_token || '',
      token_type: value.token_type || 'bearer',
      expires_in: lifetime,
      expires_at: expiresAt,
      user: value.user
    };
  }

  function storeSession(payload) {
    session = normalizeSession(payload);
    if (!session) return null;
    try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (error) { /* in-memory session still works for this tab */ }
    return session;
  }

  function clearSession() {
    session = null;
    try { window.localStorage.removeItem(SESSION_KEY); } catch (error) { /* ignore storage restrictions */ }
  }

  function readStoredSession() {
    if (session) return session;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) session = normalizeSession(JSON.parse(raw));
    } catch (error) { clearSession(); }
    return session;
  }

  async function readResponse(response) {
    const raw = await response.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (error) { data = { message: raw }; }
    }
    if (!response.ok) {
      const message = data && (data.msg || data.message || data.error_description || data.error);
      throw new Error(message || `The server returned ${response.status}.`);
    }
    return data;
  }

  function redirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function authRequest(endpoint, options = {}) {
    if (!configured) throw new Error('Cloud accounts are not configured.');
    const headers = { apikey: publishableKey, 'Content-Type': 'application/json' };
    if (options.session && options.session.access_token) headers.Authorization = `Bearer ${options.session.access_token}`;
    const response = await fetch(`${baseUrl}/auth/v1/${endpoint}`, {
      method: options.method || 'POST',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    return readResponse(response);
  }

  async function refreshSession() {
    if (refreshInFlight) return refreshInFlight;
    const current = readStoredSession();
    if (!current || !current.refresh_token) {
      clearSession();
      return null;
    }
    refreshInFlight = (async () => {
      try {
        const payload = await authRequest('token?grant_type=refresh_token', { body: { refresh_token: current.refresh_token } });
        return storeSession(payload);
      } catch (error) {
        clearSession();
        throw error;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  async function restoreFromUrl() {
    if (!configured) return null;
    const query = new URLSearchParams(window.location.search || '');
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const params = hash.has('access_token') ? hash : query;
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type') || '';
    const authError = params.get('error_description') || params.get('error');
    if (authError) {
      try { window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`); } catch (error) { /* ignore history restrictions */ }
      return { session: await getSession(), type: 'error', error: authError };
    }
    if (!accessToken || !refreshToken) return { session: await getSession(), type: '' };
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` }
    });
    const user = await readResponse(response);
    const restored = storeSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: params.get('token_type') || 'bearer',
      expires_in: Number(params.get('expires_in') || 3600),
      expires_at: Date.now() / 1000 + Number(params.get('expires_in') || 3600),
      user
    });
    try { window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`); } catch (error) { /* no history access in embedded previews */ }
    return { session: restored, type };
  }

  async function getSession() {
    const current = readStoredSession();
    if (!current) return null;
    if (current.expires_at && current.expires_at <= Date.now() / 1000 + 75) return refreshSession();
    return current;
  }

  async function restRequest(path, options = {}) {
    if (!configured) throw new Error('Cloud accounts are not configured.');
    const activeSession = options.anonymous ? null : await getSession();
    if (!options.anonymous && !activeSession) throw new Error('Please log in again.');
    const headers = { apikey: publishableKey, 'Content-Type': 'application/json' };
    if (activeSession) headers.Authorization = `Bearer ${activeSession.access_token}`;
    if (options.prefer) headers.Prefer = options.prefer;
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    return readResponse(response);
  }

  async function signUp({ email, password, username, displayName, color }) {
    const payload = await authRequest(`signup?redirect_to=${encodeURIComponent(redirectUrl())}`, {
      body: { email, password, data: { username, display_name: displayName, color } }
    });
    const active = storeSession(payload);
    return { user: payload && payload.user, session: active };
  }

  async function signIn(email, password) {
    const payload = await authRequest('token?grant_type=password', { body: { email, password } });
    return storeSession(payload);
  }

  async function signOut() {
    const active = await getSession().catch(() => null);
    try {
      if (active) await authRequest('logout', { session: active });
    } finally {
      clearSession();
    }
  }

  async function requestPasswordReset(email) {
    return authRequest(`recover?redirect_to=${encodeURIComponent(redirectUrl())}`, { body: { email } });
  }

  async function checkUsername(username) {
    const rows = await restRequest(`profiles?select=id&username=eq.${encodeURIComponent(username)}&limit=1`, { anonymous: true });
    return Array.isArray(rows) && rows.length === 0;
  }

  async function uploadImage(dataUrl) {
    const active = await getSession();
    if (!active || !active.user || !active.user.id) throw new Error('Please log in again before adding a photo.');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(String(dataUrl || ''));
    if (!match) throw new Error('That photo could not be prepared. Choose it again.');
    const mime = match[1].toLowerCase();
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    const objectPath = `${active.user.id}/${crypto.randomUUID()}.${extension}`;
    const response = await fetch(`${baseUrl}/storage/v1/object/post-media/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${active.access_token}`,
        'Content-Type': mime,
        'x-upsert': 'false'
      },
      body: new Blob([bytes], { type: mime })
    });
    await readResponse(response);
    return `${baseUrl}/storage/v1/object/public/post-media/${objectPath}`;
  }

  async function loadData() {
    const active = await getSession();
    if (!active || !active.user) throw new Error('Please log in again.');
    const userId = active.user.id;
    const [profileRows, postRows, likeRows, commentRows, followRows, savedRows, notificationRows] = await Promise.all([
      restRequest('profiles?select=id,username,display_name,bio,avatar_url,color,is_sample,sample_followers,created_at&order=display_name.asc'),
      restRequest('posts?select=id,author_id,body,image_url,image_alt,created_at&order=created_at.desc&limit=100'),
      restRequest('post_likes?select=post_id,user_id&limit=2000'),
      restRequest('post_comments?select=id,post_id,author_id,body,created_at&order=created_at.asc&limit=2000'),
      restRequest('follows?select=follower_id,following_id&limit=2000'),
      restRequest(`saved_posts?select=post_id&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=500`),
      restRequest(`notifications?select=id,user_id,actor_id,type,post_id,text,read,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`)
    ]);
    const users = profileRows.map((profile) => ({
      id: profile.id,
      name: profile.display_name,
      username: profile.username,
      email: profile.id === userId ? active.user.email || '' : '',
      bio: profile.bio || '',
      color: profile.color || '#648b85',
      photo: profile.avatar_url || null,
      sample: !!profile.is_sample,
      followers: Number(profile.sample_followers || 0),
      joinedAt: Date.parse(profile.created_at) || Date.now()
    }));
    const posts = postRows.map((post) => ({
      id: post.id,
      authorId: post.author_id,
      body: post.body || '',
      image: post.image_url || '',
      imageAlt: post.image_alt || '',
      createdAt: Date.parse(post.created_at) || Date.now(),
      likes: likeRows.filter((like) => like.post_id === post.id).map((like) => like.user_id),
      comments: commentRows.filter((comment) => comment.post_id === post.id).map((comment) => ({
        id: comment.id,
        authorId: comment.author_id,
        body: comment.body,
        createdAt: Date.parse(comment.created_at) || Date.now()
      }))
    }));
    const follows = {};
    followRows.forEach((row) => {
      if (!follows[row.follower_id]) follows[row.follower_id] = [];
      follows[row.follower_id].push(row.following_id);
    });
    return {
      version: 1,
      users,
      posts,
      follows,
      saved: { [userId]: savedRows.map((row) => row.post_id) },
      notifications: notificationRows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        actorId: row.actor_id,
        type: row.type,
        postId: row.post_id,
        text: row.text,
        read: row.read,
        createdAt: Date.parse(row.created_at) || Date.now()
      }))
    };
  }

  async function toggleFollow(followerId, followingId, following) {
    if (following) {
      return restRequest(`follows?follower_id=eq.${encodeURIComponent(followerId)}&following_id=eq.${encodeURIComponent(followingId)}`, { method: 'DELETE' });
    }
    return restRequest('follows', { method: 'POST', body: { follower_id: followerId, following_id: followingId }, prefer: 'return=minimal' });
  }

  async function toggleLike(postId, userId, liked) {
    if (liked) {
      return restRequest(`post_likes?post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
    }
    return restRequest('post_likes', { method: 'POST', body: { post_id: postId, user_id: userId }, prefer: 'return=minimal' });
  }

  async function toggleSaved(postId, userId, saved) {
    if (saved) {
      return restRequest(`saved_posts?post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
    }
    return restRequest('saved_posts', { method: 'POST', body: { post_id: postId, user_id: userId }, prefer: 'return=minimal' });
  }

  async function createPost({ body, image, imageAlt }) {
    const active = await getSession();
    let imageUrl = null;
    if (image) imageUrl = await uploadImage(image);
    await restRequest('posts', {
      method: 'POST',
      body: { author_id: active.user.id, body: body || '', image_url: imageUrl, image_alt: imageAlt || '' },
      prefer: 'return=minimal'
    });
  }

  async function addComment(postId, authorId, body) {
    return restRequest('post_comments', {
      method: 'POST', body: { post_id: postId, author_id: authorId, body }, prefer: 'return=minimal'
    });
  }

  async function updateProfile({ userId, displayName, bio, photo }) {
    const patch = { display_name: displayName, bio };
    if (photo) patch.avatar_url = await uploadImage(photo);
    return restRequest(`profiles?id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
  }

  async function updatePassword({ email, currentPassword, newPassword }) {
    await signIn(email, currentPassword);
    const active = await getSession();
    return authRequest('user', { method: 'PUT', session: active, body: { password: newPassword } });
  }

  async function setPassword(newPassword) {
    const active = await getSession();
    if (!active) throw new Error('The password reset link has expired. Request a new one.');
    return authRequest('user', { method: 'PUT', session: active, body: { password: newPassword } });
  }

  async function markNotificationsRead(userId) {
    return restRequest(`notifications?user_id=eq.${encodeURIComponent(userId)}&read=eq.false`, { method: 'PATCH', body: { read: true }, prefer: 'return=minimal' });
  }

  async function deleteOwnAccount() {
    const active = await getSession();
    if (!active || !active.user) throw new Error('Please log in again.');
    const headers = { apikey: publishableKey, Authorization: `Bearer ${active.access_token}`, 'Content-Type': 'application/json' };
    const listingResponse = await fetch(`${baseUrl}/storage/v1/object/list/post-media`, {
      method: 'POST', headers,
      body: JSON.stringify({ prefix: active.user.id, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
    });
    const files = await readResponse(listingResponse);
    if (Array.isArray(files)) {
      for (const file of files) {
        const name = String(file && file.name || '');
        if (!name || name.includes('/') || name === '.' || name === '..') continue;
        const objectPath = `${active.user.id}/${name}`.split('/').map(encodeURIComponent).join('/');
        const deleteResponse = await fetch(`${baseUrl}/storage/v1/object/post-media/${objectPath}`, { method: 'DELETE', headers });
        await readResponse(deleteResponse);
      }
    }
    await restRequest('rpc/delete_own_lately_account', { method: 'POST', body: {} });
    clearSession();
  }

  window.LatelyCloud = {
    configured,
    getSession,
    restoreFromUrl,
    getUserId: currentSessionUserId,
    clearSession,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    checkUsername,
    loadData,
    toggleFollow,
    toggleLike,
    toggleSaved,
    createPost,
    addComment,
    updateProfile,
    updatePassword,
    setPassword,
    markNotificationsRead,
    deleteOwnAccount
  };
})();
