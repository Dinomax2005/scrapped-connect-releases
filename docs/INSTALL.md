# Running Lately

## Local preview

1. Install Node.js 18 or newer.
2. From the repository folder, run `npm start` (or `node server.js`).
3. Open <http://localhost:3000>.

For the downloadable static site, extract `lately-website.zip` and upload the contents of its `lately/` folder to an HTTPS host. From the extracted folder, `python3 -m http.server 8000` is also useful for a local preview.

## Accounts and devices

Sign-ups use Supabase Auth, and profiles, posts, follows, likes, replies, saved posts, notifications, and uploaded photos are stored in the Lately Social Supabase project. The same account can log in from another device. Confirmation and password-reset messages need reliable SMTP configured in Supabase before public use.

The website bundle contains only the public project URL and publishable key. Never add a Supabase secret or service-role key to browser files.

## Hosting

Lately is live on GitHub Pages at <https://dinomax2005.github.io/scrapped-connect-releases/>. The Pages workflow also publishes `lately-website.zip` at <https://dinomax2005.github.io/scrapped-connect-releases/lately-website.zip>. This repository’s Pages environment allows the active deployment branch; pushes to that branch publish an updated static site.

If you move to a custom domain, add its URL to **Supabase → Authentication → URL Configuration** before using email links there.

The Electron packaging files in the repository are legacy tooling for the earlier SCRAPPED Connect desktop app. Lately’s supported download is the static website ZIP.
