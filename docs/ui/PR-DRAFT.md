<!-- Draft PR description for ui/v2-look. Not opened yet; nothing is being merged. -->
<!-- Open question before opening: CLAUDE.md (agent instructions for Cassius's workstream) stays at the repo root for now. Decide when the PR is opened whether it goes in the team PR or moves out (for example to docs/ui/). -->

## UI v2 · Poster Signal (Cassius)

All UI and look work from visualrequirement.md v2, built as standalone modules under public/ui/. The only change to existing game code is an off-by-default rendering mood flag in public/island-kit/render.mjs, with its code in public/island-kit/mood.mjs. New files at the repo root: CLAUDE.md and ui-preview-server.mjs. No changes to index.html, app.mjs, style.css, the server, or Ray's island source.

**Design source:** Figma (Cover page): https://www.figma.com/design/6QNXwAjpDU1niZin1aiWby/CHI-Island-%C2%B7-Look---Feel-v2?node-id=11-2
**Wiring guide:** docs/ui-handoff.md
**Preview locally:** node ui-preview-server.mjs, then open http://127.0.0.1:4175/ui/preview.html

### Included
- Design tokens (color, type, spacing, motion) and reduced-motion support
- Player View HUD: top-right menu, ID label with copy, notification bell, island chip, plus/throw button
- Island Access: ring cards (wide) and compact rows (phone), all states on the 120 h scale, toasts
- Login and onboarding: enter, ID reveal, password and email, sign in, Login as Judge, choose home island, rotate prompt, 6-step tutorial
- Notifications list and email template
- In-world prompts: edge, locked bridge, landing states, failed throw, water and nourish feedback, dormant label
- Panels: Seed Catalog, new seed form, plant detail with discussion
- World View labels and legend
- Rendering mood B (Clear noon) wired behind an off-by-default flag (?mood=noon); all options in docs/ui/phase7-mood

### Not included / needs an owner
- No design yet: Followed plants panel, Email and reminders panel, Island plants list (#browse-plants)
- Rendering mood: Ray to sign off before the flag goes on by default; plant shadows wait for plants moving into the 3D scene
- vercel.json needs a /ui/ route for previews (exact line in the handoff doc)
- Island icons, 3D plant stages and island color sign-off (Ray)
- New copy to confirm with the team (listed in the handoff doc)

### For Celena
Wiring checklist and account callbacks in docs/ui-handoff.md (§5). Data contracts for Island Access and notifications in UI-CONTEXT §11.

### For Ray
Mood flag in docs/ui-handoff.md §10; island colors, icons and the draw-call note (about 2,000 to 2,500 per frame) in §12 and §13.

Base: main. Merge after PR #1 (docs/v2-logic); until then its commits also appear here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
