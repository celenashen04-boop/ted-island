# CHI Island · Modeling brief (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). New in v2. The v1 design docs are at commit `0694768`.*

**Owner:** Ray (3D modeling)
**Source:** Figma "new" section (node 614:54) and the decisions confirmed on November 22. See [the change log](logic-changes-2026-11-22.md) and [context.md](../context.md).

This brief lists every 3D and model-related change from the November 22 update. Game logic and UI changes are covered in the other documents.

## Technical context

- Islands are procedural three.js models in `public/island-kit/source/{spiral,verdant,pinwheel}/`. Check edits in [Island Studio](island-studio.md) from above and at walking height, then in the Research Garden.
- Plants are drawn procedurally in `public/scene.mjs` (`drawOak`, stages 0–4). The bridges built from trees use `traceOakConnection`.
- Each island already exposes two bridge landings through `model.bridgeLandings()` in `public/island-kit/navigation.mjs`, one for each neighboring island.
- The Design Kit accepts GLB files up to 12 MB as handoff assets. Agree with engineering whether new plants and bridges ship as procedural code or GLB, and agree on the scale, pivots, and collision approach.
- The islands render at 1.125 times their original scale. Keep plant scale consistent with that.

## 1. Plant growth models (required)

Replace the five acorn-oak stages with a planted seed and three main stages. Follow the reference images in Figma nodes 600:27, 600:28, and 600:29.

| Stage | Reference | Notes |
| --- | --- | --- |
| Seed planted | — | A low soil mound with a visible seed. Show it immediately after a successful throw. |
| Sprout | 600:27 | A short stem with a few leaves |
| Young plant | 600:28 | A taller, leafy plant with a broader profile |
| Mature plant | 600:29 | A tree with a distinct trunk and a full pink canopy |

- All stages share one ground origin so each model can replace the previous one in place.
- The same shared idea shows the same stage on every island.
- The design needs a short growth transition between stages and a selected or highlighted state that stays visible against dense foliage.
- The thresholds are in context.md. They affect timing, not the models.

## 2. Dormant and revival states (required)

Inactive plants shrink, but they keep their earned stage.

- **Dormant:** After 15 days without activity, the plant gradually shrinks to a seedling-sized form over days 15 to 30. It should look dormant, for example with a closed or faded canopy, and should not look dead. Its discussion remains available.
- Provide either a dormant form for each stage or one shared seedling form for any stage. The modeler decides.
- **Revival:** One water, nourish, or reply returns the plant to its earned stage. The transition should feel rewarding.

## 3. Island icons and trunk origin icons (required)

- Design one icon for each island that reflects its theme: Health & Wellbeing (Spiral Harbor), Sustainability (Verdant Springs), and Games & Play (Pinwheel Island). Use each island's representative color.
- Deliver two versions of each icon:
  - A flat 2D icon for Island Access cards, catalog packets, and badges. It must be legible at small sizes and in the center of an access ring.
  - A 3D emblem or decal on each tree trunk showing where the plant came from. It must be readable from walking distance and must not compete with the canopy.
- Every plant stage that has a trunk shows the emblem. Decide whether sprouts show it.

## 4. Permanent bridges (required)

Bridges are no longer grown from trees or built through participation. **All three bridges exist from the start**: Health & Wellbeing–Sustainability, Health & Wellbeing–Games & Play, and Sustainability–Games & Play.

- Model each span between the existing landing points. Keep the walking surface continuous with the island decks, provide collision, and allow walking in both directions.
- The previous Mossy Tangle tree-built spans and the `traceOakConnection` growth stages are retired. A mossy, organic style can stay as the visual style.
- **Locked state:** A player without access to the far island can see the bridge but cannot cross it. The locked bridge needs a visible boundary at the entrance, such as a gate, closed arch, or vine curtain, plus a spot for the frosted-glass prompt.
- **Unlocked state:** When access is active, the boundary opens or is visibly removed. A brief unlock effect plays when access is first granted. Access is per player, so the locked and unlocked states are visual only, never shared geometry.
- The bridges must read clearly in World View from the rotating overview and in Player View when another island is seen in the distance.

### Known bug: players fall under the island near Sustainability's bridges (Ray to investigate)

**Symptom (reported Nov 22):** A player walking down a bridge at Sustainability (Verdant Springs) suddenly falls below the island and is sent back to the spawn point.

**What the code does:** When a player's feet drop more than 8 units below the lowest bridge end, `walk()` in `public/scene.mjs` returns them to `spawn`. The respawn is a consequence of the fall, not a separate bug.

**Still to find out:**
- Which bridge: toward Health & Wellbeing or Games & Play?
- Which direction: onto Sustainability, or away from it?
- Was the player at the center or near the edge of the bridge?

**Leads from a quick movement simulation (unconfirmed):**
1. Verdant's east landing at local (5.35, 1.92) now sits on the meadow because the freestanding landing block was removed (see [island-integration.md](island-integration.md)). Sustainability is the highest island and Games & Play the lowest. Near that landing, the bridge surface is already about 0.7 below the meadow edge about 2 units out, and the bridge visibly passes under the meadow lip.
2. `moveTo()` decides whether a step is allowed with `queryIsland(x, z, radius)`. The gravity step in `walk()` / `floorAt()` uses `queryIsland(x, z, 0)` and treats `island_boundary` as no floor. Where these two checks disagree near the rim, and the point is outside the bridge's half-width (0.65), a player can step somewhere with no floor and fall through. This needs checking with a grid scan around each landing.

**Fix target for the new permanent bridges:**
- Give each bridge a level landing deck at the island's rim height, continuous with the walkable terrain. Leave no gap between the island boundary and the bridge surface, and no step down greater than 0.56.
- Make the bridge at least as wide as the walkable rim it meets, or block the rim on either side of the landing.
- Test all three bridges in both directions, along the center and along both edges, and confirm that no player can reach spawn by falling.

## 5. Scenery plants on islands (required, Ray decides the details)

The existing decorative plants compete with idea plants. **Direction from November 22: remove the scenery plants and keep only the round green bushes.** Ray makes the final call for each island.

Earlier proposals from the comments on Figma node 600:20 are still available:

- **Sustainability (Verdant Springs):** keep the scenery plants inside the greenhouse to match the theme.
- **Health & Wellbeing (Spiral Harbor):** remove all of the scenery plants.

Whatever is decided:

- Idea plants must be clearly distinguishable from the remaining bushes by silhouette, trunk emblem, and color.
- Keep enough open grass for acorn landings.
- After changing any plants, check the navigation and walkable areas. The edge-stuck issue (Figma 600:19) is handled with an edge prompt. If the cause is collision or landing geometry, fix it in the model.

## 6. Interaction effects (shared with engineering)

- **Watering:** a cool droplet effect or a ripple through the roots
- **Fertilizing:** a warm pulse in the soil
- **Planting:** a small impact effect when the acorn lands
- **Growth:** a short transition between stages
- **Dormancy and revival:** see section 2
- **Bridge unlock:** see section 4

The interface shows text with each effect, such as "+1 water · access until Tue 3 p.m." Each effect needs a clear anchor point on the plant.

## 7. Open questions for Ray and the team

1. **Thrown seed (Ray decides):** The tree changes from an oak to a pink-canopy tree. Should the thrown seed stay an acorn, or change to a seed that matches the new tree?
2. **One species or one per island?** The trunk emblem marks origin. Should the canopy color or species also vary by origin island?
3. **Locked-bridge boundary:** gate, arch, vines, or another treatment?
4. **Scenery plants:** finalize each island using the section 5 direction to keep only the round green bushes.
5. **Dormant forms:** one shared seedling form, or a separate dormant form for each stage?
6. **Delivery format:** procedural code in the island kit, or GLB files? Agree with engineering before modeling begins.

## Checklist

- [ ] Planted seed, sprout, young plant, and mature plant models
- [ ] Dormant form or forms, plus shrink and revival transitions
- [ ] Three flat island icons
- [ ] Trunk emblem for each island
- [ ] Three permanent bridges with locked and unlocked states and an unlock effect
- [ ] Investigate and fix the fall-under-island bug at Sustainability's bridges
- [ ] Scenery plants removed except the round green bushes, finalized for each island
- [ ] Watering, fertilizing, planting, and growth effects
- [ ] Studio and Research Garden check from above and at walking height
