# CHI Island · Research Garden

A local multiplayer prototype using Node.js 24 or newer. Run `npm run dev` from this directory and open [CHI Island](http://127.0.0.1:4173). There are no package dependencies.

## Play

1. Use **WASD** to walk and climb stairs. You fall when you walk off a ledge and respawn if you fall off the island. Drag the view or use the arrow keys to look around.
2. Press **Q** or select the bottom-right **+** to open the slingshot. Drag backward from the seed near the bottom of the view and release. The green arc previews where it will land. If the seed lands on open grass, add a title, short description, open question, and optional PDF (up to 10 MB), then choose **Plant research seed**.
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

Island GLB files can be attached to the kit for handoff. The game previews 2D island thumbnails in World View and as distant island art. First-person terrain and physics still use the existing island geometry.

## Design references

- [Growth and bridges](docs/growth-and-bridges.html) shows the five acorn oak stages, bridge design studies, and an interactive crossing. Open the HTML in a browser.
- [Seed concepts](docs/seed-concepts) contains the acorn oak, cherry blossom, and lantern tree reference sheets.
- [Earlier prototype snapshot](docs/prototype-snapshot-2026-11-19.md) records the single-island version.
