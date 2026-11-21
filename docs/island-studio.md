# Island Studio

[Island Studio](https://ted-island.vercel.app/studios) is the standalone viewer for [Spiral Harbor](https://ted-island.vercel.app/studios/spiral), [Verdant Springs](https://ted-island.vercel.app/studios/verdant), and [Pinwheel Island](https://ted-island.vercel.app/studios/pinwheel). It opens directly without choosing a home island or creating a garden session.

## View and edit locally

1. Clone this repository, then run `node studio-server.mjs` from its root with Node.js 24 or newer.
2. Open [the local Studio](http://127.0.0.1:4174/studios). Use **Orbit view** to inspect geometry, **Explore on foot** to check routes, and **Reset view** to return to the starting view. **Navigation data** downloads the current island's boundaries, walkable surfaces, obstacles, water mask, and bridge endpoints.
3. Edit the relevant source files in your editor and reload the page. Edit and review on a branch when the production site should keep its current models.
4. Use `npm run dev` and open [the local Research Garden](http://127.0.0.1:4173/) when verifying the same changes inside the full game.

The Studio is an editing preview. Geometry edits are made in source files.

| Change | Source |
| --- | --- |
| Island terrain, architecture, planting, and water | `public/island-kit/source/{spiral,verdant,pinwheel}/` |
| Spiral pavilion ramp | `public/island-kit/source/spiral/pavilion-ramp.js` |
| Verdant greenhouse approaches and indoor exhibit | `public/island-kit/source/verdant/greenhouse-access.js` and `botanical-display.js` |
| Shared meadow planting and shoreline tools | `public/island-kit/source/meadow-plants.js` and `shoreline.js` |
| Walking, planting, and collision queries | `public/island-kit/navigation.mjs` and `collision.mjs` |
| Studio pages, controls, and presentation | `public/studios/` |

After changing a model, inspect it from above and at walking height. Confirm that plants root into terrain, water meets its banks, and each new walkway reaches its intended surface. Check placement rules and bridge approaches in the Research Garden for changes that affect either.
