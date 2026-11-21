# CHI Island · Current prototype

*Snapshot as of November 19, 2026*

CHI Island is a first-person multiplayer research garden on one shared floating island. Players throw seeds with a slingshot, attach research to successful landings, and explore ideas planted by other players.

## Play the prototype

Run `npm run dev` from the CHI Island source folder with Node.js 24, then open [the local game](http://127.0.0.1:4173/). Open a private browser window or a separate browser profile to test as a second guest.

- **Desktop** — Move with WASD. Drag the scene or use the arrow keys to look around. Walk up stairs and step off platforms. Falling off the island returns you to the starting point.
- **Phone** — Hold the phone sideways. Use the left joystick to move, swipe the scene to look, and tap plants to open them.
- **Throwing** — Press Q or choose **Throw seed**. Pull back from the seed near the bottom of the screen and release. Drag direction sets the launch angle, and pull distance sets power. The green arc shows the predicted path and impact. You can keep moving while aiming. Throws that hit an obstacle or miss the island can be retried.

## Seed creation and growth

1. Land a seed on open grass with room around it.
2. Enter an article title and a short research idea, and attach a research PDF up to 10 MB. All three are required. Choose **Plant research seed** to save it.
3. Click or tap a seed or plant to read the idea and open the PDF. Newly planted seeds bob above the soil.
4. Choose **Like · Water** on another guest’s plant to support it. Each guest can plant multiple seeds and water each other guest’s plant once. Plants sprout at one like, grow at two, and bloom at five.

## Multiplayer and saved data

A browser cookie identifies each guest. The Node.js backend stores the planter, exact seed location, research details, PDF, and likes in SQLite. It sends updates to connected players through Server-Sent Events.

The local database survives refreshes and server restarts. The Vercel preview uses temporary storage, so different server instances can show different gardens and replacing an instance can erase its seeds, PDFs, and likes.

## Proposed rules still to build

| Proposed feature | Current behavior |
| --- | --- |
| Resident home islands and visits to other islands | Everyone plays on one shared island. |
| Start from a title, idea, or paper/poster file, with separate description and open-question fields | The current form requires a title, idea, and PDF. The idea field can contain a question. |
| Automatic catalog entry with title, description, original island, and planting status | A seed appears in the garden and retains its planter. There is no catalog or separate home-island identity. |
| Catalog-only adoption and one planting per seed per island | There is no adoption or replanting. Interacting with a planted seed opens its research and watering action. |
