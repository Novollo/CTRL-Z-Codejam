-- Seed data. Safe to run again: it wipes the tables first.
-- Run: npm run db:local (laptop) or npm run db:remote (Cloudflare).
-- PLACEHOLDERS: addresses, lat/lng, photos, the two non-Five-Guys restaurants and every walk time.
-- The team replaces them from a map (booklet 9.3, 14.1).

DELETE FROM payments;
DELETE FROM pings;
DELETE FROM listings;
DELETE FROM buyers;
DELETE FROM orders;
DELETE FROM walk_times;
DELETE FROM restaurants;

-- 3 restaurants near McGill
INSERT INTO restaurants (id, name, address, lat, lng, photo_url, default_category, default_tags, default_diet) VALUES
  ('r_fiveguys', 'Five Guys', 'Placeholder address, downtown Montréal (TBD)', 45.5017, -73.5727,
   '/img/restaurants/five-guys.jpg', 'burgers', '["burgers","fries"]',
   '{"vegetarian":"no","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_pizza', 'Milton Slice (placeholder)', 'Placeholder address, Milton St (TBD)', 45.5075, -73.5760,
   '/img/restaurants/pizza.jpg', 'pizza', '["pizza"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_bowls', 'Green Bowl Co. (placeholder)', 'Placeholder address, Sherbrooke St W (TBD)', 45.5040, -73.5745,
   '/img/restaurants/bowls.jpg', 'bowls', '["bowls"]',
   '{"vegetarian":"unsure","vegan":"unsure","halal":"unsure","gluten_free":"unsure"}');

-- Walk time in minutes: campus spot × restaurant (placeholder guesses)
INSERT INTO walk_times (spot, restaurant_id, minutes) VALUES
  ('trottier',  'r_fiveguys', 6),  ('trottier',  'r_pizza', 5),  ('trottier',  'r_bowls', 7),
  ('mclennan',  'r_fiveguys', 8),  ('mclennan',  'r_pizza', 6),  ('mclennan',  'r_bowls', 4),
  ('leacock',   'r_fiveguys', 7),  ('leacock',   'r_pizza', 5),  ('leacock',   'r_bowls', 5),
  ('bronfman',  'r_fiveguys', 9),  ('bronfman',  'r_pizza', 8),  ('bronfman',  'r_bowls', 3),
  ('burnside',  'r_fiveguys', 8),  ('burnside',  'r_pizza', 6),  ('burnside',  'r_bowls', 6),
  ('ssmu',      'r_fiveguys', 10), ('ssmu',      'r_pizza', 4),  ('ssmu',      'r_bowls', 8),
  ('redpath',   'r_fiveguys', 7),  ('redpath',   'r_pizza', 6),  ('redpath',   'r_bowls', 5),
  ('mcconnell', 'r_fiveguys', 9),  ('mcconnell', 'r_pizza', 7),  ('mcconnell', 'r_bowls', 9);

-- The stage order (booklet 5 S1, 14.1): Five Guys pickup, #4821, in "Preparing".
-- food_price 17.78 = 11.49 + 6.29. total 23.46 = 17.78 + 2.99 service + 2.69 tax.
-- ready_at is set by /api/admin/reset (now + 4 min, scaled by DEMO_SPEED).
INSERT INTO orders (id, restaurant_id, items, food_price, fees, total, type, status, ready_at, pickup_code) VALUES
  ('ord_4821', 'r_fiveguys',
   '[{"name":"Little Cheeseburger","price":11.49},{"name":"Cajun Fries (regular)","price":6.29}]',
   17.78, '{"service_fee":2.99,"delivery_fee":0,"tax":2.69}', 23.46,
   'pickup', 'preparing', NULL, 'ZEE-4821');

-- The teammate's stage buyer (booklet 12.1): Trottier, 10 min, Burgers, $12.
INSERT INTO buyers (id, token, name, notify_on, spot, lat, lng, max_walk_min, food_types, diet, max_price, telegram_chat_id) VALUES
  ('b_demo', 'tok_demo', 'Sarah', 1, 'trottier', NULL, NULL, 10, '["burgers"]', '[]', 12, NULL);
