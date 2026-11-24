# Agent instructions · CHI Island UI workstream (Cassius)

You are working for **Cassius Palacio**, who owns **UI and look** for CHI Island, a CHI 2027 Student Design Competition entry. You are running in VS Code inside the team repo `celenashen04-boop/ted-island`.

## Before you do anything

1. Read, in this order:
   1. `docs/ui/UI-CONTEXT.md` (the full context for this workstream; **the source of truth for your scope**)
   2. `visualrequirement.md` (the UI brief)
   3. `docs/logic-changes-2026-11-22.md` (what changed in v2, and §10 on rendering)
   4. `context.md` (game rules)
   5. Skim `public/index.html`, `public/style.css`, `public/app.mjs`, and `public/island-kit/render.mjs`
2. Run `git status` and `git branch -a`. Confirm you are on `ui/v2-look`. If it doesn't exist, create it from `origin/docs/v2-logic` (or from `origin/main` if PR #1 has been merged; check with `gh pr view 1 --repo celenashen04-boop/ted-island`).
3. Run `npm run dev` and confirm http://127.0.0.1:4173 loads.
4. Cassius's design system and all UI screens are in Figma file `6QNXwAjpDU1niZin1aiWby` (Direction G · Poster Signal). That is the source of truth for the look; node IDs are in UI-CONTEXT §0.1. If the team logic file link in §0 is also filled in, pull its reference frames for behavior and copy: node `614:54` (v2 logic), `599:4` (Welcome), `599:5` (rotate prompt), `600:6` (Player View controls), `600:18` (dashboard → Island Access), `600:19` (edge issue), `600:20` (scenery), `600:27`–`600:29` (plant references), `609:36` (enter page, ID label). Use `get_screenshot`, `get_design_context`, and `get_metadata`. Summarize what you see for Cassius before building.

## Hard rules

- **Scope:** UI, visual design, onboarding, tutorial, notification UI, the rotate prompt, and the rendering mood only. **Do not** change game logic, access math, growth thresholds, server or backend code (`server.mjs`, `garden.mjs`, `api/`), or Ray's island geometry in `public/island-kit/source/`.
- **Rendering changes** in `public/island-kit/render.mjs`, `scene.mjs`, or `world.mjs` (sky, fog, lighting, contact shadows): propose them first, keep them behind a small flag or isolated function, and tell Cassius to check with Ray before merging.
- **No dependencies, no frameworks, no build step.** Plain HTML, CSS, and ES modules, matching the existing code.
- **Avoid conflicts with Celena**, who is rewriting `index.html`, `app.mjs`, and `style.css` in parallel. Put new work in new files under `public/ui/` (see UI-CONTEXT §10). Keep edits to shared files minimal and additive.
- **Never** push to `main`, merge PRs, force-push, or delete branches. Commit to `ui/v2-look`. Ask Cassius before pushing or opening a PR.
- **Confirmed copy** in UI-CONTEXT §7 stays word for word unless Cassius changes it.
- **Do not use em dashes** in anything you write: docs, commit messages, comments, new UI copy, or messages to Cassius. Use periods, commas, colons, or parentheses. (The one confirmed string with an em dash is flagged in UI-CONTEXT §11; leave it and point it out.)
- **Design decisions that belong to Cassius** (palette, type, menu contents, rotate prompt, tutorial look, rendering mood): present 2 or 3 clear options with a screenshot or preview of each, and let him choose. Do not pick for him and do not offer your own leaning on team-level decisions.
- **Accessibility:** 44 × 44 minimum hit area, `aria-label` or tooltip on every icon-only button, visible `:focus-visible` rings, respect `prefers-reduced-motion`, safe-area insets, and **never use color as the only signal**.
- **Performance:** must run smoothly on phones. No real-time shadow maps, no post-processing, no large textures. Prefer CSS over canvas for UI.

## Work plan (in this order; check in with Cassius after each phase)

### Phase 1 · Tokens from Figma (direction is decided: G · Poster Signal)
The look is **already designed** in Figma file `6QNXwAjpDU1niZin1aiWby`. Do not invent a new direction. UI-CONTEXT §0.1 lists every token, text style and node ID.
1. Build `public/ui/tokens.css` from the token table in UI-CONTEXT §0.1. Use the exact CSS names from the Figma variables' code syntax (`--color-text-primary`, `--space-16`, etc.). Load Archivo and Space Mono from Google Fonts.
2. For each component, use the Figma MCP (`get_design_context` and `get_screenshot` with the node IDs in §0.1, after loading the `figma-design-to-code` skill) and reproduce it in plain HTML/CSS.
3. Build `public/ui/preview.html` showing every component state next to its Figma screenshot. Stop and show Cassius.

### Phase 2 · Core components
In `public/ui/components.css` plus small `.mjs` modules where behavior is needed:
- Circular icon button (all states), labeled panel button (primary, secondary, outline)
- Frosted-glass surface (prompts, toasts, tips)
- Top-right cluster: **menu dropdown** (Seed Catalog, Island Access, plus options for Cassius), **user ID label** with copy, **notification bell** with an unread dot
- Toast component for "+48 hours" and "Access full (5 days)"

### Phase 3 · Island Access panel
- `public/ui/access-ring.mjs`: an SVG ring component. Input `{ islandId, name, hue, iconSvg, expiresAt, now, maturity: {mature, total}, isHome }`. Fixed 120 h scale.
- Card states: full, 72 h, 48 h, 24 h, 6 h (clock alert), expired, home, plus the panel empty state
- Wide (right overlay) and narrow (bottom sheet) layouts
- Selected card detail: "Access ends {date} at {time}"

### Phase 4 · Login, onboarding, rotate prompt, tutorial
- Enter page → ID reveal (Copy) → password → optional email and checkbox → Welcome and home island choice (the "home island" explainer) → tutorial
- Returning sign-in and **Login as Judge**
- Remove the Island Studio link and the LinkedIn onboarding fields in the preview designs
- Rotate prompt redesign
- Tutorial: step cards or coach marks covering walk, create a seed, catalog, adopt and plant, water and nourish, plant stages, ending with "adopt a seed, water it, and the bridge opens"

### Phase 5 · Notifications and in-world feedback
- Notification list with the 4 types, unread state, and empty state
- Email template (plain HTML, inline styles) in `public/ui/email-notification.html`
- Edge prompt, locked bridge prompt with **Unlock access**, valid and invalid landing labels, water and nourish feedback, dormant plant label, **View idea** pill

### Phase 6 · Restyle existing panels
Seed Catalog, New seed form, Plant details and discussion, World View labels with maturity rate, all in the new tokens. Prefer overriding through the new stylesheets rather than rewriting `style.css`.

### Phase 7 · Rendering mood (only after Cassius approves and Ray is looped in)
Sky gradient or skydome, distance fog, a light tint for each island, and cheap blob contact shadows under plants. Measure the frame rate before and after in `?preview=mobile`.

### Phase 8 · Handoff
- Write `docs/ui-handoff.md`: every component, its class names, expected data, states, where it mounts in the HUD, and which existing element IDs it replaces (`#open-catalog`, `#toggle-dashboard`, `#world-dashboard`, `#onboarding`, `#landscape-required`, etc.)
- Optionally push the gallery into Figma (use the `figma-use` / `figma-generate-design` skills, or `html_to_figma`) on a page named "UI v2 · Cassius" so the team can comment.

## How to verify every change

- Reload http://127.0.0.1:4173/ui/preview.html and http://127.0.0.1:4173/?preview=mobile
- Take screenshots (browser tool if available) and show them to Cassius
- Check keyboard tab order and focus rings
- Check every ring state against the table in UI-CONTEXT §7.4
- `git diff --stat` before each commit; shared files should show only small additive changes

## Commits

Small, descriptive commits on `ui/v2-look`, for example `ui: add design tokens and direction board`. No em dashes in messages.

## When you're unsure

Ask Cassius one short question rather than guessing. If the question is really for Ray, Celena, Yuwen, or Penny, add it to UI-CONTEXT §11 and tell Cassius who to ask.
