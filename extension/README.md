# Ctrl+Z Eats Chrome extension (track F)

This extension puts our green **Ctrl+Z this order** button on a DoorDash order page. Press and hold it, check the order, and the Ctrl+Z Eats agent prices it. Press and hold **List it**, and people near campus get pinged, just like in our own app.

It is a demo. Nothing is cancelled or changed on DoorDash, and DoorDash is not involved. The extension sends only the restaurant name, item names, quantities and prices to our server. It never reads or sends cookies, the address, payment details or the customer's name.

## Install (about 1 minute)

1. In Chrome, open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder of this project.
   On a Mac, press Cmd+Shift+G in the folder picker and paste the folder's path.
4. Pin the extension: click the puzzle icon in the toolbar, then the pin next to **Ctrl+Z Eats**.

The folder already contains the built files (`extension/build`). After changing the code, run `npm run extension:build`, then click the reload arrow on the extension's card in `chrome://extensions`.

## Pick the server

Click the Ctrl+Z Eats icon in the toolbar. Under **Server**, pick:

- **This laptop**: `http://localhost:8787`. Start it first with `npm run dev`.
- **Live site**: `https://ctrlz-eats.stalerole.workers.dev`. It needs the import endpoint (`POST /api/orders/import`) to be deployed.

The popup tells you if it can reach the server.

## Demo mode

In the popup, turn on **Demo mode**.

- **Off:** the button shows only while the order is "Preparing" (rule R1).
- **On:** the button shows on any DoorDash order page, past orders included. A **Demo mode** label is always shown next to the button and in the panel, so the demo stays honest.

If the page can't be read (DoorDash changed its layout), the panel still opens with empty fields. Type the restaurant, items and prices, and the rest works the same.

## On stage

1. Open a past order on doordash.com, with demo mode on.
2. Press and hold **Ctrl+Z this order** for about a second.
3. Check the order, then press **Continue**. The agent writes the listing and the price plan.
4. Press and hold **List it**. Phones on `/join` (and Telegram) get pinged, and the price falls live in the panel.

## Add another site (Uber Eats, SkipTheDishes, ...)

1. Copy `sites/doordash.ts` to `sites/<site>.ts` and change the text patterns and `data-testid` values. Keep every selector for that site in that one file. Never use generated class names.
2. Add the reader to the list in `sites/index.ts`.
3. In `manifest.json`, add the site's pages to `content_scripts.matches` and `host_permissions`.
4. Add the site's name to `source` in `sites/types.ts` and in `ImportOrderRequest` (`shared/api.ts`, a lead change).
5. Run `npm run extension:build` and reload the extension.

## Files

- `manifest.json`: Chrome's settings. The only permissions are `storage`, doordash.com and our two servers.
- `sites/`: the site readers. `doordash.ts` holds every DoorDash selector.
- `src/content.ts`: watches the page (it's a single-page app) and shows or hides the button.
- `src/ui/`: the button, the panel and the press-and-hold logic, inside a Shadow DOM.
- `src/background.ts`: the only part that talks to our server (HTTP and the live connection).
- `src/popup.ts` and `popup.html`: the settings.
- `fixtures/`: local test pages. Git ignores this folder, because a saved order page holds personal data.
