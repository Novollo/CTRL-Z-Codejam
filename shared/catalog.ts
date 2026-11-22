// Fixed lists from the booklet: food types, tags, diets, campus spots, fallbacks.
// Keys are what the code stores. Labels are the exact on-screen text.
// FROZEN: only the lead changes this file (see CLAUDE.md).

/** Buyer "What do you like?" chips (booklet B1.3). */
export const FOOD_TYPES = [
  { key: "burgers", label: "Burgers" },
  { key: "pizza", label: "Pizza" },
  { key: "sushi", label: "Sushi" },
  { key: "asian", label: "Asian" },
  { key: "bowls", label: "Healthy / bowls" },
  { key: "sandwiches", label: "Sandwiches" },
  { key: "coffee_bakery", label: "Coffee & bakery" },
  { key: "dessert", label: "Dessert" },
] as const;
export type FoodType = (typeof FOOD_TYPES)[number]["key"];

/** Tags the agent may use (booklet 8.2 `allowed_tags`). Food types + two extra tags. */
export const ALLOWED_TAGS = [
  "burgers", "pizza", "sushi", "asian", "bowls", "sandwiches", "coffee_bakery", "dessert", "fries", "drinks",
] as const;
export type Tag = (typeof ALLOWED_TAGS)[number];

/** Chip label for each tag on a listing card ("Burgers", "Fries"…). */
export const TAG_LABELS: Record<Tag, string> = {
  burgers: "Burgers", pizza: "Pizza", sushi: "Sushi", asian: "Asian", bowls: "Healthy / bowls",
  sandwiches: "Sandwiches", coffee_bakery: "Coffee & bakery", dessert: "Dessert", fries: "Fries", drinks: "Drinks",
};

/** Buyer "Diet" chips (booklet B1.4). */
export const BUYER_DIETS = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "halal", label: "Halal" },
  { key: "no_nuts", label: "No nuts" },
  { key: "no_gluten", label: "No gluten" },
] as const;
export type BuyerDiet = (typeof BUYER_DIETS)[number]["key"];

/** Agent diet answer (booklet 8.3). "unsure" counts as "no" for matching. */
export type DietAnswer = "yes" | "no" | "unsure";
export interface ListingDiet {
  vegetarian: DietAnswer;
  vegan: DietAnswer;
  halal: DietAnswer;
  gluten_free: DietAnswer;
}

/** Words in `may_contain` that count as a nut for the "No nuts" rule (booklet 9.3.5). */
export const NUT_WORDS = ["peanut", "peanuts", "nut", "nuts", "tree nuts", "almond", "almonds", "hazelnut", "cashew", "walnut", "pecan", "pistachio"] as const;

/** Buyer "Where are you?" campus spots (booklet B1.1). */
export const CAMPUS_SPOTS = [
  { key: "trottier", label: "Trottier" },
  { key: "mclennan", label: "McLennan Library" },
  { key: "leacock", label: "Leacock" },
  { key: "bronfman", label: "Bronfman" },
  { key: "burnside", label: "Burnside" },
  { key: "ssmu", label: "SSMU / University Centre" },
  { key: "redpath", label: "Redpath Hall" },
  { key: "mcconnell", label: "McConnell Engineering" },
] as const;
export type CampusSpot = (typeof CAMPUS_SPOTS)[number]["key"];

/** Buyer "How far will you walk?" chips, in minutes (booklet B1.2). */
export const WALK_CHOICES_MIN = [5, 10, 15, 20] as const;
export type WalkChoice = (typeof WALK_CHOICES_MIN)[number];

/** Seller fallback when nobody buys (booklet R9, S3.3). "donate" stays valid for the engine and old rows, but is no longer offered (round 8: donate button removed). */
export type Fallback = "pickup_self" | "free" | "donate";
/** The choices shown to the seller (S3 and the Chrome extension). */
export const FALLBACKS: readonly { key: Fallback; label: string }[] = [
  { key: "pickup_self", label: "I'll pick it up" },
  { key: "free", label: "Give it free to someone nearby" },
];
export const DEFAULT_FALLBACK: Fallback = "free";

export type DropSpeed = "fast" | "normal" | "slow";
