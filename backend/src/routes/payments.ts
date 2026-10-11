import { Router, type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { getHomepageContent } from "../homepageContent.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const API_URL = "https://api.razorpay.com/v1/orders";
const PAYMENT_API_URL = "https://api.razorpay.com/v1/payments";
const RAZORPAY_TIMEOUT_MS = 12_000;
const paymentRateBuckets = new Map<string, { count: number; resetAt: number }>();
function paymentRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = String(req.ip || req.socket.remoteAddress || "unknown");
    let bucket = paymentRateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; paymentRateBuckets.set(key, bucket); }
    bucket.count += 1;
    if (paymentRateBuckets.size > 5000) {
      for (const [bucketKey, value] of paymentRateBuckets) if (value.resetAt <= now) paymentRateBuckets.delete(bucketKey);
    }
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return fail(res, 429, "Too many payment requests. Please wait a moment and try again.");
    }
    next();
  };
}

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

function validPhone(value: unknown) {
  return /^\+?[0-9]{10,15}$/.test(String(value || "").replace(/[\s-]/g, ""));
}

function validPincode(value: unknown) {
  return /^[0-9]{6}$/.test(String(value || "").trim());
}

async function createOrderFromCapturedAttempt(client: import("pg").PoolClient, attemptRow: any, paymentId: string) {
  const sequence = await client.query<{ value: string }>("SELECT nextval('zavyro_order_number_seq')::text AS value");
  const datePart = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
  const orderNumber = `ZV-${datePart}-${sequence.rows[0].value.padStart(4, "0")}`;
  const orderResult = await client.query(
    `INSERT INTO zavyro_order_records
      (order_number, customer_user_id, customer_name, customer_email, customer_phone, source, order_status, payment_status, payment_method, subtotal, delivery_charge, discount_amount, total_amount, shipping_address, notes)
     VALUES ($1,$2,$3,$4,$5,'online','pending','paid','razorpay',$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [orderNumber, attemptRow.user_id, attemptRow.customer_name, attemptRow.customer_email, attemptRow.customer_phone, attemptRow.subtotal, attemptRow.delivery_charge, attemptRow.discount_amount, attemptRow.total_amount, attemptRow.shipping_address, `Razorpay payment: ${paymentId}`],
  );
  const savedItems = Array.isArray(attemptRow.items) ? attemptRow.items : JSON.parse(attemptRow.items || "[]");
  for (const item of savedItems) {
    await client.query(
      `INSERT INTO zavyro_order_items (order_id,product_id,title,quantity,unit_price,size,format,image_url,customization_url,customization_filename) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [orderResult.rows[0].id, item.productId, item.title, item.quantity, item.unitPrice, item.size, item.format, item.imageUrl, item.customizationUrl, item.customizationFilename],
    );
  }
  await client.query("UPDATE zavyro_payment_attempts SET status='paid', razorpay_payment_id=$2, order_id=$3, updated_at=now() WHERE id=$1", [attemptRow.id, paymentId, orderResult.rows[0].id]);
  return orderResult.rows[0];
}

async function resolveServerPrice(item: any) {
  const productId = String(item.productId || "").trim();
  const size = String(item.size || "").trim().toUpperCase();

  // Combos are priced from the admin-managed homepage configuration, never from
  // a price sent by the browser.
  if (productId.startsWith("combo:")) {
    const comboId = productId.slice("combo:".length);
    const content = await getHomepageContent();
    const combo = content.combos.find((candidate) => candidate.id === comboId && candidate.visible);
    if (!combo || !Number.isFinite(Number(combo.price)) || Number(combo.price) <= 0) {
      throw new Error("This combo is no longer available. Refresh the shop and choose it again.");
    }
    return Number(combo.price);
  }

  // Never trust a browser-supplied unit price for a missing/unknown product.
  if (!productId) throw new Error("A cart item is missing its product ID. Refresh the shop and try again.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error("A cart item is outdated or invalid. Refresh the shop and rebuild your cart before paying.");
  }
  const result = await pool.query(
    `SELECT COALESCE(ps.offer_price, ps.original_price, ps.price, p.base_price) AS price
       FROM products p
       INNER JOIN product_sizes ps ON ps.product_id = p.id AND ps.size_code = $2
      WHERE p.id = $1 AND p.is_active = true AND ps.is_available = true
      LIMIT 1`,
    [productId, size],
  );
  if (!result.rows[0]) throw new Error("A selected poster or size is no longer available. Refresh your cart.");
  return Number(result.rows[0].price || 0);
}

router.post("/create", requireAuth, paymentRateLimit(12, 5 * 60 * 1000), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return fail(res, 503, "Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend environment.");
    }

    const { items, customer, deliveryCharge = 0, discountAmount = 0 } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) return fail(res, 400, "Your cart is empty.");
    if (!customer || typeof customer !== "object") return fail(res, 400, "Customer details are required before payment.");

    const fullName = String(customer.fullName || "").trim();
    const email = String(customer.email || req.user!.email || "").trim().toLowerCase();
    const phone = String(customer.phone || "").replace(/[\s-]/g, "");
    const line1 = String(customer.line1 || "").trim();
    const city = String(customer.city || "").trim();
    const state = String(customer.state || "").trim();
    const pincode = String(customer.pincode || "").trim();

    if (!fullName || fullName.length < 2) return fail(res, 400, "Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(res, 400, "Enter a valid email address.");
    if (!validPhone(phone)) return fail(res, 400, "Enter a valid phone number.");
    if (!line1 || !city || !state) return fail(res, 400, "Complete your delivery address.");
    if (!validPincode(pincode)) return fail(res, 400, "Enter a valid 6-digit PIN code.");

    const normalized = [];
    for (const item of items) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
      if (!item.title || quantity < 1) return fail(res, 400, "One of the cart items is invalid.");
      const unitPrice = await resolveServerPrice(item);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return fail(res, 400, "A cart item has an invalid price.");
      normalized.push({
        productId: item.productId || null,
        title: String(item.title).trim(),
        quantity,
        unitPrice,
        size: item.size ? String(item.size) : null,
        format: item.format ? String(item.format) : "single",
        imageUrl: item.image || item.imageUrl || null,
        customizationUrl: item.image_path || null,
        customizationFilename: item.customFileName || null,
      });
    }

    const subtotal = normalized.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    // Delivery/discount are calculated server-side; never trust browser totals.
    const delivery = subtotal >= 500 ? 0 : 50;
    const discount = 0;
    const total = Math.max(0, subtotal + delivery - discount);
    if (total <= 0) return fail(res, 400, "Your order total must be greater than zero.");

    const attemptResult = await pool.query(
      `INSERT INTO zavyro_payment_attempts
        (user_id, customer_name, customer_email, customer_phone, shipping_address, items, subtotal, delivery_charge, discount_amount, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'created')
       RETURNING id`,
      [req.user!.id, fullName, email, phone, { fullName, phone, line1, city, state, pincode }, JSON.stringify(normalized), subtotal, delivery, discount, total],
    );
    const attemptId = attemptResult.rows[0].id as string;
    const amountPaise = Math.round(total * 100);

    const razorpayResponse = await fetch(API_URL, {
      signal: AbortSignal.timeout(RAZORPAY_TIMEOUT_MS),
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `zv_${attemptId.replace(/-/g, "").slice(0, 30)}`,
        notes: { attempt_id: attemptId, user_id: req.user!.id },
      }),
    });

    const razorpay = await razorpayResponse.json().catch(() => ({}));
    if (!razorpayResponse.ok || !razorpay?.id) {
      await pool.query("UPDATE zavyro_payment_attempts SET status='failed', failure_reason=$2, updated_at=now() WHERE id=$1", [attemptId, razorpay?.error?.description || "Razorpay order creation failed."]);
      return fail(res, 502, razorpay?.error?.description || "Could not start Razorpay payment.");
    }

    await pool.query(
      `UPDATE zavyro_payment_attempts SET razorpay_order_id=$2, status='ready', updated_at=now() WHERE id=$1`,
      [attemptId, razorpay.id],
    );

    return res.status(201).json({
      success: true,
      attemptId,
      razorpayOrderId: razorpay.id,
      keyId: RAZORPAY_KEY_ID,
      amount: amountPaise,
      currency: "INR",
      customer: { name: fullName, email, phone },
    });
  } catch (error) {
    if (error instanceof Error && /missing its product ID|outdated or invalid|no longer available|Refresh your cart|Refresh the shop/.test(error.message)) {
      return fail(res, 409, error.message);
    }
    console.error("Create Razorpay order error:", error);
    return fail(res, 500, "Could not start payment.");
  }
});

router.post("/verify", requireAuth, paymentRateLimit(30, 5 * 60 * 1000), async (req: AuthenticatedRequest, res: Response) => {
  const { attemptId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
  if (!attemptId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return fail(res, 400, "Payment verification details are incomplete.");

  try {
    const attempt = await pool.query("SELECT * FROM zavyro_payment_attempts WHERE id=$1 AND user_id=$2 LIMIT 1", [attemptId, req.user!.id]);
    if (!attempt.rows[0]) return fail(res, 404, "Payment session not found.");
    const row = attempt.rows[0];
    if (row.razorpay_order_id !== razorpay_order_id) return fail(res, 400, "Payment order does not match this checkout.");
    if (row.status === "paid" && row.order_id) {
      const existing = await pool.query("SELECT * FROM zavyro_order_records WHERE id=$1", [row.order_id]);
      return res.json({ success: true, order: existing.rows[0] });
    }

    const suppliedSignature = String(razorpay_signature).trim().toLowerCase();
    const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const suppliedBuffer = /^[a-f0-9]{64}$/.test(suppliedSignature) ? Buffer.from(suppliedSignature, "hex") : Buffer.alloc(0);
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      await pool.query("UPDATE zavyro_payment_attempts SET status='verification_failed', failure_reason='Invalid Razorpay signature', updated_at=now() WHERE id=$1", [attemptId]);
      return fail(res, 400, "Payment verification failed.");
    }

    // A valid checkout signature alone is not sufficient: confirm the payment directly
    // with Razorpay and compare its captured amount/currency/order to our stored attempt.
    const paymentResponse = await fetch(`${PAYMENT_API_URL}/${encodeURIComponent(String(razorpay_payment_id))}`, {
      method: "GET",
      signal: AbortSignal.timeout(RAZORPAY_TIMEOUT_MS),
      headers: { Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}` },
    });
    const paymentEntity = await paymentResponse.json().catch(() => ({}));
    if (!paymentResponse.ok || !paymentEntity?.id) {
      return fail(res, 502, "We couldn't confirm the payment with Razorpay yet. Please refresh your orders before trying again.");
    }
    const expectedAmountPaise = Math.round(Number(row.total_amount) * 100);
    const paymentMatches = paymentEntity.id === razorpay_payment_id
      && paymentEntity.order_id === razorpay_order_id
      && paymentEntity.currency === "INR"
      && Number(paymentEntity.amount) === expectedAmountPaise
      && paymentEntity.status === "captured"
      && paymentEntity.captured === true;
    if (!paymentMatches) {
      await pool.query(
        "UPDATE zavyro_payment_attempts SET status='verification_failed', failure_reason=$2, updated_at=now() WHERE id=$1 AND status <> 'paid'",
        [attemptId, "Razorpay payment is not captured or does not match the expected order amount/currency."],
      );
      return fail(res, 409, "Payment is not confirmed as captured yet. Your order has not been created. If money was deducted, contact support before paying again.");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT * FROM zavyro_payment_attempts WHERE id=$1 FOR UPDATE", [attemptId]);
      const attemptRow = locked.rows[0];
      if (attemptRow.status === "paid" && attemptRow.order_id) {
        const existing = await client.query("SELECT * FROM zavyro_order_records WHERE id=$1", [attemptRow.order_id]);
        await client.query("COMMIT");
        return res.json({ success: true, order: existing.rows[0] });
      }

      const createdOrder = await createOrderFromCapturedAttempt(client, { ...attemptRow, id: attemptId }, String(razorpay_payment_id));
      // Commit the verified order independently from notifications. A mail queue
      // outage must never roll back a paid order or make checkout appear unsuccessful.
      await client.query("COMMIT");
      try {
        await pool.query(
          `INSERT INTO zavyro_notification_jobs (order_id, channel, status)
           VALUES ($1, 'email-admin', 'pending'), ($1, 'email-customer', 'pending')
           ON CONFLICT (order_id, channel) DO NOTHING`,
          [createdOrder.id],
        );
      } catch (notificationError) {
        console.error("Order saved, but email notification enqueue failed; the recovery worker will retry:", notificationError);
      }
      return res.status(201).json({ success: true, order: createdOrder });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return fail(res, 500, "Could not complete the order after payment verification.");
  }
});


// Razorpay retries failed webhook deliveries. This is the recovery path for a
// captured payment when the customer's verify request could not finish creating
// the order because the API process or database was temporarily unavailable.
router.post("/webhook", async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const supplied = String(req.header("x-razorpay-signature") || "").trim().toLowerCase();
  if (!webhookSecret || !rawBody || !/^[a-f0-9]{64}$/.test(supplied)) return fail(res, 400, "Invalid webhook configuration or signature.");
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex"); const suppliedBuffer = Buffer.from(supplied, "hex");
  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) return fail(res, 400, "Invalid webhook signature.");
  if (req.body?.event !== "payment.captured") return res.json({ success: true, ignored: true });
  const payment = req.body?.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id || payment.status !== "captured" || payment.captured !== true || payment.currency !== "INR") return res.json({ success: true, ignored: true });
  try {
    const found = await pool.query("SELECT * FROM zavyro_payment_attempts WHERE razorpay_order_id=$1 LIMIT 1", [String(payment.order_id)]);
    if (!found.rows[0]) return res.json({ success: true, ignored: true });
    const attempt = found.rows[0];
    if (Math.round(Number(attempt.total_amount) * 100) !== Number(payment.amount)) return fail(res, 409, "Captured payment amount does not match the checkout attempt.");
    if (attempt.status === "paid" && attempt.order_id) return res.json({ success: true, alreadyProcessed: true });
    const client = await pool.connect(); let createdOrder: any;
    try {
      await client.query("BEGIN");
      const lockedResult = await client.query("SELECT * FROM zavyro_payment_attempts WHERE id=$1 FOR UPDATE", [attempt.id]);
      const locked = lockedResult.rows[0];
      if (!locked) { await client.query("ROLLBACK"); return res.json({ success: true, ignored: true }); }
      if (locked.status === "paid" && locked.order_id) {
        const existing = await client.query("SELECT * FROM zavyro_order_records WHERE id=$1", [locked.order_id]);
        await client.query("COMMIT"); return res.json({ success: true, alreadyProcessed: true, orderId: existing.rows[0]?.order_number });
      }
      createdOrder = await createOrderFromCapturedAttempt(client, locked, String(payment.id));
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
    try {
      await pool.query(`INSERT INTO zavyro_notification_jobs (order_id, channel, status) VALUES ($1,'email-admin','pending'),($1,'email-customer','pending') ON CONFLICT (order_id,channel) DO NOTHING`, [createdOrder.id]);
    } catch (error) { console.error("Recovered paid order saved, notification jobs will be recovered by the worker:", error); }
    return res.json({ success: true, recovered: true, orderId: createdOrder.order_number });
  } catch (error) {
    console.error("Razorpay captured-payment webhook reconciliation failed:", error);
    return fail(res, 500, "Temporary reconciliation error. Razorpay should retry this webhook.");
  }
});

export default router;
