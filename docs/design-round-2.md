# Design round 2: make it feel alive

Feedback from the team after the first full build (Nov 21). **Where this file and the booklet disagree, this file wins.** Everything else in the booklet still holds (rules R1–R12, flow, data, exact texts not changed below).

## The goal in one line
The app must feel **satisfying**: things move, react and celebrate. Every important moment gets an animation, a sound cue and (on phones) a small vibration. Clean, calm layout like the Uber Eats "Base" design system, with our own colours and our own bear, Zee.

## Design language (both apps)
Inspiration: Uber Eats Base (clean white screens, very big bold headings, black/forest primary buttons with a right arrow, pill chips, round toggles, list rows with a small icon on the left and an action on the right, full-width bottom button) and Robinhood onboarding (big friendly illustration on a coloured top half, bold headline, short text, page dots, two buttons at the bottom).

- **Colours:** only our tokens. Forest `#1E5631` replaces Uber's black for primary buttons; leaf for success and live accents; mint for soft panels; amber only for warnings/timers. Never Uber's logo, name or exact colours.
- **Type:** Inter, large and bold headings (h1 28–34 px on hero screens). Prices and timers in JetBrains Mono.
- **Shapes:** 12 px corners, pill chips, 56 px bottom button with a `→` arrow.
- **Mascot:** Zee is the star. Use `Mascot` from `web/src/ui` (poses: sitting, bag, thinking, jumping). Switch poses with `cycle` on waiting/loading screens; use motions (`bob`, `stir`, `wiggle`, `jump`, `breathe`). Celebrations use `jumping` + `sparkles`.
- **Motion kit:** `web/src/ui/ui.css` classes: `ui-pop-in`, `ui-slide-up`, `ui-fade-in` (stagger with `ui-delay-1..4`), `ui-pulse-ring` (live things), `ui-float-up` (little "+1" bubbles), `ui-shimmer` (loading), `ui-price-drop` (each new lower price).
- **Sound + haptics:** `sound` and `haptic` from `web/src/ui`. Ping on a new offer, a soft tick on price drops (not every tick, max every ~3 s), `lock` on "It's yours", `success`/`cash` + `Confetti` on listed / paid / sold, `lost` on "Grabbed by someone". Call `sound.unlock()` on the first tap. Add a small mute button (speaker icon) in a corner.
- **Respect** `prefers-reduced-motion` (the kit already does).

## Shared data changes (contract, already on main)
- `OrderItem.description`: what's in each item. Five Guys: burger = "One hand-formed beef patty, American cheese, pickles, grilled onions, ketchup and mustard on a toasted sesame bun."; fries = "Fresh-cut Idaho potatoes, skin on, cooked in peanut oil and dusted with Cajun spice. Regular size."
- `ListingCard.items`: buyers see the items with descriptions.
- New live message **`listing.stats`** `{ seen, watching, interested }`, sent to the seller and card holders on every tick. `DEMO_CROWD` (Worker setting, default "on") adds a simulated campus crowd on top of the real counts so the room never looks empty.

## Mascot: Zee is now the red bird (round 2c)
The team replaced the bear chef with a red bird in a tartan kilt. Same name: **Zee**. Eight poses in `web/public/mascot/*.webp` (transparent background), all in `MASCOT_POSES`:
`sitting` (standing calm), `bag` (running with the food bag), `thinking` (hand on chin + "?"), `jumping` (sparkles), `waving`, `pointing`, `thumbsup`, `proud` (arms crossed + sparkles).
Suggested use: onboarding card 1 + B1 → `waving`; S2 → cycle `thinking` → `pointing`, then `thumbsup` on "Your listing is ready!"; S3 → `proud`; S4 feed → cycle `sitting` / `pointing` / `thumbsup`; B3 → `pointing`; B5 → `bag` then `jumping`; S5a → `jumping`; B2 → `sitting` with `breathe`. The bird is red: put it on white or mint, never on red. Keep the app's green brand colours.

## Restaurant logos (round 2b)
The team's logos are in `web/public/img/logos/` (`fiveguys`, `dominos`, `timhortons`, `mcgillpizza`, `onigiri`.png, trimmed, max 512 px, white background). `Restaurant.logo_url` and `ListingCard.logo_url` point to them. The stage order stays Five Guys; Domino's, Tim Hortons, McGill Pizza and Onigiri Shop Pat replace the placeholder restaurants. Show logos on a white rounded tile (they have white backgrounds), `object-contain`, never stretched:
- **Seller S1 header:** the Five Guys logo instead of the shop icon (big, centred on the mint header). S3 preview card: small logo next to the title.
- **Buyer B3 card and B5 pass:** the restaurant logo next to the name.
- **Buyer onboarding card 1 and B2:** a gently auto-scrolling row "Campus favourites" with all 5 logos from `GET /api/restaurants` (marquee style, pauses on touch).

## Seller app (track A)
1. **S1:** show each item with its description under the name (smaller, stone colour), like a real receipt. Keep the greyed Cancel and the green Ctrl+Z button.
2. **S2 agent screen: slower and more "real".** Zee cycles poses (`thinking` ↔ `sitting`) with `stir`. Lines appear one by one, about **1.6 s apart** (not 0.7 s), each with a small checkmark when done:
   "Reading your order…" → "Checking who's hungry nearby…" → "Cooking up your listing…" → then a 4th line "Your listing is ready!" with a success sound.
   Then a big bottom button **"See my listing →"** appears (pop-in). The seller taps it to open S3. Do **not** jump to S3 automatically. (The API call runs in the background as before; if it's slower, the lines wait.)
3. **S3 confirm sheet:** show the items with descriptions in the preview card. **Remove the agent's reason line** ("Drops fast: only 1 person nearby…"). In its place, a positive demand line built from data, e.g. "🔥 High demand: 17 people near campus want burgers" (use `listing.stats` if available, otherwise "Lots of people near campus want burgers right now"). Never show a small or negative number to the seller.
4. **S4 listed: no longer blank.** Keep the big falling price and countdown ring, and add:
   - **Stats row** (three pill cards, count-up animation when numbers change): "👀 Seen by 23", "🔥 17 want it", "⚡ 8 watching now".
   - **Agent activity feed**: Zee working (cycle `thinking`/`sitting`, `bob`) next to a live log of what the agent is doing, newest on top, each line sliding in. Build lines from real events + friendly invented flavour, e.g.:
     "Shared your combo with 14 students near Trottier", "Price dropped to $13.30, 3 more people can afford it now", "Sarah is looking at your order 👀", "Highlighting 'fresh, untouched' to burger fans", "Someone tapped Buy! Waiting for payment…" (on `listing.locked`), "They didn't pay in time, back on the market" (on `listing.unlocked`). One new line every few seconds, max ~6 visible.
   - Keep "Lowest price … Edit", "If nobody buys … Change", "Stop listing".
5. **S5a sold: big celebration.** Confetti + `cash` sound + Zee `jumping` with sparkles; the money back counts up from $0 to the sold price; "You undid 40% of your mistake." pops in after.
6. **S5b:** Zee in the right pose, gentle animation, same texts as the booklet.

## Buyer website (track B)
1. **`/join` first screen = an inviting onboarding**, Robinhood-style: 3 short swipeable cards (dots + "Next"), each with a big coloured top half (mint/leaf/forest) holding Zee in a different pose and motion, a bold headline and one line of text:
   1. "Get fresh food for less, near campus." / "Regretted orders near McGill, at a falling price." (Zee waving/`sitting`, `bounce`)
   2. "Watch the price drop." / "Set your max price. We ping you when it's under." (Zee `thinking`, a mini animated price ticking down)
   3. "Grab it at the counter." / "First to tap Buy wins. Pay, show your code, eat." (Zee `bag`, `wiggle`)
   Bottom: big button "Get started →". Then B1.
2. **B1 profile:** Uber-Base styling: large heading, rounded inputs, pill chips that pop when selected, a big round toggle with a satisfying animation, a slider with the live value in mono. Sections slide in one by one when the toggle is turned on.
3. **B2 waiting:** not empty. Zee `sitting` with `breathe`, a soft pulsing "Live" ring, the summary card, and a small live strip ("3 orders resold near campus today", "Average saving: 45%"). These can be friendly static demo lines.
4. **B3 offer pop-up:** slides up with `ping` sound + vibration. Show the item list with descriptions (`listing.items`). Add a **"👀 8 people watching right now"** line (from `listing.stats.watching`, pulsing dot), which should feel a little stressful. Each price drop animates (`ui-price-drop`) with an occasional soft tick. The Buy button gently pulses.
5. **B4 locked:** `lock` sound, big countdown ring.
6. **B5 paid / pickup pass: big celebration.** Confetti + `success` sound + Zee `bag` with sparkles; the pickup code flips/pops in; a "ticket" look (perforated edge) in mint.
7. **B-lost:** `lost` sound, card shakes softly and greys out.
8. **`/stage`:** unchanged (two phone frames), but make sure sounds don't double up (only the frame the user taps should be unlocked; that's fine).

## Engine (track C)
- Send **`listing.stats`** on every tick to the seller and every card holder: `seen` = pinged count, `watching` = card holders with an open WebSocket now, `interested` = active buyers whose filters match the listing (price ignored). With `DEMO_CROWD = "on"` add the crowd: starts at `DEMO_CROWD.start_share` (45%) of the max at publish and grows smoothly to `DEMO_CROWD.seen_max` / `interested_max` at the floor time; `watching` wobbles between `watching_min` and `watching_max`. `listing.reach.reached` = the same `seen`. Interested ≥ watching always; seen ≥ watching.
- `ListingCard.items` comes from the order (already wired).
- Pass item descriptions to the agent: `AgentInput.items` entries as `"Little Cheeseburger: One hand-formed beef patty, …"` so the selling line can say what's in it.
- Admin `GET /api/admin/state` stays as is. (DEMO_CROWD is a Worker setting.)
