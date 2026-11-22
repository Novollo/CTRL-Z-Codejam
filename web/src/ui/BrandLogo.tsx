// The Ctrl+Z Eats logo (round 8): the team's green bird with the food bag + "Ctrl + Z Eats" keycaps.
// Files in web/public/img/brand (transparent, made from the team's logo). Use on LIGHT backgrounds only
// (white, mint): the logo is green and disappears on forest.
//   <BrandLogo />                     full logo, 32 px tall
//   <BrandLogo height={56} />         bigger (landing hero)
//   <BrandLogo variant="mark" />      the bird only (small spaces)
export function BrandLogo({ variant = "full", height = 32, className = "" }: { variant?: "full" | "mark"; height?: number; className?: string }) {
  const src = variant === "full" ? "/img/brand/logo.webp" : "/img/brand/mark.webp";
  const ratio = variant === "full" ? 2518 / 716 : 863 / 716;
  return (
    <img
      src={src}
      alt="Ctrl+Z Eats"
      width={Math.round(height * ratio)}
      height={height}
      draggable={false}
      className={`inline-block select-none object-contain ${className}`}
      style={{ height, width: Math.round(height * ratio) }}
    />
  );
}
