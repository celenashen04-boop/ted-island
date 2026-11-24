# CHI Island UI v2 · handoff

> **Integrated on `feat/v2-backend`.** Open `/?preview=mobile` to play. Generated IDs, PDF planting, access, shared discussion, followed-plant read tracking, and the email preferences UI use the live backend. Email delivery and password reset links require the Railway mail settings in the README. The noon mood remains opt-in pending Ray’s review.

*Branch `ui/v2-look`, November 23, 2026. Owner: Cassius (UI and look). Written for Celena (wiring the UI into the game) and Ray (3D and rendering).*

Everything here is new files in `public/ui/`, plus the rendering mood (`public/island-kit/mood.mjs` and a flag in `render.mjs`, off by default). Nothing else is wired into the game yet: `index.html`, `app.mjs`, `style.css`, `server.mjs`, `garden.mjs`, `api/`, `scene.mjs` and `world.mjs` are unchanged. This doc says what each piece is, what data it needs, and which current element it replaces.

Contents:
1. [How to run and see it](#1-how-to-run-and-see-it)
2. [How the kit works](#2-how-the-kit-works)
3. [Player View HUD](#3-player-view-hud)
4. [Island Access](#4-island-access)
5. [Login, onboarding, rotate prompt, tutorial](#5-login-onboarding-rotate-prompt-tutorial)
6. [Notifications and email](#6-notifications-and-email)
7. [In-world prompts and feedback](#7-in-world-prompts-and-feedback)
8. [Panels: Seed Catalog, New seed, Plant detail, Followed plants, Island plants, Email and reminders](#8-panels)
9. [World View labels](#9-world-view-labels)
10. [Rendering mood (option B, behind a flag)](#10-rendering-mood-option-b-behind-a-flag)
11. [Element ID map](#11-element-id-map)
12. [Wiring checklist](#12-wiring-checklist)
13. [Open items](#13-open-items)

---

## 1. How to run and see it

| What | Where |
|---|---|
| Game (unchanged) | `npm run dev`, then http://127.0.0.1:4173 |
| UI gallery: every component, live, beside its Figma frame | `node ui-preview-server.mjs`, then http://127.0.0.1:4175/ui/preview.html |
| Rendering mood in the game (flag) | http://127.0.0.1:4173/?preview=mobile-game&mood=noon |
| Rendering mood preview (all options) | http://127.0.0.1:4175/ui/mood-preview.html |
| Figma (source of truth for the look) | file `6QNXwAjpDU1niZin1aiWby`, Direction G · Poster Signal. Node IDs are in `docs/ui/UI-CONTEXT.md` §0.1 and in each module's header comment |

`server.mjs` serves only an allowlist, so `/ui/` returns 404 on port 4173. On Vercel, `/ui/` is not routed either (see [§13](#13-open-items)). Until it is, use the `/public/` prefix on a deployment: `/public/ui/mood-preview.html` works fully, and `/public/ui/preview.html` loads but its icons, badges and stage images are missing.

## 2. How the kit works

**Stylesheets**, in this order (later files rely on earlier ones):

```html
<link rel="stylesheet" href="/ui/tokens.css">      <!-- colors, type, spacing, motion tokens, Archivo + Space Mono -->
<link rel="stylesheet" href="/ui/components.css">  <!-- buttons, icon buttons, HUD, toasts, prompts, tips, access, notifications -->
<link rel="stylesheet" href="/ui/motion.css">      <!-- all animation; respects prefers-reduced-motion -->
<link rel="stylesheet" href="/ui/onboarding.css">  <!-- login, onboarding, rotate prompt, tutorial -->
<link rel="stylesheet" href="/ui/panels.css">      <!-- catalog, new seed, plant detail, World View labels -->
```

Load them after `style.css` so they win where they overlap. Every class starts with `ui-`, so nothing collides with the current classes.

**Modules.** Each `.mjs` file exports a `create...()` function. It takes plain data and callbacks and returns DOM (usually `{ element }` or `{ layer, open, close, update }`). There are no globals and no network calls: anything that talks to the server is a callback you pass in. All copy lives at the top of each module.

**Panels** (catalog, new seed, plant detail, followed plants, island plants, email and reminders, Island Access, notifications) return a `layer`: a full-screen `.ui-layer` with a backdrop. Append it to `document.body` once, then call `open()` and `close()`. Escape, the backdrop and the × close it, focus moves into the panel and returns to the opener, and `motion.mjs` runs the slide. `contained: true` is only for the gallery; leave it off in the game.

**Shared helpers.**

| File | Exports | Use |
|---|---|---|
| `islands-ui.mjs` | `ISLAND_UI`, `islandUi(id)`, `islandClass(id)`, `islandBadgeSrc(id)`, `el()`, `icon(name)` | Island names and hues by id (matches `islands.mjs`). `islandClass(id)` sets `--island` for any component |
| `motion.mjs` | `openPanel`, `closePanel`, `toggleMenu`, `showToast`, `setRing`, `setNumeral`, `swapStage`, `setDormant`, `setPlusReady`, `motionMs`, `prefersReducedMotion` | State classes for motion.css. `motionMs('--motion-...')` reads a duration token from JS |
| `fields.mjs` | `createField`, `createCheckbox`, `infoLine` | Text field (single or multi-line) with label, help and `setError()`; checkbox with a 44 px hit area |
| `panel.mjs` | `createPanelShell`, `createPanelHeader` | The shared panel frame and header (title, subtitle, island accent, close) |

**Assets.** `icons/` (the Figma icon set, used through `icon(name)`), `badges/` (placeholder island badges until Ray's icons arrive), `stages/` (seed, sprout, young, mature, dormant), `markers/` (landing and legend marks).

**Accessibility built in.** 44 × 44 hit areas (small controls get theirs from a pseudo-element), `aria-label` or a visible label on every icon button, visible `:focus-visible` rings, full keyboard support in the menu, panels and tutorial, reduced motion, safe-area insets, and no state shown by color alone (every ring, dot and lock also has text).

## 3. Player View HUD

Figma: Player View / Default 20:3, Menu open 20:147. Gallery: `#hud`.

**Top right: `hud.mjs` → `createTopRight()`**. Builds the ID label, the bell and the menu as one cluster (`.ui-hud-tr`).

```js
const hud = createTopRight({
  playerId: 'Mossy-Fern-4821',
  unread: 1,
  items: MENU_ITEMS,                 // option C, chosen by Cassius
  onSelect: id => { /* 'catalog' | 'access' | 'followed' | 'how-to-play' | 'settings' */ },
  onNotifications: () => notifications.open(),
  onLogout: () => { ... },
});
document.querySelector('.world').append(hud.element);
// hud.idLabel, hud.bell, hud.menu, hud.setPlayerId(id)
```

| Piece | Module | Class | States and notes |
|---|---|---|---|
| ID label | `id-label.mjs` `createIdLabel(id)` | `.ui-id-label` | Default, Copied (2 s, announced). `setId()` |
| Bell | `bell.mjs` `createBell({ unread, onOpen })` | `.ui-icon-btn` with dot | No dot, unread dot. `setUnread(n, { pulse })`. The label carries the count |
| Menu | `menu.mjs` `createMenu({ items, playerId, onSelect, onLogout })` | `.ui-menu-anchor`, `.ui-menu` | Closed, open, selected item. `setMeta(id, text)` updates a line, e.g. `setMeta('access', '2 islands open · 1d left')`. Arrow keys, Home, End, Escape |

Menu items (option C): **Seed Catalog**, **Island Access**, **Followed plants**, **How to play** (replays the tutorial), **Email and reminders** (the optional email, the expiry reminder checkbox and unsubscribe). Footer: the player ID and **Log out**. `onSelect` receives the item id: open Followed plants for `'followed'` and Email and reminders for `'settings'` ([§8](#8-panels)). Keep the meta lines live with `followedMenuMeta()` and `emailMenuMeta()`.

**Corner controls: markup patterns (CSS only, no module).** Copy from the gallery's `#hud` section:

| Piece | Classes | Notes |
|---|---|---|
| World View button | `.ui-icon-btn` + `icon('globe')` | `aria-label="World View"` |
| Island chip | `button.ui-island-chip` + `islandClass(id)`, `__context`, `__name` | "Home island" over the island name. Visiting another island: change the context line. **It is a button:** tapping it opens Island plants (Figma 31:1150). Give it `aria-haspopup="dialog"` and an `aria-label` such as "Health & Wellbeing, home island. Show island plants" |
| Plant button (+) | `.ui-icon-btn.ui-icon-btn--l.ui-icon-btn--active.ui-plus` | Call `setPlusReady(button, ready)` from `motion.mjs`: it sets `aria-pressed` and swaps the label between "Plant a seed" and "Cancel throw" |
| Movement pad | `.ui-joystick` + `.ui-joystick__handle` | Square pad with four direction ticks. The existing touch controller drives the handle position. |
| Throw hint | `.ui-hint` | "Tap to throw" while the acorn is ready |
| Tip (frosted) | `.ui-tip`, `__eyebrow`, `__body` + a secondary button | Replaces the `instruction-glass` tips. Example copy in the gallery is a placeholder |

**Toasts: `toast.mjs`.** One region per screen, top center.

```js
const region = toastRegion();                                  // once
accessToast(region, { island: 2, addedHours: 48, hoursLeft: 76 });  // "+48 hours" / "Games & Play access · 3d 04h left"
accessToast(region, { island: 2, capped: true });              // "Access full" / "Games & Play · 5 days (cap)"
plantedToast(region, { island: 0, title: 'Haptics for calm breathing' });
```

Slides in, holds 3 s, slides out. The title and detail split follows Figma; the team still has to confirm it against the confirmed strings ([§13](#13-open-items)).

## 4. Island Access

Figma: 21:3 wide, 21:148 phone, 21:379 selected, 21:559 empty. Gallery: `#access`. Replaces the Bridge dashboard.

```js
const access = createAccessPanel({
  homeIsland: 0,
  islands: [{ islandId: 1, expiresAt: 1764021600000, maturity: { mature: 4, total: 12 }, isHome: false }, ...],
  onVisit: id => turnToward(id),                  // face that bridge
  onUnlock: id => catalog.open({ island: id }),   // catalog filtered to that island
  onOpenCatalog: () => catalog.open(),            // from the empty state
});
document.body.append(access.layer);
access.open();
access.update(islands);   // after any action; rings and numerals animate
```

**Data per island:** `islandId`, `isHome`, `expiresAt` (ms, or `null` if never opened), `maturity: { mature, total }`. Optional: `iconSvg` (Ray's icon), `hue`, `name`. The panel works out hours, labels and the ring itself and re-renders every 30 s while open.

**Ring** (`access-ring.mjs`): fixed 120 h scale, island hue, island icon in the center.

| Remaining | Ring | Label |
|---|---|---|
| 120 h | Full | 5 days left |
| 72 h | 3/5 | 3 days left |
| 48 h | 2/5 | 2 days left |
| 24 h | 1/5 | 24 hours left |
| 6 h | Thin sliver plus clock alert | 6 hours left |
| Expired | Empty, muted | Access expired |
| Never opened | Empty, muted | Not open yet |
| Home | Full, ∞ numeral | Home · always open |

Maturity line: "4 of 12 ideas mature (33%)", or "No ideas yet" (never 0%). Selecting an active card shows "Access ends Nov 24 at 3:30 p.m." Action: **Visit island** while open, **Unlock access** after it expires.

**Layouts:** wide screens get the 3 cards in a right overlay (`.ui-panel--access`). Short landscape phones get compact rows (`createAccessRow`) in a 440 px panel without the body line. `setLayout()` forces one. Empty state: a prompt to open the Seed Catalog.

Classes: `.ui-access`, `.ui-access-card`, `.ui-access-row`, `.ui-ring`, `.ui-numeral`.

## 5. Login, onboarding, rotate prompt, tutorial

### Onboarding: `onboarding.mjs` → `createOnboarding()`

Figma: Screens · Onboarding 11:5. Gallery: `#onboarding`. Replaces `#onboarding` (and drops the LinkedIn fields and the Island Studio link).

| Screen | Figma | Class |
|---|---|---|
| Enter: I'm new here, I have an ID, Login as Judge | 18:21 | `.ui-ob-enter` |
| ID reveal with Copy | 18:128 | `.ui-ob-reveal` |
| Secure your ID: password, optional email, reminder checkbox | 18:218 | `.ui-ob-secure` |
| Sign in (returning player) | 18:323 | `.ui-ob-signin` |
| Judge session | 18:423 | `.ui-ob-judge` |
| Choose home island, with the "home island" explainer | 18:519 | `.ui-ob-home`, `.ui-ob-explainer` |

```js
const onboarding = createOnboarding({
  createAccount: async () => ({ id: 'Mossy-Fern-4821' }),
  setPassword: async ({ id, password, email, remind }) => ({ ok: true }),
  signIn: async ({ id, password }) => ({ ok: false, error: 'That ID and password don’t match.' }),
  startJudge: async () => ({ id: 'Quiet-Kelp-7310' }),
  islandStats: { 0: { residents: 12, ideas: 9 }, 1: {...}, 2: {...} },   // optional
  onChooseIsland: async islandId => { /* save, then tutorial.start() */ },
  onSignedIn: () => { ... },
  onForgotPassword: () => { ... },
});
document.body.append(onboarding.element);
onboarding.show();   // also setPlayerId(id), setPath(screen)
```

Errors from the callbacks show under the right field (`{ ok: false, error }`). The password needs at least 6 characters.

### Rotate prompt: `rotate-prompt.mjs` → `createRotatePrompt({ onFullscreen })`

Figma 18:3. Replaces `#landscape-required`. The game stays landscape only. `rotate.setVisible(isPortraitPhone)`: the current show and hide logic in `app.mjs` can drive it unchanged. `onFullscreen` is optional (replaces `#play-landscape`). Class `.ui-rotate`.

### Tutorial: `tutorial.mjs` → `createTutorial()`

Figma 19:398 to 19:1150. Gallery: `#tutorial`. Starts after the player chooses a home island; **How to play** in the menu replays it. Replaces `#movement-tip`, `#world-tip`, `#catalog-tip` and `#participation-tip` as first-run guidance.

| Step | Target | Title |
|---|---|---|
| 1 | `joystick` | Walk around |
| 2 | `plus` | Plant your first idea |
| 3 | `menu` | Open the Seed Catalog |
| 4 | `landing` | Adopt and plant |
| 5 | `plant` | Water and nourish (with the stage strip) |
| 6 | `bridge` | Adopt, water, cross |

```js
const tutorial = createTutorial({
  targets: {
    joystick: () => document.querySelector('#move-stick'),
    plus:     () => plusButton,
    menu:     () => hud.menu.button,
    landing:  () => scene.screenRect('landing'),         // { x, y, width, height } in screen px
    plant:    () => scene.screenRect('nearest-plant'),
    bridge:   () => scene.screenRect('nearest-bridge'),
  },
  onDone: () => { ... },   // Start playing or Skip tutorial
});
document.body.append(tutorial.element);
tutorial.start();          // also go(i), stop(), refresh() after a resize
```

A target is an element or a function returning one, or a screen rectangle. Steps 4 to 6 need rectangles from the scene ([§12](#12-wiring-checklist)). Keyboard: arrow keys move between steps, Escape skips. Classes `.ui-tutorial`, `.ui-tutorial-card`, `.ui-tut-mask`.

## 6. Notifications and email

### Notification panel: `notifications.mjs` → `createNotificationPanel()`

Figma: list 21:996, empty 21:1166, Notification Row 14:364. Gallery: `#notifications`. Opens from the bell.

```js
const notifications = createNotificationPanel({
  items,
  hasEmail: false,                    // the empty state offers "add an email" when false
  onSelect: item => item.type === 'access' ? access.open() : detail.open(...),
  onAddEmail: () => { /* open Email and reminders */ },
});
document.body.append(notifications.layer);
const unread = notifications.update(items, { email: true });   // returns the unread count
hud.bell.setUnread(unread);
```

**Item:** `{ id, type, island, at (ms), unread, plant?, quote?, hoursLeft?, idleDays? }`.

| Type | Title | Body |
|---|---|---|
| `reply` | Reply on your comment | the quoted reply |
| `comment` | New comment on your seed | the quoted comment |
| `access` | {Island} access ends in {n} hours | Water or nourish a {island} plant to stay longer. |
| `thirsty` | Your tree is getting thirsty | No activity for {n} days. One like revives it. |

States: unread (dot and bold title), read, empty. Selecting a row marks it read locally; saving that to the server is Celena's. Classes `.ui-panel--notes`, `.ui-note`.

### Email: `email-notification.html`

Figma 21:1302. Tables and inline styles, safe for mail clients. `{{placeholders}}` and the copy for each type are listed in the file's header comment. **Every value must be HTML-escaped on the server.** The comment and access subjects and opening lines are placeholders ([§13](#13-open-items)).

## 7. In-world prompts and feedback

`world-feedback.mjs`. Figma: Player View 20:437 to 20:1355. Gallery: `#world`. Small DOM pieces that sit over the 3D canvas. **The game owns placement:** put them in a layer over the canvas and set `left`/`top` from the projected world position. Nothing here reads the scene.

| Piece | Call | States | Replaces |
|---|---|---|---|
| View idea pill | `createViewIdeaPill({ onOpen })` then `.set({ stage, island, title })` | Plant stage, dormant (`.set({ dormant: true, ... })`, Figma 20:1355) | Plant labels drawn on the 2D canvas |
| Landing marker | `createLandingMarker('valid', { onRetry })` then `.set(state)` | `valid`, `invalid`, `failed` (a button that retries) | Landing ring on the canvas |
| Edge prompt | `createEdgePrompt()` | "The bridges are this way" | Part of `#message` |
| Locked bridge | `createLockedPrompt({ island, onUnlock })` | **Unlock access** opens the catalog filtered to that island | Locked-bridge text in `#message` |
| Water or nourish feedback | `createActionFeedback({ kind: 'water' \| 'nourish', island, until })` | Water, and nourish ("+1 nutrient · {island} access until {time}") | Part of `#message` |

Classes `.ui-pill`, `.ui-landing`, `.ui-prompt`, `.ui-world-prompt`. Pair water and nourish with an `accessToast()`. The scene effects themselves (water ripple, nourish pulse, in the plant's island hue) belong to the canvas and are specified in the gallery's Motion section.

## 8. Panels

All of them use `panel.mjs` and `panels.css`. Gallery: `#panels` (Seed Catalog, New seed, Plant detail) and `#lists` (Followed plants, Island plants, Email and reminders).

### Seed Catalog: `catalog.mjs` → `createSeedCatalog()`

Figma 23:187, filtered 23:335, Catalog Card 16:257. Replaces `#seed-catalog`, `#catalog-seed` and `#open-catalog` (opened from the menu now).

```js
const catalog = createSeedCatalog({
  homeIsland: 0,
  seeds: [{ id, island: 2, title, idea, stage: 'seed' | 'sprout' | 'young' | 'mature', growing: false, planted: false }],
  isLocked: islandId => !hasAccess(islandId),
  onAdopt: seed => startAdoption(seed),   // close the catalog, ready the acorn
  onView: seed => openPlant(seed.id),
});
document.body.append(catalog.layer);
catalog.open();               // all other islands
catalog.open({ island: 2 });  // from Unlock access: filtered, with the locked-bridge note
catalog.update(seeds);
```

Card states: **Available** (Adopt seed, "Opens 48 hours on {island}"), **Growing** ("This idea is already growing..."), **Planted** ("Planted on your island" and View idea). Filtered and locked: "Adopt a {island} seed to unlock this bridge for 48 hours." Empty: "No seeds from other islands yet." or "No {island} seeds yet." Classes `.ui-panel--catalog`, `.ui-seed-card`, `.ui-filter`.

### New seed form: `seed-form.mjs` → `createSeedForm()`

Figma 20:903. Replaces `#plant-dialog`. Opens after a valid throw.

```js
const form = createSeedForm({
  onSubmit: async ({ title, question, idea, file }) => ({ ok: true }),   // or { ok: false, error }
  // adopted seed: onSubmit receives { adoption }
});
document.body.append(form.layer);
form.open({ island: 0 });                                       // new seed
form.open({ island: 0, adoption: { title: 'Play as research method' } });
```

Fields: Title or article, Open question, Short description, optional PDF (Attach paper or poster). All three text fields are required ("Add a title.", "Add an open question.", "Add a short description."). An adopted seed shows only "Plant “{title}” here to begin connecting the islands." Closes itself on `{ ok: true }`. Classes `.ui-panel--seed`, `.ui-seed-form`.

### Plant detail and discussion: `plant-detail.mjs` → `createPlantDetail()`

Figma 23:478, Comment 16:293. Replaces `#idea-dialog` and the comment form inside it.

```js
const detail = createPlantDetail({
  onWater: async plant => updatedPlant,              // or nothing
  onFollow: async (plant, on) => updatedPlant,
  onPost: async ({ plant, text, replyTo }) => ({ ok: true }),
});
document.body.append(detail.layer);
detail.open(plant, comments);
detail.update(plant, comments);
```

**plant:** `{ id, island, author, title, idea?, question, stage, dormant, plantedOn: [islandIds], water: { count, goal }, nutrients: { count, goal }, contributors: { count, goal }, likes, following, paperUrl, canWater }`.
**comments:** `[{ id, author, authorIsland, at, text, replies: [same shape, one level only] }]`.

States: plant stage, dormant ("One like or comment revives it"), Follow / Following, Water disabled on your own plant ("You can’t water your own plant"), Paper link hidden without `paperUrl`, no comments ("No comments yet. A comment nourishes this plant."), replying ("Reply to {ID} · nourish", Cancel reply), empty post ("Write a comment first."), post error. Classes `.ui-panel--plant`, `.ui-plant-detail`, `.ui-comment`, `.ui-composer`, `.ui-stat`.

### Plant Row: `plant-row.mjs` → `createPlantRow()`

Figma 30:273. Shared by Followed plants and Island plants. The whole row is one button that opens the plant.

**plant:** `{ id, island (origin), title, stage: 'seed' | 'sprout' | 'young' | 'mature', dormant, at (last activity, ms), newReplies, contributors }`.

| State | When | Status line |
|---|---|---|
| New activity (black tab, dark status) | `newReplies > 0` | "Young plant · 2 new replies" |
| Up to date | no new replies | "Mature · 7 contributors" |
| Dormant | `dormant: true` (wins over new activity) | "Dormant · one like or comment revives it" |

The meta line is the origin island and the time since the last activity ("Health & Wellbeing · 2h"). Lists sort new activity first, then most recent, dormant last (`sortPlants()`). Classes `.ui-plant-row`, `--new`, `--current`, `--dormant`.

### Followed plants: `followed-plants.mjs` → `createFollowedPlants()`

Figma 31:486, empty 31:693. Menu 03. Replaces `#follow-updates`.

```js
const followed = createFollowedPlants({
  plants,                                   // the plants this player follows, Plant Row shape
  onOpen: plant => detail.open(...),
  onBrowse: () => islandPlants.open(),      // empty state button
});
document.body.append(followed.layer);
followed.open();
const fresh = followed.update(plants);      // returns how many have new activity
hud.menu.setMeta('followed', followedMenuMeta(plants));   // "2 new replies", or nothing
```

States: list (subtitle "{n} with new activity", or "Up to date"), empty ("You’re not following any plants yet", Browse island plants). Marking replies as seen when a plant is opened is Celena's (server). Class `.ui-panel--followed`.

### Island plants: `island-plants.mjs` → `createIslandPlants()`

Figma 31:1150. **Opens from the island chip** (marked as the entry point in the frame). Replaces `#browse-plants` and `#island-plants`.

```js
const islandPlants = createIslandPlants({ island: 0, plants, onOpen: plant => detail.open(...) });
document.body.append(islandPlants.layer);
chip.addEventListener('click', () => islandPlants.open({ island: currentIsland, plants }));
```

**plants:** every plant growing on that island, Plant Row shape, `island` being each plant's origin (adopted plants show theirs). Subtitle: "{island} · 9 ideas · 3 mature (33%)", or "{island} · No ideas yet" (never 0%). Filters: All, Growing (seed to young), Mature, Dormant, each with its count; a filter with no plants is disabled. Empty: "No plants here yet. Plant the first idea with +." Header accent is the island shown. Class `.ui-panel--island-plants` (560 px).

### Email and reminders: `email-settings.mjs` → `createEmailSettings()`

Figma: no email 31:834, saved 31:995. Menu 05.

```js
const email = createEmailSettings({
  settings: { email: '', remindAccess: true, remindReplies: true },
  onSave: async ({ email, remindAccess, remindReplies }) => ({ ok: true }),   // or { ok: false, error }
  onRemove: async () => ({ ok: true }),
});
document.body.append(email.layer);
email.open();
hud.menu.setMeta('settings', emailMenuMeta(settings));   // "Not set up", "Reminders on", "Reminders off"
```

States: **not set up** (empty field, both boxes checked, "Without an email, a forgotten password can’t be recovered.", Save with the mail icon) and **saved** ("Saved. Used only for reminders and password reset.", Save changes, Remove email). An invalid address shows "Check the email address." (same as onboarding). Saving announces "Saved."; removing announces "Email removed." and returns to not set up. The onboarding `remind` checkbox maps to `remindAccess`. Class `.ui-panel--email`.

## 9. World View labels

`world-labels.mjs`. Figma 23:3, World Island Label 16:416, legend 23:126. Gallery: `#world-view`. Replaces the island labels drawn on `#world-map` and the World View tip.

```js
const label = createWorldLabel({ island: 1, access: 'home' | 'open' | 'locked', maturity: { mature: 4, total: 12 }, hoursLeft: 76 });
worldLayer.append(label.element);        // the game positions it over the island
label.set({ access: 'locked' });
worldLayer.append(createWorldLegend().element);   // Open to you, Locked, Drag to rotate
```

Home is inverse with a home icon, Open shows time left ("3d left"), Locked shows a lock and "Locked". Each label has a full `aria-label`. Classes `.ui-world-label`, `.ui-world-legend`.

## 10. Rendering mood (option B, behind a flag)

Cassius picked **B · Clear noon** (Nov 23). It is wired into `render.mjs` behind a flag that is **off by default**, so the live game looks exactly as before.

- **Try it:** add `?mood=noon` to the game URL, e.g. `/?preview=mobile-game&mood=noon`. `?mood=off` forces it off. The other options (`morning`, `dusk`) still work through the same param for comparison.
- **The flag:** `MOOD_DEFAULT` at the top of `public/island-kit/render.mjs` (currently `null`). **Ray signs off before it changes to `'noon'`.**
- **What it does:** a clear-noon sky (CSS gradient on the renderer canvas, overriding `style.css`), light distance fog, brighter lights, and a faint tint of each island's hue. Code: `public/island-kit/mood.mjs` (moved from `public/ui/` because `/island-kit/*.mjs` is served by both `server.mjs` and Vercel and `/ui/` is not).
- **When off:** `render.mjs` reads the URL param and nothing else. It never requests `mood.mjs` and adds no work per frame.
- **Not live yet:**
  - Contact shadows: `islandRenderer.setPlantSpots([{ x, y, z, radius }])` is ready, but nothing calls it yet, because plants are still drawn on the 2D canvas.
  - Fog and tint only reach the 3D islands. Plants, bridges and labels on the 2D canvas don't get them until they move into the three.js scene.
- **Frame time in the live game** (`?preview=mobile-game`, 844 × 390 at 3× density, renderer capped at 1.5×, Chrome on an Apple M4 Max; total work per displayed frame including the 2D canvas, GPU forced to finish):

| View | CPU | Flag off | `?mood=noon` |
|---|---|---|---|
| Player | normal | 7.5 ms median, 9.0 ms p95 | 7.4 ms median, 8.6 ms p95 |
| Player | 4× slower | 21.5 ms median, 23.1 ms p95 | 20.6 ms median, 23.0 ms p95 |
| World (redraw frames, p95) | normal | 10.2 ms | 10.4 ms |
| World (redraw frames, p95) | 4× slower | 25.1 ms | 25.1 ms |

  The difference is within run-to-run noise. A real phone test is still needed before turning it on by default.
- Preview of all options: `/ui/mood-preview.html`. Comparison sheet: `docs/ui/phase7-mood/mood-options.png`.

## 11. Element ID map

What each current element in `index.html` becomes.

| Current element | Replaced by |
|---|---|
| `#open-world` | World View button (`.ui-icon-btn` + globe) |
| `#resident-badge`, `#island-name` | Home island chip (`.ui-island-chip`) and the ID label in `createTopRight()` |
| `#resident-photo`, `#resident-linkedin`, `#share-resident-linkedin` | Removed (no LinkedIn in v2) |
| `#seed-mode` | Plant button (`.ui-plus`) with `setPlusReady()` |
| `#planting-tip` | Throw hint (`.ui-hint`) and landing markers |
| `#open-catalog` | Seed Catalog in the menu |
| `#browse-plants`, `#island-plants` | `createIslandPlants()`, opened from the island chip |
| `#movement-tip`, `#world-tip` | Tutorial steps 1 and the World View legend; `.ui-tip` for any tip that stays |
| `#message` | Toasts, edge prompt, locked bridge prompt, action feedback |
| `#toggle-dashboard`, `#world-dashboard`, `#world-home`, `#bridge-list` | Island Access in the menu and `createAccessPanel()` |
| `#follow-updates` | `createFollowedPlants()` (menu 03) and the notification panel |
| Island Studio link in `#world-dashboard` | Removed |
| `#home-island` | Home label in `createWorldLabel()` (keep the button behaviour: select home to return) |
| `#onboarding` and its fields | `createOnboarding()` |
| `#seed-catalog`, `#catalog-tip`, `#catalog-seed` | `createSeedCatalog()` (the card carries the seed detail) |
| `#plant-dialog`, `#adoption-confirmation` | `createSeedForm()` |
| `#idea-dialog`, `#comment-form`, `#reply-context`, `#cancel-reply`, `#participation-tip` | `createPlantDetail()` |
| `#landscape-required`, `#play-landscape` | `createRotatePrompt()` |
| `#map`, `#world-map` | The UI mounts around the existing canvases. |
| `#move-stick` | Uses the square `.ui-joystick` component with the original touch input. |

## 12. Wiring checklist

**Celena**
- [x] Serve `/ui/`: a static route in `server.mjs` for local play, and the `vercel.json` route in [§13](#13-open-items).
- [x] Add the five stylesheets after `style.css` and mount the HUD (§3) in `.world`.
- [x] Hook the callbacks to the API: onboarding (account, password, sign-in, judge, home island), catalog adopt, seed form submit with the PDF, water, follow, post, notifications (list, mark read, email flag).
- [x] Island Access data per island ([§4](#4-island-access)) and `turnToward(id)` for Visit island.
- [x] Followed plants: the player's followed plants in the Plant Row shape, with `newReplies` since they last opened each one, and marking them seen when opened ([§8](#8-panels)).
- [x] Island plants: every plant on an island in the Plant Row shape (origin island, stage, dormant, last activity, contributors). Make the island chip a button that opens it.
- [x] Email and reminders: read the saved email and both reminder flags, save them (`onSave`) and remove the email (`onRemove`). Live delivery requires the Railway mail variables. The second flag (`remindReplies`) is new: replies and comments on the player's plants.
- [x] Screen rectangles for tutorial steps 4 to 6 (`landing`, `nearest-plant`, `nearest-bridge`), with fallback targets before plants and bridges are in view.
- [x] Project world positions into screen positions for the in-world pieces (§7) and the World View labels (§9).
- [x] Scene effects on the canvas: water ripple (two expanding ellipses, 700 ms), nourish pulse (swelling disc, 600 ms), in the plant's island hue.
- [x] HTML-escape every value in the email template.
- [x] Hide or remove the replaced elements in [§11](#11-element-id-map).

**Ray**
- [ ] Island icons (SVG) for the badges and the access rings (`iconSvg`). Placeholders are in `public/ui/badges/` and Figma's Island Badge set 12:404.
- [ ] Sign off on the island hues: Health #F05A3C, Sustainability #1E9E6A, Games #3358E0.
- [ ] Review option B (`?mood=noon`), test it on a real phone, and **sign off before `MOOD_DEFAULT` in `render.mjs` is set to `'noon'`**. Until then the flag stays off.
- [ ] Motion for 3D assets: stage growth from the base (400 ms), dormant scale to 0.7 and desaturate (600 ms), bridge unlock color sweep (500 ms). Tokens in `tokens.css`.
- [ ] Draw calls ([§13](#13-open-items)).

**Celena (mood, later)**
- [ ] Once plants are in the three.js scene, call `islandRenderer.setPlantSpots()` with each plant's ground point so the contact shadows appear.

## 13. Open items

**For Celena**
- **Railway email.** Add the mail variables documented in the README to send real reminders and password reset links.
- Branch previews sit behind Vercel sign-in. Ray needs a share link, or team access, to open the mood preview on his phone.

**For Ray**
- **Rendering mood sign-off:** option B is behind a flag that is off by default. Ray approves before `MOOD_DEFAULT` changes.
- **Island colors:** confirm the three hues above so the 3D island tops match the UI.
- **Island icons:** still placeholders everywhere.
- **Draw calls:** the islands render at about 2,050 draw calls in Player View and 2,500 in World View before any UI or mood. That is the main cost on phones. Merging meshes per material, or instancing repeated plants and rocks, would help more than any rendering setting.

**Copy to confirm with the team** (Cassius is raising these)
- Toast format: Figma splits the confirmed strings into a title and a detail line ("+24 hours" / "Sustainability access · 3d 04h left", "Access full" / "Sustainability · 5 days (cap)").
- The confirmed ID reveal copy contains an em dash ("Save this ID — you'll need it"). Suggested: "Save this ID. You'll need it to log back in."
- Email subjects and opening lines for the comment and access types (placeholders, approved by Cassius for now).
- "+1 nutrient · {island} access until {time}" (nourish feedback).
- New copy not in Figma:
  - Onboarding: "That ID and password don’t match.", "Enter your ID.", "Check the email address.", "Copied"
  - Island Access: "Not open yet"
  - Seed form: "Add a title.", "Add an open question.", "Add a short description."
  - Discussion: "Write a comment first.", "No comments yet. A comment nourishes this plant.", "Reply to {ID} · nourish", "Following"
  - Catalog: "No seeds from other islands yet.", "No {island} seeds yet."
  - Plant detail tooltip: "You can’t water your own plant"
  - Followed plants: "Up to date" (subtitle with nothing new), "1 new reply", "1 contributor"
  - Island plants: "No plants here yet. Plant the first idea with +."
  - Email and reminders: "Email removed." (screen readers), menu meta "Reminders on" and "Reminders off"
- Tutorial step 1 says "Drag the left pad". Desktop players may need a W A S D version.

**Design follow-ups (Cassius)**
- Hover, pressed, disabled and focus states are placeholders; Figma has no variants for them.
- The tip component and its example copy are not in Figma.
- Figma bugs worked around in code: the Icon Button Active L globe draws black on black; the empty state's Open Seed Catalog button has a blank icon; the selected card's expiry line overflows; tutorial steps 4 and 6 run off the frame. Followed plants' Figma subtitle says "2 with new activity" with one new-activity row; the code counts plants with new activity.
