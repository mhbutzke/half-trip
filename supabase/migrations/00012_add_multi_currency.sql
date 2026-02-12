-- Add multi-currency support
-- trips: base_currency for the trip's primary currency
-- expenses: exchange_rate for converting to base currency

-- Add base_currency to trips (defaults existing trips to BRL)
ALTER TABLE trips ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'BRL';

-- Add exchange_rate to expenses (defaults existing expenses to 1.00)
ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 1.00
  CONSTRAINT expenses_exchange_rate_positive CHECK (exchange_rate > 0);
