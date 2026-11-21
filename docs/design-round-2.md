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

# Round 3 (team feedback, Nov 21 evening)

## Sounds: only when something happens
The team heard repeating sounds while muted. Causes: mute only applied to one page, and the seller feed played a sound every ~2.8 s. The kit now enforces the rule (`web/src/ui/sound.ts`):
- **Mute is global** across every tab and `/stage` frame. Use the shared `<MuteButton />` from `web/src/ui` and delete your own mute button.
- Hidden pages never play. Each sound has a cooldown. `sound.tick()` does nothing.
- **Allowed sounds:** `tap` when the user presses a button that does something; `ping` when an offer opens; `lock` on "It's yours"; `success` once when listed or paid; `cash` once on sold; `lost` once on "Grabbed by someone". **Never** on feed lines, stats, price drops, timers, page loads or animations. Remove every other call.

## Grey doodle backgrounds (less blank)
`<Doodles variant="food" | "city" | "mix" tone opacity />` from `web/src/ui`: a soft line-icon pattern like the Uber Eats screenshot (food icons; or campus/city: buildings, a domed hall, Mount Royal, trees, a bike, a tram). Put it behind content (`relative` container, content above), low opacity (0.05–0.10), forest tone on mint, ink tone on white. Use it on: S2 agent screen (food), the onboarding top halves (city on card 1, food on 2–3), B2 (city), B3 card header (food), the map picker frame (city, very faint). Not everywhere, just enough that no big area looks empty.

## Motion: buttons and flow
- Every tappable button: add `ui-press` (springy press + soft hover shadow) and `sound.tap()` when it does something.
- Content that appears: `ui-flow-in` with `ui-delay-1..4` so sections flow in one after another.

## Mascot images fixed
The bird poses are re-cut from the sheet: no leftovers from neighbouring poses, the same scale for every pose, the same ground line. **Never clip Zee:** no `overflow-hidden` circle or tight box around the mascot. Let it stand on the background or on a soft shape bigger than it.

## Seller S2: a bit longer
Lines about **2.2 s** apart (was 1.6 s), food `Doodles` on the mint background, then thumbs-up and "See my listing →" as before.

## Buyer onboarding: nicer, less bland
Doodles on each coloured top half, Zee centred and never cut off, headline and text flowing in, page dots that animate, `ui-press` on Next / Get started, a soft slide between cards. The "Campus favourites" logo row stays (the team likes it).

## B1 "Where are you?" → a campus map
Draw `CAMPUS_MAP` from `shared/campusMap.ts` as an SVG (our own schematic, not an official map): light grey streets with labels, a green lower field, grey decoration buildings, and the **8 pickable buildings in red**. Tap a building to pick it: it pops (scale), turns darker red, gets a white outline and a pin with the name above it, plus `sound.tap()` and `haptic.light()`. Show the picked name under the map ("📍 Trottier"). Keep a small chip list under the map as a fallback (also good for accessibility). Small "Not to scale" note. Map width = screen width minus padding; buildings must be easy to tap on a phone.

## B1 "What do you like?": allow everything
Add an **"Anything 🍽️"** chip first, selected by default (it means `food_types = []`). Picking a specific type unselects Anything; picking Anything clears the others. Same idea for Diet: a "No restrictions" chip first (it means `diet = []`).

# Round 4 (team feedback): a complete story on three screens

## No emojis anywhere
The team finds emoji labels unprofessional. **Remove every emoji from the UI** (stats pills, demand line, "Anything", the 📍 line, feed lines, buttons, Telegram excepted). Use `<Icon name="…" />` from `web/src/ui` (custom line icons: eye, flame, bolt, users, heart, pin, utensils, clock, bag, check, checkCircle, store, courier, receipt, swap, tag, trendDown, bell, home, search, cart, user, undo, sparkle, leaf, info, x, arrowRight, chevronRight/Left, star, phone, qr). Icons in forest, ink or leaf; never coloured emoji.

## The stage order is now a DELIVERY order
Five Guys #4821 for **Alex**: $17.78 food + $2.49 delivery + $2.99 service + $2.69 tax = **$25.95**. When it's listed, the courier is released (booklet R3) and the restaurant switches it to **pickup**. The seller's S3 shows the booklet's yellow delivery warning ("Your courier is released. If nobody buys it, you pick it up at the restaurant."). On a sale the new owner gets a **new pickup code** (`listings.pickup_code`, made with `makePickupCode()`); the seller's original code ZEE-4821 is no longer valid for pickup by the buyer.

## Seller (track A): a full delivery-app shell, then back
Mimic the *structure* of a food delivery app (never Uber's name, logo or exact colours; keep the "Demo app" tag):
1. **Home:** location bar ("McGill campus"), search field, category chips with icons, **3 restaurant cards** with big logo tile, rating, delivery time and fee (from `GET /api/restaurants`; Five Guys plus two others), a bottom tab bar (Home · Browse · Orders · Account, icons).
2. A sticky **"Your order" banner** above the tab bar: Five Guys logo, "Preparing · arriving 12:58", chevron. Tap → slides up into **S1 order tracker** (delivery version: courier line, delivery fee row).
3. Ctrl+Z → S2 → S3 → S4 → S5 as now.
4. **After the end** (sold, stopped, or not sold): a "Back to home" button returns to Home. The banner now reads e.g. "Order resold on Ctrl+Z Eats · $9.40 back", or "Preparing" again if stopped.
5. **Zee's feed: cleaner chat.** Zee's avatar once, then bubbles like a chat (rounded, white on mint, small timestamp, newest at the bottom with smooth auto-scroll, "Zee is typing…" dots between lines). Short sentences. Stats pills above it with `Icon` (eye / users / bolt), no emojis.

## Restaurant tablet (track E): `/restaurant?r=r_fiveguys`
Our design system (white, forest, mint, Inter, mono for codes), *structured* like a restaurant order manager: left sidebar (Orders, Menu, Performance: only Orders works), header "Five Guys · Order manager", tabs **Active / Completed**, order list rows (status dot, code, customer, items, fulfilment, total). Selecting an order opens a detail panel.
- Data: `GET /api/restaurant/:id/orders` → `RestaurantOrdersResponse`; live: `connectLive({ role: "restaurant", restaurantId })` → `restaurant.order` messages carrying the full `RestaurantOrderView`; replace that order in the list.
- Buttons: **Mark ready** (POST `API.restaurantReady`), **Picked up** (POST `API.restaurantPickedUp`).
- The moments to animate (pop-in banner + highlight on the row):
  1. Ctrl+Z pressed / listed: amber banner "Customer pressed Ctrl+Z: this order is being resold on Ctrl+Z Eats. Keep preparing." Fulfilment chip animates **Delivery → Pickup** with "Courier released".
  2. Sold / taken free: a forest banner "Order changed hands", customer name **Alex → Sarah** (old one crossed out), pickup code **ZEE-4821 → ZEE-7Q2K** (old one crossed out, new one big in mono), channel badge "Delivery app → Ctrl+Z Eats".
  3. Timeline on the right (`timeline`), newest at the bottom.
- Works at tablet size and inside a phone frame (≥ 390 px wide: collapse the sidebar into a top bar).

## `/demo` (track B): three phones
Seller (left, `/seller`), buyer (middle, `/join`), restaurant (right, `/restaurant?r=r_fiveguys`), the same phone frames as `/stage`, scaled to fit, small labels under each ("Customer who regrets", "Student nearby", "Five Guys kitchen"). `/stage` stays as it is.

## Engine (track C)
- `/ws?role=restaurant&restaurant=<id>`: send `restaurant.order` with the full `RestaurantOrderView` of every order that changes (and all of that restaurant's open orders on connect).
- `GET /api/restaurant/:id/orders`: the real order(s) of that restaurant + `MOCK_RESTAURANT_QUEUE(now)` for Five Guys so the list isn't empty. `POST /api/restaurant/orders/:id/ready` (same as admin order-ready) and `/picked-up` (status picked_up).
- Build `timeline` from real events (received, Ctrl+Z pressed = undo, listed + courier released when type is delivery, locked, sold/taken free, new code, ready, picked up, stopped).
- On sale or free take: generate `listings.pickup_code = makePickupCode()`; the `PickupPass.pickup_code` is that NEW code; the restaurant view shows the new code with the old one as `previous_pickup_code`, `customer_name` = buyer's name, `channel` "ctrlz".
- Fulfilment: delivery orders become pickup from publish onward (courier released); back to delivery if the seller stops the listing.
- Admin reset restores all of this.
