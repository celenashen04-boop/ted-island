# CHI Island · Logic changes, November 22, 2026 (v2)

*Version 2 · November 22, 2026 · Based on the updated logic in Figma (node 614:54). New in v2. The v1 design docs are at commit `0694768`.*

This file lists every change from the previous design (Figma "old logic", node 614:70, and `context.md` at commit `0694768`) to the updated design (Figma "new", node 614:54). It covers the new design's 12 comments from November 22 and the decisions confirmed with Celena the same day. `context.md` now describes the resulting rules. 3D modeling work is listed separately in [modeling-brief.md](modeling-brief.md).

Status: **Decided** comes from Figma. **Confirmed** was clarified on November 22. **Open** still needs an answer. See [Open questions](#open-questions).

## 1. Summary

| Area | Before | After |
| --- | --- | --- |
| Bridges | Built through shared seeds. Foundations 40%, Walkway 40%, Connection 20%. Open when two mature oaks join. | **All bridges exist from the start.** Nothing is constructed. |
| Crossing | Permanent for contributors, or earned by a comment after a bridge opens. | **Time-limited island access.** Adopting, watering, and nourishing extend access to the plant's origin island. Home access never expires. |
| Growth | Five stages from seed to mature tree, using acorn oak art. | **Three main stages:** sprout, young plant, and mature plant, plus the planted seed. Uses new tree models. |
| Lifecycle | A mature tree stays mature. | **Inactive trees go dormant and shrink.** After a long period of inactivity, they are deleted following a warning and an export option. |
| Identity | Browser cookie. Choose a domain and optionally add LinkedIn. | **Anonymous system-generated user ID with a password.** Optional private email. Judge login. |
| Notifications | In-app updates for followed plants in the dashboard | **In-app notification center** plus **opt-in email**. Web Push comes later. |
| Dashboard | Bridge dashboard in World View | **Island Access panel**, reachable from Player View |

## 2. Login, identity, and onboarding

| # | Change | Source | Status |
| --- | --- | --- | --- |
| 2.1 | Before choosing a domain, the enter page creates the player's session. | Comment on 609:36 | Confirmed |
| 2.2 | Show the user ID at the top right of the main page as a semi-transparent label, as in most games. | Comment on 609:36 | Confirmed |
| 2.3 | Add **Login as Judge**. A judge receives a random user ID, chooses an island, and plays as a regular player. | To-do §1 | Decided |
| 2.4 | Each judge has a unique ID and synchronized real-time activity across browsers and devices. A judge session survives a refresh. | To-do §1 | Decided |
| 2.5 | Add an optional email field with consent, preferences, and unsubscribe. | To-do §1, Island Access notes | Confirmed as optional |
| 2.6 | Add the checkbox: “Email me when island access is about to expire.” | Island Access notes | Decided |
| 2.7 | Make **home island** on the Welcome screen selectable to show an explanation of what a home island means and does. | Comment on 599:4 | Decided |
| 2.8 | Remove **Explore the islands in Island Studio** from the Welcome screen. | Comment on 599:4 | Decided |
| 2.9 | Restyle the **Turn your phone sideways** prompt. The game remains landscape only. | Comment on 599:5 | Confirmed. The visual direction is up to Cassius (UI). |
| 2.10 | After choosing a home island, start a tutorial. It covers walking, creating a seed, using the Seed Catalog, adopting and planting a seed, and watering and nourishing. It also shows each plant stage. The tutorial ends with the sequence: adopt a seed, water it, and the bridge opens. | Note 600:9, §8.2 | Decided |
| 2.11 | The CHI website's entry button is a regular link to the game. It passes no attendee data. Every player arrives through CHI, so no source tracking is needed. | Confirmed Nov 22 | Confirmed |

### Login and identity rules (confirmed)

- The system generates an **anonymous, readable user ID**, such as `Mossy-Fern-4821`. Players cannot choose or change it, and it contains no real name.
- The ID is the player's only public name. It appears at the top right, on seeds and plants, and in comments. There is no separate user name field. LinkedIn sharing remains opt-in.
- On the first visit, show the ID with a **Copy** button and the message: “Save this ID — you'll need it to log back in.” The player then sets a password of at least six characters.
- Returning players sign in with their user ID and password. A cookie keeps the browser signed in.
- Email is optional and private. It is used only for notifications and password reset. When setting a password, warn players who do not add an email that they cannot recover a forgotten password.
- Encourage players to add an email: “Leave your email and we'll let you know when someone replies to your research or your island access is about to expire. Your email is never shown.”
- Judges receive the same type of ID without a password. Their session lasts for the browser session.
- Email codes are not used for sign-in because they would require an email address and new sending infrastructure before the conference. They can be added later as an optional sign-in method.

## 3. Player View controls

| # | Change | Source | Status |
| --- | --- | --- | --- |
| 3.1 | After a failed throw, retry by selecting the seed **where it landed**, without pressing the plus button again. | Comment on 600:6 | Confirmed |
| 3.2 | Replace separate top-right buttons with one dropdown for the Seed Catalog and Island Access. | Comment on 600:6 | Confirmed. Cassius (UI) decides the contents and layout. |
| 3.3 | Move the bridge dashboard into the main screen. It becomes the **Island Access** panel. | Comment on 600:18 | Confirmed |
| 3.4 | Stop letting players reach an island edge without guidance. At an edge without a bridge, show: “The bridges are this way.” At a locked bridge, show: “Adopt a {island} seed, then water or nourish it to unlock this bridge.” Include a button that opens the catalog filtered to that island. | Comment on 600:19, §8.2 | Confirmed with revised copy |
| 3.5 | Add watering and fertilizing animations with feedback that explains each action's contribution to growth and access. | To-do §2 | Decided |

## 4. Plants and islands

| # | Change | Source | Status |
| --- | --- | --- | --- |
| 4.1 | Use three main growth stages: sprout, young plant, and mature plant. | To-do §3, images 600:27–29 | Confirmed |
| 4.2 | Growth art follows the reference models. Ray designs the plant models. | Images 600:27–29 | Confirmed |
| 4.3 | Add a unique origin icon to each tree trunk that reflects its island's theme. | Comment on 600:29 | Decided |
| 4.4 | Ray designs an icon for each island. The icon is used on trunks, Island Access cards, and the catalog. | Comment on 600:29 | Decided |
| 4.5 | Remove existing scenery plants **except the round green bushes**, so idea plants stand out. Ray makes the final call for each island. | Comments on 600:20 | Confirmed, with Ray deciding the final treatment |

### Growth thresholds (confirmed)

| Stage | Water (likes) | Nutrients (comments or replies) | Participation |
| --- | ---: | ---: | --- |
| Seed planted | 0 | 0 | Seed submitted |
| Sprout | 1 | 0 | One person besides the creator |
| Young plant | 2 | 2 | At least two contributors |
| Mature plant | 6 | 8 | At least four contributors, including two who replied to someone else |

These match the previous numbers without the former “Tree” stage. Contributors are counted across all plantings of a shared seed.

## 5. Bridges and island access

### Rules

- Bridges between every island pair exist from the start and do not require construction.
- Access to another island is time-limited and tracked **separately for each island**. Home-island access never expires.
- Access begins immediately after a qualifying action. Time counts down continuously, including while the player is offline.
- The game has no active-use timers, daily earning limits, or stored minute balances.

| Action | Access earned |
| --- | --- |
| Adopt and plant a seed from another island | 48 hours on that seed's origin island |
| Water a plant by liking it | 24 hours on the plant's origin island |
| Nourish a plant with a comment or reply | 36 hours on the plant's origin island |
| Create your own seed | No access. Its reward is appearing in other islands' catalogs. |
| Like or comment on your own plant | No access |

- **Actions stack up to a 5-day (120-hour) cap** (confirmed Nov 22). The new expiry is min(max(current expiry, action time) + duration, action time + 120 hours). Every action adds its full time until the cap. Five days covers a weekend, when players may have more free time, while a burst of comments cannot bank weeks of access.
  - Example: watering at noon on Monday gives access until noon Tuesday. Nourishing at 6 p.m. Monday extends it to 12 a.m. Thursday (+36 hours). Adopting a seed at 7 p.m. Monday adds 48 hours, extending access to 12 a.m. Saturday. A comment at 8 p.m. Monday would reach 12 p.m. Sunday, so it is capped at 8 p.m. Saturday, 5 days after the comment.
  - After each action, show the added time, such as “+24 hours · Games & Play access: 3 days 4 hours.” At the cap, show “Access full (5 days).” The plant still receives its water or nutrient.
  - This replaces the Figma proposal, where repeated actions refreshed access without adding to it. Refreshing gave no visible reward when access was already high.
- Expiry prevents a player from entering an island across a bridge. A player already visiting when access expires can stay, and any qualifying action there renews access. Notify the player: “Your access to {island} ended. Water or nourish a plant here to stay longer.”
- **Only a person's first comment or reply on each plant per day earns access** (confirmed Nov 22). Later comments that day still nourish the plant. Likes count once per person per plant, and edits do not earn progress or access.

### Island Access panel

- Header: **Island Access**. Subtitle: “Home · {domain}”. Body: “Adopt, water, or nourish ideas to unlock other islands and extend your visits.”
- Each island card shows its island icon in the center. A ring shows remaining time in the island's color. Below it are the island name and exact remaining time.
- Cards show **Visit island** while access is active and **Unlock access** after it expires. **Unlock access** opens the catalog filtered to that island.
- Rings use a fixed 120-hour scale, which matches the cap. The Figma proposal used 48 hours. The exact time is always shown. Selecting an active card shows the expiry, such as “Access ends Nov 24 at 3:30 p.m.”

| Remaining | Ring | Label |
| --- | --- | --- |
| 120 hours (cap) | Full | 5 days left |
| 72 hours | Three-fifths | 3 days left |
| 48 hours | Two-fifths | 2 days left |
| 24 hours | One-fifth | 24 hours left |
| 6 hours | Thin sliver with a clock alert | 6 hours left |
| Expired | Empty and muted | Access expired |

### Island maturity rate (confirmed Nov 22)

- Each island shows the share of its idea plants that are mature, so islands can be compared: **mature plants ÷ all idea plants planted on that island**, including adopted plantings.
  - Example: “Sustainability · 4 of 12 ideas mature (33%).”
- Count a plant as mature when it has reached the mature stage and is not dormant. The rate drops when trees go dormant, which encourages players to return.
- Everyone can see the rate. Show it under each island label in World View and on each Island Access card.
- An island with no plants shows “No ideas yet,” not 0%.

### Removed

- Foundations, Walkway, and Connection scoring, along with its counters and next-action copy
- Starting a bridge by planting an adopted seed
- Mossy Tangle tree-built spans and bridges that open when two mature oaks join
- Separate bridge counters for each planting pair and island pair
- Contributor crossing access and access earned by commenting after a bridge opens
- Hints and catalog tips saying that adoption starts a bridge
- The Island Studio link on the Welcome screen

### Unchanged

- The Seed Catalog is still the only way to adopt a seed. Each seed can be planted once per island.
- Visitors can read, like, comment, and reply, but cannot collect seeds.
- Plantings of the same seed share growth and discussion.
- Players communicate only through seeds, comments, and replies. Other players are not shown walking on the islands (confirmed Nov 22).

## 6. Notifications

| Channel | Status | Use |
| --- | --- | --- |
| In-app notification center | **Required** | Shows a bell with an unread dot. It covers comments on your tree, replies to your contributions, access expiring, and trees becoming dormant. It extends today's followed-plant updates. Live updates use the existing Server-Sent Events. |
| Email | **Opt-in** | Sends the same events to players who added an email. |
| Web Push | **After the conference** | Works on desktop and Android browsers. iPhone users must add the site to their home screen. |

Access reminder email:

- Send six hours before expiry, only to players who opted in.
- Send once for each island's current expiry.
- When access is extended, cancel the pending reminder and schedule a new one.
- Combine islands that reach the reminder time together into one email.
- Include an option to turn reminders off.

Tree reminder: on day 12 of inactivity, before dormancy starts, send “Your tree is getting thirsty” to opted-in players and in-app.

Comment and reply emails include **the actual comment text** and the commenter's anonymous ID, plus a link back to the plant. Sample subject: “Someone left a message on your tree!”

## 7. Tree inactivity and data retention

Meaningful activity means watering, nourishing, commenting, or replying. Opening the site does not count. Inactivity is measured on the shared plant, so activity on any planting keeps every planting active.

| Days since meaningful activity | State |
| --- | --- |
| 0–14 | Active. No change. |
| 12 | “Getting thirsty” reminder |
| 15–30 | Dormant. The tree gradually shrinks to a seedling. Discussion remains available. |
| 31–335 | Inactive seedling. Any meaningful interaction reactivates it. |
| 335 | Deletion warning sent to the creator and all contributors: “scheduled for deletion in 30 days,” with return and export options |
| 365 | The tree and its data are deleted if every planting is still inactive |

- A dormant tree keeps its earned growth stage. One meaningful interaction returns it to that stage. The growth counts remain unchanged; only the model's visual size changes.
- Deletion must not remove contributions associated with other plants.
- The Figma proposal used a 120-day deletion window. This was extended to 365 days so ideas last until the next CHI. The warning still comes 30 days before deletion.

## 8. Feasibility review (recommendations accepted)

1. **Planting your own seed did not unlock any island.** A new seed comes from the player's home island, and access is earned on the plant's origin island. The 48-hour reward therefore moved to adopting a seed from another island.
2. **Bootstrap:** A new player's first access must come from adopting a seed in the catalog. The tutorial, edge message, and **Unlock access** button all lead there.
3. **Expiry during a visit:** Expiry blocks entry only. Visitors are not removed.
4. **Dormancy and growth counts:** Dormancy changes only the model's visual size. One interaction restores the earned stage.
5. **Deleting shared plants:** A shared plant is deleted only after every planting is inactive. Use a 365-day window with export.

The 5-day cap and the first-comment-per-plant-per-day rule limit comment farming. A player can hold at most 5 days of access, so regular returns still matter, and reminders and rings stay meaningful. Each plant still accepts only one like per person, and edits add nothing.

## 9. Older open comments from earlier pages

| Comment | Status |
| --- | --- |
| “initially, will there be any bridge?” | Answered: yes |
| “why travel if the seed store shows all ideas?” | Answered: visiting provides full discussions and every plant, which requires participation |
| “each island has a representative color?” | Yes. Used for rings, packets, and icons. |
| Island plant-coverage percentage | **Included, redefined as the island maturity rate.** See §5. |
| Randomly generated avatars | Not included in this round. This could pair with the anonymous ID. |
| Special events based on each year's CHI theme | Not included in this round |

## 10. Island look and rendering

- **Owner:** Cassius (UI)
- **Reference:** Monument Valley. It combines soft pastel palettes, clean geometric forms, gentle lighting, and a calm, readable mood.
- **Current issue:**
  - Idea plants and bridges are drawn on a separate 2D canvas over the three.js islands. Because of this, they do not share the islands' lighting, they cast no shadows, and they can look pasted on.
  - Moving them into the three.js scene with Ray's new models would make the islands and plants read as one world.
- **Ideas to consider:**
  - Soft contact shadows under plants
  - Distance fog for depth between islands
  - A lighting mood for each island that matches its icon and color
  - A sky with more character than the current gradient
- **Constraint:** Phones must keep running smoothly, so avoid expensive real-time shadows and post-processing.
- Backend requirements are in [backend-plan.md](backend-plan.md).

## Open questions

All logic questions were answered on November 22. Decisions left to others:

- **Cassius (UI):** the top-right dropdown contents and layout, the rotate prompt style, and the overall island look and rendering (§10)
- **Ray:** the final scenery-plant treatment, whether the thrown seed stays an acorn, and the other questions in [the modeling brief](modeling-brief.md)
- **Team:** random avatars and CHI-theme events may be considered after the conference
