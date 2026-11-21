// Design tokens (booklet 11.2 and 11.3). The same values are in tokens.css for Tailwind.
// In React, prefer the Tailwind classes: bg-forest, text-ink, text-stone, border-line, font-mono, rounded-card…
// FROZEN: only the lead changes this file (see CLAUDE.md).

export const COLORS = {
  forest: "#1E5631", // main brand: Ctrl+Z button, primary buttons, logo
  leaf: "#6CC24A",   // accents: sparkles, progress ring, "You undid 40%", reason icon
  mint: "#EEF7EA",   // light green backgrounds: S2, selected chips, pickup pass
  ink: "#111111",    // headings and main text
  stone: "#6B6B6B",  // secondary text
  line: "#E8E8E8",   // borders, dividers, greyed Cancel button
  white: "#FFFFFF",  // screen background
  amber: "#F2A900",  // warnings only: delivery warning, last 60 s, lock countdown
} as const;
export type ColorToken = keyof typeof COLORS;

export const FONTS = {
  ui: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace", // prices and timers, bold
} as const;

/** px */
export const TYPE = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 13,
} as const;

/** px */
export const SHAPE = {
  radius: 12,          // cards and buttons
  bottomButtonHeight: 56,
  iconStroke: 2,       // Lucide line icons
} as const;

/** Seller phone frame size (booklet 5). */
export const PHONE = { width: 390, height: 844 } as const;

/**
 * Mascot poses (round 2: Zee is now the team's red bird; files in /web/public/mascot/).
 * The first four keys are the booklet's poses, kept so existing screens still work.
 */
export const MASCOT_POSES = {
  sitting: "/mascot/standing.webp",   // calm, standing: B2, S4, empty states
  bag: "/mascot/bag.webp",            // running with the food bag: B5, Telegram welcome
  thinking: "/mascot/thinking.webp",  // hand on chin + "?": S2 agent at work
  jumping: "/mascot/jumping.webp",    // jumping with sparkles: S5a sold, B5 paid
  waving: "/mascot/waving.webp",      // hello: onboarding, B1
  pointing: "/mascot/pointing.webp",  // "look at this": S4 feed, B3 offer
  thumbsup: "/mascot/thumbsup.webp",  // "done!": S2 "Your listing is ready!", success lines
  proud: "/mascot/proud.webp",        // arms crossed + sparkles: S3, "I'm on it"
} as const;
