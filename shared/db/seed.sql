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

-- 5 restaurants near McGill (round 2: the team's logos in web/public/img/logos)
INSERT INTO restaurants (id, name, address, lat, lng, photo_url, logo_url, default_category, default_tags, default_diet) VALUES
  ('r_fiveguys', 'Five Guys', 'Placeholder address, downtown Montréal (TBD)', 45.5017, -73.5727,
   '/img/restaurants/five-guys.jpg', '/img/logos/fiveguys.png', 'burgers', '["burgers","fries"]',
   '{"vegetarian":"no","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_dominos', 'Domino''s', 'Near McGill campus (address TBD)', 45.5005, -73.5745, '/img/restaurants/dominos.jpg', '/img/logos/dominos.png', 'pizza', '["pizza"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_timhortons', 'Tim Hortons', 'Near McGill campus (address TBD)', 45.5033, -73.5768, '/img/restaurants/timhortons.jpg', '/img/logos/timhortons.png', 'coffee_bakery', '["coffee_bakery","sandwiches"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_mcgillpizza', 'McGill Pizza', 'Near McGill campus (address TBD)', 45.506, -73.5752, '/img/restaurants/mcgillpizza.jpg', '/img/logos/mcgillpizza.png', 'pizza', '["pizza"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_onigiri', 'Onigiri Shop Pat', 'Near McGill campus (address TBD)', 45.5078, -73.572, '/img/restaurants/onigiri.jpg', '/img/logos/onigiri.png', 'asian', '["asian"]',
   '{"vegetarian":"unsure","vegan":"unsure","halal":"unsure","gluten_free":"unsure"}');

-- Walk time in minutes: campus spot × restaurant (placeholder guesses)
INSERT INTO walk_times (spot, restaurant_id, minutes) VALUES
  ('trottier', 'r_fiveguys', 6), ('trottier', 'r_dominos', 8), ('trottier', 'r_timhortons', 5), ('trottier', 'r_mcgillpizza', 6), ('trottier', 'r_onigiri', 9),
  ('mclennan', 'r_fiveguys', 8), ('mclennan', 'r_dominos', 7), ('mclennan', 'r_timhortons', 4), ('mclennan', 'r_mcgillpizza', 5), ('mclennan', 'r_onigiri', 8),
  ('leacock', 'r_fiveguys', 7), ('leacock', 'r_dominos', 6), ('leacock', 'r_timhortons', 5), ('leacock', 'r_mcgillpizza', 4), ('leacock', 'r_onigiri', 8),
  ('bronfman', 'r_fiveguys', 9), ('bronfman', 'r_dominos', 6), ('bronfman', 'r_timhortons', 6), ('bronfman', 'r_mcgillpizza', 7), ('bronfman', 'r_onigiri', 10),
  ('burnside', 'r_fiveguys', 8), ('burnside', 'r_dominos', 7), ('burnside', 'r_timhortons', 5), ('burnside', 'r_mcgillpizza', 5), ('burnside', 'r_onigiri', 8),
  ('ssmu', 'r_fiveguys', 10), ('ssmu', 'r_dominos', 9), ('ssmu', 'r_timhortons', 6), ('ssmu', 'r_mcgillpizza', 4), ('ssmu', 'r_onigiri', 6),
  ('redpath', 'r_fiveguys', 7), ('redpath', 'r_dominos', 7), ('redpath', 'r_timhortons', 4), ('redpath', 'r_mcgillpizza', 5), ('redpath', 'r_onigiri', 9),
  ('mcconnell', 'r_fiveguys', 9), ('mcconnell', 'r_dominos', 9), ('mcconnell', 'r_timhortons', 6), ('mcconnell', 'r_mcgillpizza', 7), ('mcconnell', 'r_onigiri', 10);

-- The stage order: Five Guys #4821, in "Preparing". Round 4: a DELIVERY order (was pickup in the booklet).
-- food_price 17.78 = 11.49 + 6.29. total 25.95 = 17.78 + 2.49 delivery + 2.99 service + 2.69 tax.
-- ready_at is set by /api/admin/reset (now + 4 min, scaled by DEMO_SPEED).
INSERT INTO orders (id, restaurant_id, items, food_price, fees, total, type, status, ready_at, pickup_code, customer_name) VALUES
  ('ord_4821', 'r_fiveguys',
   '[{"name":"Little Cheeseburger","price":11.49,"description":"One hand-formed beef patty, American cheese, pickles, grilled onions, ketchup and mustard on a toasted sesame bun."},{"name":"Cajun Fries (regular)","price":6.29,"description":"Fresh-cut Idaho potatoes, skin on, cooked in peanut oil and dusted with Cajun spice. Regular size."}]',
   17.78, '{"service_fee":2.99,"delivery_fee":2.49,"tax":2.69}', 25.95,
   'delivery', 'preparing', NULL, 'ZEE-4821', 'Alex');

-- The teammate's stage buyer (booklet 12.1): Trottier, 10 min, Burgers, $12.
INSERT INTO buyers (id, token, name, notify_on, spot, lat, lng, max_walk_min, food_types, diet, max_price, telegram_chat_id) VALUES
  ('b_demo', 'tok_demo', 'Sarah', 1, 'trottier', NULL, NULL, 10, '["burgers"]', '[]', 12, NULL);
