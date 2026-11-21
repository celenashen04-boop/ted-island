# CHI Island: Move the backend from Vercel to Railway

## Why

On Vercel, the server runs as several short-lived copies. Each copy keeps its own temporary SQLite file and its own list of live players. As a result:

- Players can end up in separate gardens without knowing it.
- Seeds, comments, likes, bridges and profiles disappear when a copy is replaced.

The code already works correctly as **one always-on Node server with a persistent disk**. This guide deploys the same code that way. You don't need to change the game code.

## What stays the same

- `server.mjs` and `garden.mjs`: the API, game rules and SQLite database
- Live updates through Server-Sent Events (`/api/events`)
- Player progress saved per cookie ID: home island, plants, likes, comments, follows, bridge contributions

## Requirements

- A Railway account (sign in with GitHub)
- Node **24**. `node:sqlite` needs it, and `package.json` already sets `"engines": { "node": "24.x" }`.
- The repo on GitHub: `celenashen04-boop/ted-island`

---

## Option A: Railway dashboard (no terminal)

1. Go to railway.com, then choose **New Project → Deploy from GitHub repo → `ted-island`**.
2. Open the service, then **Settings**:
   - Start command: `npm start` (this runs `node server.mjs`; Railway usually detects it)
   - **Replicas: 1.** Do not scale up. SSE clients and SQLite need a single server.
3. Add a volume: right-click the service (or use **+ New → Volume**), attach it to the service, and set the **mount path** to `/data`.
4. Open **Variables** and add:

   ```
   HOST=0.0.0.0
   TED_DATA_DIR=/data
   TED_SECURE_COOKIE=1
   ```

   Do **not** set `PORT`. Railway provides it, and the server already reads it.
5. Go to **Settings → Networking → Generate Domain**.
6. Wait for the deploy to finish, then open the domain.

## Option B: Railway CLI

Run these from the repo folder:

```bash
# 1. Install and log in
npm install -g @railway/cli
railway login              # or: railway login --browserless

# 2. Create the project and link this folder
railway init               # choose a name, e.g. chi-island

# 3. Persistent disk for the SQLite database and PDFs
railway volume add --mount-path /data

# 4. Environment variables
railway variable set HOST=0.0.0.0
railway variable set TED_DATA_DIR=/data
railway variable set TED_SECURE_COOKIE=1

# 5. Deploy
railway up

# 6. Public URL
railway domain
```

If the CLI asks which service to use, pick the app service, not the volume. Afterward, make sure in the dashboard that the service is set to **1 replica**.

To redeploy automatically on every `git push`, connect the GitHub repo to the service in **Settings → Source**.

---

## Optional cleanup in the repo

These files are only used by Vercel. They can stay, but removing them avoids confusion:

```bash
git rm vercel.json api/garden.mjs
git commit -m "Remove Vercel config; deploy on Railway with a persistent volume"
git push
```

If the Railway build log doesn't show Node 24, add a version file and push:

```bash
echo "24" > .nvmrc
git add .nvmrc
git commit -m "Pin Node 24 for Railway"
git push
```

Also update the hosting paragraph in `README.md`. Example:

> Deployed on Railway as a single service with a volume mounted at `/data` (`TED_DATA_DIR=/data`, `HOST=0.0.0.0`, `TED_SECURE_COOKIE=1`). Keep it at one replica. The garden lives in `/data/garden.sqlite`.

---

## Check that it works

1. **Shared garden:** open the site in two different browsers or devices. Plant a seed in one, and it should appear in the other within a second or two without reloading.
2. **Persistence:** redeploy the service (**Deployments → Redeploy**), then reload. Your seeds, likes and comments should still be there.
3. **Live updates:** like a plant in browser A. Its growth should update in browser B.
4. **Data file:** run `railway volume browse /`, which should show `garden.sqlite`.

## Backups (recommended before the conference)

```bash
railway volume files list /
railway volume files download /garden.sqlite ./garden-backup.sqlite
```

Copy `garden.sqlite-wal` too if it's there. The database uses WAL mode.

## After the move

- Stop sharing the old Vercel link, or delete that Vercel project.
- Data created on Vercel does not carry over. The Railway garden starts empty.
- Player identity is still one browser cookie. A new device, a private window or cleared cookies means a new player. Add a simple login later if players will switch devices.
- Add access controls before you upload private conference material.
