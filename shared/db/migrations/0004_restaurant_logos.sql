-- Round 2: real restaurant logos. The two placeholder restaurants become the team's four campus picks.
-- Addresses, coordinates and walk minutes are still placeholders (fill from a map).
ALTER TABLE restaurants ADD COLUMN logo_url TEXT NOT NULL DEFAULT '';
UPDATE restaurants SET logo_url = '/img/logos/fiveguys.png' WHERE id = 'r_fiveguys';

DELETE FROM walk_times WHERE restaurant_id IN ('r_pizza', 'r_bowls');
DELETE FROM restaurants WHERE id IN ('r_pizza', 'r_bowls');

INSERT INTO restaurants (id, name, address, lat, lng, photo_url, logo_url, default_category, default_tags, default_diet) VALUES
  ('r_dominos', 'Domino''s', 'Near McGill campus (address TBD)', 45.5005, -73.5745, '/img/restaurants/dominos.jpg', '/img/logos/dominos.png', 'pizza', '["pizza"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_timhortons', 'Tim Hortons', 'Near McGill campus (address TBD)', 45.5033, -73.5768, '/img/restaurants/timhortons.jpg', '/img/logos/timhortons.png', 'coffee_bakery', '["coffee_bakery","sandwiches"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_mcgillpizza', 'McGill Pizza', 'Near McGill campus (address TBD)', 45.506, -73.5752, '/img/restaurants/mcgillpizza.jpg', '/img/logos/mcgillpizza.png', 'pizza', '["pizza"]',
   '{"vegetarian":"unsure","vegan":"no","halal":"unsure","gluten_free":"no"}'),
  ('r_onigiri', 'Onigiri Shop Pat', 'Near McGill campus (address TBD)', 45.5078, -73.572, '/img/restaurants/onigiri.jpg', '/img/logos/onigiri.png', 'asian', '["asian"]',
   '{"vegetarian":"unsure","vegan":"unsure","halal":"unsure","gluten_free":"unsure"}');

INSERT INTO walk_times (spot, restaurant_id, minutes) VALUES
  ('trottier', 'r_dominos', 8), ('trottier', 'r_timhortons', 5), ('trottier', 'r_mcgillpizza', 6), ('trottier', 'r_onigiri', 9),
  ('mclennan', 'r_dominos', 7), ('mclennan', 'r_timhortons', 4), ('mclennan', 'r_mcgillpizza', 5), ('mclennan', 'r_onigiri', 8),
  ('leacock', 'r_dominos', 6), ('leacock', 'r_timhortons', 5), ('leacock', 'r_mcgillpizza', 4), ('leacock', 'r_onigiri', 8),
  ('bronfman', 'r_dominos', 6), ('bronfman', 'r_timhortons', 6), ('bronfman', 'r_mcgillpizza', 7), ('bronfman', 'r_onigiri', 10),
  ('burnside', 'r_dominos', 7), ('burnside', 'r_timhortons', 5), ('burnside', 'r_mcgillpizza', 5), ('burnside', 'r_onigiri', 8),
  ('ssmu', 'r_dominos', 9), ('ssmu', 'r_timhortons', 6), ('ssmu', 'r_mcgillpizza', 4), ('ssmu', 'r_onigiri', 6),
  ('redpath', 'r_dominos', 7), ('redpath', 'r_timhortons', 4), ('redpath', 'r_mcgillpizza', 5), ('redpath', 'r_onigiri', 9),
  ('mcconnell', 'r_dominos', 9), ('mcconnell', 'r_timhortons', 6), ('mcconnell', 'r_mcgillpizza', 7), ('mcconnell', 'r_onigiri', 10);
