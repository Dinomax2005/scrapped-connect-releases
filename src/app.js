/* Lately — a small, people-first social space. */
(() => {
  'use strict';

  const STORE_KEY = 'lately.workspace.v1';
  const SESSION_KEY = 'lately.session.v1';
  const ITERATIONS = 180000;
  const Cloud = window.LatelyCloud && window.LatelyCloud.configured ? window.LatelyCloud : null;
  const CLOUD = !!Cloud;
  const root = document.getElementById('app');
  const state = {
    data: null,
    view: 'home',
    feedTab: 'for-you',
    search: '',
    profileId: null,
    authMode: 'signup',
    authNotice: '',
    loading: false,
    pendingImage: null,
    pendingProfileImage: null
  };

  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    bookmark: '<path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.7L6 21z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    heart: '<path d="M20.4 5.6a5.2 5.2 0 0 0-7.4 0L12 6.7l-1.1-1.1a5.2 5.2 0 0 0-7.4 7.4l1.1 1.1L12 21l7.4-6.9 1.1-1.1a5.2 5.2 0 0 0-.1-7.4Z"/>',
    comment: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    share: '<path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9L6.1 12l1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" transform="translate(-1 -1)"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>'
  };

  function icon(name, className = '') {
    return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function uid(prefix = 'id') {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `${prefix}_${window.crypto.randomUUID()}`;
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  function sampleData() {
    const now = Date.now();
    const people = [
      { id: 'sample-mara', name: 'Mara Voss', username: 'mara.voss', bio: 'Bakes on weekends. Takes the long way home.', color: '#bd8267', followers: 286 },
      { id: 'sample-theo', name: 'Theo Park', username: 'theopark', bio: 'Trying to get better at making things slowly.', color: '#728878', followers: 174 },
      { id: 'sample-inez', name: 'Inez Calder', username: 'inezcalder', bio: 'Coffee, old books, and a camera that needs a new strap.', color: '#b69352', followers: 412 },
      { id: 'sample-jules', name: 'Jules Mercer', username: 'julesmercer', bio: 'Usually halfway through a book and a cup of tea.', color: '#81799a', followers: 95 },
      { id: 'sample-eli', name: 'Eli Navarro', username: 'elinav', bio: 'A small garden on a very small balcony.', color: '#648b85', followers: 131 }
    ].map((person, index) => ({
      ...person,
      email: '',
      passwordSalt: '',
      passwordHash: '',
      sample: true,
      joinedAt: now - (index + 7) * 86400000,
      photo: null
    }));

    return {
      version: 1,
      users: people,
      posts: [
        {
          id: 'post-mara-1', authorId: 'sample-mara',
          body: 'Took the long way to the river this morning. It had that silver look it gets just before the rain. #morningwalk',
          image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=82',
          imageAlt: 'A quiet stretch of water at the edge of a green landscape',
          createdAt: now - 18 * 60000,
          likes: ['sample-inez', 'sample-jules', 'sample-eli'],
          comments: [
            { id: 'comment-mara-1', authorId: 'sample-inez', body: 'I know exactly the light you mean.', createdAt: now - 9 * 60000 }
          ]
        },
        {
          id: 'post-theo-1', authorId: 'sample-theo',
          body: 'First loaf in months that didn’t try to become a brick. The neighbours have already claimed half. #homebaking',
          image: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=1200&q=82',
          imageAlt: 'A freshly baked loaf cooling on a wooden counter',
          createdAt: now - 2 * 3600000,
          likes: ['sample-mara', 'sample-inez'],
          comments: [
            { id: 'comment-theo-1', authorId: 'sample-mara', body: 'A good loaf never stays yours for long.', createdAt: now - 90 * 60000 },
            { id: 'comment-theo-2', authorId: 'sample-jules', body: 'That crust looks perfect.', createdAt: now - 75 * 60000 }
          ]
        },
        {
          id: 'post-inez-1', authorId: 'sample-inez',
          body: 'A little table by the window, one very good espresso, and absolutely no plans to leave. #slowmorning',
          image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82',
          imageAlt: 'A cup of coffee on a cafe table beside a window',
          createdAt: now - 5 * 3600000,
          likes: ['sample-mara', 'sample-theo', 'sample-eli', 'sample-jules'],
          comments: []
        },
        {
          id: 'post-jules-1', authorId: 'sample-jules',
          body: 'Went into the bookshop on Lark Street for five minutes. Came out an hour later with a tote bag and no regrets. #readinglist',
          image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=82',
          imageAlt: 'Tall shelves of books inside a small bookshop',
          createdAt: now - 20 * 3600000,
          likes: ['sample-theo', 'sample-eli'],
          comments: [
            { id: 'comment-jules-1', authorId: 'sample-inez', body: 'The five-minute bookshop visit is a myth.', createdAt: now - 18 * 3600000 }
          ]
        },
        {
          id: 'post-eli-1', authorId: 'sample-eli',
          body: 'Small win: the basil survived another week. I’m choosing to take this personally. #balconygarden',
          image: '',
          imageAlt: '',
          createdAt: now - 28 * 3600000,
          likes: ['sample-mara'],
          comments: []
        }
      ],
      follows: {},
      saved: {},
      notifications: []
    };
  }

  const Store = {
    load() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return this.data = sampleData();
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users) || !Array.isArray(parsed.posts)) {
          return this.data = sampleData();
        }
        parsed.follows = parsed.follows || {};
        parsed.saved = parsed.saved || {};
        parsed.notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
        parsed.posts.forEach((post) => {
          if (!Array.isArray(post.likes)) post.likes = [];
          if (!Array.isArray(post.comments)) post.comments = [];
        });
        return this.data = parsed;
      } catch (error) {
        console.warn('Lately could not read saved browser data.', error);
        return this.data = sampleData();
      }
    },
    save() {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
        return true;
      } catch (error) {
        console.warn('Lately could not save browser data.', error);
        toast('This browser is running low on storage. Try removing a photo.', 'warning');
        return false;
      }
    }
  };

  function currentUser() {
    if (!state.data) return null;
    if (CLOUD) {
      const id = Cloud.getUserId();
      return id ? state.data.users.find((user) => user.id === id && !user.sample) || null : null;
    }
    let id = null;
    try { id = window.localStorage.getItem(SESSION_KEY); } catch (error) { /* storage may be unavailable */ }
    return state.data.users.find((user) => user.id === id && !user.sample) || null;
  }

  function setSession(userId) {
    if (CLOUD) {
      if (!userId) Cloud.clearSession();
      return;
    }
    try {
      if (userId) window.localStorage.setItem(SESSION_KEY, userId);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch (error) { /* keep the app usable for this visit */ }
  }

  function findUser(id) {
    return state.data.users.find((user) => user.id === id) || null;
  }

  function initials(user) {
    return String(user && user.name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function safeImageUrl(value) {
    const image = String(value || '');
    if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image)) return image;
    try {
      const url = new URL(image);
      return url.protocol === 'https:' ? url.href : '';
    } catch (error) { return ''; }
  }

  function safeColor(value) {
    const color = String(value || '');
    return /^#[0-9a-f]{6}$/i.test(color) ? color : '#7b8b79';
  }

  function avatar(user, size = '') {
    const photo = safeImageUrl(user && user.photo);
    const style = `--avatar-color:${safeColor(user && user.color)}`;
    return `<span class="avatar ${size}" style="${style}" aria-hidden="true">${photo ? `<img src="${escapeHtml(photo)}" alt="" />` : escapeHtml(initials(user || {}))}</span>`;
  }

  function userByUsername(username) {
    const normalized = String(username || '').replace(/^@/, '').toLowerCase();
    return state.data.users.find((user) => user.username.toLowerCase() === normalized) || null;
  }

  function getFollowList(userId) {
    return state.data.follows[userId] || [];
  }

  function isFollowing(userId) {
    const me = currentUser();
    return !!me && getFollowList(me.id).includes(userId);
  }

  function followingCount(userId) {
    return getFollowList(userId).length;
  }

  function followerCount(userId) {
    const base = findUser(userId);
    const seeded = base && base.sample ? Number(base.followers) || 0 : 0;
    const live = Object.values(state.data.follows).filter((list) => list.includes(userId)).length;
    return seeded + live;
  }

  function passwordCryptoAvailable() {
    return !!(window.crypto && window.crypto.subtle && window.isSecureContext !== false);
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function hexBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  async function hashPassword(password, salt) {
    const key = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await window.crypto.subtle.deriveBits({
      name: 'PBKDF2', salt: hexBytes(salt), iterations: ITERATIONS, hash: 'SHA-256'
    }, key, 256);
    return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function makeBrand() {
    return `<span class="brand-mark" aria-hidden="true"><span></span></span><span class="brand-word">lately</span>`;
  }

  function renderLoading() {
    return `<main class="loading-page"><div class="loading-card">${makeBrand()}<div class="loading-mark"></div><p>Just a moment.</p></div></main>`;
  }

  function renderAuth() {
    const signup = state.authMode === 'signup';
    return `<main class="auth-page">
      <section class="auth-story" aria-label="About Lately">
        <a class="brand auth-brand" href="#" aria-label="Lately home">${makeBrand()}</a>
        <div class="story-copy">
          <p class="eyebrow eyebrow-light">A little more human</p>
          <h1>Life doesn’t need a highlight reel.</h1>
          <p class="story-lede">A place for the half-finished thoughts, the good light, and the things you’ll want to remember tomorrow.</p>
        </div>
        <article class="story-post">
          <div class="story-post-top"><span class="story-avatar">MV</span><div><strong>Mara Voss</strong><small>@mara.voss · 18 min</small></div><span class="story-dot"></span></div>
          <p>“Took the long way to the river this morning. It had that silver look it gets just before the rain.”</p>
          <div class="story-post-bottom"><span>${icon('heart')} 18</span><span>${icon('comment')} 4</span><span>Just a moment, kept.</span></div>
        </article>
        <div class="story-foot"><span>Make room for the ordinary.</span><span>01 / 03</span></div>
      </section>

      <section class="auth-panel">
        <div class="auth-mobile-brand">${makeBrand()}</div>
        <div class="auth-form-wrap">
          <p class="eyebrow">YOUR CORNER OF THE INTERNET</p>
          <h2>${signup ? 'Come on in.' : 'Good to have you back.'}</h2>
          <p class="auth-intro">${signup ? 'Make an account and find your people.' : 'Pick up where you left off.'}</p>
          ${state.authNotice ? `<p class="auth-notice" role="status">${escapeHtml(state.authNotice)}</p>` : ''}
          <form id="auth-form" class="auth-form" novalidate>
            ${signup ? `<label class="field-label" for="auth-name">Your name</label>
            <input class="text-field" id="auth-name" name="name" type="text" maxlength="48" autocomplete="name" placeholder="What should we call you?" required />` : ''}
            ${signup ? `<label class="field-label" for="auth-username">Username</label>
            <div class="input-with-prefix"><span>@</span><input class="text-field" id="auth-username" name="username" type="text" maxlength="20" autocomplete="username" placeholder="choose-a-handle" autocapitalize="none" required /></div>` : `<label class="field-label" for="auth-identifier">${CLOUD ? 'Email address' : 'Email or username'}</label>
            <input class="text-field" id="auth-identifier" name="identifier" type="${CLOUD ? 'email' : 'text'}" autocomplete="${CLOUD ? 'email' : 'username'}" placeholder="${CLOUD ? 'you@example.com' : 'you@example.com or @handle'}" required />`}
            ${signup ? `<label class="field-label" for="auth-email">Email address</label>
            <input class="text-field" id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />` : ''}
            <label class="field-label" for="auth-password">Password</label>
            <input class="text-field" id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'At least 8 characters' : 'Your password'}" required />
            ${signup ? `<label class="field-label" for="auth-confirm">Confirm password</label>
            <input class="text-field" id="auth-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="Type it once more" required />` : ''}
            <p class="form-error" id="auth-error" role="alert"></p>
            <button class="button button-dark button-wide" type="submit">${signup ? 'Create your account' : 'Log in'} ${icon('arrow')}</button>
          </form>
          ${!signup && CLOUD ? `<p class="auth-forgot"><button type="button" class="text-button" data-action="forgot-password">Forgot your password?</button></p>` : ''}
          <p class="auth-switch">${signup ? 'Already have an account?' : 'New around here?'} <button type="button" class="text-button" data-action="toggle-auth">${signup ? 'Log in' : 'Create an account'}</button></p>
          <p class="local-note">${icon('lock')} ${CLOUD ? (signup ? 'We’ll email a confirmation link after you join. Sign in from any device to see the same account.' : 'Your profile and posts sync across devices when you use the same email and password.') : 'This preview keeps your account on this browser. It isn’t connected to other people or devices yet.'}</p>
        </div>
        <div class="auth-panel-footer">A quieter place to keep in touch <span><a href="lately-website.zip" download>Download website</a> · © 2026 Lately</span></div>
      </section>
    </main>`;
  }

  function navItem(view, label, iconName, badge = '') {
    const current = state.view === view || (view === 'profile' && state.view === 'profile' && state.profileId === currentUser().id);
    return `<button type="button" class="nav-link ${current ? 'is-active' : ''}" data-view="${view}" ${current ? 'aria-current="page"' : ''}>
      <span class="nav-link-icon">${icon(iconName)}</span><span>${label}</span>${badge ? `<span class="nav-count">${badge}</span>` : ''}
    </button>`;
  }

  function renderMobileNav() {
    return `<nav class="mobile-nav" aria-label="Main navigation">
      <button type="button" class="mobile-nav-item ${state.view === 'home' ? 'is-active' : ''}" data-view="home" aria-label="Home">${icon('home')}<span>Home</span></button>
      <button type="button" class="mobile-nav-item ${state.view === 'discover' ? 'is-active' : ''}" data-view="discover" aria-label="Discover">${icon('search')}<span>Find</span></button>
      <button type="button" class="mobile-nav-create" data-action="open-composer" aria-label="Write a post">${icon('plus')}</button>
      <button type="button" class="mobile-nav-item ${state.view === 'saved' ? 'is-active' : ''}" data-view="saved" aria-label="Saved">${icon('bookmark')}<span>Saved</span></button>
      <button type="button" class="mobile-nav-item ${state.view === 'profile' && state.profileId === currentUser().id ? 'is-active' : ''}" data-action="my-profile" aria-label="Your profile">${icon('user')}<span>You</span></button>
    </nav>`;
  }

  function renderShell() {
    const me = currentUser();
    const unread = state.data.notifications.filter((item) => item.userId === me.id && !item.read).length;
    return `<div class="app-shell">
      <aside class="sidebar">
        <a class="brand side-brand" href="#" aria-label="Lately home" data-view="home">${makeBrand()}</a>
        <button type="button" class="button button-dark compose-main" data-action="open-composer">${icon('plus')}<span>Write a post</span></button>
        <nav class="primary-nav" aria-label="Main navigation">
          ${navItem('home', 'Home', 'home')}
          ${navItem('discover', 'Discover', 'search')}
          ${navItem('notifications', 'Notifications', 'bell', unread ? String(unread) : '')}
          ${navItem('saved', 'Saved', 'bookmark')}
        </nav>
        <div class="sidebar-rule"></div>
        <button type="button" class="nav-link ${state.view === 'profile' && state.profileId === me.id ? 'is-active' : ''}" data-action="my-profile">
          <span class="nav-link-icon">${icon('user')}</span><span>My profile</span>
        </button>
        <button type="button" class="nav-link ${state.view === 'settings' ? 'is-active' : ''}" data-view="settings">
          <span class="nav-link-icon">${icon('settings')}</span><span>Account settings</span>
        </button>
        <div class="sidebar-bottom">
          <div class="sidebar-note"><span class="note-mark">✳</span><p>Small moments count, too.</p></div>
          <button type="button" class="account-chip" data-action="my-profile" aria-label="Open your profile">
            ${avatar(me, 'avatar-small')}
            <span class="account-chip-meta"><strong>${escapeHtml(me.name)}</strong><small>@${escapeHtml(me.username)}</small></span>
            <span class="account-chip-more">${icon('dots')}</span>
          </button>
          <button type="button" class="sign-out-link" data-action="logout">${icon('logout')}<span>Log out</span></button>
        </div>
      </aside>

      <div class="main-column">
        <header class="mobile-topbar">
          <a class="brand" href="#" data-view="home">${makeBrand()}</a>
          <div class="mobile-top-actions">
            <button type="button" class="icon-button" data-action="focus-search" aria-label="Search">${icon('search')}</button>
            <button type="button" class="icon-button mobile-bell" data-view="notifications" aria-label="Notifications">${icon('bell')}${unread ? '<i></i>' : ''}</button>
          </div>
        </header>
        <div class="main-scroll" id="main-scroll">
          <div class="mobile-search-slot" id="mobile-search-slot"></div>
          <main class="page-content" id="page-content">${renderView()}</main>
        </div>
      </div>

      <aside class="right-rail" aria-label="Your corner">
        ${renderRightRail()}
      </aside>
      ${renderMobileNav()}
      <div id="modal-root"></div>
    </div>`;
  }

  function greetingDate() {
    return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
  }

  function renderComposePrompt() {
    const me = currentUser();
    return `<section class="compose-prompt">
      ${avatar(me, 'avatar-medium')}
      <button type="button" class="compose-placeholder" data-action="open-composer">What’s on your mind, ${escapeHtml(me.name.split(' ')[0])}?</button>
      <button type="button" class="compose-photo-button" data-action="open-composer" aria-label="Add a photo">${icon('photo')}</button>
    </section>`;
  }

  function feedPosts(tab = state.feedTab) {
    const me = currentUser();
    const following = new Set([me.id, ...getFollowList(me.id)]);
    return state.data.posts
      .filter((post) => tab !== 'following' || following.has(post.authorId))
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderHome() {
    const me = currentUser();
    const firstName = escapeHtml(me.name.split(' ')[0]);
    const posts = feedPosts();
    const activeTab = state.feedTab;
    let list = '';
    if (posts.length) list = posts.map(renderPost).join('');
    else if (activeTab === 'following') list = `<section class="empty-state"><span class="empty-illustration">${icon('user')}</span><h2>Your feed is quiet.</h2><p>Follow a few people and their posts will show up here.</p><button type="button" class="button button-outline" data-view="discover">Find people</button></section>`;
    else list = `<section class="empty-state"><span class="empty-illustration">${icon('spark')}</span><h2>Nothing here just yet.</h2><p>Write the first post you’d like to remember.</p><button type="button" class="button button-outline" data-action="open-composer">Write a post</button></section>`;

    return `<header class="view-heading home-heading">
      <div><p class="eyebrow">${greetingDate()}</p><h1>Good to see you, ${firstName}.</h1><p class="view-subtitle">A little of what’s been happening.</p></div>
      <button type="button" class="heading-search-button" data-action="focus-search" aria-label="Search Lately">${icon('search')}</button>
    </header>
    <div class="feed-tabs" role="tablist" aria-label="Choose your feed">
      <button type="button" role="tab" aria-selected="${activeTab === 'for-you'}" class="feed-tab ${activeTab === 'for-you' ? 'is-active' : ''}" data-action="feed-tab" data-tab="for-you">For you</button>
      <button type="button" role="tab" aria-selected="${activeTab === 'following'}" class="feed-tab ${activeTab === 'following' ? 'is-active' : ''}" data-action="feed-tab" data-tab="following">Following</button>
    </div>
    ${renderComposePrompt()}
    <section class="feed-list" aria-label="Recent posts">${list}</section>`;
  }

  function timeAgo(timestamp) {
    const elapsed = Math.max(0, Date.now() - Number(timestamp || Date.now()));
    if (elapsed < 60000) return 'just now';
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m`;
    if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h`;
    if (elapsed < 604800000) return `${Math.floor(elapsed / 86400000)}d`;
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(timestamp));
  }

  function exactTime(timestamp) {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
  }

  function formatPostBody(body) {
    const safe = escapeHtml(body).replace(/\n/g, '<br>');
    return safe.replace(/(^|\s)(#[a-z0-9_]+)/gi, (match, before, tag) => `${before}<button type="button" class="inline-tag" data-action="tag" data-tag="${escapeHtml(tag.toLowerCase())}">${tag}</button>`);
  }

  function renderPost(post) {
    const author = findUser(post.authorId);
    if (!author) return '';
    const me = currentUser();
    const liked = Array.isArray(post.likes) && post.likes.includes(me.id);
    const saved = (state.data.saved[me.id] || []).includes(post.id);
    const image = safeImageUrl(post.image);
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const latestComment = comments.length ? comments[comments.length - 1] : null;
    const commenter = latestComment && findUser(latestComment.authorId);

    return `<article class="post-card" data-post-card="${escapeHtml(post.id)}">
      <header class="post-header">
        <button type="button" class="post-author" data-action="view-profile" data-user-id="${escapeHtml(author.id)}" aria-label="View ${escapeHtml(author.name)}’s profile">
          ${avatar(author, 'avatar-medium')}
          <span class="post-author-copy"><strong>${escapeHtml(author.name)}</strong><small>@${escapeHtml(author.username)}</small></span>
        </button>
        <time class="post-time" datetime="${new Date(post.createdAt).toISOString()}" title="${escapeHtml(exactTime(post.createdAt))}">${timeAgo(post.createdAt)}</time>
        <button type="button" class="post-menu-button" data-action="share-post" data-post-id="${escapeHtml(post.id)}" aria-label="Share this post">${icon('dots')}</button>
      </header>
      <div class="post-copy">${formatPostBody(post.body)}</div>
      ${image ? `<div class="post-photo"><img src="${escapeHtml(image)}" alt="${escapeHtml(post.imageAlt || 'Photo attached to this post')}" loading="lazy" /><span class="photo-fallback">Photo couldn’t be loaded</span></div>` : ''}
      <div class="post-actions">
        <button type="button" class="post-action like-action ${liked ? 'is-liked' : ''}" data-action="like-post" data-post-id="${escapeHtml(post.id)}" aria-pressed="${liked}" aria-label="${liked ? 'Unlike' : 'Like'} post">
          ${icon('heart')}<span>${post.likes.length || ''}</span>
        </button>
        <button type="button" class="post-action" data-action="open-comments" data-post-id="${escapeHtml(post.id)}" aria-label="Open ${comments.length} comments">
          ${icon('comment')}<span>${comments.length || ''}</span>
        </button>
        <button type="button" class="post-action post-share-action" data-action="share-post" data-post-id="${escapeHtml(post.id)}" aria-label="Share post">${icon('share')}</button>
        <button type="button" class="post-action save-action ${saved ? 'is-saved' : ''}" data-action="save-post" data-post-id="${escapeHtml(post.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save post'}">${icon('bookmark')}</button>
      </div>
      ${commenter ? `<button type="button" class="comment-preview" data-action="open-comments" data-post-id="${escapeHtml(post.id)}">${avatar(commenter, 'avatar-tiny')}<span><strong>${escapeHtml(commenter.name.split(' ')[0])}</strong> ${escapeHtml(latestComment.body)}</span><span class="view-replies">View</span></button>` : ''}
    </article>`;
  }

  function renderRightRail() {
    const me = currentUser();
    const suggestions = state.data.users.filter((user) => user.id !== me.id && !isFollowing(user.id)).slice(0, 3);
    const tags = popularTags().slice(0, 4);
    return `<div class="rail-inner">
      <form class="rail-search" id="rail-search-form">
        ${icon('search')}<input name="query" type="search" placeholder="Search people and posts" aria-label="Search people and posts" autocomplete="off" value="${escapeHtml(state.search)}" />
        <kbd>⌘ K</kbd>
      </form>
      <section class="rail-card">
        <div class="rail-card-heading"><div><p class="eyebrow">A FEW GOOD PEOPLE</p><h2>Worth a follow</h2></div>${icon('spark')}</div>
        <div class="suggestion-list">${suggestions.length ? suggestions.map((user) => renderSuggestion(user)).join('') : `<p class="rail-empty">You’re all caught up with people to follow.</p>`}</div>
        <button type="button" class="rail-more-link" data-view="discover">Meet more people ${icon('arrow')}</button>
      </section>
      <section class="rail-card trend-card">
        <div class="rail-card-heading"><div><p class="eyebrow">GOOD CONVERSATIONS</p><h2>On people’s minds</h2></div></div>
        <div class="trend-list">${tags.length ? tags.map((tag, index) => `<button type="button" class="trend-row" data-action="tag" data-tag="${escapeHtml(tag.name)}"><span class="trend-index">0${index + 1}</span><span><strong>${escapeHtml(tag.name)}</strong><small>${tag.count} ${tag.count === 1 ? 'post' : 'posts'}</small></span>${icon('arrow')}</button>`).join('') : '<p class="rail-empty">Your conversations will show up here.</p>'}</div>
      </section>
      <footer class="rail-footer"><span>Be kind. Be curious. Be here.</span><span>Made for real life · <button type="button" data-view="settings">Your data</button></span></footer>
    </div>`;
  }

  function renderSuggestion(user) {
    return `<div class="suggestion-row">
      <button type="button" class="suggestion-person" data-action="view-profile" data-user-id="${escapeHtml(user.id)}">${avatar(user, 'avatar-small')}<span><strong>${escapeHtml(user.name)}</strong><small>@${escapeHtml(user.username)}</small></span></button>
      <button type="button" class="follow-button ${isFollowing(user.id) ? 'is-following' : ''}" data-action="toggle-follow" data-user-id="${escapeHtml(user.id)}" aria-label="${isFollowing(user.id) ? 'Unfollow' : 'Follow'} ${escapeHtml(user.name)}">${isFollowing(user.id) ? 'Following' : 'Follow'}</button>
    </div>`;
  }

  function popularTags() {
    const totals = new Map();
    state.data.posts.forEach((post) => {
      const tags = String(post.body || '').match(/#[a-z0-9_]+/gi) || [];
      tags.forEach((tag) => totals.set(tag.toLowerCase(), (totals.get(tag.toLowerCase()) || 0) + 1));
    });
    return Array.from(totals, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function renderDiscover() {
    const query = state.search.trim().toLowerCase().replace(/^#/, '');
    const people = state.data.users.filter((user) => user.id !== currentUser().id && (query === '' || `${user.name} ${user.username} ${user.bio}`.toLowerCase().includes(query)));
    const posts = state.data.posts.filter((post) => {
      if (!query) return false;
      const author = findUser(post.authorId);
      return `${post.body} ${author ? author.name : ''} ${author ? author.username : ''}`.toLowerCase().includes(query) || (query.startsWith('#') && post.body.toLowerCase().includes(query));
    }).sort((a, b) => b.createdAt - a.createdAt);

    return `<header class="view-heading"><div><p class="eyebrow">LOOK AROUND</p><h1>Discover</h1><p class="view-subtitle">Find good people and things worth reading.</p></div></header>
      <form class="discover-search" id="discover-search-form">${icon('search')}<input id="discover-search-input" name="query" type="search" placeholder="Try a name, a place, or #slowmorning" value="${escapeHtml(state.search)}" autocomplete="off" aria-label="Search Lately" /><button class="button button-dark" type="submit">Search</button></form>
      ${query ? `<section class="discover-section"><div class="section-heading"><h2>People</h2><span>${people.length}</span></div>${people.length ? `<div class="discover-people">${people.map((user) => renderDiscoverPerson(user)).join('')}</div>` : `<p class="muted-note">No people matched “${escapeHtml(state.search)}”.</p>`}</section>
      <section class="discover-section"><div class="section-heading"><h2>Posts</h2><span>${posts.length}</span></div>${posts.length ? `<div class="feed-list">${posts.map(renderPost).join('')}</div>` : `<p class="muted-note">No posts matched that search.</p>`}</section>` : `<section class="discover-section"><div class="section-heading"><h2>People to know</h2><span>Take your time</span></div><div class="discover-people">${people.map((user) => renderDiscoverPerson(user)).join('')}</div></section>
      <section class="discover-section"><div class="section-heading"><h2>Conversations</h2><span>From the feed</span></div><div class="topic-grid">${popularTags().map((tag) => `<button type="button" class="topic-card" data-action="tag" data-tag="${escapeHtml(tag.name)}"><span class="topic-label">A LITTLE TRENDING</span><strong>${escapeHtml(tag.name)}</strong><small>${tag.count} ${tag.count === 1 ? 'post' : 'posts'} so far</small></button>`).join('')}</div></section>`}`;
  }

  function renderDiscoverPerson(user) {
    const following = isFollowing(user.id);
    return `<article class="discover-person-card">
      <div class="discover-person-head"><button type="button" class="discover-avatar-button" data-action="view-profile" data-user-id="${escapeHtml(user.id)}">${avatar(user, 'avatar-large')}</button><div><button type="button" class="person-name-link" data-action="view-profile" data-user-id="${escapeHtml(user.id)}">${escapeHtml(user.name)}</button><small>@${escapeHtml(user.username)}</small></div></div>
      <p>${escapeHtml(user.bio || 'Here to share a little of the day.')}</p>
      <div class="discover-person-foot"><span>${followerCount(user.id).toLocaleString()} followers</span><button type="button" class="follow-button ${following ? 'is-following' : ''}" data-action="toggle-follow" data-user-id="${escapeHtml(user.id)}">${following ? 'Following' : 'Follow'}</button></div>
    </article>`;
  }

  function renderNotifications() {
    const me = currentUser();
    const notes = state.data.notifications.filter((item) => item.userId === me.id).sort((a, b) => b.createdAt - a.createdAt);
    if (!notes.length) return `<header class="view-heading"><div><p class="eyebrow">THE SMALL THINGS</p><h1>Notifications</h1><p class="view-subtitle">Replies, likes, and new people to meet.</p></div></header>
      <section class="empty-state notification-empty"><span class="empty-illustration">${icon('bell')}</span><h2>It’s quiet here.</h2><p>When someone likes a post, leaves a reply, or follows you, you’ll find it here.</p></section>`;
    return `<header class="view-heading"><div><p class="eyebrow">THE SMALL THINGS</p><h1>Notifications</h1><p class="view-subtitle">Replies, likes, and new people to meet.</p></div><button class="text-button" type="button" data-action="mark-read">Mark all read</button></header>
      <div class="notification-list">${notes.map((item) => {
        const actor = findUser(item.actorId);
        if (!actor) return '';
        return `<article class="notification-row ${item.read ? '' : 'is-unread'}"><span class="notification-mark">${icon(item.type === 'follow' ? 'user' : item.type === 'comment' ? 'comment' : 'heart')}</span>${avatar(actor, 'avatar-small')}<p><strong>${escapeHtml(actor.name)}</strong> ${escapeHtml(item.text)} <time>${timeAgo(item.createdAt)}</time></p></article>`;
      }).join('')}</div>`;
  }

  function renderSaved() {
    const me = currentUser();
    const ids = state.data.saved[me.id] || [];
    const posts = ids.map((id) => state.data.posts.find((post) => post.id === id)).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
    return `<header class="view-heading"><div><p class="eyebrow">FOR ANOTHER DAY</p><h1>Saved</h1><p class="view-subtitle">Good things, kept close.</p></div></header>
      ${posts.length ? `<section class="feed-list">${posts.map(renderPost).join('')}</section>` : `<section class="empty-state"><span class="empty-illustration">${icon('bookmark')}</span><h2>Keep a post for later.</h2><p>Use the bookmark on any post and it’ll be waiting here when you need it.</p><button type="button" class="button button-outline" data-view="home">Back to your feed</button></section>`}`;
  }

  function renderProfile() {
    const user = findUser(state.profileId) || currentUser();
    if (!user) return renderHome();
    const own = user.id === currentUser().id;
    const posts = state.data.posts.filter((post) => post.authorId === user.id).sort((a, b) => b.createdAt - a.createdAt);
    const following = isFollowing(user.id);
    return `<section class="profile-header-card">
      <div class="profile-cover" style="--cover-color:${safeColor(user.color)}"></div>
      <div class="profile-detail-row">${avatar(user, 'avatar-profile')}<div class="profile-actions">${own ? `<button type="button" class="button button-outline" data-action="edit-profile">Edit profile</button>` : `<button type="button" class="button ${following ? 'button-outline is-following' : 'button-dark'}" data-action="toggle-follow" data-user-id="${escapeHtml(user.id)}">${following ? 'Following' : 'Follow'}</button>`}</div></div>
      <div class="profile-info"><h1>${escapeHtml(user.name)}</h1><p class="profile-handle">@${escapeHtml(user.username)}</p>${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : `<p class="profile-bio muted-note">A new page. Say a little about yourself.</p>`}
        <div class="profile-stats"><span><strong>${posts.length}</strong> posts</span><span><strong>${followerCount(user.id).toLocaleString()}</strong> followers</span><span><strong>${followingCount(user.id)}</strong> following</span></div>
        <p class="profile-joined">${icon('user')} Here since ${new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(user.joinedAt))}</p>
      </div>
    </section>
    <div class="profile-post-heading"><h2>${own ? 'Your posts' : `Posts by ${escapeHtml(user.name.split(' ')[0])}`}</h2><span>${posts.length}</span></div>
    ${posts.length ? `<section class="feed-list">${posts.map(renderPost).join('')}</section>` : `<section class="empty-state profile-empty"><span class="empty-illustration">${icon('photo')}</span><h2>No posts yet.</h2><p>${own ? 'Your first post doesn’t have to be anything big.' : `${escapeHtml(user.name.split(' ')[0])} hasn’t shared anything here yet.`}</p>${own ? `<button type="button" class="button button-outline" data-action="open-composer">Write a post</button>` : ''}</section>`}`;
  }

  function renderSettings() {
    const me = currentUser();
    return `<header class="view-heading"><div><p class="eyebrow">YOUR ACCOUNT</p><h1>Settings</h1><p class="view-subtitle">A few things you can change.</p></div></header>
      <section class="settings-card">
        <div class="settings-card-title"><div><p class="eyebrow">PROFILE</p><h2>Your details</h2></div><button type="button" class="button button-outline button-small" data-action="edit-profile">Edit profile</button></div>
        <div class="settings-detail-row">${avatar(me, 'avatar-medium')}<div><strong>${escapeHtml(me.name)}</strong><small>@${escapeHtml(me.username)} · ${escapeHtml(me.email)}</small></div></div>
      </section>
      <section class="settings-card">
        <div class="settings-card-title"><div><p class="eyebrow">SECURITY</p><h2>Change password</h2></div>${icon('lock')}</div>
        <form id="password-form" class="settings-form" novalidate>
          <label class="field-label" for="old-password">Current password</label><input class="text-field" type="password" id="old-password" name="current" autocomplete="current-password" required />
          <div class="settings-form-row"><div><label class="field-label" for="new-password">New password</label><input class="text-field" type="password" id="new-password" name="password" autocomplete="new-password" minlength="8" required /></div><div><label class="field-label" for="confirm-password">Confirm new password</label><input class="text-field" type="password" id="confirm-password" name="confirm" autocomplete="new-password" minlength="8" required /></div></div>
          <p class="form-error" id="password-error" role="alert"></p><button class="button button-dark" type="submit">Update password</button>
        </form>
      </section>
      <section class="settings-card data-card">
        <div><p class="eyebrow">${CLOUD ? 'YOUR DATA' : 'A NOTE ABOUT THIS PREVIEW'}</p><h2>${CLOUD ? 'Your account travels with you.' : 'Your account lives in this browser.'}</h2><p>${CLOUD ? 'Your profile, posts, follows, and saved posts sync through the shared service, so you can log in from another device. Your email stays private. Profile details and uploaded photos are public; posts are for signed-in members.' : 'Posts, profile details, and your password hash are stored on this device. No one else can see or follow you yet, and your account won’t carry over to another browser. This is a working prototype, not a live network.'}</p></div>
        <div class="data-actions"><button type="button" class="text-button" data-action="export-data">Export my data</button><button type="button" class="text-button danger-text" data-action="delete-account">${CLOUD ? 'Delete my account' : 'Delete local account'}</button></div>
      </section>`;
  }

  function renderView() {
    switch (state.view) {
      case 'discover': return renderDiscover();
      case 'notifications': return renderNotifications();
      case 'saved': return renderSaved();
      case 'profile': return renderProfile();
      case 'settings': return renderSettings();
      case 'home':
      default: return renderHome();
    }
  }

  function render(options = {}) {
    if (!root) return;
    const oldScroll = document.getElementById('main-scroll') ? document.getElementById('main-scroll').scrollTop : 0;
    if (state.loading) {
      root.innerHTML = renderLoading();
      document.title = 'Lately — life, as it happens';
      return;
    }
    const user = currentUser();
    if (!user) {
      root.innerHTML = renderAuth();
      document.title = 'Lately — life, as it happens';
      const first = document.getElementById(state.authMode === 'signup' ? 'auth-name' : 'auth-identifier');
      if (first) first.focus({ preventScroll: true });
      return;
    }
    if (state.view === 'profile' && !findUser(state.profileId)) state.profileId = user.id;
    root.innerHTML = renderShell();
    document.title = `${state.view === 'home' ? 'Home' : state.view[0].toUpperCase() + state.view.slice(1)} — Lately`;
    if (options.preserveScroll) {
      const scroll = document.getElementById('main-scroll');
      if (scroll) scroll.scrollTop = oldScroll;
    }
  }

  function toast(message, kind = 'success') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const item = document.createElement('div');
    item.className = `toast toast-${kind}`;
    item.setAttribute('role', 'status');
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => {
      item.classList.add('is-leaving');
      window.setTimeout(() => item.remove(), 250);
    }, 2800);
  }

  function setView(view) {
    state.view = view;
    if (view === 'profile') state.profileId = currentUser().id;
    if (view === 'discover' && !state.search) state.search = '';
    render();
    const scroll = document.getElementById('main-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  async function reloadCloud(preserveScroll = true) {
    if (!CLOUD) return;
    state.data = await Cloud.loadData();
    render({ preserveScroll });
  }

  async function toggleFollow(userId) {
    const me = currentUser();
    const person = findUser(userId);
    if (!person || !me || person.id === me.id) return;
    const list = getFollowList(me.id).slice();
    const wasFollowing = list.includes(userId);
    if (CLOUD) {
      try {
        await Cloud.toggleFollow(me.id, userId, wasFollowing);
        await reloadCloud(true);
        toast(wasFollowing ? `You unfollowed ${person.name.split(' ')[0]}.` : `You’re following ${person.name.split(' ')[0]}.`, wasFollowing ? 'neutral' : 'success');
      } catch (error) { toast(error.message || 'Could not update that follow.', 'warning'); }
      return;
    }
    if (wasFollowing) {
      state.data.follows[me.id] = list.filter((id) => id !== userId);
      toast(`You unfollowed ${person.name.split(' ')[0]}.`, 'neutral');
    } else {
      state.data.follows[me.id] = [...list, userId];
      toast(`You’re following ${person.name.split(' ')[0]}.`);
    }
    Store.save();
    render({ preserveScroll: true });
  }

  async function toggleLike(postId) {
    const post = state.data.posts.find((item) => item.id === postId);
    const me = currentUser();
    if (!post || !me) return;
    post.likes = Array.isArray(post.likes) ? post.likes : [];
    const wasLiked = post.likes.includes(me.id);
    if (CLOUD) {
      try {
        await Cloud.toggleLike(postId, me.id, wasLiked);
        await reloadCloud(true);
      } catch (error) { toast(error.message || 'Could not update that like.', 'warning'); }
      return;
    }
    post.likes = wasLiked ? post.likes.filter((id) => id !== me.id) : [...post.likes, me.id];
    Store.save();
    render({ preserveScroll: true });
  }

  async function toggleSaved(postId) {
    const me = currentUser();
    if (!me) return;
    const saved = state.data.saved[me.id] || [];
    const wasSaved = saved.includes(postId);
    if (CLOUD) {
      try {
        await Cloud.toggleSaved(postId, me.id, wasSaved);
        await reloadCloud(true);
        toast(wasSaved ? 'Removed from saved.' : 'Saved for later.', 'neutral');
      } catch (error) { toast(error.message || 'Could not update your saved posts.', 'warning'); }
      return;
    }
    state.data.saved[me.id] = wasSaved ? saved.filter((id) => id !== postId) : [...saved, postId];
    const added = state.data.saved[me.id].includes(postId);
    Store.save();
    render({ preserveScroll: true });
    toast(added ? 'Saved for later.' : 'Removed from saved.', 'neutral');
  }

  function openModal(markup) {
    const target = document.getElementById('modal-root');
    if (target) target.innerHTML = markup;
    const focusTarget = target && target.querySelector('[autofocus], textarea, input:not([type="file"]), button');
    if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 10);
  }

  function closeModal() {
    const target = document.getElementById('modal-root');
    if (target) target.innerHTML = '';
    state.pendingImage = null;
    state.pendingProfileImage = null;
  }

  function openSetPassword() {
    openModal(`<div class="modal-backdrop"><section class="modal-card recovery-modal" role="dialog" aria-modal="true" aria-labelledby="set-password-title">
      <header class="modal-header"><div><p class="eyebrow">ACCOUNT ACCESS</p><h2 id="set-password-title">Choose a new password</h2></div></header>
      <form id="set-password-form" class="settings-form recovery-form" novalidate><p class="recovery-copy">Use at least eight characters. This will replace the password on your account.</p><label class="field-label" for="reset-password">New password</label><input class="text-field" id="reset-password" name="password" type="password" autocomplete="new-password" required /><label class="field-label" for="reset-password-confirm">Confirm password</label><input class="text-field" id="reset-password-confirm" name="confirm" type="password" autocomplete="new-password" required /><p class="form-error" id="set-password-error" role="alert"></p><div class="modal-footer"><button type="submit" class="button button-dark">Save new password</button></div></form>
    </section></div>`);
  }

  async function submitSetPassword(form) {
    const values = new FormData(form);
    const password = String(values.get('password') || '');
    const confirm = String(values.get('confirm') || '');
    if (password.length < 8) return setFormError('set-password-error', 'Use at least 8 characters.');
    if (password !== confirm) return setFormError('set-password-error', 'Those passwords don’t match.');
    try {
      await Cloud.setPassword(password);
      state.data = await Cloud.loadData();
      state.view = 'home';
      closeModal();
      render();
      toast('Your password has been reset.');
    } catch (error) { setFormError('set-password-error', error.message || 'That reset link may have expired. Request a new one.'); }
  }

  function openPasswordRecovery() {
    if (!CLOUD) return;
    openModal(`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-card recovery-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
      <header class="modal-header"><div><p class="eyebrow">ACCOUNT ACCESS</p><h2 id="recovery-title">Reset your password</h2></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
      <form id="recovery-form" class="settings-form recovery-form" novalidate><p class="recovery-copy">We’ll send a password reset link to the email address on your account.</p><label class="field-label" for="recovery-email">Email address</label><input class="text-field" id="recovery-email" name="email" type="email" autocomplete="email" required /><p class="form-error" id="recovery-error" role="alert"></p><div class="modal-footer"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button type="submit" class="button button-dark">Send reset link</button></div></form>
    </section></div>`);
  }

  async function submitPasswordRecovery(form) {
    const email = String(new FormData(form).get('email') || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('recovery-error', 'Enter a valid email address.');
    try {
      await Cloud.requestPasswordReset(email);
      closeModal();
      toast('If that email is registered, a reset link is on its way.');
    } catch (error) {
      setFormError('recovery-error', error.message || 'We couldn’t send the reset link. Try again.');
    }
  }

  function openComposer() {
    state.pendingImage = null;
    const me = currentUser();
    openModal(`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-card composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <header class="modal-header"><div><p class="eyebrow">A MOMENT, KEPT</p><h2 id="composer-title">Write a post</h2></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
      <form id="composer-form" class="composer-form" novalidate>
        <div class="composer-author">${avatar(me, 'avatar-medium')}<div><strong>${escapeHtml(me.name)}</strong><small>@${escapeHtml(me.username)}</small></div></div>
        <textarea id="composer-body" name="body" maxlength="1200" placeholder="What’s happening? It can be something small." aria-label="Write your post"></textarea>
        <div class="composer-preview hidden" id="composer-image-preview"><img alt="Photo preview" /><button type="button" class="preview-remove" data-action="remove-pending-image" aria-label="Remove photo">${icon('close')}</button></div>
        <p class="form-error" id="composer-error" role="alert"></p>
        <footer class="composer-footer"><div><label class="button button-outline button-small photo-picker">${icon('photo')} Add a photo<input id="composer-file" type="file" accept="image/*" hidden /></label><span class="composer-help">Keep it kind. Keep it yours.</span></div><button class="button button-dark" type="submit">Post it</button></footer>
      </form>
    </section></div>`);
  }

  function openComments(postId) {
    const post = state.data.posts.find((item) => item.id === postId);
    if (!post) return;
    const author = findUser(post.authorId);
    const comments = post.comments || [];
    openModal(`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-card comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-title">
      <header class="modal-header"><div><p class="eyebrow">A GOOD CONVERSATION</p><h2 id="comments-title">Replies</h2></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
      <div class="commented-post"><div class="comment-author-row">${avatar(author, 'avatar-small')}<strong>${escapeHtml(author.name)}</strong><small>${timeAgo(post.createdAt)}</small></div><p>${formatPostBody(post.body)}</p></div>
      <div class="comments-list">${comments.length ? comments.map((comment) => { const person = findUser(comment.authorId); return person ? `<article class="comment-row">${avatar(person, 'avatar-small')}<div><div class="comment-meta"><strong>${escapeHtml(person.name)}</strong><time>${timeAgo(comment.createdAt)}</time></div><p>${escapeHtml(comment.body)}</p></div></article>` : ''; }).join('') : `<p class="no-comments">Nothing here yet. You can start.</p>`}</div>
      <form class="comment-form" id="comment-form" data-post-id="${escapeHtml(postId)}"><label class="sr-only" for="comment-text">Write a reply</label><textarea id="comment-text" name="comment" maxlength="500" rows="2" placeholder="Add something kind…" required></textarea><button type="submit" class="button button-dark">Reply</button></form>
    </section></div>`);
  }

  function openEditProfile() {
    const me = currentUser();
    state.pendingProfileImage = null;
    openModal(`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-card edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <header class="modal-header"><div><p class="eyebrow">MAKE IT YOURS</p><h2 id="edit-profile-title">Edit your profile</h2></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
      <form id="profile-form" class="settings-form" novalidate>
        <div class="profile-photo-edit">${avatar(me, 'avatar-large')}<label class="text-button photo-text-button">Change photo<input type="file" id="profile-file" accept="image/*" hidden /></label><span class="photo-edit-preview hidden" id="profile-photo-preview"></span></div>
        <label class="field-label" for="profile-name">Name</label><input class="text-field" id="profile-name" name="name" maxlength="48" value="${escapeHtml(me.name)}" required />
        <label class="field-label" for="profile-bio">A little about you</label><textarea class="text-field bio-field" id="profile-bio" name="bio" maxlength="180" placeholder="The little things you like…">${escapeHtml(me.bio || '')}</textarea>
        <p class="form-error" id="profile-error" role="alert"></p><div class="modal-footer"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button type="submit" class="button button-dark">Save changes</button></div>
      </form>
    </section></div>`);
  }

  async function compressImage(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 12 * 1024 * 1024) throw new Error('That photo is too large. Choose one under 12 MB.');
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('We couldn’t open that photo.'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('That photo could not be read.'));
      element.src = source;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) throw new Error('We couldn’t prepare that photo. Try another one.');
    if (blob.size > 900 * 1024) throw new Error('That photo is still too large after resizing. Try a smaller image.');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('We couldn’t finish preparing that photo.'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  function setFormError(id, message) {
    const target = document.getElementById(id);
    if (target) target.textContent = message || '';
  }

  async function handleCloudAuth(formData, showError) {
    const password = String(formData.get('password') || '');
    try {
      if (state.authMode === 'signup') {
        const name = String(formData.get('name') || '').trim();
        const username = String(formData.get('username') || '').trim().replace(/^@/, '').toLowerCase();
        const email = String(formData.get('email') || '').trim().toLowerCase();
        const confirm = String(formData.get('confirm') || '');
        if (name.length < 2) return showError('Add your name so people know it’s you.');
        if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(username)) return showError('Use 3–20 letters, numbers, dots, or underscores for your username.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('That email address doesn’t look quite right.');
        if (password.length < 8) return showError('Choose a password with at least 8 characters.');
        if (password !== confirm) return showError('Those passwords don’t match yet.');
        if (!(await Cloud.checkUsername(username))) return showError('That username is already taken. Try another.');
        const colors = ['#bd8267', '#728878', '#b69352', '#81799a', '#648b85'];
        const result = await Cloud.signUp({ email, password, username, displayName: name, color: colors[Math.floor(Math.random() * colors.length)] });
        if (!result.session) {
          state.authMode = 'login';
          state.authNotice = 'Check your email and follow the confirmation link to continue to Lately.';
          render();
          return;
        }
        state.data = await Cloud.loadData();
        state.authNotice = '';
        state.view = 'home';
        state.feedTab = 'for-you';
        render();
        toast(`Welcome to Lately, ${name.split(' ')[0]}.`);
        return;
      }

      const email = String(formData.get('identifier') || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Enter the email address on your account.');
      const session = await Cloud.signIn(email, password);
      if (!session) return showError('We couldn’t start a session. Try again.');
      state.data = await Cloud.loadData();
      state.authNotice = '';
      state.view = 'home';
      render();
      const me = currentUser();
      toast(`Welcome back, ${me ? me.name.split(' ')[0] : 'again'}.`);
    } catch (error) {
      console.error('Lately cloud account action failed.', error);
      showError(error.message || 'We couldn’t complete that account action. Please try again.');
    }
  }

  async function handleAuth(form) {
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const errorBox = document.getElementById('auth-error');
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const showError = (message) => { if (errorBox) errorBox.textContent = message; if (submit) submit.disabled = false; };

    if (CLOUD) return handleCloudAuth(formData, showError);
    if (!passwordCryptoAvailable()) {
      showError('For account security, open Lately on HTTPS or localhost.');
      return;
    }

    try {
      if (state.authMode === 'signup') {
        const name = String(formData.get('name') || '').trim();
        const username = String(formData.get('username') || '').trim().replace(/^@/, '').toLowerCase();
        const email = String(formData.get('email') || '').trim().toLowerCase();
        const confirm = String(formData.get('confirm') || '');
        if (name.length < 2) return showError('Add your name so people know it’s you.');
        if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(username)) return showError('Use 3–20 letters, numbers, dots, or underscores for your username.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('That email address doesn’t look quite right.');
        if (state.data.users.some((user) => user.username.toLowerCase() === username)) return showError('That username is already taken. Try another.');
        if (state.data.users.some((user) => user.email && user.email.toLowerCase() === email)) return showError('There’s already an account with that email.');
        if (password.length < 8) return showError('Choose a password with at least 8 characters.');
        if (password !== confirm) return showError('Those passwords don’t match yet.');

        const salt = randomSalt();
        const passwordHash = await hashPassword(password, salt);
        const user = {
          id: uid('user'), name, username, email, bio: '', color: ['#bd8267', '#728878', '#b69352', '#81799a', '#648b85'][state.data.users.filter((entry) => !entry.sample).length % 5],
          photo: null, passwordSalt: salt, passwordHash, sample: false, joinedAt: Date.now()
        };
        state.data.users.push(user);
        state.data.follows[user.id] = [];
        state.data.saved[user.id] = [];
        Store.save();
        setSession(user.id);
        state.view = 'home';
        state.feedTab = 'for-you';
        render();
        toast(`Welcome to Lately, ${name.split(' ')[0]}.`);
        return;
      }

      const identifier = String(formData.get('identifier') || '').trim().replace(/^@/, '').toLowerCase();
      const user = state.data.users.find((entry) => !entry.sample && (entry.username.toLowerCase() === identifier || String(entry.email || '').toLowerCase() === identifier));
      if (!user || !user.passwordSalt || !user.passwordHash || (await hashPassword(password, user.passwordSalt)) !== user.passwordHash) {
        return showError('We couldn’t find an account with those details. Check them and try again.');
      }
      setSession(user.id);
      state.view = 'home';
      render();
      toast(`Welcome back, ${user.name.split(' ')[0]}.`);
    } catch (error) {
      console.error('Lately account action failed.', error);
      showError('Something went wrong. Please try once more.');
    }
  }

  function navigateProfile(userId) {
    if (!findUser(userId)) return;
    state.profileId = userId;
    state.view = 'profile';
    render();
    const scroll = document.getElementById('main-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  async function sharePost(postId) {
    const post = state.data.posts.find((item) => item.id === postId);
    const author = post && findUser(post.authorId);
    if (!post || !author) return;
    const text = `@${author.username}: ${post.body}`;
    try {
      if (navigator.share) await navigator.share({ title: `A post from ${author.name}`, text });
      else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast('Post copied to your clipboard.');
      } else {
        toast('Sharing is not available in this browser.', 'warning');
      }
    } catch (error) {
      if (error && error.name !== 'AbortError') toast('We couldn’t share that post just now.', 'warning');
    }
  }

  function focusSearch() {
    if (state.view !== 'discover') {
      state.view = 'discover';
      state.search = '';
      render();
    }
    const search = document.getElementById('discover-search-input');
    if (search) search.focus();
  }

  function doSearch(query) {
    state.search = String(query || '').trim();
    state.view = 'discover';
    render();
    const input = document.getElementById('discover-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  async function saveProfile(form) {
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const bio = String(formData.get('bio') || '').trim();
    if (name.length < 2) return setFormError('profile-error', 'Your name needs at least two characters.');
    const user = currentUser();
    if (CLOUD) {
      try {
        await Cloud.updateProfile({ userId: user.id, displayName: name.slice(0, 48), bio: bio.slice(0, 180), photo: state.pendingProfileImage });
        state.data = await Cloud.loadData();
        closeModal();
        render({ preserveScroll: true });
        toast('Profile updated.');
      } catch (error) { setFormError('profile-error', error.message || 'We couldn’t update your profile.'); }
      return;
    }
    user.name = name.slice(0, 48);
    user.bio = bio.slice(0, 180);
    if (state.pendingProfileImage) user.photo = state.pendingProfileImage;
    Store.save();
    closeModal();
    render({ preserveScroll: true });
    toast('Profile updated.');
  }

  async function handleComment(form) {
    const post = state.data.posts.find((item) => item.id === form.dataset.postId);
    const body = String(new FormData(form).get('comment') || '').trim();
    if (!post || !body) return;
    if (CLOUD) {
      try {
        await Cloud.addComment(post.id, currentUser().id, body.slice(0, 500));
        state.data = await Cloud.loadData();
        closeModal();
        render({ preserveScroll: true });
        toast('Reply added.');
      } catch (error) { toast(error.message || 'We couldn’t add that reply.', 'warning'); }
      return;
    }
    post.comments = Array.isArray(post.comments) ? post.comments : [];
    post.comments.push({ id: uid('comment'), authorId: currentUser().id, body: body.slice(0, 500), createdAt: Date.now() });
    Store.save();
    closeModal();
    render({ preserveScroll: true });
    toast('Reply added.');
  }

  async function createPost(form) {
    const body = String(new FormData(form).get('body') || '').trim();
    if (!body && !state.pendingImage) return setFormError('composer-error', 'Write a line or add a photo first.');
    if (CLOUD) {
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await Cloud.createPost({ body: body.slice(0, 1200), image: state.pendingImage, imageAlt: state.pendingImage ? 'A photo shared by ' + currentUser().name : '' });
        state.data = await Cloud.loadData();
        state.view = 'home';
        state.feedTab = 'for-you';
        closeModal();
        render();
        toast('Your post is up.');
      } catch (error) {
        if (submit) submit.disabled = false;
        setFormError('composer-error', error.message || 'We couldn’t publish that post.');
      }
      return;
    }
    const post = {
      id: uid('post'), authorId: currentUser().id, body: body.slice(0, 1200), image: state.pendingImage || '', imageAlt: state.pendingImage ? 'A photo shared by ' + currentUser().name : '',
      createdAt: Date.now(), likes: [], comments: []
    };
    state.data.posts.unshift(post);
    Store.save();
    state.view = 'home';
    state.feedTab = 'for-you';
    closeModal();
    render();
    toast('Your post is up.');
  }

  async function changePassword(form) {
    const formData = new FormData(form);
    const current = String(formData.get('current') || '');
    const password = String(formData.get('password') || '');
    const confirm = String(formData.get('confirm') || '');
    const user = currentUser();
    if (CLOUD) {
      if (!user) return setFormError('password-error', 'Please log in again before changing your password.');
      if (password.length < 8) return setFormError('password-error', 'Use at least 8 characters for the new password.');
      if (password !== confirm) return setFormError('password-error', 'The new passwords don’t match.');
      try {
        await Cloud.updatePassword({ email: user.email, currentPassword: current, newPassword: password });
        form.reset();
        setFormError('password-error', '');
        toast('Password updated.');
      } catch (error) { setFormError('password-error', error.message || 'We couldn’t update your password.'); }
      return;
    }
    if (!passwordCryptoAvailable()) return setFormError('password-error', 'Open Lately on HTTPS or localhost to update your password.');
    if (!user || (await hashPassword(current, user.passwordSalt)) !== user.passwordHash) return setFormError('password-error', 'Your current password isn’t right.');
    if (password.length < 8) return setFormError('password-error', 'Use at least 8 characters for the new password.');
    if (password !== confirm) return setFormError('password-error', 'The new passwords don’t match.');
    user.passwordSalt = randomSalt();
    user.passwordHash = await hashPassword(password, user.passwordSalt);
    Store.save();
    form.reset();
    setFormError('password-error', '');
    toast('Password updated.');
  }

  async function deleteAccount() {
    if (!window.confirm(CLOUD ? 'Delete your account and all of its posts, follows, and photos? This can’t be undone.' : 'Delete this account and its local posts? This can’t be undone.')) return;
    const me = currentUser();
    if (!me) return;
    if (CLOUD) {
      try {
        await Cloud.deleteOwnAccount();
        state.data = { version: 1, users: [], posts: [], follows: {}, saved: {}, notifications: [] };
        state.authMode = 'signup';
        state.view = 'home';
        render();
        toast('Your account was deleted.', 'neutral');
      } catch (error) { toast(error.message || 'We couldn’t delete your account.', 'warning'); }
      return;
    }
    state.data.users = state.data.users.filter((user) => user.id !== me.id);
    state.data.posts = state.data.posts.filter((post) => post.authorId !== me.id);
    state.data.posts.forEach((post) => {
      post.likes = (post.likes || []).filter((id) => id !== me.id);
      post.comments = (post.comments || []).filter((comment) => comment.authorId !== me.id);
    });
    delete state.data.follows[me.id];
    delete state.data.saved[me.id];
    state.data.notifications = state.data.notifications.filter((item) => item.userId !== me.id && item.actorId !== me.id);
    Store.save();
    setSession(null);
    state.view = 'home';
    state.authMode = 'signup';
    render();
    toast('Your local account was deleted.', 'neutral');
  }

  async function markNotificationsRead() {
    const me = currentUser();
    if (CLOUD) {
      try { await Cloud.markNotificationsRead(me.id); await reloadCloud(true); }
      catch (error) { toast(error.message || 'Could not update notifications.', 'warning'); }
      return;
    }
    state.data.notifications.forEach((item) => { if (item.userId === me.id) item.read = true; });
    Store.save();
    render({ preserveScroll: true });
  }

  function exportLocalData() {
    const me = currentUser();
    const exportObject = {
      profile: { id: me.id, name: me.name, username: me.username, email: me.email, bio: me.bio, joinedAt: me.joinedAt },
      posts: state.data.posts.filter((post) => post.authorId === me.id),
      likes: state.data.posts.filter((post) => (post.likes || []).includes(me.id)).map((post) => post.id),
      comments: state.data.posts.flatMap((post) => (post.comments || []).filter((comment) => comment.authorId === me.id).map((comment) => ({ postId: post.id, ...comment }))),
      following: state.data.follows[me.id] || [],
      savedPostIds: state.data.saved[me.id] || [],
      notifications: state.data.notifications.filter((item) => item.userId === me.id),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lately-${me.username}-data.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Your data file is ready.');
  }

  async function logout() {
    try {
      if (CLOUD) await Cloud.signOut();
      else setSession(null);
    } catch (error) {
      setSession(null);
      toast(error.message || 'Signed out on this device.', 'neutral');
    }
    state.authMode = 'login';
    state.authNotice = '';
    state.view = 'home';
    state.data = CLOUD ? { version: 1, users: [], posts: [], follows: {}, saved: {}, notifications: [] } : state.data;
    render();
  }

  document.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');
    const viewElement = event.target.closest('[data-view]');
    if (event.target.closest('[data-action="backdrop-close"]') && event.target === event.target.closest('[data-action="backdrop-close"]')) {
      closeModal();
      return;
    }
    if (viewElement && (!actionElement || viewElement !== actionElement)) {
      event.preventDefault();
      setView(viewElement.dataset.view);
      return;
    }
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    switch (action) {
      case 'toggle-auth':
        state.authMode = state.authMode === 'signup' ? 'login' : 'signup';
        state.authNotice = '';
        render();
        break;
      case 'logout':
        logout();
        break;
      case 'my-profile': navigateProfile(currentUser().id); break;
      case 'view-profile': navigateProfile(actionElement.dataset.userId); break;
      case 'toggle-follow': toggleFollow(actionElement.dataset.userId); break;
      case 'like-post': toggleLike(actionElement.dataset.postId); break;
      case 'save-post': toggleSaved(actionElement.dataset.postId); break;
      case 'open-comments': openComments(actionElement.dataset.postId); break;
      case 'share-post': sharePost(actionElement.dataset.postId); break;
      case 'open-composer': openComposer(); break;
      case 'close-modal': closeModal(); break;
      case 'remove-pending-image':
        state.pendingImage = null;
        const composerPreview = document.getElementById('composer-image-preview');
        if (composerPreview) composerPreview.classList.add('hidden');
        break;
      case 'edit-profile': openEditProfile(); break;
      case 'forgot-password': openPasswordRecovery(); break;
      case 'feed-tab':
        state.feedTab = actionElement.dataset.tab;
        render({ preserveScroll: true });
        break;
      case 'tag': doSearch(actionElement.dataset.tag); break;
      case 'focus-search': focusSearch(); break;
      case 'mark-read': markNotificationsRead(); break;
      case 'delete-account': deleteAccount(); break;
      case 'export-data': exportLocalData(); break;
      default: break;
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'auth-form') return handleAuth(form);
    if (form.id === 'recovery-form') return submitPasswordRecovery(form);
    if (form.id === 'set-password-form') return submitSetPassword(form);
    if (form.id === 'composer-form') return createPost(form);
    if (form.id === 'comment-form') return handleComment(form);
    if (form.id === 'profile-form') return saveProfile(form);
    if (form.id === 'password-form') return changePassword(form);
    if (form.id === 'discover-search-form' || form.id === 'rail-search-form') {
      const data = new FormData(form);
      return doSearch(data.get('query'));
    }
  });

  document.addEventListener('change', async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files || !input.files[0]) return;
    try {
      if (input.id === 'composer-file') {
        state.pendingImage = await compressImage(input.files[0]);
        const preview = document.getElementById('composer-image-preview');
        if (preview) {
          preview.querySelector('img').src = state.pendingImage;
          preview.classList.remove('hidden');
        }
      } else if (input.id === 'profile-file') {
        state.pendingProfileImage = await compressImage(input.files[0]);
        const preview = document.getElementById('profile-photo-preview');
        if (preview) {
          preview.innerHTML = `<img src="${escapeHtml(state.pendingProfileImage)}" alt="New profile photo preview" />`;
          preview.classList.remove('hidden');
        }
      }
    } catch (error) {
      toast(error.message || 'Could not open that photo.', 'warning');
      input.value = '';
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      focusSearch();
    }
    if (event.key === 'Escape') closeModal();
  });

  document.addEventListener('input', (event) => {
    if (event.target && event.target.id === 'discover-search-input') {
      state.search = event.target.value;
      const focused = event.target.selectionStart;
      const cursor = focused == null ? state.search.length : focused;
      const page = document.getElementById('page-content');
      if (page) page.innerHTML = renderDiscover();
      const input = document.getElementById('discover-search-input');
      if (input) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(cursor, cursor);
      }
    }
  });

  document.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const photo = image.closest('.post-photo');
    if (photo) {
      photo.classList.add('is-broken');
      image.remove();
      return;
    }
    const avatarNode = image.closest('.avatar');
    if (avatarNode) avatarNode.textContent = avatarNode.dataset.initials || '?';
  }, true);

  window.addEventListener('storage', (event) => {
    if (event.key === STORE_KEY || event.key === SESSION_KEY) {
      state.data = Store.load();
      render({ preserveScroll: true });
    }
  });

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }

  async function init() {
    if (CLOUD) {
      state.loading = true;
      state.data = { version: 1, users: [], posts: [], follows: {}, saved: {}, notifications: [] };
      render();
      let linkType = '';
      try {
        const restored = await Cloud.restoreFromUrl();
        linkType = restored && restored.type || '';
        if (restored && restored.error) {
          state.authMode = 'login';
          state.authNotice = restored.error;
        }
        if (restored && restored.session) state.data = await Cloud.loadData();
      } catch (error) {
        Cloud.clearSession();
        state.authMode = 'login';
        state.authNotice = error.message || 'That sign-in link may have expired. Please log in or request another.';
      }
      state.loading = false;
      render();
      if (linkType === 'recovery' && currentUser()) openSetPassword();
      window.addEventListener('focus', () => {
        if (currentUser()) reloadCloud(true).catch((error) => console.warn('Lately could not refresh the shared feed.', error));
      });
      registerServiceWorker();
      return;
    }
    state.data = Store.load();
    render();
    try {
      if (!window.localStorage.getItem(STORE_KEY)) Store.save();
    } catch (error) { /* private browsing may disable persistent storage */ }
    registerServiceWorker();
  }

  window.Lately = {
    init,
    render,
    getState: () => state,
    utilities: { escapeHtml, timeAgo, safeImageUrl, passwordCryptoAvailable },
    _storeKey: STORE_KEY,
    _sessionKey: SESSION_KEY
  };
  init().catch((error) => {
    console.error('Lately failed to start.', error);
    state.loading = false;
    state.data = state.data || { version: 1, users: [], posts: [], follows: {}, saved: {}, notifications: [] };
    render();
    toast(error.message || 'Lately could not load. Try refreshing.', 'warning');
  });
})();
;
