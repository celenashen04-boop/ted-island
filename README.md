# CHI Island · Research Garden (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). Version 1 is commit `0694768`.*

A local multiplayer prototype using Node.js 24 or newer. Run `npm run dev` from this directory and open [CHI Island](http://127.0.0.1:4173). There are no package dependencies.

## Play

1. Use **WASD** to walk and climb stairs. The edges of the islands and bridges stop you from walking into the gap. Drag the view or use the arrow keys to look around.
2. Press **Q** or select the bottom-right **+** to ready an acorn. Face open grass and tap or click anywhere in the scene for the same short forward throw. If the acorn lands on open grass, add a title, short description, open question, and optional PDF (up to 10 MB), then choose **Plant research seed**.
3. Open **Seed Catalog** from the top-right menu and adopt a seed from another island. Planting it on your home island opens 48 hours of access to that island. Watering a plant adds 24 hours of access to the plant's origin island, and nourishing it adds 36 hours. Access can stack up to 5 days. **Island Access** in the same menu shows the time left for each island. Walk across the bridge in **Player View** while access is active.
4. In a private window or a separate browser profile, sign in as a second player or choose **Login as Judge**. Click a seed or plant in the scene, then open its PDF or select **Like · Water**.

On a phone, turn it sideways. Use the left joystick to move and drag on the right to look around. Tap a plant to open its research. On desktop, the [landscape phone preview](http://127.0.0.1:4173/?preview=mobile) shows the same layout.

New players receive an anonymous user ID, such as `Mossy-Fern-4821`, and set a password. They can add an email address for reminders and password recovery. They then choose a home island and complete a short tutorial. Judges receive a random ID without a password. Each player can plant multiple seeds and adopt each foreign seed once. A like waters a plant, and a comment fertilizes it. Plants grow from a seed into a sprout, a young plant, and a mature plant. Growth is shared across plantings. Plants become dormant after 15 days without activity and can be deleted after 365 days.

All bridges exist from the start. Crossing a bridge requires time-limited access to the island on the other side, while access to the home island never expires. The bell shows comments, replies, and access reminders. With email delivery configured, regular accounts can turn access reminders and discussion emails on or off in **Email and reminders**. See [context.md](context.md) for the full design, [the November 22 change log](docs/logic-changes-2026-11-22.md) for what changed, [the modeling brief](docs/modeling-brief.md) for the 3D work, and [the backend plan](docs/backend-plan.md) for server work.

The server sends garden changes over Server-Sent Events. The SQLite database in `data/` holds accounts, research PDFs, seeds, likes, island access expiries, and notifications across refreshes and restarts. `TED_DATA_DIR` can point at a different persistent storage directory. The default address only accepts connections from this machine.

For remote multiplayer, deploy the Node server with a persistent writable disk, HTTPS, and a proxy that supports unbuffered event streams. Set `HOST=0.0.0.0`, assign `PORT` as needed, and set `TED_SECURE_COOKIE=1` behind HTTPS. Add access controls before using it for private conference material. Players sign in with their user ID and password, and a browser cookie keeps the session signed in.

Vercel uses temporary storage for this preview. Seeds, likes, and PDFs may disappear when instances are replaced, and players on different instances may see separate gardens. Use a host with a persistent disk for a shared garden with durable saves.

## Email on Railway

Set `RESEND_API_KEY` and `CHI_EMAIL_FROM` in the Railway service variables. The sender must use a domain verified with Resend. CHI Island uses `RAILWAY_PUBLIC_DOMAIN` for email links. Set `TED_ORIGIN` if the public app uses a different HTTPS domain. The persistent Node service checks for pending reminders once a minute. Local play works with in-app notifications and saved preferences when email delivery is disabled.

## Design Kit

Open the [Design Kit](http://127.0.0.1:4173/design-kit) to upload artwork for buttons, plant stages, bridge stages, and island thumbnails, or to edit the shared UI theme. **Preview in game** loads the draft in a separate tab. **Apply in this browser** applies that draft to normal play in the current browser. Export the kit as JSON and import it in another browser to hand off artwork. The kit stays in browser storage until exported.

Island GLB files can be attached to the kit for handoff. Optional 2D thumbnails can replace distant island art in the game.

## Island models

Both views use the animated, procedural models from the [CHI 2027 island kit](https://github.com/RayZiruiLiu/chi-2027-code-native-islands/tree/3445ee91011e588c3980329eb25573a6505b84f6). Spiral Harbor is Health & Wellbeing, Verdant Springs is Sustainability, and Pinwheel Island is Games & Play. The models' navigation data sets walkable surfaces, planting ground, and bridge landings. The model renderer requires WebGL 2.

The production site and studio now build the islands from the same reviewed source under `public/island-kit/source/`. See the [integration notes and change history](docs/island-integration.md) for what was brought back from the Studio and where it connects to the game.

## Island Studio

Open [Island Studio](https://ted-island.vercel.app/studios) to inspect one island at a time in orbit or on foot. For local source editing, run `node studio-server.mjs` and open [the standalone studio](http://127.0.0.1:4174/studios). See the [Island Studio editing guide](docs/island-studio.md).

## Design references

- [Growth and bridges](docs/growth-and-bridges.html) is an earlier study from before November 22. It shows the five acorn oak stages and tree-built bridges, both since replaced. Open the HTML in a browser.
- [Seed concepts](docs/seed-concepts) contains the acorn oak, cherry blossom, and lantern tree reference sheets.
- [Earlier prototype snapshot](docs/prototype-snapshot-2026-11-19.md) records the single-island version.
