# Lately

**A quieter place to share the things you want to remember.**

Lately is a small social website with a readable feed, familiar people, and room for ordinary life. It’s built with plain HTML, CSS, and JavaScript, with Supabase providing shared accounts and data across devices.

## Try it here

**Live website:** <https://dinomax2005.github.io/scrapped-connect-releases/> · **Download:** <https://dinomax2005.github.io/scrapped-connect-releases/lately-website.zip>

For a local preview, use Node.js 18 or newer:

```bash
npm start
```

Then open <http://localhost:3000>. The account service is hosted separately, so you can sign in from another browser or device once the site is served from an HTTPS host.

## Download the website

The ready-to-host static site is in **`lately-website.zip`** (also served by the local preview at <http://localhost:3000/download/lately-website.zip>). Extract it and upload the files inside `lately/` to an HTTPS static host. You can also run `python3 -m http.server 8000` from the extracted folder for a local preview.

The bundle contains the public Supabase project URL and publishable key. Those are browser-safe; do **not** put a Supabase `service_role` or secret key in the website. The database uses row-level security to protect user-owned changes.

## What works

- Email sign-up and multi-device sign-in; confirmation, password-reset, and password-change flows (confirmation/reset email delivery requires SMTP setup).
- Profiles, profile photos, the shared feed, text/photo posts, likes, replies, follows, saved posts, and notifications.
- Search, responsive layouts, and an installable PWA shell.
- Supabase Storage for uploaded photos; names, usernames, bios, and uploaded photos are publicly readable. Posts require a signed-in account, and email addresses are not exposed in profiles.

The initial feed includes fictional sample people and posts so it isn’t empty on first launch.

## Hosting and email setup

The site is deployed on **GitHub Pages** at <https://dinomax2005.github.io/scrapped-connect-releases/>. The deployment workflow publishes the static app and ZIP from the current session branch. Supabase’s redirect allow-list includes GitHub Pages, localhost, and common preview hosts; add any custom domain in **Supabase → Authentication → URL Configuration** before using it.

Email confirmation and password recovery use Supabase Auth. Configure a reliable custom SMTP provider in the Supabase dashboard before a public launch; the default email sender is intended for development and may be rate-limited. No email is sent by the app itself.

## Backend

A separate Supabase project named **Lately Social** was created for this website. It stores profiles, posts, likes, replies, follows, saved posts, notifications, and uploaded media. The existing Supabase project for another app was left untouched.

- `src/config.js` — Supabase project URL and **public** publishable key
- `src/cloud.js` — browser auth, REST data access, and photo uploads
- `src/app.js` — UI and interaction flows
- `src/sw.js` — offline app-shell cache
- `server.js` — zero-dependency local preview host
- `lately-website.zip` — static website download bundle

Run the checks with:

```bash
npm test
npm run verify
```
