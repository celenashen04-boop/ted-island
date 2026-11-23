# UI workstream: session handoff (branch `ui/v2-look`)

*Last updated Nov 22, 2026. For Cassius, or the next agent picking this up. Read `CLAUDE.md` and `docs/ui/UI-CONTEXT.md` first; this file only records where the work stopped.*

## How to run

- `npm run dev`: the game at http://127.0.0.1:4173. Nothing from `public/ui/` is wired into it yet.
- `node ui-preview-server.mjs`: the UI gallery at http://127.0.0.1:4175/ui/preview.html. `server.mjs` only serves an allowlist, so `/ui/` returns 404 on port 4173. Vercel serves `public/**`, so `/ui/preview.html` works there.
- Figma design system: file `6QNXwAjpDU1niZin1aiWby` (node IDs in UI-CONTEXT §0.1).
- Nothing has been pushed. Every commit is local on `ui/v2-look`. Ask Cassius before pushing or opening a PR.

## Status by phase

| Phase | Status | Main files |
|---|---|---|
| 1 · Tokens and core components | Done | `public/ui/tokens.css`, `components.css`, `icons/`, `badges/`, `stages/` |
| Motion layer (extra, requested) | Done | `motion.css`, `motion.mjs`, motion tokens in `tokens.css` |
| 2 · HUD: menu, ID label, bell, toasts, tip | Done | `hud.mjs`, `menu.mjs`, `id-label.mjs`, `bell.mjs`, `toast.mjs`, `islands-ui.mjs` |
| 3 · Island Access panel | Done | `access-ring.mjs`, `access-panel.mjs` (styles in `components.css`) |
| 4 · Onboarding, rotate prompt, tutorial | Built, committed, **verification partly done** (see below) | `onboarding.css`, `onboarding.mjs`, `fields.mjs`, `rotate-prompt.mjs`, `tutorial.mjs` |
| 5 · Notifications and in-world feedback | Not started | |
| 6 · Restyle existing panels | Not started | |
| 7 · Rendering mood | Not started (needs Cassius's approval and Ray) | |
| 8 · Handoff doc `docs/ui-handoff.md` | Not started | |

## Phase 4: what was verified and what is left

Verified in the browser (gallery, `#onboarding`):
- The Enter and Choose home island screens match Figma.
- The new-player path: ID reveal and Copy; the Secure screen's short-password error and focus; the no-email warning, which hides once an email is typed; then Choose home island.
- The home island explainer opens.
- Sign-in: empty ID error, wrong-password error (role="alert"), success.
- Judge path: random ID, then Choose home with the "Welcome to CHI Island" eyebrow.

Still to check:
1. Screenshot the ID reveal, Secure, Sign in and Judge screens and compare them with the Figma refs (the gallery swaps the matching Figma image under the live frame).
2. The rotate prompt in its 390 × 844 frame against `figma-ref/ob-rotate.png`.
3. The tutorial: run all 6 steps in `#tutorial`. Check that the highlight sits on the joystick, plus and menu; that cards stay inside the frame (steps 4 and 6 overflow in Figma, and the code clamps them); that the step 5 stage strip shows; that the dashed highlight draws in; and that Escape and the arrow keys work.
4. Phone-width overflow (390 px) and the 44 px hit-area check over the new sections.
5. Reduced motion: the tutorial highlight should not draw in, and screens should only fade.
6. Then report Phase 4 to Cassius and wait for a go-ahead on Phase 5.

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
- Load order: `tokens.css`, `components.css`, `motion.css`, `onboarding.css`. Watch selector specificity, because `motion.css` loads after `components.css`.
- No em dashes in anything new. Small commits on `ui/v2-look` with the Co-Authored-By line.
- Playwright screenshots must be saved under the workspace (`.playwright-mcp/`). Delete that folder afterwards.
