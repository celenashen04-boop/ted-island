# Island integration and progress (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). Version 1 is commit `0694768`.*

The Studio started from general-site commit `a5fa553`. The revised procedural models have now been brought back into the Research Garden. Both experiences consume the same sources in `public/island-kit/`; the separate Studio viewer and routes live under `public/studios/`. See the [Studio editing guide](island-studio.md).

## What changed since the export

| Area | Changes |
| --- | --- |
| All islands | Expanded the grass and rock shoulders to provide more planting space while preserving each island’s silhouette. Added island-specific plants arranged in irregular patches. Refined shorelines against the terrain triangles. |
| Spiral Harbor | Rebuilt the pavilion ramp as a thick, supported deck that meets the terrain and ends at the pavilion floor. Kept the reflecting pond, dock, and animated boat and refined the sandy shoreline. |
| Verdant Springs | Reworked the stream, banks, and waterfall lip to form a connected water surface. Softened the outlet outline. Relocated the pond and pavilion willows and cleared the greenhouse stairs. Rebuilt the rear bridge approaches with rectangular timber strips, joined the terraces near the pavilion, and removed the freestanding east landing block. The east bridge endpoint now sits on the meadow. Added greenhouse stairs at both doors, arched windows with muted blue glazing, and eight distinct specimens on the indoor benches. Consolidated the outdoor flower beds into one planted bed on open ground. |
| Pinwheel Island | Expanded the mint meadow with sculptural flowers and other low planting, and refined both pools while retaining their stepping stones and the existing kinetic installations. |
| Navigation | Marked low beds and greenhouse planters as stepable surfaces. Small decorative vegetation does not block movement. Walking through water uses the basin, and the water surface provides depth information. The island boundaries and bridge endpoints are exported with current model coordinates. |

## Research Garden integration

- Player View and World View build the same island kit used by the standalone Studio.
- The Research Garden and its server use the same navigation model to resolve terrain height and seed placement. Decorative vegetation is compatible with seed drops on eligible ground.
- The full game keeps its onboarding, Seed Catalog, planting, and player movement. As of November 22, 2026, bridge construction is replaced by permanent bridges with time-limited island access. See [the change log](logic-changes-2026-11-22.md) for details. The Studio provides a separate viewing and local editing workflow and has no garden session.
- Island Studio is no longer linked from the onboarding screen, because the link confused new players. The Node server and Vercel route configuration both expose `/studios` and its three island pages.
- Permanent bridge models, revised plant stages, island icons, and scenery-plant changes are tracked in [the modeling brief](modeling-brief.md).
