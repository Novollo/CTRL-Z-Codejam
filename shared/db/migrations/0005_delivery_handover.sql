-- Round 4: the stage order is a DELIVERY order (team decision): when it's resold, the restaurant sees it
-- switch from delivery to pickup and change hands. The new owner gets a NEW pickup code (listings.pickup_code).
ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN pickup_code TEXT;
UPDATE orders
   SET type = 'delivery',
       fees = '{"service_fee":2.99,"delivery_fee":2.49,"tax":2.69}',
       total = 25.95,
       customer_name = 'Alex'
 WHERE id = 'ord_4821';
