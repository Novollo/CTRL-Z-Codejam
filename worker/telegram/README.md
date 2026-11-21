# worker/telegram: Track D

The Telegram bot (booklet section 7) through `POST /api/telegram/webhook`. Key: `TELEGRAM_BOT_TOKEN`.

- `handleTelegramUpdate` → `/start` (welcome text from the booklet, asks the first name, then the settings menu),
  `/on` ("Pings on 🟢"), `/off` ("Paused"), `/settings` (inline buttons: Where are you? · How far will you walk? ·
  What do you like? · Diet · Max price), `/stop` (deletes the profile), and (live) location → `buyers.lat/lng`.
  Writes the `buyers` table, then calls `notifyBuyerChanged`. Never throws (Telegram would resend the update).
- `sendTelegramPing` → the ping text from booklet 7 with a [Buy now] link button. Returns the message id.
  Telegram only accepts `https://` links on buttons: on a laptop (`http://localhost`) the link goes in the text.
- `editTelegramPing` → replaces the text (e.g. "Gone — grabbed at $8.40") and removes the button.
- A new bot profile starts with pings **off** (like B1) and no campus spot; the menu says "Send /on to get pings."

## Test

```bash
node worker/agent/run-test.mjs worker/telegram/test-telegram.ts
```

Sends sample update objects through the real local database; calls to Telegram are captured, not sent.
One real read-only `getMe` checks the token and prints the bot's @name.

## Lead: connect the bot (after deploy)

1. If `getMe` fails ("Unauthorized"): Telegram → @BotFather → `/mybots` → the bot → API Token. Put the token in
   `.dev.vars` as `TELEGRAM_BOT_TOKEN`, then `npm run secrets:upload`.
2. Point Telegram at the Worker (paste in a browser, with the real token instead of `<TOKEN>`):
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ctrlz-eats.stalerole.workers.dev/api/telegram/webhook`
3. Check: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` shows that URL and no `last_error_message`.
4. Optional: @BotFather → `/setcommands` → `start - Start`, `settings - Settings`, `on - Pings on`, `off - Pause pings`, `stop - Delete my profile`.
5. On the phone: `/start`, type the first name, set Trottier · 10 min · Burgers · $12, then `/on`.
