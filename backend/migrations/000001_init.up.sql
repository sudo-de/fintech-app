CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        transaction_type NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  category    TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  date        TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE savings_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  month         CHAR(7) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budgets (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category  TEXT NOT NULL,
  "limit"   NUMERIC(12,2) NOT NULL,
  month     CHAR(7) NOT NULL,
  UNIQUE(user_id, category, month)
);

CREATE TABLE no_spend_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date    TIMESTAMPTZ NOT NULL,
  duration_days INT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
