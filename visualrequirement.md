# CHI Island · Visual requirements (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). Version 1 is commit `0694768`.*

## Project overview

CHI Island is a multiplayer first-person garden and discussion space. Each resident has a home island. They plant research ideas by throwing an acorn, water plants by liking them, and fertilize them by commenting or replying. Residents adopt ideas from other islands through the Seed Catalog. All bridges between islands exist from the start. Crossing a bridge requires time-limited access to the island on the other side. Residents earn that access by adopting, watering, and nourishing ideas that come from that island.

The visual system needs to make four things immediately readable: where the player is, how an idea is growing, how long the player can still visit each island, and where an idea comes from. A shared idea has the same growth stage and conversation wherever it is planted. Updated November 22, 2026. See [the change log](docs/logic-changes-2026-11-22.md), and see [the modeling brief](docs/modeling-brief.md) for 3D assets.

This brief uses the current three-island prototype. Island names, palettes, landmarks, and exact dimensions are art decisions. Use Island A, B, and C as placeholders until names are supplied.

## 1. Art direction and shared visual language

Owner: Cassius (UI). Rendering reference: *Monument Valley*, for its soft pastel palette, clean geometric forms, gentle lighting, and calm readability. See §10 of [the change log](docs/logic-changes-2026-11-22.md).

Use a cohesive garden-and-island style with readable silhouettes in both a distant world overview and close first-person play. Explore a stylized low-poly or softly simplified 3D direction suitable for the Unreal prototype. Use a quiet environment palette so interactive plants, selected routes, and action feedback stand out.

- **Island identity** uses a name, a distinct outline or landmark, a representative color, and an island icon. Reuse the identity on map labels, catalog cards, comment authors, Island Access cards, and the origin icon on each tree trunk.
- **Plant growth** uses silhouette, height, foliage, and a written stage label where an interface is available. Dormant plants appear visibly smaller and quieter than active plants at the same stage.
- **Island access** uses a ring that shows the remaining time in the island’s color, the exact time remaining, and a lock state on the bridge.
- **Player identity** uses the anonymous user ID, such as `Mossy-Fern-4821`, wherever a name appears.
- **Interaction states** use shape, icon, and text alongside color. Check readability over bright sky, water, dark vegetation, and soil.

### Shared controls

Use circular icon buttons for controls over the scene and labeled rounded buttons inside panels. Start with a light opaque circular surface, dark icon, and visible edge or shadow. Use a filled accent surface for an active panel, and a visible focus outline for keyboard navigation. Provide default, hover/focus, pressed, selected, and unavailable states as applicable. Keep icon-only controls at least 44 × 44 logical units as a design target and show a tooltip or accessible label.

| Control | Placement and appearance |
|---|---|
| Player View | World View top left. Circular person or first-person silhouette icon. |
| World View | Player View top left. Circular globe icon. |
| Menu | Player View top right. One dropdown button that opens **Seed Catalog** and **Island Access**. Cassius (UI) decides the final contents and layout. |
| User ID | Top right of the main page. A semi-transparent label, as in most games, showing the anonymous ID with a copy action. |
| Notifications | Bell with an unread dot. Opens the notification list. |
| Close panel | Top right of panel header. Small × glyph with a full-size hit area. |
| New seed | Player View lower right. Circular plus button that rotates into × to cancel. After a failed throw, selecting the seed retries it without pressing plus again. |
| View idea | Small contextual pill near the reticle with a leaf or info icon and the idea title nearby. |
| Plant seed | Filled primary button with a seed icon. Enters aiming mode. |
| Cancel aiming | Outline button labeled **Cancel** near the bottom edge in aiming mode. |
| Attach paper or poster | Outline button with a paperclip. Show selected filename and a remove control. |
| Adopt seed | Filled action on an eligible catalog card. After successful planting, show a check and **Planted on your island**. |
| Water / Like | Droplet icon with a count. Outline before liking, filled after liking. |
| Comment | Speech bubble with a count. Opens the composer. |
| Reply | Compact labeled action with a reply arrow below a comment. |
| Post comment / Post reply | Filled composer action. Include draft, sending, and failed submission treatments. |
| Follow / Following | Bell with a text label. Outline when available, filled when following. |
| Visit island | Island Access card action while access is active. Turns the view toward that bridge entrance. |
| Unlock access | Island Access card action after access expires, and the action at a locked bridge. Opens the catalog filtered to that island. |

## 2. Islands and environment

Design a prototype set of three islands. Example silhouettes for exploration:

| Island | Proposed silhouette and landmark | Asset requirements |
|---|---|---|
| A | Crescent coast and tall rock | Terrain, landmark, walkable paths, planting plots, bridge landings, identity badge |
| B | Round coast and central grove | Terrain, distinctive grove, walkable paths, planting plots, bridge landing, identity badge |
| C | Long coast and low ridge | Terrain, ridge landmark, walkable paths, planting plots, bridge landing, identity badge |

Create ocean, shoreline, soil, paths, rocks, and reusable vegetation. Preserve enough open soil and sightlines for the throw preview and plant labels. Each island needs to read from above and at eye level. All three bridges are permanent and attach to the islands’ landing points. Each bridge needs a locked state for players without access to that island. Include a home island marker with a house icon and island name, and a way to identify the current island when visiting. Reduce scenery plants or make them clearly different from idea plants. See the modeling brief for the open decisions.

## 3. World View and Island Access

### World View

Design a full-width, rotatable three-quarter overview with every island label, the home marker, the three permanent bridges, and the globe and Player View controls. Bridges the resident can currently cross use a continuous, highlighted treatment. Locked bridges are muted and show a lock. Under each island label, show its maturity rate, for example “4 of 12 ideas mature (33%),” or “No ideas yet.”

### Island Access panel

Design a right-side overlay on wide screens and a compact overlay or bottom sheet on narrow screens. It is reachable from Player View through the top-right menu. The header reads **Island Access**, followed by “Home · {domain}” and a close control. The body copy reads “Adopt, water, or nourish ideas to unlock other islands and extend your visits.” Use the iOS Batteries widget as the reference.

| Card element | Content and treatment |
|---|---|
| Center | Island icon |
| Ring | Remaining access in the island’s color, on a fixed 120-hour (5-day) scale that matches the access cap |
| Below | Island name, exact remaining time, and maturity rate |
| Action | **Visit island** while access is active, **Unlock access** after it expires |
| Detail | Selecting an active card shows the exact expiry, such as “Access ends Nov 24 at 3:30 p.m.” |

| Remaining | Ring | Label |
|---|---|---|
| 120 hours (cap) | Full | 5 days left |
| 72 hours | Three-fifths | 3 days left |
| 48 hours | Two-fifths | 2 days left |
| 24 hours | One-fifth | 24 hours left |
| 6 hours | Thin sliver with a clock alert | 6 hours left |
| Expired | Empty, muted ring | Access expired |

Provide designs for full (capped), partial, near-expiry, and expired cards, the “+X hours” toast, the “Access full (5 days)” toast, and for the empty state before any island has been unlocked. Never rely on ring length or color alone.

### Notifications

Design the bell, the unread dot, and the notification list. Include these types: a comment on your plant, a reply to your contribution, access ending in six hours, and “Your tree is getting thirsty.” Selecting an item opens the related plant or the Island Access panel. Design an email version of the same types with a short subject, a plain body that includes the actual comment text and the commenter’s anonymous ID, a link back to the plant, and an unsubscribe link.

### Login and onboarding

Design the first-visit ID reveal with a copy action and the message “Save this ID — you’ll need it to log back in.” Include the password fields, an optional email field with the reminder checkbox, sign-in for returning players, and **Login as Judge**. On the Welcome screen, make **home island** selectable to show an explanation, and remove the Island Studio link. Restyle the rotate prompt. The game stays landscape only, and the visual direction is up to Cassius (UI). Design the tutorial steps that follow island selection.

## 4. First-person Player View and planting

Design a default garden view and an aiming view. Put the translucent movement joystick at bottom left and leave the right side open for look input. Separate the aiming gesture from normal look input through a clear aiming state. Keep the reticle and the object’s path readable with panels closed.

- **Default HUD** shows the World View button, the top-right menu, user ID, and notification bell, the island identity, the movement joystick, and a subtle reticle. A plant name and **View idea** pill appear when the player targets a nearby plant.
- **Ready HUD** shows the readied acorn, the plus button turned into ×, and the hint “Tap to throw.” A tap sends the acorn a fixed short distance in the direction the player faces.
- **Valid landing** uses a ground ring and seed indicator. **Invalid landing** uses a broken ring, ×, and a short reason such as **Aim at open soil**.
- **Throw sequence** needs the in-hand and in-flight acorn, a brief framed landing, and a small planting impact effect. Include a brief planting confirmation, a failed-throw state, and a seed that can be selected where it landed to retry.
- **Edge and bridge prompts** use a frosted-glass notice. At an edge without a bridge, it reads “The bridges are this way.” At a locked bridge, it reads “Adopt a {island} seed, then water or nourish it to unlock this bridge” and includes an **Unlock access** action.

## 5. Plant models and effects

The plant models are specified in [the modeling brief](docs/modeling-brief.md). The interface needs a thumbnail or icon for each stage and a written stage label.

| Stage | Prototype threshold |
|---|---|
| Seed planted | Idea submitted |
| Sprout | 1 water, 0 nutrients, someone besides the creator participates |
| Young plant | 2 water, 2 nutrients, 2 contributors |
| Mature plant | 6 water, 8 nutrients, 4 contributors including 2 who have replied |

One like adds water, and one comment or reply adds a nutrient. Give watering a cool droplet or root ripple, fertilizing a warm soil pulse, and a stage change a short growth transition. Every watering or fertilizing action shows feedback with what it added to growth and how much access it earned, such as “+1 water · Sustainability access until Tue 3 p.m.” A mature plant keeps its size and still plays the effects. Provide a targeted or selected highlight that stays visible against dense foliage. A dormant plant shows its smaller dormant form and a short label explaining that one interaction will revive it.

## 6. Seed creation, catalog, and plant details

### New seed form

Design a panel with an idea or article title field, short description, open question, and optional paper or poster attachment. Include field labels, attachment states, validation, the **Plant seed** action, and a way back to the garden. The form opens after a successful throw lands on open grass.

### Seed Catalog

Match the dashboard panel’s spacing and header treatment. Cards include idea title, description preview, original island badge, current stage thumbnail, and local planting status. Include loading, empty, available, already-planted, and action-error examples. Residents discover ideas originating on their own island in the garden. Visitors adopt seeds through the catalog.

Show the access adoption earns beside **Adopt seed**, such as “Opens 48 hours on Games & Play.” For a seed that is already growing, show the current stage and explain that its tree and conversation come with it. Show **Planted on your island** after successful planting, with an optional **View idea** action if navigation is supported.

### Plant details and discussion

Start with the idea title, creator’s anonymous ID, origin island badge, growth stage or dormant state, question, and a summary of water, nutrients, and contributors. Show the same discussion across all locations. Provide a threaded comment layout with author island badges, reply affordances, composer, and visible posting feedback. Include a way to view attached papers or posters and make past discussion and takeaways accessible. Show followed state and a simple new-activity indicator for followed plants.

## 7. Asset handoff

| Deliverable | What to include |
|---|---|
| Art direction sheet | Palette, typography, icon style, lighting reference, and a top-down and eye-level reference |
| Editable UI designs | Named components and state variants, wide and narrow layouts, and annotated placement and spacing |
| 3D asset kit | Three islands, landmarks, foliage, the planted seed and three plant stages with dormant variants, the acorn, three permanent bridges with locked states, and trunk origin icons. See the modeling brief. |
| Materials and textures | Source textures and game-ready exports. Identify palette swaps, tiling materials, and transparency. |
| Icons and thumbnails | Editable vectors for UI icons, island badges, stage thumbnails, and export-ready sizes |
| Motion and effects | Storyboards or previews for panel movement, the acorn throw, planting, watering, fertilizing, plant growth, dormancy and revival, and bridge unlock |
| Import notes | Agree export formats and budgets with engineering. Include units and scale, pivots, bridge snap points, collision intent, material slots, and any level-of-detail versions. |

### Review scenes

1. **Sign in:** A new player receives an anonymous ID, saves it, sets a password, optionally adds an email, chooses a home island, and completes the tutorial.
2. **Create and throw:** A resident submits an idea, throws an acorn at open soil, and sees the planted seed. A failed throw can be retried by selecting the seed.
3. **Grow and discuss:** A like and a comment produce distinct effects and show the growth and access each one earned. The player can open the plant and read its stage and conversation.
4. **Adopt and unlock:** B adopts A’s mature tree. The tree and its conversation appear on B, and B’s Island Access card for A gains 48 hours and shows “+48 hours.”
5. **Cross and return:** The resident walks across the open bridge to A, browses a plant found only on A, and comments on it, which adds 36 hours, up to the 5-day cap. Later, the card shows 6 hours left, and the bell and email deliver the reminder.
6. **Locked bridge:** A resident without access reaches the bridge, sees the lock prompt, and opens the catalog filtered to that island.
7. **Dormancy:** A mature tree shrinks after inactivity, keeps its discussion, and returns to its full stage after one watering.
