# CHI Island · Visual requirements

## Project overview

CHI Island is a multiplayer first-person garden and discussion space. Each resident has a home island. They plant research ideas with a slingshot, water plants by liking them, and fertilize them by commenting or replying. Residents adopt ideas from other islands through the Seed Catalog. When an adopted seed is successfully planted, a bridge starts between the adopter’s island and the idea’s original island. Participation from both islands builds the bridge.

The visual system needs to make three things immediately readable: where the player is, how an idea is growing, and what a bridge still needs. A shared idea has the same growth stage and conversation wherever it is planted. Each pair of islands has its own bridge progress.

This brief uses the current three-island prototype. Island names, palettes, landmarks, and exact dimensions are art decisions. Use Island A, B, and C as placeholders until names are supplied.

## 1. Art direction and shared visual language

Use a cohesive garden-and-island style with readable silhouettes in both a distant world overview and close first-person play. Explore a stylized low-poly or softly simplified 3D direction suitable for the Unreal prototype. Use a quiet environment palette so interactive plants, selected routes, and action feedback stand out.

- **Island identity** uses a name, a distinct outline or landmark, and a color or emblem. Reuse the identity on map labels, catalog cards, and comment authors.
- **Plant growth** uses silhouette, height, foliage, and a written stage label where an interface is available.
- **Bridge status** uses geometry, route line treatment, written status, and progress indicators.
- **Interaction states** use shape, icon, and text alongside color. Check readability over bright sky, water, dark vegetation, and soil.

### Shared controls

Use circular icon buttons for controls over the scene and labeled rounded buttons inside panels. Start with a light opaque circular surface, dark icon, and visible edge or shadow. Use a filled accent surface for an active panel, and a visible focus outline for keyboard navigation. Provide default, hover/focus, pressed, selected, and unavailable states as applicable. Keep icon-only controls at least 44 × 44 logical units as a design target and show a tooltip or accessible label.

| Control | Placement and appearance |
|---|---|
| Player View | World View top left. Circular person or first-person silhouette icon. |
| World View | Player View top left. Circular globe icon. |
| Bridge Dashboard | World View top right. Circular bridge icon. Filled selected state while open. |
| Seed Catalog | Player View top right. Circular seed icon. Filled selected state while open. |
| Close panel | Top right of panel header. Small × glyph with a full-size hit area. |
| New seed | Player View lower right. Rounded, labeled button with a seed and plus icon. |
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
| Cross bridge | Labeled action with a forward arrow at an open bridge landing for eligible players. |
| View shared plants | Labeled action in the open-but-locked bridge state, guiding residents to a shared plant where they can comment. |

## 2. Islands and environment

Design a prototype set of three islands. Example silhouettes for exploration:

| Island | Proposed silhouette and landmark | Asset requirements |
|---|---|---|
| A | Crescent coast and tall rock | Terrain, landmark, walkable paths, planting plots, bridge landings, identity badge |
| B | Round coast and central grove | Terrain, distinctive grove, walkable paths, planting plots, bridge landing, identity badge |
| C | Long coast and low ridge | Terrain, ridge landmark, walkable paths, planting plots, bridge landing, identity badge |

Create ocean, shoreline, soil, paths, rocks, and reusable vegetation. Preserve enough open soil and sightlines for the throw preview and plant labels. Each island needs to read from above and at eye level. Design bridge landings as repeatable attachment points and leave space between islands for unfinished spans. Include a home island marker with a house icon and island name, plus a way to identify the current island when visiting.

## 3. World View and Bridge Dashboard

### World View

Design a full-width, rotatable three-quarter overview with all island labels, the home marker, and both circular corner controls. Show default and dashboard-open compositions. A selected bridge card can highlight its route and outline both endpoints. Use a dotted route for a bridge at 0%, a partially built route during construction, and a continuous bridge when open. Show separate A–B and A–C routes when B and C adopt the same idea from A.

### Bridge Dashboard

Design a right-side overlay panel on wide screens and a compact overlay or bottom sheet on narrow screens. The header shows **Bridges**, the resident’s home island, and a close control. Include an empty state for a home island with no bridges. Each card names both endpoints and shows the percentage, status, next action, and the three requirement rows.

| Card element | Content and treatment |
|---|---|
| Header | Island badges and names, percentage, and **Under construction** or **Open** status |
| Progress | Three visually divided segments with lengths proportional to 40%, 40%, and 20% |
| Foundations | Two separately labeled resident counts, each out of two. Ten percentage points per qualifying resident. |
| Walkway | Qualifying comments and replies out of four. The completed state includes participation from both endpoint islands. |
| Connection | Cross-island reply count out of one. Show a check when complete. |
| Next action | One short instruction tied to the missing requirement, such as **Add a question, example, or reply to finish the walkway**. |
| Open bridge | Keep **Open** visible and show personal crossing access separately. |

Provide card designs for 0%, in progress, nearly complete, open with access, and open with access locked. Example at 90%: foundations A 2/2 and B 2/2, walkway 3/4, connection 1/1. Third-island activity can grow the shared plant while the bridge card stays unchanged. The brief needs a pair-specific card layout that keeps this distinction clear.

### Bridge models

Supply reusable landing anchors, construction markers, foundation supports, walkway sections, the final joining span, and the complete bridge. Show which parts appear at each construction stage. Provide a small completion effect and a landing sign or interaction prompt. A contributor can cross when the bridge opens. A resident of either endpoint island who still needs access can earn it by commenting on a shared plant. Use a personal lock indicator alongside the bridge’s shared **Open** status.

## 4. First-person Player View and planting

Design a default garden view and an aiming view. Put the translucent movement joystick at bottom left and leave the right side open for look input. Separate the aiming gesture from normal look input through a clear aiming state. Keep the reticle and the object’s path readable with panels closed.

- **Default HUD** shows the World View and Seed Catalog buttons, the island identity, the movement joystick, and a subtle reticle. A plant name and **View idea** pill appear when the player targets a nearby plant.
- **Aiming HUD** shows the slingshot, loaded seed, pull feedback, dotted trajectory, landing preview, and Cancel control. Make room for a one-line drag-and-release hint.
- **Valid landing** uses a ground ring and seed indicator. **Invalid landing** uses a broken ring, ×, and a short reason such as **Aim at open soil**.
- **Throw sequence** needs slingshot idle, loaded, pulled, and released poses, an in-flight seed model, and a small planting impact effect. Define first-person framing and whether hands are visible. Include a brief planting confirmation.
- **Resident presence** needs a simple remote-player visual and readable name treatment if other residents are visible in real time. Keep names from competing with plant labels.

## 5. Plant models and effects

Create five stages with shared visual DNA and a silhouette sheet at the same scale. Give each stage a consistent ground origin so it can replace the previous model cleanly. Use the same stage across all islands for the same shared idea.

| Stage | Model and recognition cue | Prototype threshold |
|---|---|---|
| Seed planted | Low soil mound with a small identifiable seed marker | Idea submitted |
| Sprout | Short stem and two visible leaves | 1 water, 0 nutrients, someone besides the creator participates |
| Young plant | Taller stem, several leaves, broader profile | 2 water, 2 nutrients, 2 contributors |
| Tree | Distinct trunk and branches, compact canopy | 4 water, 4 nutrients, 3 contributors |
| Mature tree | Thicker trunk, wider crown, established silhouette | 6 water, 8 nutrients, 4 contributors including 2 who have replied |

Provide a thumbnail or icon for each stage. One like adds water and one comment or reply adds a nutrient. Give watering a cool droplet or root ripple, fertilizing a warm soil pulse, and a stage change a short growth transition. Use water and fertilizer feedback at maturity while the tree holds its size. Provide a simple targeted/selected highlight visible against dense foliage.

## 6. Seed creation, catalog, and plant details

### New seed form

Design a panel with an idea or article title field, short description, open question, and optional paper or poster attachment. Include field labels, attachment states, validation, the **Plant seed** action, and a way back to the garden. The action opens the slingshot aiming state.

### Seed Catalog

Match the dashboard panel’s spacing and header treatment. Cards include idea title, description preview, original island badge, current stage thumbnail, and local planting status. Include loading, empty, available, already-planted, and action-error examples. Residents discover ideas originating on their own island in the garden. Visitors adopt seeds through the catalog.

For a seed that is already growing, show the current stage beside **Adopt seed** and explain that its tree and conversation come with it. Show **Planted on your island** after successful planting, with an optional **View idea** action if navigation is supported.

### Plant details and discussion

Start with the idea title, creator, origin island badge, growth stage, question, and a summary of water, nutrients, and contributors. Show the same discussion across all locations. Provide a threaded comment layout with author island badges, reply affordances, composer, and visible posting feedback. Include a way to view attached papers or posters and make past discussion and takeaways accessible. Show followed state and a simple new-activity indicator for followed plants.

## 7. Asset handoff

| Deliverable | What to include |
|---|---|
| Art direction sheet | Palette, typography, icon style, lighting reference, and a top-down and eye-level reference |
| Editable UI designs | Named components and state variants, wide and narrow layouts, and annotated placement and spacing |
| 3D asset kit | Three islands or modular terrain kit with three layouts, landmarks, foliage, planting plots, five plant stages, first-person slingshot, seed, and bridge modules |
| Materials and textures | Source textures and game-ready exports. Identify palette swaps, tiling materials, and transparency. |
| Icons and thumbnails | Editable vectors for UI icons, island badges, stage thumbnails, and export-ready sizes |
| Motion and effects | Storyboards or previews for panel movement, slingshot pull/release, planting, watering, fertilizing, plant growth, and bridge completion |
| Unreal import notes | Agree export formats and budgets with engineering. Include units and scale, pivots, bridge snap points, collision intent, material slots, and any level-of-detail versions. |

### Review scenes

1. **Create and throw:** A resident submits an idea, aims at open soil, and sees the planted mound.
2. **Grow and discuss:** A like and a comment produce distinct effects. The player can open the plant and read its stage and conversation.
3. **Adopt a mature tree:** B adopts and plants A’s mature tree. The mature tree and its conversation appear on B, and the new A–B bridge starts at 0%.
4. **Read bridge progress:** The dashboard shows a 90% bridge and makes the missing requirement clear. At completion, compare the open state for residents with and without crossing access.
5. **See independent routes:** C adopts the same idea. A–B and A–C appear as separate routes with independent progress.
6. **Visit and return:** A resident crosses, browses a destination-only plant, and sees how to adopt it through the catalog. A followed plant shows new activity when the resident returns.
