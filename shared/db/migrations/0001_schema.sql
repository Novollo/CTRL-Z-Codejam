-- Ctrl+Z Eats D1 schema (booklet 10.3). Matches shared/types.ts exactly.
-- Money: REAL dollars. Timestamps: INTEGER epoch ms. JSON: TEXT. Booleans: INTEGER 0/1.
-- FROZEN: only the lead changes this file. New changes = a new numbered migration file.

CREATE TABLE restaurants (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  photo_url        TEXT NOT NULL,
  default_category TEXT NOT NULL,                 -- a FoodType key
  default_tags     TEXT NOT NULL DEFAULT '[]',    -- JSON Tag[]
  default_diet     TEXT NOT NULL DEFAULT '{}'     -- JSON ListingDiet
);

CREATE TABLE walk_times (
  spot          TEXT NOT NULL,                    -- a CampusSpot key
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  minutes       INTEGER NOT NULL,
  PRIMARY KEY (spot, restaurant_id)
);

CREATE TABLE orders (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  items         TEXT NOT NULL,                    -- JSON [{name, price}]
  food_price    REAL NOT NULL,
  fees          TEXT NOT NULL,                    -- JSON {service_fee, delivery_fee, tax}
  total         REAL NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('pickup', 'delivery')),
  status        TEXT NOT NULL CHECK (status IN ('received', 'preparing', 'ready', 'picked_up')),
  ready_at      INTEGER,                          -- epoch ms
  pickup_code   TEXT NOT NULL
);

CREATE TABLE listings (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id),
  status        TEXT NOT NULL CHECK (status IN ('draft', 'live', 'locked', 'sold', 'free', 'closed', 'donated', 'stopped')),
  start_price   REAL NOT NULL,
  floor_price   REAL NOT NULL,
  drop_speed    TEXT NOT NULL CHECK (drop_speed IN ('fast', 'normal', 'slow')),
  opens_at      INTEGER,
  closes_at     INTEGER,
  fallback      TEXT NOT NULL CHECK (fallback IN ('pickup_self', 'free', 'donate')),
  tags          TEXT NOT NULL DEFAULT '[]',       -- JSON Tag[]
  diet          TEXT NOT NULL DEFAULT '{}',       -- JSON ListingDiet
  may_contain   TEXT NOT NULL DEFAULT '[]',       -- JSON string[]
  title         TEXT NOT NULL,
  selling_line  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  agent_source  TEXT NOT NULL CHECK (agent_source IN ('live', 'default')),
  locked_by     TEXT,                             -- buyer id
  lock_until    INTEGER,
  sold_price    REAL,
  buyer_id      TEXT                              -- winning buyer id
);
CREATE INDEX listings_order ON listings(order_id);

CREATE TABLE buyers (
  id               TEXT PRIMARY KEY,
  token            TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  notify_on        INTEGER NOT NULL DEFAULT 0,
  spot             TEXT,                          -- a CampusSpot key
  lat              REAL,
  lng              REAL,
  max_walk_min     INTEGER NOT NULL DEFAULT 10,
  food_types       TEXT NOT NULL DEFAULT '[]',    -- JSON FoodType[]
  diet             TEXT NOT NULL DEFAULT '[]',    -- JSON BuyerDiet[]
  max_price        REAL NOT NULL DEFAULT 12,
  telegram_chat_id TEXT UNIQUE
);

CREATE TABLE pings (
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id   TEXT NOT NULL REFERENCES buyers(id),
  channel    TEXT NOT NULL CHECK (channel IN ('web', 'telegram')),
  reason     TEXT NOT NULL,
  sent_at    INTEGER NOT NULL,
  dismissed  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, buyer_id, channel)
);

CREATE TABLE payments (
  listing_id        TEXT NOT NULL REFERENCES listings(id),
  buyer_id          TEXT NOT NULL REFERENCES buyers(id),
  amount            REAL NOT NULL,
  stripe_session_id TEXT UNIQUE,
  status            TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  paid_at           INTEGER
);
CREATE INDEX payments_listing ON payments(listing_id);
