-- Telegram: remember which message to edit to "Gone — grabbed at $X" (booklet 7).
ALTER TABLE pings ADD COLUMN telegram_message_id INTEGER;
