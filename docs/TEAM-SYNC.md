# Accounts and cross-device sync

Lately uses a dedicated Supabase project for shared account and social data. There is no per-device GitHub sync: sign in with the same email and password on each device to see the same profile, posts, follows, replies, likes, saved posts, and notifications.

Names, usernames, bios, and profile photos are publicly readable. Posts are readable to signed-in members. Uploaded post photos use public Storage URLs, so do not post private images. Email addresses stay in Supabase Auth and are not returned by the public profile query. Database row-level security restricts edits and private saved items to their owner.

Before publishing, configure a reliable SMTP sender and add the final HTTPS domain to Supabase Auth’s redirect allow-list. Never ship a service-role or secret key in the browser bundle; only the publishable key belongs in `src/config.js`.
