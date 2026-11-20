# CHI Island · Research Garden

A local multiplayer prototype using Node.js 24 or newer. Run `npm run dev` from this directory and open [CHI Island](http://127.0.0.1:4173). There are no package dependencies.

## Play

1. Use **WASD** to walk and climb stairs. You fall when you walk off a ledge and respawn if you fall off the island. Drag the view or use the arrow keys to look around.
2. Press **Q** or choose **Throw seed**, drag backward from the seed near the bottom of the view, and release. Pull farther to throw harder, pull down to loft the seed, and pull sideways to steer it in the opposite direction. The green arc previews the throw and stays visible while the seed flies. A seed can miss the island. If it lands on open grass, enter a title and research idea, upload a PDF (up to 10 MB), and choose **Plant research seed**.
3. Open **Seed Catalog** to adopt a seed from another island. Throw and plant it on your home island to start the bridge. In **World View**, check construction progress, find followed plant updates, or cross a bridge you helped complete.
4. In a private window or a separate browser profile, click a seed or plant in the scene. Open its PDF or select **Like · Water**.

On a phone, turn it sideways. The left joystick moves you, swiping the view turns the camera, and the **Throw seed** button arms the launcher. Drag the seed to throw and tap a planted seed to open its research.

New guests choose one of three domains during onboarding, which sets their home island. Existing residents can choose when they first complete onboarding. Earlier plantings stay on their original islands. Profile photos and LinkedIn URLs are optional and private to the resident. Each guest can plant multiple seeds and adopt each foreign seed once. A like waters a plant and a comment fertilizes it. Growth is shared across plantings.

Bridges open after two residents from each island participate, the islands add four qualifying discussion contributions, and someone replies across the two islands. The dashboard shows Foundations, Walkway, and Connection progress. Contributors can cross, and a qualifying comment after opening can grant a resident access. See [context.md](context.md) for the full design.

The server sends garden changes over Server-Sent Events. The SQLite database in `data/` holds research PDFs, seeds, and likes across refreshes and restarts. `TED_DATA_DIR` can point at a different persistent storage directory. The default address only accepts connections from this machine.

For remote multiplayer, deploy the Node server with a persistent writable disk, HTTPS, and a proxy that supports unbuffered event streams. Set `HOST=0.0.0.0`, assign `PORT` as needed, and set `TED_SECURE_COOKIE=1` behind HTTPS. Add access controls before using it for private conference material. Guest identity is tied to a browser cookie.

Vercel uses temporary storage for this preview. Seeds, likes, and PDFs may disappear when instances are replaced, and players on different instances may see separate gardens. Use a host with a persistent disk for a shared garden with durable saves.

## Design Kit

Open the [Design Kit](http://127.0.0.1:4173/design-kit) to upload artwork for buttons, plant stages, bridge stages, and island thumbnails, or to edit the shared UI theme. **Preview in game** loads the draft in a separate tab. **Apply in this browser** applies that draft to normal play in the current browser. Export the kit as JSON and import it in another browser to hand off artwork. The kit stays in browser storage until exported.

Island GLB files can be attached to the kit for handoff. The game previews 2D island thumbnails in World View and as distant island art. First-person terrain and physics still use the existing island geometry.
