# CHI Island · Research Garden

A local multiplayer prototype using Node.js 24 or newer. Run `npm run dev` from this directory and open [CHI Island](http://127.0.0.1:4173). There are no package dependencies.

## Play

1. Use **WASD** to walk and climb stairs. The edges of the islands and bridges stop you from walking into the gap. Drag the view or use the arrow keys to look around.
2. Press **Q** or select the bottom-right **+** to ready an acorn. Face open grass and tap or click anywhere in the scene for the same short forward throw. If the acorn lands on open grass, add a title, short description, open question, and optional PDF (up to 10 MB), then choose **Plant research seed**.
3. Open **Seed Catalog** to adopt a seed from another island. Plant it on your home island to start a bridge. Use the bridge icon in **World View** to check progress, see followed plant updates, and find the bridge entrance. Cross completed bridges on foot in **Player View**.
4. In a private window or a separate browser profile, click a seed or plant in the scene. Open its PDF or select **Like · Water**.

On a phone, turn it sideways. Use the left joystick to move and drag on the right to look around. Tap a plant to open its research. On desktop, the [landscape phone preview](http://127.0.0.1:4173/?preview=mobile) shows the same layout.

New guests choose a home island during onboarding and can optionally add a LinkedIn profile. When an author opts in to sharing, residents can open that LinkedIn profile from a plant they select in the 3D scene. Each guest can plant multiple seeds and adopt each foreign seed once. A like waters a plant and a comment fertilizes it. Growth is shared across plantings.

Bridges open when two mature oaks join across the gap and the pair completes the participation requirements. The dashboard tracks Foundations, Walkway, and Connection. Contributors can cross the moss-covered branches, and a qualifying comment after opening can grant access. See [context.md](context.md) for the full design.

The server sends garden changes over Server-Sent Events. The SQLite database in `data/` holds research PDFs, seeds, and likes across refreshes and restarts. `TED_DATA_DIR` can point at a different persistent storage directory. The default address only accepts connections from this machine.

For remote multiplayer, deploy the Node server with a persistent writable disk, HTTPS, and a proxy that supports unbuffered event streams. Set `HOST=0.0.0.0`, assign `PORT` as needed, and set `TED_SECURE_COOKIE=1` behind HTTPS. Add access controls before using it for private conference material. Guest identity is tied to a browser cookie.

Vercel uses temporary storage for this preview. Seeds, likes, and PDFs may disappear when instances are replaced, and players on different instances may see separate gardens. Use a host with a persistent disk for a shared garden with durable saves.

## Design Kit

Open the [Design Kit](http://127.0.0.1:4173/design-kit) to upload artwork for buttons, plant stages, bridge stages, and island thumbnails, or to edit the shared UI theme. **Preview in game** loads the draft in a separate tab. **Apply in this browser** applies that draft to normal play in the current browser. Export the kit as JSON and import it in another browser to hand off artwork. The kit stays in browser storage until exported.

Island GLB files can be attached to the kit for handoff. Optional 2D thumbnails can replace distant island art in the game.

## Island models

Both views use the animated, procedural models from the [CHI 2027 island kit](https://github.com/RayZiruiLiu/chi-2027-code-native-islands/tree/3445ee91011e588c3980329eb25573a6505b84f6). Spiral Harbor is Health & Wellbeing, Verdant Springs is Sustainability, and Pinwheel Island is Games & Play. The models' navigation data sets walkable surfaces, planting ground, and bridge landings. The model renderer requires WebGL 2.

The production site and studio now build the islands from the same reviewed source under `public/island-kit/source/`. See the [integration notes and change history](docs/island-integration.md) for what was brought back from the Studio and where it connects to the game.

## Island Studio

Open [Island Studio](https://ted-island.vercel.app/studios) to inspect one island at a time in orbit or on foot. For local source editing, run `node studio-server.mjs` and open [the standalone studio](http://127.0.0.1:4174/studios). See the [Island Studio editing guide](docs/island-studio.md).

## Design references

- [Growth and bridges](docs/growth-and-bridges.html) shows the five acorn oak stages, bridge design studies, and an interactive crossing. Open the HTML in a browser.
- [Seed concepts](docs/seed-concepts) contains the acorn oak, cherry blossom, and lantern tree reference sheets.
- [Earlier prototype snapshot](docs/prototype-snapshot-2026-11-19.md) records the single-island version.
