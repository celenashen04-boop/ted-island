# CHI Island · Design context (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). Version 1 is commit `0694768`.*

Consult this file before changing CHI Island’s views, game rules, or data model, and update it when design decisions change. It describes the intended platform behavior and serves as the design reference. The current prototype uses three islands and domain-based onboarding. The rules changed on November 22, 2026; see [the change log](docs/logic-changes-2026-11-22.md). The 3D modeling work is in [the modeling brief](docs/modeling-brief.md), and the server work is in [the backend plan](docs/backend-plan.md).

## Island environments

| Research domain | Island model |
| --- | --- |
| Health & Wellbeing | Spiral Harbor |
| Sustainability | Verdant Springs |
| Games & Play | Pinwheel Island |

Player View and World View share the same animated environments. Keep the research domain names in the game UI. Movement and planting follow the terrain. Each island pair is joined by a permanent walkable bridge attached to the models’ designated landing decks.

Each island has a representative color and an icon designed for its theme. Use them on Island Access cards, catalog packets, and the origin icon on each tree trunk.

In Player View, players automatically step up onto stair treads and low objects with a stable top and enough headroom. The maximum rise is three-quarters of the character’s height. Taller obstacles, such as the pinwheel mast, and island edges without a bridge block movement.

Use the island meshes for solid-object collision in Player View. Keep stairs, decks, ramps, and bridges walkable. Preserve clearance through openings, and let residents wade through shallow water.

Scale the three animated islands to 1.125 times their original width, height, and depth. Keep saved plants in the same relative locations.

Scenery plants on the islands must not be confused with idea plants. Remove scenery plants except the round green bushes. Ray makes the final call for each island.

## Login and identity

- On the first visit, choose **I’m new here**, **I have an ID**, or **Login as Judge**. New players receive a generated ID such as `Mossy-Fern-4821`, copy it, set a password of at least six characters, and choose their home island.
- Returning players enter their ID and password. Existing accounts retain their IDs and passwords. The game stores a password hash on the server and keeps the session in a cookie. Regular accounts can add an email address for recovery and independently opt into access or discussion reminders.
- The player ID is the account’s public name. Show it in the HUD, on planted ideas, and in comments.
- Email is optional and private. It is used only for notifications and password reset. Encourage players to add it, and warn players without an email that a forgotten password cannot be recovered. Provide consent, notification preferences, and an unsubscribe option.
- **Login as Judge** creates a random ID without a password. Judges choose an island and play as regular players. Each judge session is unique, synchronizes in real time across browsers and devices, survives a refresh, and lasts for the browser session.
- The CHI website’s entry button is a regular link to the game and passes no attendee data.

## Onboarding and tutorial

- New residents choose a domain from the three islands. The chosen domain becomes their home island. Selecting **home island** on the Welcome screen explains what a home island means and does. An existing resident completing onboarding can choose their home island. Previously planted seeds stay on their original islands.
- The Welcome screen does not link to Island Studio.
- After the home island is chosen, a tutorial covers walking, creating a seed, using the Seed Catalog, and adopting and planting a seed. It also covers watering and nourishing, and shows each plant stage. It ends by explaining that planting an adopted seed opens 48 hours of bridge access and that watering and nourishing can extend that access.

## Instruction overlays

- Use shared frosted glass for instructions and short in-game guidance: a low-opacity warm tint, soft blur, and dark text. Use a solid surface when blur is unavailable or the player requests more contrast.
- Show movement and camera controls on arrival and map controls in World View. In planted seed details, explain watering and fertilizing next to those actions, including the access each one earns. Give each hint a **Got it** button and remember dismissal in that browser.
- At an island edge without a bridge, show “The bridges are this way.” At a locked bridge, show “Adopt a {island} seed, then water or nourish it to unlock this bridge,” with a button that opens the catalog filtered to that island.

## World View

- Label islands by subject only: **Health & Wellbeing**, **Sustainability**, and **Games & Play**.
- Show the three permanent bridges. Mark bridges the resident can currently cross.
- Let residents drag to rotate the world.
- The resident’s home island is the only clickable island on the map. Selecting it returns to Player View. Other island labels are muted and inactive.
- Keep the world map full width.

## Player View

- Phone play uses landscape. When a phone opens or returns to portrait, show a rotate prompt over the current screen. Resume the same view when the phone returns to landscape. Offer fullscreen landscape on browsers that support it. The preview scales an interactive landscape phone viewport to fit the panel.
- Show the other islands and the bridges leading to them in the distance, using the same relative direction and height as World View. Use the island the player is standing on as the reference point.
- Use the left joystick to move and drag on the right side to change the viewing direction.
- Provide a circular globe button to switch to World View.
- Show the player’s copyable ID and a notification bell at the top right. The menu opens **Seed Catalog**, **Island Access**, **Followed plants**, **How to play**, and **Email and reminders**, with **Sign out** in the footer.
- Ready an acorn with the bottom-right plus button. It rotates into an × that cancels the throw. Show “Tap to throw.” A tap or click anywhere in the scene sends the acorn the same short distance in the direction the player faces, unless it hits an obstacle first. Frame the flight and hold briefly on the landing. Dragging adjusts the camera while the acorn is ready. After a failed throw, the player can retry by selecting the seed where it landed, without pressing the plus button again. Keep the earlier slingshot control in the scene code as an alternative.
- Let residents select plants in the garden. Liking another resident’s plant waters it. Leaving a comment nourishes it. Each action plays an animation and shows how it contributes to growth and access.
- Residents adopt seeds from other islands through the Seed Catalog. They discover seeds that originated on their own island in the physical garden. Those seeds appear in the catalogs of residents on other islands.

## Seed creation and planting

- Every resident can create and plant an idea seed on their home island by readying an acorn and tapping the scene to throw it.
- A seed can start from an article title, a research idea, or an uploaded paper or poster. Include a short description and an open question to invite discussion.
- Once planted, the seed appears on its original island and enters the catalogs of residents on other islands.
- Each seed retains its creator and original home island. Catalog cards show the title, description, open question, origin island, growth stage, and adoption action or planting status. The planted-idea detail keeps its close button visible while the discussion scrolls. Selecting outside the panel closes it.
- Residents can select a seed from another island in the catalog and plant it on their home island.
- Show all eligible seed packets together under All islands, with a shelf beneath each row. Color each packet by its original island. Residents can filter to a single island. Packets lift on mouse hover or keyboard focus, and give the same feedback on press on touchscreens.
- The tutorial and catalog explain that planting an adopted seed opens 48 hours of access to the seed’s origin island.
- The catalog is the only place to adopt seeds. Each seed can be planted only once per island. Visiting an island gives no ability to collect or replant its seeds there, or to bring them home directly.

## Plant growth and shared discussion

- Residents can nourish plants on their home island. A like waters a plant, and a comment fertilizes it.
- A seed can grow into a mature plant through participation on its home island alone.
- Planting the same seed on multiple islands creates multiple locations for one shared plant. Comments, likes, contributors, and growth are synchronized across those locations, and residents can see contributions from every participating island.
- When a growing or mature plant is adopted, the new island receives its current growth and shared discussion. Suggested catalog copy: “This idea is already growing. Bring its current tree and shared conversation to your island.”
- Each tree trunk shows its original island’s icon.
- A mature plant reaches its final size and continues responding to participation. Previous discussions and takeaways stay accessible.

### Growth stages

Use the plant models from the modeling brief: a planted seed, then three main stages.

| Stage | Water required | Nutrients required | Participation requirement |
| --- | ---: | ---: | --- |
| Seed planted | 0 | 0 | Seed submitted |
| Sprout | 1 | 0 | One person other than the creator participates |
| Young plant | 2 | 2 | At least two contributors overall |
| Mature plant | 6 | 8 | At least four contributors, including two people who have replied to someone else |

Each like gives one water, and each comment or reply gives one nutrient. Count distinct residents across all plantings when applying the participation requirements. Each resident can like a plant once, and edits add nothing.

### Inactivity and data retention

- Meaningful activity is watering, nourishing, commenting, or replying. Opening the site does not count. Measure inactivity on the shared plant, so activity at any planting keeps every planting active.

| Days without meaningful activity | State |
| --- | --- |
| 0–14 | Active. No change. |
| 12 | “Your tree is getting thirsty” reminder |
| 15–30 | Dormant. The plant gradually shrinks to its seedling form. The discussion stays accessible. |
| 31–335 | Inactive seedling |
| 335 | Notify the creator and all contributors that the plant will be deleted in 30 days. Offer return and export options for the plant data and discussion. |
| 365 | Delete the plant and its data if every planting is still inactive |

- A dormant plant keeps its earned stage. Only its displayed size changes. One meaningful interaction returns it to that stage.
- Deleting a plant does not remove contributions associated with other plants.

## Bridges and island access

- All three bridges exist from the start and require no construction.
- Each resident has separate access to each other island. Access to their home island never expires.
- Access starts as soon as the qualifying action happens and counts down continuously, including while the resident is offline. There are no active-use timers, daily earning limits, or stored minute balances.

| Action | Access earned |
| --- | --- |
| Adopt and plant a seed from another island | 48 hours on that seed’s origin island |
| Water a plant (like) | 24 hours on the plant’s origin island |
| Nourish a plant (comment or reply) | 36 hours on the plant’s origin island |
| Create your own seed | None |
| Like or comment on your own plant | None |

- **Actions stack up to a 5-day cap.** New expiry = min(max(current expiry, action time) + action duration, action time + 120 hours). Each action adds its full duration until the remaining time reaches 5 days. The cap makes a weekend of access reachable, while a burst of comments cannot bank weeks of access.
- Show the added time after each action, such as “+24 hours · Games & Play access: 3 days 4 hours.” When the cap is reached, show “Access full (5 days).” The plant still receives its water or nutrient.
- Only a resident’s first comment or reply on each plant per day earns access. Later comments that day still nourish the plant.
- An expired resident cannot enter that island across a bridge. A resident already on the island when access expires may stay. Any qualifying action there renews access. Notify them: “Your access to {island} ended. Water or nourish a plant here to stay longer.”

### Island maturity rate

- Each island shows **mature plants ÷ all idea plants planted on it**, counting adopted plantings, for example “4 of 12 ideas mature (33%).”
- Dormant plants do not count as mature. Everyone can see the rate under each island label in World View and on Island Access cards.
- An island with no plants shows “No ideas yet.”

### Island Access panel

- Header: **Island Access**. Subtitle: “Home · {domain}”. Body: “Adopt, water, or nourish ideas to unlock other islands and extend your visits.”
- Each card shows the island icon in the center, surrounded by a ring in the island’s color showing the remaining time. The island name and exact remaining time appear below. The action is **Visit island** while access is active, which turns the view toward that bridge entrance, and **Unlock access** after expiry, which opens the catalog filtered to that island.
- Rings use a fixed 120-hour (5-day) scale, which matches the cap. The ring is full at 120 hours, three-fifths at 72 hours, two-fifths at 48 hours, and one-fifth at 24 hours. At 6 hours it shows a thin sliver with a clock alert. When access has expired, the ring is empty and muted, labeled **Access expired**. Always show the exact remaining time. Selecting an active card shows the expiry, such as “Access ends Nov 24 at 3:30 p.m.”

## Crossing and exploring

- A resident with active access can walk across that bridge in either direction in Player View.
- Without access, residents can preview the other island’s idea seeds in the Seed Catalog, including the title, description, open question, and planting status. Catalog previews contain no discussions. If a seed is already planted on the resident’s home island, its shared discussion remains accessible from that home planting.
- Walking off the far end of the bridge brings the player onto the destination island and opens access to its plant directory. Visitors can browse all plants there, including those not shared with their home island, and read the full discussions.
- Visitors can read, like, comment, and reply on plants they visit. These actions extend access to the plant’s origin island.
- Visiting gives no direct way to collect or bring a seed home. Adopting and planting seeds from another island remains a catalog action.

## Notifications

- **In-app notification center (required):** A bell with an unread dot. Notifications cover comments on your plant, replies to your contributions, island access ending in six hours, and the “getting thirsty” reminder. Followed-plant updates appear here. Deliver live updates through Server-Sent Events.
- **Email (opt-in):** Send the same events to residents who added an email and opted in. Comment and reply emails include the actual comment text, the commenter’s anonymous ID, and a link to the plant. Send the access reminder six hours before expiry, once per island’s current expiry. When an action extends access, cancel the pending reminder and schedule a new one. Combine islands reaching the threshold together into one email. Every email includes a way to turn reminders off.
- **Web Push:** Planned after the conference.

## Multiplayer

- Players see each other only through shared seeds, plants, comments, replies, and notifications. Other players’ avatars and positions are not shown or synchronized.
- Garden changes reach every connected player in real time.

## Continued participation

- Residents can continue contributing to shared plants at any time.
- The **Followed plants** list shows all followed plants and counts new discussion since the player last opened each one. Players can open the discussion from an accessible planting. If they have left every island where it grows, the list keeps the plant and directs them to Island Access.
