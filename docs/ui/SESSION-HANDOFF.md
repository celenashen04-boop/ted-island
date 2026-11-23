# UI workstream: session handoff (branch `ui/v2-look`)

*Last updated Nov 23, 2026. For Cassius, or the next agent picking this up. Read `CLAUDE.md` and `docs/ui/UI-CONTEXT.md` first; this file only records where the work stopped.*

## How to run

- `npm run dev`: the game at http://127.0.0.1:4173. Nothing from `public/ui/` is wired into it yet.
- `node ui-preview-server.mjs`: the UI gallery at http://127.0.0.1:4175/ui/preview.html. `server.mjs` only serves an allowlist, so `/ui/` returns 404 on port 4173. On Vercel, `/ui/` is not routed yet (`vercel.json` maps only some paths), so use the `/public/` prefix there: `/public/ui/mood-preview.html` works fully, and `/public/ui/preview.html` loads without its icons, badges and stage images.
- Figma design system: file `6QNXwAjpDU1niZin1aiWby` (node IDs in UI-CONTEXT §0.1).
- `ui/v2-look` is pushed to origin through Phase 8 (Nov 23). Ask Cassius before pushing again or opening a PR.

## Status by phase

| Phase | Status | Main files |
|---|---|---|
| 1 · Tokens and core components | Done | `public/ui/tokens.css`, `components.css`, `icons/`, `badges/`, `stages/` |
| Motion layer (extra, requested) | Done | `motion.css`, `motion.mjs`, motion tokens in `tokens.css` |
| 2 · HUD: menu, ID label, bell, toasts, tip | Done | `hud.mjs`, `menu.mjs`, `id-label.mjs`, `bell.mjs`, `toast.mjs`, `islands-ui.mjs` |
| 3 · Island Access panel | Done | `access-ring.mjs`, `access-panel.mjs` (styles in `components.css`) |
| 4 · Onboarding, rotate prompt, tutorial | Done and verified (Nov 22) | `onboarding.css`, `onboarding.mjs`, `fields.mjs`, `rotate-prompt.mjs`, `tutorial.mjs` |
| 5 · Notifications and in-world feedback | Done, approved Nov 23 | `notifications.mjs`, `world-feedback.mjs`, `email-notification.html` (styles in `components.css`, `motion.css`) |
| 6 · Restyle existing panels | Done. Approved by Cassius (Nov 23) | `catalog.mjs`, `seed-form.mjs`, `plant-detail.mjs`, `world-labels.mjs`, `panel.mjs`, `panels.css` |
| 7 · Rendering mood | 3 options in a separate preview page (Nov 23). Waiting on Cassius and Ray to pick one. Live game untouched | `mood.mjs`, `mood-preview.html`, `mood-preview.mjs`, `docs/ui/phase7-mood/` |
| 8 · Handoff doc `docs/ui-handoff.md` | Written (Nov 23) | `docs/ui-handoff.md` |

## Phase 4: verification (done)

- Every onboarding screen was compared with its Figma frame: Enter, ID reveal, Secure, Sign in, Judge, and Choose home island with the explainer.
  - Fixed: the Secure form column is now 320 px as drawn. A cleared error no longer leaves an empty helper row. The checkbox keeps its 44 px hit area without adding space.
- Flows checked: the new-player path, the sign-in errors, and the Judge path.
- Rotate prompt: matches 18:3, apart from a 32 px safe area. The Figma frame has no padding.
- Tutorial: all 6 steps compared side by side with the Figma frames.
  - Fixed: the step 4 card is top-aligned beside the landing spot. The step 5 card sits higher, so the stage strip sits under it as drawn.
  - Every card stays at least 16 px inside the frame.
  - The arrow keys, Escape, Replay and focus on each card title all work.
  - Reduced motion: no highlight draw-in, and the card only fades.
- At 390 px there is no horizontal page scroll. Every control a player touches has a 44 px hit area; the small buttons get theirs from a pseudo-element.

## Phase 5: what was built and checked

- **Notification list and empty state** (21:996, 21:1166): live in the gallery at `#notifications`.
  - The bell opens the panel, and selecting a row marks it read and updates the bell.
  - The empty state drops the email line when the player already has an email.
  - Checked: keyboard (Tab, Enter, Escape), focus on the selected row after it is rebuilt, and 83 px rows.
- **Email** (21:1302): `email-notification.html`, built with tables and inline styles. The gallery fills it with the Figma sample.
- **In-world pieces** (20:437 to 20:1355): live at `#world`, each state compared with its Figma frame.
  - View idea pill, dormant label, valid, invalid and failed landing, edge prompt, locked bridge with Unlock access, water and nourish feedback with the access toast.
  - The failed-throw marker is a button that retries.
- **Not built:** scene effects (water ripple, nourish pulse) stay with Celena; they are in the Motion section.

## Phase 6: what was built and checked

- **Seed Catalog** (23:187, filtered 23:335):
  - Filters for the other islands.
  - Card states: Available, Growing, and Planted with View idea.
  - When it opens from Unlock access at a locked bridge, it shows the locked-bridge note.
- **New seed form** (20:903): title and question side by side, the description, Attach paper or poster, and Plant seed.
  - Adopted seeds show the current app's confirmation line instead of the fields.
- **Plant detail** (23:478): the idea column, the shared discussion with replies, and the composer.
  - Dormant state: the dormant stage image and "One like or comment revives it".
- **World View labels and legend** (16:416, 23:126).
- Checked:
  - side by side with every Figma frame;
  - 44 px tap areas;
  - keyboard: focus, validation, Escape, reply and post, Follow pressed state;
  - no horizontal scroll at 390 px.
- `.ui-plant` was already taken by the stage-growth mock in `motion.css`, so the plant detail classes use `ui-plant-detail`.

## Decisions Cassius has made (keep them)

- Direction G · Poster Signal. Figma is the source of truth for the look.
- Motion: quick and precise with no overshoot. CSS only. Tokens in `tokens.css`.
- Water and nourish effects use the plant's island hue: thin rings for water, a filled disc for nourish.
- Menu option C: Seed Catalog, Island Access, Followed plants, How to play, Email and reminders, and a footer with the ID and Log out. The bell and ID label stay outside the menu.
- Island Access maturity uses the confirmed copy: "4 of 12 ideas mature (33%)".
- The phone Island Access panel leaves out the body line. It does not fit: 410 px on a 390 px screen.
- "Not open yet" (an island never unlocked) stays. Cassius is raising it with the team.
- The rotate prompt and tutorial are built as drawn in Figma, with no options.

## Open items for Cassius

- Hover, pressed, disabled and focus states are placeholders. Figma has no variants for them.
- The tip component is not in Figma; it was built from the Prompt's Locked anatomy. Its two example tips use placeholder copy.
- Figma bugs worked around in code:
  - The Icon Button Active L globe draws its inner strokes in black on black.
  - The empty state's "Open Seed Catalog" button has a blank icon.
  - The selected card's expiry line runs past the card edge.
  - Tutorial steps 4 and 6 run off the screen.
  - The Figma menu still shows 4 items; option C has 5.
- New copy not in Figma:
  - "That ID and password don’t match."
  - "Enter your ID."
  - "Check the email address."
  - "Copied"
  - "Not open yet"
- Tutorial step 1 says "Drag the left pad". A desktop (W A S D) variant may be needed.
- The toast copy format question is open with the team (UI-CONTEXT §11).
- The em dash in the confirmed ID reveal copy is still flagged (UI-CONTEXT §11).

## Phase 7 · Rendering mood (options only)

- Preview: http://127.0.0.1:4175/ui/mood-preview.html (gallery server). Query: `?mood=current|morning|noon|dusk&view=player|close|world&ui=0`. Drag to look around. The bar has per-layer toggles (sky, fog, tint, shadows) and a live fps readout.
- The page builds its own scene from Ray's island models (read-only imports of `islands.mjs` and `island-kit/navigation.mjs`). `render.mjs`, `scene.mjs` and `world.mjs` are unchanged. `ui-preview-server.mjs` now also serves `/island-kit/` and `/islands.mjs`, read-only, for this page.
- `public/ui/mood.mjs` holds the 3 options (A Pastel morning, B Clear noon, C Warm dusk) plus Current, and `createMood()`, which is the one function render.mjs would call behind a flag once a mood is picked.
- Sky is a CSS gradient behind the transparent canvas (as the game does today). Fog is `THREE.Fog`, with separate bands for Player and World View. Tint is a faint emissive wash of the island hue. Contact shadows are one `InstancedMesh` of soft blobs (1 draw call).
- Plants are low-poly stand-ins. Shadows are flat blobs, so they may clip on steep slopes (up to 35 degrees where planting is allowed).
- Measured on 844×390 at a 1.5 pixel ratio (Apple M4 Max via Chrome; the browser caps the frame loop at 30 fps, so cost is measured with a forced-sync benchmark): every option is within 0.5 ms of Current. With 4× CPU throttling, Current is 19.8 ms (Player) and 23.2 ms (World). The baseline cost is Ray's islands at about 2,050 to 2,500 draw calls, not the mood.
- Screenshots and the comparison sheet: `docs/ui/phase7-mood/mood-options.png`.

## Requests to teammates

These are listed in UI-CONTEXT §11:
- **Celena:**
  - a `/ui/` static route;
  - the data the Island Access panel needs;
  - scene hooks for the water and nourish effects and the landing marker;
  - the screen rectangles the tutorial needs for steps 4 to 6 (landing, plant, bridge).
- **Ray:** island icons, sign-off on the island hues, and motion for stage growth, dormancy and bridge unlock.

## Conventions to keep

- Every class starts with `ui-`. New work goes in `public/ui/`. No edits to `index.html`, `app.mjs`, `style.css`, `server.mjs`, `garden.mjs` or `api/`.
- Modules take plain data and callbacks, return DOM, and have no globals. All copy lives in one place per module.
- Load order: `tokens.css`, `components.css`, `motion.css`, `onboarding.css`, `panels.css`. Watch selector specificity, because `motion.css` loads after `components.css`.
- No em dashes in anything new. Small commits on `ui/v2-look` with the Co-Authored-By line.
- Playwright screenshots must be saved under the workspace (`.playwright-mcp/`). Delete that folder afterwards.
