# CHI Island · UI and Look · Full context for Cassius's workstream

*Written November 22, 2026, 6 p.m. PT. Owner: Cassius Palacio (UI and look). Read this whole file before writing any code or creating any Figma frames.*

---

## 0. Fill these in first

| Item | Value |
|---|---|
| **UI design system file (Cassius, Direction G)** | https://www.figma.com/design/6QNXwAjpDU1niZin1aiWby (file key `6QNXwAjpDU1niZin1aiWby`) |
| Team logic file link (Yuwen's v2 logic, precedents) | `PASTE TEAM FIGMA LINK HERE` |
| Figma node for the v2 logic ("new"), team file | `614:54` |
| Figma node for the old logic, team file | `614:70` |
| Does Cassius have push access to the repo? | `YES / NO` |
| Working branch name | `ui/v2-look` (suggested) |

## 0.1 Chosen direction: G · Poster Signal (decided Nov 22)

Swiss conference poster. White paper, black type at large sizes, strict grid, **island color is the only color on screen**. Square corners everywhere, 1 px black hairlines instead of shadows. The 3D world stays soft and desaturated; island hue appears only on island tops, idea plants and trunk origin squares. This replaces the Monument Valley wording in §7.1 and §8 for the UI layer; Monument Valley still guides Ray's 3D rendering.

### Tokens (Figma variables, each has WEB code syntax)

| Token | Value | CSS |
|---|---|---|
| bg/canvas | #F4F4F1 | `var(--color-bg-canvas)` |
| bg/surface | #FFFFFF | `var(--color-bg-surface)` |
| bg/muted | #ECECE8 | `var(--color-bg-muted)` |
| bg/inverse | #111111 | `var(--color-bg-inverse)` |
| text/primary | #111111 | `var(--color-text-primary)` |
| text/secondary | #8E8E8E | `var(--color-text-secondary)` |
| text/inverse | #FFFFFF | `var(--color-text-inverse)` |
| border/default | #111111 | `var(--color-border-default)` |
| border/subtle | #D0D0CC | `var(--color-border-subtle)` |
| action/primary | #111111 | `var(--color-action-primary)` |
| status/alert | #FF4A1C (unread dot, alerts only) | `var(--color-status-alert)` |
| island/health | #F05A3C | `var(--color-island-health)` |
| island/sustainability | #1E9E6A | `var(--color-island-sustainability)` |
| island/games | #3358E0 | `var(--color-island-games)` |
| island/muted | #BDBDBD (expired, locked) | `var(--color-island-muted)` |
| ring/track | #E2E2E2 | `var(--color-ring-track)` |
| world/sky-top, sky-bottom, ground, stone | #E6E8E6, #FAFAF8, #D9DCD6, #9A9E99 | `var(--color-world-*)` |
| space/2 to space/48 | 2, 4, 8, 12, 16, 24, 32, 48 | `var(--space-N)` |
| radius/none | 0 | `var(--radius-none)` |
| size/touch | 44 | `var(--size-touch)` |
| stroke/hairline | 1 | `var(--stroke-hairline)` |

### Type (Figma text styles)

| Style | Font | Size / tracking |
|---|---|---|
| Display/XL | Archivo ExtraBold | 72 / -4% |
| Display/Numeral | Archivo ExtraBold | 44 / -5% (time left, e.g. 72H) |
| Heading/L, M, S | Archivo ExtraBold 28, Bold 20, SemiBold 15 | tight |
| Body/M, S, Strong | Archivo Regular 15, Regular 13, Medium 13 | |
| Label/M, S | Space Mono Regular 11, 9, uppercase, +6% | |
| Mono/ID | Space Mono Regular 12, +4% | player IDs |

Both fonts are on Google Fonts. Replace Oswald in `style.css`.

### Figma map (node IDs in the design system file)

| Page | ID | Contents |
|---|---|---|
| Cover | `11:2` | Index, decisions, open items |
| Foundations | `11:3` | Color, type, spacing specimens; 32 icon components (`Icon/<name>`); Island Badge set `12:404`; Plant Stage set `12:433` |
| Components | `11:4` | Button `13:41`, Icon Button `13:69`, ID Label `13:81`, Island Chip `13:105`, Toast `13:124`, Prompt `13:153`, Menu Item `14:67`, Menu `14:68`, Access Card `14:268`, Access Row `22:277`, Notification Row `14:364`, Text Field `14:388`, Checkbox `14:398`, Panel Header `16:132`, Catalog Card `16:257`, Comment `16:293`, Reticle `16:297`, View Idea Pill `16:302`, Landing Marker `16:328`, Joystick `16:329`, Tutorial Card `16:389`, World Island Label `16:416`, Scene/Player View `17:199`, Scene/World View `17:250` |
| Screens · Onboarding | `11:5` | Rotate prompt `18:3`, Enter `18:21`, ID reveal `18:128`, Secure your ID `18:218`, Sign in `18:323`, Judge session `18:423`, Choose home island `18:519`, Tutorial steps 1 to 6 `19:398` `19:565` `19:705` `19:845` `19:991` `19:1150` |
| Screens · Player View | `11:6` | Default `20:3`, Menu open `20:147`, Ready to throw `20:313`, Landing valid `20:437`, Landing invalid `20:555`, Failed throw `20:673`, New seed form `20:791`, Edge prompt `20:962`, Locked bridge `20:1086`, Water feedback `20:1223`, Dormant plant `20:1355`, Visiting `20:1480` |
| Screens · Access & Notifications | `11:7` | Wide panel (desktop) `21:3`, Phone panel `21:148`, Card selected `21:379`, Empty `21:559`, Toasts `21:718`, All card states `21:840`, Notification list `21:996`, Notifications empty `21:1166`, Email `21:1302` |
| Screens · World & Panels | `11:8` | World View `23:3`, Seed Catalog `23:134`, Catalog filtered `23:282`, Plant detail `23:426` |
| Directions (archive) | | Directions A to G explorations |

### Layout decisions in the file (proposals for Cassius to confirm)

- **Top-right menu:** 01 Seed Catalog, 02 Island Access, 03 Followed plants, 04 How to play, footer with ID and Log out. The bell and ID label stay outside the menu.
- **Island Access:** ring cards in a right panel on wide screens (A1). On a landscape phone a full card is too tall, so phones use the compact **Access Row** in a 440 px right panel (A2 to A4).
- **Rotate prompt:** full-bleed poster type on paper, portrait frame.
- **Plus button:** black 58 px square; turns into × when an acorn is readied.
- **Joystick:** square, to match the system.

---

## 1. What the project is

**CHI Island** is the team's entry to the **CHI 2027 Student Design Competition**. It is a multiplayer, first-person, browser-based garden where conference attendees, especially first-timers, plant research ideas as seeds on themed islands. Other players grow those ideas by liking (watering) and commenting (nourishing). The goal is to lower the pressure of networking at CHI by letting people connect through ideas first.

- Live preview (temporary, Vercel): https://ted-island.vercel.app/
- Repo: https://github.com/celenashen04-boop/ted-island
- v2 design PR (docs only, not yet merged): https://github.com/celenashen04-boop/ted-island/pull/1 (branch `docs/v2-logic`)
- Ray's island source repo: https://github.com/RayZiruiLiu/chi-2027-code-native-islands
- Asset Drive (from Ray): https://drive.google.com/file/d/18CXIqFmsObqn9hx5onhTMAfuZpfGzNqs/view

Landscape only. Plays on phones (joystick plus drag to look) and desktop (WASD plus arrow keys or drag).

---

## 2. Team and ownership

| Person | Shows up in chat as | Owns |
|---|---|---|
| **Cassius** | `C` | **UI and look.** Visual direction, all HUD and panel design, login and onboarding screens, tutorial, notification UI, the rotate prompt, and the overall island rendering mood. Final "human taste" quality check across everything. |
| Celena | `~ Celena` | Code lead. Global changes, backend, merging PRs, hosting decision (leaving Vercel for Railway, Render, or Fly.io). |
| Yuwen Wang | `~ Yuwen Wang` | Logic and backend planning, wrote the v2 docs, coordinates meetings and timelines. |
| Penny | `任欣语` | Information architecture and game logic (seed planting, bridging, access rules). |
| Ray Liu | `~ Ray Liu` | 3D: islands, plant growth models, dormant variants, island icons, trunk origin icons, permanent bridges. Builds code-native in Codex, not Blender. |

**Rule:** do not change game logic, backend, access math, or 3D island models. Those belong to others. If a UI need requires a logic or model change, write it down as a request for that person (see section 11).

---

## 3. Timeline

- **Tonight (Sun Nov 22):** Cassius starts the UI pass. Visual direction plus first screens.
- **Before Thanksgiving (Thu Nov 26):** team target to finish the v2 revisions. Ray and Yuwen both aligned on this.
- **Dec 4:** prototype is a thin slice. Polish matters most on the screens a judge sees in the first two minutes: login, home island choice, tutorial, Player View HUD, Island Access.

---

## 4. Tech stack (read before touching code)

- **Node.js 24, zero npm dependencies.** Run `npm run dev` and open http://127.0.0.1:4173
- **Mobile layout preview on desktop:** http://127.0.0.1:4173/?preview=mobile (844 × 390 landscape frame)
- **Frontend:** plain HTML, CSS, and ES modules in `public/`. No framework, no build step, no bundler. Keep it that way.
- **3D:** three.js (vendored in `public/island-kit/`), WebGL 2. Islands are procedural code from Ray's kit in `public/island-kit/source/{spiral,verdant,pinwheel}/`.
- **Plants and bridges** are currently drawn on a separate 2D canvas over the three.js scene. That is why they look pasted on (see section 8).
- **Server:** `server.mjs`, `garden.mjs`, SQLite in `data/`, live updates over Server-Sent Events.
- **Design Kit:** http://127.0.0.1:4173/design-kit lets you upload button art, plant stages, island thumbnails, and edit the UI theme. Elements with `data-art="..."` attributes can be reskinned through it. Your design tokens should stay compatible with it.

### Key files

| File | What it is |
|---|---|
| `public/index.html` | All HUD markup and dialogs (onboarding, catalog, plant detail, rotate prompt) |
| `public/style.css` | All styles. Single file, 290 lines, minified style. Current palette is dark forest green `#223f3b`, cream `#fff8e2`, Oswald headings. |
| `public/app.mjs` | UI wiring, dialogs, catalog, onboarding, HUD state |
| `public/scene.mjs` | Player View rendering (first-person) |
| `public/world.mjs` | World View (rotatable overview) |
| `public/islands.mjs` | Island list: id, name, model, position, color |
| `public/island-kit/render.mjs` | three.js island renderer (lighting, sky, fog live here) |
| `public/design-kit.*`, `design-assets.mjs` | Design Kit page and theme slots |
| `visualrequirement.md` | **The UI brief. Your spec.** |
| `context.md` | Game rules (v2) |
| `docs/logic-changes-2026-11-22.md` | What changed from v1 to v2, and who decides what |
| `docs/modeling-brief.md` | Ray's 3D brief (read only, for alignment) |
| `docs/backend-plan.md` | Celena's backend plan (read only) |

**Important:** on `docs/v2-logic`, the README and docs describe v2, but `public/index.html` still has the **v1 UI** (Bridge dashboard, Island Studio links, separate top-right buttons, LinkedIn onboarding). The v2 logic has not been implemented in code yet. Celena's agent is doing that in parallel. That means **you will collide on `index.html`, `style.css`, and `app.mjs` if you edit them heavily.** See the strategy in section 10.

---

## 5. The islands

| id | Name | Model folder | Current color | Theme |
|---|---|---|---|---|
| 0 | Health & Wellbeing | `spiral` (Spiral Harbor) | `#a5b76e` | Health, Wellbeing & Accessibility |
| 1 | Sustainability | `verdant` (Verdant Springs) | `#8ab692` | Sustainability |
| 2 | Games & Play | `pinwheel` (Pinwheel Island) | `#bfbb77` | Games & Play |

The three current colors are too close together (all olive and sage). In a Monument Valley palette, each island needs a clearly distinct hue that still sits in one soft family, and the ring on each Island Access card uses that hue. Ray designs the island icons. Your UI uses them, so leave a slot for each icon and use a placeholder until his arrive.

---

## 6. v2 game rules that affect the UI (summary)

- **Identity:** an anonymous system ID like `Mossy-Fern-4821`. No real names. It is the only public name and appears top right, on seeds, and in comments. Password of 6 or more characters. Optional private email. **Login as Judge** gives a random ID with no password.
- **Bridges:** all three exist from the start. Nothing is built.
- **Island access:** time-limited for each island. Your home island never expires.
  - Adopt and plant a seed from another island: +48 h on that seed's origin island
  - Water (like): +24 h
  - Nourish (comment or reply): +36 h
  - Stacks up to a **120 h (5 day) cap**
  - Only your first comment per plant per day earns access
- **Growth:** seed planted → sprout → young plant → mature plant. Inactive plants go **dormant** (smaller and quieter) after 15 days. One interaction revives them.
- **Maturity rate for each island:** "4 of 12 ideas mature (33%)" or "No ideas yet." Never show 0%.
- **Notifications:** bell with an unread dot (in-app, required). Email for players who opt in.
- **Players never see each other walking.** No avatars and no synced positions. Communication happens only through seeds and comments.

---

## 7. Cassius's deliverables (from `visualrequirement.md` v2 and change log §10)

Each item lists the **exact copy that is already confirmed**. Do not reword confirmed copy without asking Cassius.

### 7.1 Visual direction (do this first; everything else depends on it)
- Reference: **Monument Valley.** Soft pastel palette, clean geometric forms, gentle light, calm readability.
- Deliver: palette (base surfaces, text, accent, 3 island hues, success, warning, error), typography (decide whether Oswald stays), icon style (stroke weight, corner radius), button system, glass and panel surfaces, shadow and elevation, motion timing.
- Output as CSS custom properties (design tokens) plus a Figma style page.

### 7.2 Shared controls
- Circular icon buttons over the scene. Labeled rounded buttons inside panels.
- States: default, hover/focus, pressed, selected, unavailable. Visible focus ring.
- **Minimum 44 × 44 hit area.** Tooltip or `aria-label` on every icon-only control.

### 7.3 Top-right menu (Cassius decides contents and layout)
- One dropdown button in Player View top right, replacing the separate buttons.
- Must contain **Seed Catalog** and **Island Access**.
- Nearby, also top right: **User ID label** (semi-transparent, like most games, with a copy action) and the **notification bell** with an unread dot.
- Open decisions for Cassius: whether the bell lives inside or outside the menu, whether Followed plants and Settings or Log out go in the menu, and the order and grouping.

### 7.4 Island Access panel
- Right-side overlay on wide screens. Compact overlay or bottom sheet on narrow screens.
- Header **Island Access**. Subtitle "Home · {domain}". Close ×.
- Body copy: "Adopt, water, or nourish ideas to unlock other islands and extend your visits."
- Reference: **iOS Batteries widget.** One card per island: island icon in the center, a ring of remaining time in the island's hue on a **fixed 120 h scale**, then the name, exact time remaining, and maturity rate.
- Action: **Visit island** while access is active, **Unlock access** after it expires (opens the catalog filtered to that island).
- Selecting an active card shows "Access ends Nov 24 at 3:30 p.m."

| Remaining | Ring | Label |
|---|---|---|
| 120 h | Full | 5 days left |
| 72 h | 3/5 | 3 days left |
| 48 h | 2/5 | 2 days left |
| 24 h | 1/5 | 24 hours left |
| 6 h | Thin sliver plus clock alert | 6 hours left |
| Expired | Empty, muted | Access expired |

- States to design: full (capped), partial, near expiry, expired, empty (nothing unlocked yet), home island card (never expires).
- Toasts: "+48 hours", "+24 hours · Games & Play access: 3 days 4 hours", "Access full (5 days)".
- **Never rely on ring length or color alone.** Always show the text.

### 7.5 Notifications
- Bell, unread dot, notification list.
- Types: comment on your plant, reply to your contribution, "access ending in six hours", "Your tree is getting thirsty."
- Selecting one opens the plant or the Island Access panel.
- Email version: short subject, plain body with the actual comment text and the commenter's anonymous ID, a link back to the plant, and an unsubscribe link.

### 7.6 Login and onboarding
- First-visit **ID reveal** with **Copy** and the confirmed message: "Save this ID — you'll need it to log back in."
- Password field (6+ characters). Warning if no email: they cannot recover a forgotten password.
- Optional email field with the checkbox "Email me when island access is about to expire."
- Encouragement copy: "Leave your email and we'll let you know when someone replies to your research or your island access is about to expire. Your email is never shown."
- Returning sign-in: ID plus password.
- **Login as Judge** button.
- Welcome screen: the words **home island** are selectable and open an explanation of what a home island means. **Remove** the "Explore the islands in Island Studio" link. Remove the LinkedIn fields from onboarding (LinkedIn stays opt-in elsewhere).

### 7.7 Rotate prompt
- Restyle "Turn your phone sideways" (currently `#landscape-required` in `index.html`). The game stays landscape only. The visual direction is Cassius's call.

### 7.8 Tutorial (after choosing a home island)
Steps: walking → creating a seed → Seed Catalog → adopting and planting → watering and nourishing → shows each plant stage → ends with "adopt a seed, water it, and the bridge opens."

### 7.9 Player View HUD, in-world prompts, and feedback
- Default HUD: World View button (top left), top-right menu, user ID, bell, island identity, joystick (bottom left), subtle reticle, **View idea** pill when looking at a plant.
- Ready state: the plus button rotates into ×, with the hint "Tap to throw."
- Valid landing: ground ring. Invalid landing: broken ring, ×, "Aim at open soil."
- Failed throw: the seed stays where it landed and can be selected to retry.
- **Frosted-glass edge prompts:** "The bridges are this way." At a locked bridge: "Adopt a {island} seed, then water or nourish it to unlock this bridge" plus an **Unlock access** button.
- Water and nourish feedback: "+1 water · Sustainability access until Tue 3 p.m."
- Dormant plant label: explains that one interaction revives it.

### 7.10 Panels to restyle in the new language
Seed Catalog (adds "Opens 48 hours on Games & Play" beside **Adopt seed**), New seed form, Plant details and discussion (shows the anonymous ID, the origin island badge, the stage or dormant state).

### 7.11 World View
Island labels with maturity rate underneath, home marker, three permanent bridges. Bridges you can cross are continuous and highlighted. Locked bridges are muted with a lock.

### 7.12 Island look and rendering (change log §10)
- Problem: plants and bridges sit on a 2D canvas over the three.js islands, so they don't share lighting or shadows and look pasted on.
- Ideas: soft contact shadows under plants (blob or decal, not real-time), distance fog between islands, a lighting mood for each island that matches its hue, and a sky with more character than the current gradient (`linear-gradient(#738cbf,#bdc9eb)`).
- **Constraint: phones must stay smooth.** No real-time shadow maps and no post-processing passes.
- **Coordinate with Ray** before touching anything in `public/island-kit/`. He is actively editing island source.

---

## 8. Design principles for this project

1. **Readable at a glance:** where am I, how is this idea growing, how long can I visit each island, and where does this idea come from.
2. **The world is the hero.** UI is quiet, light, and translucent. Interactive plants and feedback carry the color.
3. **Calm, not gamey.** Monument Valley, not mobile-game neon. This is an academic networking tool that should feel welcoming to first-timers.
4. **Color is never the only signal.** Pair it with shape, icon, and text, and check readability over sky, water, foliage, and soil.
5. **Thumb-reachable on a landscape phone.** Nothing important in the top center (notch), and respect safe-area insets.
6. **Lineage:** this project borrows heavily from Cassius's Gensler prototype work (the Pseudo Tangible Playtest). Ask Cassius for those frameworks if a decision touches playtest flow or onboarding.

---

## 9. Decisions: whose call is it?

| Decision | Who decides |
|---|---|
| Palette, type, icon style, menu contents, rotate prompt, tutorial look, rendering mood | **Cassius** |
| Exact confirmed copy (listed in section 7) | Team. Cassius can propose changes in the chat. |
| Island icons, plant models, bridge models, scenery plants, whether the seed stays an acorn | Ray |
| Access math, growth thresholds, login rules, notification triggers | Already decided by the team. Do not change. |
| Hosting, email provider, moderation, merging PRs | Celena |

An agent working for Cassius should present design **options** for Cassius's own decisions and let him pick. It should never decide team-level questions on its own.

---

## 10. Strategy to avoid merge conflicts with Celena

Celena's agent is rewriting `index.html`, `app.mjs`, and `style.css` for the v2 logic at the same time. To stay out of each other's way:

1. **Branch from `docs/v2-logic`** (or from `main` once PR #1 is merged). Name it `ui/v2-look`.
2. Put new design work in **new files** wherever possible:
   - `public/ui/tokens.css`: all design tokens as CSS custom properties
   - `public/ui/components.css`: buttons, glass panels, menu, rings, toasts, bell, cards
   - `public/ui/preview.html`: a standalone **UI gallery** showing every screen and every state with mock data, no backend needed. Open it at http://127.0.0.1:4173/ui/preview.html
   - `public/ui/access-ring.mjs` and similar: small, self-contained, framework-free components that take plain data in, so Celena's code can call them
3. Keep edits to shared files **minimal and additive**: link the two new stylesheets in `index.html`, and swap class names or markup only where the v2 element does not exist yet.
4. Write `docs/ui-handoff.md` explaining every component: its class names, the data it expects, its states, and where it goes in the HUD. Then any agent (Celena's included) can wire it in.
5. Open a PR into the branch Celena names. **Never push to `main` and never merge PR #1.**

---

## 11. Requests to other teammates (keep this list updated)

- **Ray:** island icons (SVG preferred for UI use) for all 3 islands. Placeholders live in the Island Badge set (`12:404`); swapping the glyph updates every card.
- **Ray:** sign off on the island hues from Direction G (Health #F05A3C, Sustainability #1E9E6A, Games #3358E0) so the 3D island tops and trunk origin squares match.
- **Ray:** confirm before any change to `island-kit/render.mjs` (sky, fog, lighting).
- **Celena:** confirm the DOM IDs and hooks her v2 code will use for the menu, Island Access, bell, login, and tutorial, so the components match.
- **Celena:** `server.mjs` only serves an allowlist, so `/ui/*` (tokens, components, icons, gallery) returns 404 locally. Either add a static route for `/ui/` when wiring the components in, or keep using `node ui-preview-server.mjs` (port 4175) for the gallery. Vercel already serves `public/**`. (Added Nov 22, Phase 1.)
- **Team:** the toast copy in Figma splits the confirmed strings into a title and a detail line with a shorter time format ("+24 HOURS" / "Sustainability access · 3d 04h left", "ACCESS FULL" / "Sustainability · 5 days (cap)"). Confirm that's an acceptable rendering of "+24 hours · Games & Play access: 3 days 4 hours" and "Access full (5 days)". (Added Nov 22, Phase 1.)
- **Ray:** motion for 3D assets, timed with the motion tokens in `public/ui/tokens.css` (readable from JS with `motionMs()` in `public/ui/motion.mjs`): stage change grows the next model from its base over 400 ms; dormant scales to 0.7 and desaturates over 600 ms, revive reverses; bridge unlock sweeps the island color along the deck over 500 ms after the lock drops. 2D mocks are in the gallery's Motion section. (Added Nov 22.)
- **Celena:** scene effects that live on the 2D plant canvas today: water ripple (two expanding ellipses, 700 ms), nourish pulse (swelling disc, 600 ms), both in the plant's origin island hue, landing marker scale-in and invalid shake. DOM motion (panels, menu, toasts, ring, numerals, plus, unread dot) is ready through `motion.mjs`. (Added Nov 22.)
- **Team:** the confirmed ID reveal copy contains an em dash ("Save this ID — you'll need it"). Cassius may want "Save this ID. You'll need it to log back in." Raise it in the chat; don't change it on your own.

---

## 12. Done means

- Every state listed in section 7 exists in Figma and in `public/ui/preview.html`
- Checked in the `?preview=mobile` landscape frame **and** desktop
- Every icon button is 44 px or larger, has a label, and shows a visible focus state
- No information relies on color alone
- No noticeable frame rate drop on a phone after rendering changes
- `docs/ui-handoff.md` written
- Screenshots of key screens posted to the WhatsApp group for Cassius's quality check
