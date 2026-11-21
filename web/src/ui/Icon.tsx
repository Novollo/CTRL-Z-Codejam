// Custom line icons (round 4). Owned by the lead. NO emojis in the UI: use these instead.
//   <Icon name="eye" />            24 px, 2 px stroke, currentColor (booklet 11.3: Lucide-style line icons)
//   <Icon name="flame" size={16} className="text-leaf" />
// Need another icon? Ask in docs/contract-requests.md.

const PATHS = {
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  flame: "M12 22c4.4 0 7-3 7-7 0-4-3-6.5-4-10-2 2-3 4-3 6-1-1-2-2.5-2-4-2.5 2-5 5-5 8 0 4 2.6 7 7 7z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  pin: "M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  utensils: "M4 2v7a3 3 0 0 0 3 3v10 M7 2v6 M10 2v7a3 3 0 0 1-3 3 M17 22V2c-2.5 1.5-3.5 4-3.5 7.5V14H17",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  bag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  check: "M20 6 9 17l-5-5",
  checkCircle: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3",
  store: "M3 9l1.5-5h15L21 9 M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9 M3 9h18 M5 13v8h14v-8 M10 21v-5h4v5",
  courier: "M5 18a2.5 2.5 0 1 0 0-.1z M19 18a2.5 2.5 0 1 0 0-.1z M7.5 18h7l3-6h-6l-2 6 M13 8h3l1.5 4 M5 11h5",
  receipt: "M4 2v20l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V2l-3 2-2.5-2L12 4 9.5 2 7 4z M8 9h8 M8 13h8 M8 17h5",
  swap: "M17 3l4 4-4 4 M3 7h18 M7 21l-4-4 4-4 M21 17H3",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z M7 7h.01",
  trendDown: "M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  cart: "M9 21a1 1 0 1 0 0-.1z M20 21a1 1 0 1 0 0-.1z M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  undo: "M3 7v6h6 M3 13a9 9 0 1 0 2.6-6.4L3 9",
  sparkle: "M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z M2 21c0-3 1.9-5.4 5.1-6",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
  x: "M18 6 6 18 M6 6l12 12",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
  chevronRight: "M9 18l6-6-6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  qr: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v.01 M14 20h.01 M17 17h4v4h-4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, strokeWidth = 2, className = "", label }: { name: IconName; size?: number; strokeWidth?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
