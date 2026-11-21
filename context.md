# CHI Island · Design context

Consult this file before changing CHI Island’s views, game rules, or data model. Update it when design decisions change. It describes the intended platform behavior. The current prototype uses three islands and domain-based onboarding. The rules below are the design reference.

## Instruction overlays

- Use shared frosted glass for instructions and short in-game guidance. Use a low-opacity warm tint, soft blur, and dark text. Use a solid surface when blur is unavailable or the player requests more contrast.
- Show movement and camera controls on arrival, map controls in World View, and an explanation of watering and fertilizing beside the actions in planted seed details. Give each hint a Got it button and remember dismissal in that browser.
- After an adopted seed is planted, point the player to Bridges in World View to track construction.

## World View

- Label islands by subject only: **Health & Wellbeing**, **Sustainability**, and **Games & Play**.
- Let residents drag to rotate the world.
- Make the resident’s home island the only clickable island on the map. Select it to return to Player View. Other island labels are muted and inactive. Residents use the dashboard to check bridge progress and crossing access.
- Keep the world map full width by default. A circular bridge icon at the top right slides the bridge dashboard in and out, in the same position as Seed Catalog in Player View. The dashboard shows construction progress for every bridge connecting the resident’s home island to another CHI island.

## Player View
- Phone play uses landscape. When a phone opens or returns to portrait, show a rotate prompt over the current screen and resume the same view when it returns to landscape. Offer fullscreen landscape on browsers that support it. The preview scales an interactive landscape phone viewport to fit the panel.
- During onboarding, residents choose their domain from the three islands. The chosen domain becomes their home island. An existing resident completing onboarding can choose their home island. Previously planted seeds stay on their original islands. Residents can add an optional LinkedIn URL and choose whether to share it through their research. Previously uploaded profile photos stay visible only to the resident who supplied them.
- Show the other islands in the distance, using the same relative direction and height as World View. Use the island the player is standing on as the reference point.
- Show the trees growing toward the connected island and the resulting bridge directly in the 3D scene. Eligible players can step onto the completed span and walk across in Player View.
- Use the left joystick to move and drag on the right side to change the viewing direction.
- Stop walking at the outer edges of islands and completed bridges. An eligible player can walk between an island and the bridge entrance.
- Provide a circular globe button to switch to World View.
- Ready an acorn with the bottom-right plus button. It rotates into an × that cancels the throw. Show “Tap to throw.” A tap or click anywhere in the scene sends the acorn the same short distance in the direction the player faces, unless it hits an obstacle first. Frame the flight and hold briefly on the landing. Dragging adjusts the camera while the acorn is ready. Keep the earlier slingshot control available as an alternate in the scene code.
- Place a circular **Seed Catalog** button with a single seed icon at the top right.
- Let residents select plants in the garden. Liking another resident’s plant on the same island waters it. Leaving a comment fertilizes it.
- Let residents adopt seeds from other islands through the Seed Catalog. Residents discover seeds originating on their own island in the physical garden. Those seeds appear in the catalogs of residents on other islands.

## Seed creation and planting

- Every resident can create and plant an idea seed on their home island by readying an acorn and tapping the scene to throw it.
- A seed can start from an article title, a research idea, or an uploaded paper or poster. Include a short description and an open question to invite discussion.
- Once planted, the seed appears on its original island and enters the catalog of residents on other islands.
- Each seed retains its creator and original home island. On the shelf, each packet shows only the research title. Select a packet to open a centered overlay with its description, open question, and adoption action or planting status. Catalog and planted seed popups show the original island in a pill and keep the close button visible while the content scrolls. Click or tap outside either popup to close it.
- Show **Connect to author** at the bottom of the popup when a player selects a planted seed or plant directly in the 3D scene and its creator has chosen to share their LinkedIn. Residents can change sharing from their own island badge. Sharing is off by default, including for existing profiles.
- Residents can select a seed from another island in the catalog and plant it on their own home island.
- Show all eligible seed packets together in All islands, with a shelf beneath each row. Color each packet by its original island. Residents can filter to a single island. Packets lift on mouse hover or keyboard focus and give the same feedback on press on touchscreens.
- The first time the Seed Catalog opens in a browser, show a dismissible tip explaining how to adopt and plant a seed and how this starts a bridge.
- The catalog is the only place to adopt seeds. Each seed can be planted only once per island. Visiting an island gives no ability to collect or replant its seeds there or bring them home directly.

## Plant growth and shared discussion

- Residents can nourish plants on their home island. A like waters a plant, and a comment fertilizes it.
- A seed can grow into a tree through participation on its home island alone.
- Planting the same seed on multiple islands creates multiple locations for one shared plant. Comments, likes, contributors, and growth are synchronized across those locations. Users can see contributions from every participating island.
- When a growing or mature tree is adopted, the new island receives its current growth and shared discussion. Suggested catalog copy reads “This idea is already growing. Bring its current tree and shared conversation to your island.”
- Once the same seed is planted on both islands, the two plantings grow in sync and develop toward one another. Their bridge growth becomes visible as they advance from seed to mature tree.
- When a mature tree is adopted, the new planting inherits its maturity. The new island pair still begins its bridge participation count at 0%, and the two mature plantings grow toward each other to form the span.
- A mature tree reaches its final size and continues responding to participation. Its bridge-forming growth can continue until it joins the paired tree. Previous discussions and takeaways stay accessible.

### Prototype growth thresholds

- Use a low-poly acorn oak for the default growth art. Show a capped acorn, a two-leaf sprout, a lobed-leaf sapling, a small oak, and a wider mature oak. Use the same acorn when ready to throw and in flight.

| Stage | Water required | Nutrients required | Participation requirement |
| --- | ---: | ---: | --- |
| Seed planted | 0 | 0 | Seed submitted |
| Sprout | 1 | 0 | One person other than the creator participates |
| Young plant | 2 | 2 | At least two contributors overall |
| Tree | 4 | 4 | At least three contributors overall |
| Mature tree | 6 | 8 | At least four contributors, including two people who have replied to someone else |

Each like gives one water, and each comment or reply gives one nutrient. Count distinct residents across all plantings when applying the participation requirements.

## Bridge creation and construction

- Planting an adopted seed starts the connection between its original island and the adopting island. The paired plantings visibly grow toward each other across the gap. A seed from A planted by residents of B and C can form A–B and A–C connections. A B–C bridge requires its own connection.
- Use Mossy Tangle in Player View and World View. The saplings develop short shoots, the young oaks start to reach out, and the mature oaks extend thicker, rounded limbs. When the branches intertwine, the broad central bough becomes the walking surface. Show the open gap in the map while the bridge is still growing.
- Show the construction percentage alongside resident, discussion, and reply counts. Show the next action needed, such as “Add a question, example, or reply to finish the walkway.”
- **Foundations (40%)** — Add 10% per unique resident who likes or comments on a shared plant, capped at two residents per island.
- **Walkway (40%)** — Add 10% per qualifying comment or reply, up to four contributions total and at most three from either island. Completion requires at least one contribution from each island.
- **Connection (20%)** — Award 20% for the first qualifying reply between residents of the two endpoint islands.
- The bridge physically forms when the two mature trees join across the gap. It opens for crossing when the span has joined and the pair has met all three participation requirements. The dashboard shows when participation is complete and the trees are still growing together. Once open, the bridge stays open.
- Keep one bridge per island pair. While it is growing, show the most developed shared planting pair. When the bridge opens, keep it attached to the plantings that formed it. For bridges already open before tree-built spans were introduced, preserve crossing access and link an existing shared planting pair.
- For each shared seed, count activity only after that seed is planted on both islands. Count activity across all plants the pair shares.
- Count at most two comments or replies per person toward construction. A qualifying cross-island reply can occupy one of those slots in place of an earlier comment. Further discussion still nourishes the plant.
- Each resident's likes count toward their participation once per bridge, regardless of how many plants they like. Edits, repeated likes, and the original seed description do not add progress.
- Third-island residents can help the shared plant grow but cannot build this bridge.
- For a seed originating on A and also planted on B and C, track A–B and A–C independently. New activity from A can support both bridges. Activity from B supports A–B, and activity from C supports A–C. Each bridge needs its own endpoint residents and a reply between those two communities.

## Crossing and exploring

- Once construction finishes, everyone who contributed to that bridge can walk across it in Player View. The connected growth forms a continuous walking surface between the islands.
- The dashboard can turn the player's view toward a bridge entrance. Players walk across in either direction.
- A resident of either connected island who did not contribute during construction can earn crossing access after the bridge opens by commenting on a plant shared by the two islands.
- Without crossing access, residents can preview the other island’s idea seeds in the Seed Catalog, including the title, description, open question, and planting status. Catalog previews contain no discussions. If a seed is already planted on the resident’s home island, its shared discussion remains accessible from that home planting.
- Walking off the far end of the bridge brings the player onto the destination island and opens access to its plant directory. Visitors can browse all plants there, including those that are not shared with their home island, and read the full discussions.
- Visitors can read, like, comment, and reply on plants they visit.
- Visiting gives no direct way to collect or bring a seed home. Adopting and planting seeds from another island remains a catalog action.

## Continued participation

- Completed bridges remain usable without maintenance. Residents can continue contributing to shared plants after construction ends.
- Residents can follow plants and receive updates so they can return to the conversation after the first interaction or after the conference.
