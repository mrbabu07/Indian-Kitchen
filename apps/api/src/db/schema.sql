CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
DO $$ BEGIN CREATE TYPE staff_role AS ENUM ('admin','operator','kitchen'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE food_type AS ENUM ('veg','non_veg'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('placed','accepted','preparing','ready','served','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash','upi'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending','paid','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(120) NOT NULL, slug VARCHAR(120) UNIQUE NOT NULL,
  address TEXT NOT NULL, phone VARCHAR(30), gst_number VARCHAR(30), gst_percent NUMERIC(5,2) NOT NULL DEFAULT 5,
  razorpay_key_id TEXT, razorpay_key_secret TEXT, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL, email CITEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role staff_role NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL, qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, capacity INTEGER NOT NULL DEFAULT 4 CHECK(capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(branch_id,name)
);
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(branch_id,name)
);
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE, name VARCHAR(140) NOT NULL, description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK(price >= 0), image_url TEXT, food_type food_type NOT NULL DEFAULT 'veg', available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_number BIGSERIAL UNIQUE, branch_id UUID NOT NULL REFERENCES branches(id),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id), status order_status NOT NULL DEFAULT 'placed', payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending', subtotal NUMERIC(10,2) NOT NULL, tax_amount NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL, customer_name VARCHAR(120), customer_phone VARCHAR(30), notes TEXT,
  razorpay_order_id TEXT, razorpay_payment_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), served_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL, item_name VARCHAR(140) NOT NULL, unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0), special_instructions TEXT, line_total NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_branch_role ON users(branch_id,role);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON restaurant_tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_categories_branch ON categories(branch_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_branch_category ON menu_items(branch_id,category_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders(branch_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders(branch_id,status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
