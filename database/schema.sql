-- Modelo transaccional inicial para PostgreSQL 15.
-- El esquema mantiene las entidades locales independientes de la API de YAuctions.

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin');
CREATE TYPE order_status AS ENUM ('draft', 'bid_submitted', 'won', 'paid', 'shipped', 'delivered', 'cancelled');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  birth_date DATE NOT NULL,
  auth0_subject VARCHAR(255) UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  country_code CHAR(2) NOT NULL DEFAULT 'SV',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  yauctions_id VARCHAR(120) UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  image_url TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  current_bid NUMERIC(12,2) NOT NULL CHECK (current_bid >= 0),
  auction_ends_at TIMESTAMPTZ,
  availability VARCHAR(30) NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  status order_status NOT NULL DEFAULT 'draft',
  bid_amount NUMERIC(12,2) NOT NULL CHECK (bid_amount > 0),
  service_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  event_type VARCHAR(40) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_product_events_user ON product_events(user_id, occurred_at DESC);
