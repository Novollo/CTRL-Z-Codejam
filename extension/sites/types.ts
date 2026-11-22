// What every site reader returns. Only food facts: never the address, payment, tokens or the customer's name.

export interface ScrapedItem {
  name: string;
  qty: number;
  price: number; // line price in dollars, e.g. 11.49
}

export interface ScrapedOrder {
  source: "doordash";      // add "ubereats" | "skip" when those readers exist
  restaurant_name: string;
  items: ScrapedItem[];
  food_price: number;      // sum of items, no fees (booklet R7)
  status_text: string;     // e.g. "Preparing your order"
  is_preparing: boolean;
}

/** One delivery site. Keep every selector for a site inside its own file. */
export interface SiteReader {
  source: ScrapedOrder["source"];
  /** Does this reader handle the page's host name? */
  matches(host: string): boolean;
  /** Is this page one order (live tracking or a past receipt)? */
  isOrderPage(doc: Document, url: URL): boolean;
  /** Read the order on screen, or null if nothing useful was found. Must never throw. */
  read(doc: Document): ScrapedOrder | null;
  /** Where to put our button (we insert it after this element), or null for a floating button. */
  anchor(doc: Document): Element | null;
}
