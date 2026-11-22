// All site readers. To add a site: write sites/<site>.ts (a SiteReader), add it here,
// and add its pages to "content_scripts.matches" and "host_permissions" in manifest.json.
import { doordash } from "./doordash";
import type { SiteReader } from "./types";

export const READERS: SiteReader[] = [doordash];

export const readerFor = (host: string): SiteReader | null => READERS.find((r) => r.matches(host)) ?? null;

export type { ScrapedItem, ScrapedOrder, SiteReader } from "./types";
