# TED Island · CHI Research Garden

A local multiplayer prototype using Node.js 24 or newer. Run `npm run dev` from this directory and open [TED Island](http://127.0.0.1:4173). There are no package dependencies.

## Play

1. Use **WASD** to walk and climb stairs. You fall when you walk off a ledge and respawn if you fall off the island. Drag the view or use the arrow keys to look around.
2. Press **Q** or choose **Throw seed**, drag backward from the seed near the bottom of the view, and release. Pull farther to throw harder, pull down to loft the seed, and pull sideways to steer it in the opposite direction. The green arc previews the throw and stays visible while the seed flies. A seed can miss the island. If it lands on open grass, enter a title and research idea, upload a PDF (up to 10 MB), and choose **Plant research seed**.
3. In a private window or a separate browser profile, click a seed or plant in the scene. Open its PDF or select **Like · Water**.

On a phone, turn it sideways. The left joystick moves you, swiping the view turns the camera, and the **Throw seed** button arms the launcher. Drag the seed to throw and tap a planted seed to open its research.

Each browser profile gets one guest identity and one like per other plant. Each guest can plant multiple seeds. Seeds can be placed anywhere on open grass with room around them. Plants sprout at one like, grow at two, and bloom at five. Players who can access the garden can open all uploaded articles.

The server sends garden changes over Server-Sent Events. The SQLite database in `data/` holds research PDFs, seeds, and likes across refreshes and restarts. `TED_DATA_DIR` can point at a different persistent storage directory. The default address only accepts connections from this machine.

For remote multiplayer, deploy the Node server with a persistent writable disk, HTTPS, and a proxy that supports unbuffered event streams. Set `HOST=0.0.0.0`, assign `PORT` as needed, and set `TED_SECURE_COOKIE=1` behind HTTPS. Add access controls before using it for private conference material. Guest identity is tied to a browser cookie.
