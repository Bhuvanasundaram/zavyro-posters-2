import { pool } from "./db.js";

export async function ensureOptionalTables() {
  // Additive, non-destructive flags allow admins to deactivate categories while
  // preserving existing product/subcategory foreign-key associations.
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`);
  await pool.query(`ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(160) NOT NULL,
      email varchar(255) NOT NULL,
      phone varchar(20),
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS zavyro_order_number_seq START WITH 1
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_order_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number varchar(40) NOT NULL UNIQUE,
      customer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      customer_name varchar(160) NOT NULL,
      customer_email varchar(255),
      customer_phone varchar(30),
      source varchar(20) NOT NULL DEFAULT 'online',
      order_status varchar(40) NOT NULL DEFAULT 'pending',
      payment_status varchar(40) NOT NULL DEFAULT 'pending',
      payment_method varchar(60),
      subtotal numeric(12,2) NOT NULL DEFAULT 0,
      delivery_charge numeric(12,2) NOT NULL DEFAULT 0,
      discount_amount numeric(12,2) NOT NULL DEFAULT 0,
      total_amount numeric(12,2) NOT NULL DEFAULT 0,
      shipping_address jsonb,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES zavyro_order_records(id) ON DELETE CASCADE,
      product_id uuid REFERENCES products(id) ON DELETE SET NULL,
      title varchar(255) NOT NULL,
      quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
      unit_price numeric(12,2) NOT NULL DEFAULT 0,
      size varchar(30),
      format varchar(30),
      image_url text,
      customization_url text,
      customization_filename varchar(255),
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_orders_customer ON zavyro_order_records(customer_user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_orders_created ON zavyro_order_records(created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_payment_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name varchar(160) NOT NULL,
      customer_email varchar(255) NOT NULL,
      customer_phone varchar(30) NOT NULL,
      shipping_address jsonb NOT NULL,
      items jsonb NOT NULL,
      subtotal numeric(12,2) NOT NULL DEFAULT 0,
      delivery_charge numeric(12,2) NOT NULL DEFAULT 0,
      discount_amount numeric(12,2) NOT NULL DEFAULT 0,
      total_amount numeric(12,2) NOT NULL DEFAULT 0,
      razorpay_order_id varchar(80),
      razorpay_payment_id varchar(80),
      order_id uuid REFERENCES zavyro_order_records(id) ON DELETE SET NULL,
      status varchar(40) NOT NULL DEFAULT 'created',
      failure_reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_payment_attempt_user ON zavyro_payment_attempts(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_payment_attempt_razorpay ON zavyro_payment_attempts(razorpay_order_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_notification_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES zavyro_order_records(id) ON DELETE CASCADE,
      channel varchar(20) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      attempt_count integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error text,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (order_id, channel)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_notification_jobs_due ON zavyro_notification_jobs(status, next_attempt_at)`);

  // Per-recipient delivery tracking prevents one failing WhatsApp recipient from
  // forcing already-successful recipients to receive duplicate notifications.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_notification_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES zavyro_order_records(id) ON DELETE CASCADE,
      channel varchar(20) NOT NULL,
      recipient varchar(255) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      attempt_count integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error text,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (order_id, channel, recipient)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_notification_deliveries_due ON zavyro_notification_deliveries(channel, status, next_attempt_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zavyro_mockup_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(100) NOT NULL,
      note varchar(255),
      image_url text NOT NULL,
      frame jsonb NOT NULL,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_zavyro_mockup_templates_created ON zavyro_mockup_templates(created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(255) NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}
