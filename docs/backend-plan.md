# CHI Island · Backend plan (v2)

*Version 2 · November 22, 2026 · New in v2. The rules are in [context.md](../context.md). The change log is [logic-changes-2026-11-22.md](logic-changes-2026-11-22.md).*

This plan lists the backend work needed for the v2 logic.

## Current state (commit `0694768`)

- `server.mjs` is a single Node.js process with no dependencies.
  - It serves the app and its API.
  - It pushes garden changes over Server-Sent Events (SSE).
  - It sends a heartbeat to keep connections open.
- `garden.mjs` stores all data in SQLite. The tables are:
  - `residents`, `resident_profiles`, `plants`, `placements`, `watering`, `comments`, `follows`, `activity`
  - `bridges` and `bridge_contributions`
- Research PDFs are stored in the database.
- A browser cookie (`ted-player`, a random UUID) is the only identity.
- `broadcast()` rebuilds the **whole garden snapshot for every connected player** after every change.
- On Vercel, storage is temporary. Separate instances keep separate gardens.

## 1. Hosting and memory (data persistence) — required before the conference

| Item | Requirement |
| --- | --- |
| Always-on host | One long-running Node process with a persistent disk, for example Railway, Render, or Fly.io. Vercel cannot hold SSE connections, run scheduled jobs, or keep SQLite data. |
| Persistent database | Set `TED_DATA_DIR` to the persistent volume. Enable SQLite WAL mode. |
| Backups | Back up automatically every day, and every hour during the conference. Keep copies off the server. Test a restore once before the conference. |
| PDF storage | Move PDFs from the database to the volume or object storage, so the database and its backups stay small. |
| Session memory | Remember each player's last island and position, and restore them after sign-in or refresh. Judge sessions must survive a refresh. |
| Server time | Calculate all expiry times, inactivity, and retention on the server in UTC. The browser only formats them in the player's local time. |

### Decision: demo hosting (confirmed Nov 22)

- The demo, including judges testing remotely on their own devices over several days, runs on **Railway or Render with a small persistent volume**. It uses the current SQLite code with no database change.
- **Why:**
  - Judges need sessions that survive a refresh, one shared garden, and live updates.
  - Vercel cannot guarantee any of these.
  - A laptop with a tunnel would need to stay on and connected for the whole judging period.
- **Expected cost:** a few dollars a month.
- **Setup:** about half a day, following the migration steps below.
- **Later option:** a hosted database, such as Turso (SQLite-compatible), Supabase, or Neon. This would remove the need for a volume, but it requires rewriting the data access code. Consider it after the conference if usage grows.

### Why multiplayer seemed to work on Vercel

- On Vercel, `server.mjs` stores SQLite in the instance's temporary directory (`<tmpdir>/ted-island/garden.sqlite`).
- In small tests, Vercel usually runs a **single warm instance**. Every tester reaches the same database, so they see each other's plants.
- Under conference load, this breaks in three ways:
  1. **More traffic starts more instances.** Each instance has its own database, so players on different instances see different gardens.
  2. **Instances are recycled or redeployed.** The temporary directory is wiped, and seeds, likes, and PDFs disappear.
  3. **Functions have a maximum run time.** Vercel cuts the SSE stream, so live updates drop until the page is refreshed.

### Migration steps: Vercel to an always-on host

1. Create a service on Railway, Render, or Fly.io. Run `node server.mjs` with Node.js 24 or newer as **one instance**, with autoscaling off.
2. Attach a **persistent volume** and set `TED_DATA_DIR` to its mount path.
3. Set `HOST=0.0.0.0`, set `PORT` to the value the platform expects, and set `TED_SECURE_COOKIE=1`. HTTPS is provided by the platform.
4. Make sure the platform's proxy does not buffer `text/event-stream` responses. The server already sends `X-Accel-Buffering: no` and a heartbeat.
5. If existing preview data is worth keeping, copy `garden.sqlite` from a local run. Vercel's temporary data cannot be recovered reliably.
6. Point the domain, and the CHI website's entry button, to the new host.
7. Keep Vercel only for static previews, or remove `vercel.json` and `api/garden.mjs` once the new host is live.
8. Test with several browsers on different networks. Confirm that everyone sees the same garden, that updates arrive without refreshing, and that data survives a server restart.
9. Then run the load test in §7 and turn on the backups described in the table above.

## 2. Accounts and sessions

- **New `accounts` table**
  - anonymous ID (unique)
  - password hash, using Node's built-in `crypto.scrypt` with a per-user salt
  - optional email
  - email consent, with the time it was given
  - judge flag
  - creation time
- **ID generator:** two nature words plus four digits, such as `Mossy-Fern-4821`. Check that the ID is unique. Never derive it from personal data.
- **Sessions:** server-side session tokens in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie. Players can sign out.
- **Login rate limit:** after 5 failed attempts on one ID, wait before allowing another. Apply a separate limit to each IP address.
- **Password reset:** only for accounts with an email. Send a one-time link that expires within 30 minutes.
- **Judges:** create an ID with no password, flagged as a judge. The session lasts for the browser session. Keep judge activity marked so it can be filtered out of research data or cleaned up after judging.
- **Migration:** give every existing `ted-player` cookie user a generated ID on their next visit, and ask them to set a password.

## 3. Island access engine

- **New `island_access` table:** player, island, expiry. Home islands have no row and never expire.
- **Apply rules on the server:**
  - Adopting and planting a foreign seed adds 48 hours.
  - A like adds 24 hours.
  - A comment or reply adds 36 hours.
  - Credit always goes to the plant's **origin** island.
  - The new expiry is `min(max(current expiry, now) + duration, now + 120 h)`.
- **New `access_credits` table:** player, plant, date. It enforces the rule that only a player's first comment per plant per day earns access. Repeat likes and edits never earn access.
- Your own plants and seeds you created yourself never earn access.
- **Check access on the server** for crossing a bridge and for visitor-only data. Never trust the client.
- After each action, return the added time and the new expiry, so the client can show “+24 hours” or “Access full (5 days).”

## 4. Growth, dormancy, and retention

- Replace `growthStage()` with: seed → sprout → young plant → mature plant.
- **Migrate existing plants:** the old stage 3, "Tree," becomes young plant.
- Add `last_activity` to each shared seed. Update it on every like, comment, or reply on any planting of that seed.
- **Calculate state from time:** active, dormant (15–30 days), inactive seedling, warned (day 335), or deleted (day 365).
  - Calculate the state when reading the data, so nothing has to be stored for it.
  - A daily job sends reminders and deletes plants that have expired.
- **Export:** return a JSON or PDF file containing the plant, its research, and all of its discussion. Link it from the day-335 warning.
- **Deletion:**
  - Remove a seed only when every planting has been inactive for 365 days.
  - Keep other plants and other users' contributions on other plants.

## 5. Island maturity rate

- For each island, calculate mature, non-dormant plants ÷ all idea plants planted there, including adopted plantings.
- Recalculate the rate when a plant's stage or dormancy changes. Cache the result and include it in the garden updates.

## 6. Notifications and email

- **New `notifications` table:** recipient, type, plant, comment, created, read.
- **Notification types:**
  - a comment on your plant
  - a reply to your contribution
  - island access ending in 6 hours
  - a "getting thirsty" reminder on day 12
  - the deletion warning on day 335
- Deliver notifications live over SSE, and keep them for players who are offline.
- **Email outbox and worker:**
  - Use a provider such as Resend, Postmark, or Amazon SES.
  - Send email only to players who opted in.
  - Comment emails include the comment text, the commenter's anonymous ID, and a link to the plant.
  - Every email includes a one-click unsubscribe token.
  - Combine access reminders that are due at the same time into one email.
  - When access is extended, cancel the pending reminder and schedule a new one.
- **Email domain:** set up SPF, DKIM, and DMARC, so emails do not land in spam.
- **Scheduler:** run a job every minute in the long-running process. It handles access reminders, and also runs the daily dormancy and retention steps.

## 7. Multiplayer sync

Players interact only through seeds, comments, and replies. Avatars and positions are **not** synchronized.

- **Send only changes:** instead of a full snapshot for every client after every change, send small events such as `plant.watered`, `comment.added`, `plant.stage`, and `access.updated`. Keep the full snapshot for the first connection and for reconnects.
- **Catch up after reconnecting:** number each event and support SSE `Last-Event-ID`, so a client that reconnects receives what it missed. Fall back to a full snapshot if the gap is too large.
- **Send private data only to its owner:** access expiry times and notifications go only to that player's connections.
- **Run one process:** client connections are held in memory. Run a single instance, or add a shared pub/sub layer before running more than one.
- **Concurrency:** use one database transaction per action. Unique constraints already prevent double likes. Make adoption idempotent, so each seed can be planted once per island.
- **Load test:** before the conference, simulate several hundred connected clients and judges acting at the same time.

## 8. Security, privacy, and moderation

- Never return an email address in any API response or SSE event.
- Treat comment text as plain text everywhere, including emails, to prevent cross-site scripting (XSS).
- Validate request origin for POST requests to prevent cross-site request forgery (CSRF).
- Limit comment and upload rates per player.
- Check PDF type and size on the server.
- **Moderation:** players can report a comment or seed. Admins can hide or remove it. Keep a simple admin page, protected by an admin key or account, to review reports and judge sessions.
- **Account deletion:** a player can delete their account and data. Their comments show as “deleted player,” so threads stay readable.
- **Research data (to confirm):** if gameplay data will be used in a CHI paper or study, add consent at sign-up and confirm the plan with your institution's ethics board. Allow judge and test data to be excluded.

## 9. Operations

- Add a health-check endpoint and uptime monitoring.
- Log errors centrally, and never log passwords or emails.
- Use environment variables for secrets, such as email API keys. Never commit them.
- Before the conference, test the staging deployment from the CHI website entry link on phones and laptops.

## 10. Remove from v1

- Delete the `bridges` and `bridge_contributions` tables and the Foundations, Walkway, and Connection calculations.
- Remove tree-span bridge data from the snapshot.
- Remove `canCross` logic based on contributions. Replace it with the access check in §3.
