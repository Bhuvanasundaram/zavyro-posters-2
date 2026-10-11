import nodemailer from "nodemailer";
import { pool } from "../db.js";

type OrderItem = {
  title?: string;
  quantity?: number | string;
  unit_price?: number | string;
  size?: string | null;
  format?: string | null;
  customization_url?: string | null;
  customization_filename?: string | null;
};
type OrderRow = {
  id: string; order_number: string; customer_name: string; customer_email: string | null;
  customer_phone: string | null; shipping_address: unknown; subtotal: number | string;
  delivery_charge: number | string; discount_amount: number | string; total_amount: number | string;
  payment_status: string; payment_method: string | null; order_status: string;
  created_at: Date | string; notes: string | null;
};
type Channel = "email" | "email-admin" | "email-customer";
const POLL_INTERVAL_MS = 15_000;
const MAX_ATTEMPTS = 8;
let workerStarted = false;
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  const user = process.env.SMTP_USER?.trim(); const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true", auth: { user, pass } });
  }
  return transporter;
}
function adminRecipients(): string[] {
  return [...new Set((process.env.EMAIL_ADMIN_RECIPIENTS || "").split(/[;,]/).map(s => s.trim()).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)))];
}
function validEmail(value: unknown): value is string { return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function escapeHtml(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch); }
function money(value: unknown): string { const amount = Number(value || 0); return `₹${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`; }
function addressText(value: unknown): string {
  if (!value) return "Not provided";
  let obj: Record<string, unknown> = {};
  if (typeof value === "string") { try { obj = JSON.parse(value) as Record<string, unknown>; } catch { return value; } }
  else if (typeof value === "object") obj = value as Record<string, unknown>;
  return [obj.fullName, obj.line1, obj.line2, obj.address, obj.city, obj.district, obj.state, obj.pincode, obj.postalCode, obj.phone].filter(Boolean).map(String).join(", ") || "Not provided";
}
function itemSummary(item: OrderItem): string {
  const options = [item.size, item.format].filter(Boolean).join(" / ");
  const customization = item.customization_filename || item.customization_url;
  return `- ${item.title || "Poster"}${options ? ` (${options})` : ""} × ${Number(item.quantity || 1)} — ${money(Number(item.unit_price || 0) * Number(item.quantity || 1))}${customization ? ` | Customization: ${customization}` : ""}`;
}
async function loadOrder(orderId: string) {
  const orderResult = await pool.query<OrderRow>("SELECT * FROM zavyro_order_records WHERE id=$1 LIMIT 1", [orderId]);
  const order = orderResult.rows[0]; if (!order) throw new Error(`Order ${orderId} was not found.`);
  const itemResult = await pool.query<OrderItem>("SELECT title, quantity, unit_price, size, format, customization_url, customization_filename FROM zavyro_order_items WHERE order_id=$1 ORDER BY created_at ASC", [orderId]);
  return { order, items: itemResult.rows };
}
async function sendOrderEmail(orderId: string, channel: Channel): Promise<void> {
  const mailer = getTransporter();
  if (!mailer) throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS in backend .env.");
  const { order, items } = await loadOrder(orderId);
  const date = new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const adminUrl = process.env.ADMIN_ORDER_URL?.trim();
  const itemText = items.map(itemSummary).join("\n") || "- No items found";
  const itemHtml = items.map(item => `<li><strong>${escapeHtml(item.title || "Poster")}</strong>${[item.size, item.format].filter(Boolean).length ? ` (${escapeHtml([item.size, item.format].filter(Boolean).join(" / "))})` : ""} × ${Number(item.quantity || 1)} — ${money(Number(item.unit_price || 0) * Number(item.quantity || 1))}${item.customization_filename || item.customization_url ? `<br>Customization: ${escapeHtml(item.customization_filename || item.customization_url)}` : ""}</li>`).join("");
  const commonText = [`Order ID: ${order.order_number}`, `Date: ${date}`, `Customer: ${order.customer_name}`, `Email: ${order.customer_email || "Not provided"}`, `Phone: ${order.customer_phone || "Not provided"}`, `Delivery address: ${addressText(order.shipping_address)}`, "Items:", itemText, `Subtotal: ${money(order.subtotal)}`, `Delivery: ${money(order.delivery_charge)}`, `Discount: ${money(order.discount_amount)}`, `Total: ${money(order.total_amount)}`, `Payment: ${order.payment_method || "Razorpay"} (${order.payment_status})`, `Order status: ${order.order_status}`];
  const isCustomer = channel === "email-customer";
  if (isCustomer) {
    if (!validEmail(order.customer_email)) return; // No customer email is available; do not retry forever.
    const subject = `Order confirmed: ${order.order_number} — Zavyro Posters`;
    const text = [`Thank you for ordering from Zavyro Posters. Your payment was verified and your order was saved.`, ...commonText, "You can view your order from the Orders section of your Zavyro account or use Track Order on our website."].join("\n\n");
    const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#222"><h2>Thank you for your order!</h2><p>Your payment was verified and your Zavyro order has been saved.</p><h3>${escapeHtml(order.order_number)}</h3><p><b>Date:</b> ${escapeHtml(date)}<br><b>Name:</b> ${escapeHtml(order.customer_name)}<br><b>Phone:</b> ${escapeHtml(order.customer_phone || "Not provided")}<br><b>Delivery address:</b> ${escapeHtml(addressText(order.shipping_address))}</p><h3>Items</h3><ul>${itemHtml || "<li>No items found</li>"}</ul><hr><p><b>Subtotal:</b> ${money(order.subtotal)}<br><b>Delivery:</b> ${money(order.delivery_charge)}<br><b>Discount:</b> ${money(order.discount_amount)}<br><b>Total:</b> ${money(order.total_amount)}<br><b>Payment:</b> ${escapeHtml(order.payment_method || "Razorpay")} (${escapeHtml(order.payment_status)})<br><b>Order status:</b> ${escapeHtml(order.order_status)}</p><p>Track your order from your Zavyro account or the Track Order page.</p></div>`;
    await mailer.sendMail({ from: process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER, to: order.customer_email, subject, text, html });
    return;
  }
  const recipients = adminRecipients();
  if (!recipients.length) throw new Error("No valid recipients configured in EMAIL_ADMIN_RECIPIENTS.");
  const subject = `New paid order ${order.order_number} — Zavyro Posters`;
  const text = ["A new Razorpay order has been verified and saved.", ...commonText, adminUrl ? `Admin orders link: ${adminUrl}` : "Open the Zavyro admin dashboard to manage this order."].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#222"><h2>New paid order received</h2><p>Razorpay payment has been verified and the order saved.</p><h3>${escapeHtml(order.order_number)}</h3><p><b>Date:</b> ${escapeHtml(date)}<br><b>Customer:</b> ${escapeHtml(order.customer_name)}<br><b>Email:</b> ${escapeHtml(order.customer_email || "Not provided")}<br><b>Phone:</b> ${escapeHtml(order.customer_phone || "Not provided")}<br><b>Delivery address:</b> ${escapeHtml(addressText(order.shipping_address))}</p><h3>Items</h3><ul>${itemHtml || "<li>No items found</li>"}</ul><hr><p><b>Subtotal:</b> ${money(order.subtotal)}<br><b>Delivery:</b> ${money(order.delivery_charge)}<br><b>Discount:</b> ${money(order.discount_amount)}<br><b>Total:</b> ${money(order.total_amount)}<br><b>Payment:</b> ${escapeHtml(order.payment_method || "Razorpay")} (${escapeHtml(order.payment_status)})<br><b>Order status:</b> ${escapeHtml(order.order_status)}</p>${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}">Open order in admin</a></p>` : "<p>Open the Zavyro admin dashboard to manage this order.</p>"}</div>`;
  await mailer.sendMail({
    from: process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER,
    to: recipients.join(", "),
    // Legacy combined jobs created before this update sent one admin email with
    // the customer BCC'd. Keep that behavior for those already queued jobs.
    bcc: channel === "email" && validEmail(order.customer_email) ? order.customer_email : undefined,
    subject, text, html,
  });
}

async function enqueueMissingPaidOrderEmails(): Promise<void> {
  await pool.query(`
    INSERT INTO zavyro_notification_jobs (order_id, channel, status)
    SELECT o.id, wanted.channel, 'pending'
    FROM zavyro_order_records o
    CROSS JOIN (VALUES ('email-admin'), ('email-customer')) AS wanted(channel)
    WHERE o.payment_status='paid' AND o.payment_method='razorpay'
      AND o.created_at >= now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM zavyro_notification_jobs legacy WHERE legacy.order_id=o.id AND legacy.channel='email' AND legacy.status IN ('pending','sending','sent'))
      AND (wanted.channel <> 'email-customer' OR (o.customer_email IS NOT NULL AND o.customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
      AND NOT EXISTS (SELECT 1 FROM zavyro_notification_jobs j WHERE j.order_id=o.id AND j.channel=wanted.channel)
    ON CONFLICT (order_id, channel) DO NOTHING
  `);
}
async function processOneJob(): Promise<boolean> {
  const client = await pool.connect(); let jobId: string | null = null; let orderId: string | null = null; let channel: Channel = "email-admin"; let attemptCount = 0;
  try {
    await client.query("BEGIN");
    const selected = await client.query(
      `SELECT id, order_id, channel, attempt_count FROM zavyro_notification_jobs
       WHERE channel IN ('email','email-admin','email-customer')
         AND ((status='pending' AND next_attempt_at <= now()) OR (status='sending' AND updated_at < now() - interval '5 minutes'))
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
    );
    if (!selected.rows[0]) { await client.query("COMMIT"); return false; }
    jobId = String(selected.rows[0].id); orderId = String(selected.rows[0].order_id);
    const rawChannel = String(selected.rows[0].channel);
    channel = rawChannel === "email-customer" ? "email-customer" : rawChannel === "email" ? "email" : "email-admin";
    attemptCount = Number(selected.rows[0].attempt_count || 0) + 1;
    await client.query("UPDATE zavyro_notification_jobs SET status='sending', attempt_count=$2, updated_at=now() WHERE id=$1", [jobId, attemptCount]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
  if (!jobId || !orderId) return false;
  try {
    await sendOrderEmail(orderId, channel);
    await pool.query("UPDATE zavyro_notification_jobs SET status='sent', sent_at=now(), last_error=NULL, updated_at=now() WHERE id=$1", [jobId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); const exhausted = attemptCount >= MAX_ATTEMPTS; const delayMinutes = Math.min(360, 2 ** Math.min(attemptCount, 8));
    await pool.query(`UPDATE zavyro_notification_jobs SET status=$2, last_error=$3, next_attempt_at=now() + ($4 * interval '1 minute'), updated_at=now() WHERE id=$1`, [jobId, exhausted ? "failed" : "pending", message.slice(0, 2000), delayMinutes]);
    console.error(`Order notification failed for job ${jobId} (attempt ${attemptCount}):`, message);
  }
  return true;
}
async function whatsappRecipients(): Promise<string[]> {
  return [...new Set((process.env.WHATSAPP_ADMIN_RECIPIENTS || "").split(/[;,]/).map(value => value.replace(/\D/g, "")).filter(value => value.length >= 8 && value.length <= 15))];
}
async function enqueueMissingWhatsAppDeliveries(): Promise<void> {
  if (!process.env.WHATSAPP_ACCESS_TOKEN?.trim() || !process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || !process.env.WHATSAPP_TEMPLATE_NAME?.trim()) return;
  const recipients = await whatsappRecipients(); if (!recipients.length) return;
  await pool.query(`
    INSERT INTO zavyro_notification_deliveries (order_id, channel, recipient, status)
    SELECT o.id, 'whatsapp', recipient, 'pending'
    FROM zavyro_order_records o CROSS JOIN unnest($1::text[]) AS recipient
    WHERE o.payment_status='paid' AND o.payment_method='razorpay'
      AND o.created_at >= now() - interval '24 hours'
    ON CONFLICT (order_id, channel, recipient) DO NOTHING
  `, [recipients]);
}
async function processOneWhatsAppDelivery(): Promise<boolean> {
  if (!process.env.WHATSAPP_ACCESS_TOKEN?.trim() || !process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || !process.env.WHATSAPP_TEMPLATE_NAME?.trim()) return false;
  const client = await pool.connect(); let deliveryId = ""; let orderId = ""; let recipient = ""; let attempts = 0;
  try {
    await client.query("BEGIN");
    const selected = await client.query(`SELECT id, order_id, recipient, attempt_count FROM zavyro_notification_deliveries WHERE channel='whatsapp' AND ((status='pending' AND next_attempt_at<=now()) OR (status='sending' AND updated_at<now()-interval '5 minutes')) ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`);
    if (!selected.rows[0]) { await client.query("COMMIT"); return false; }
    deliveryId = String(selected.rows[0].id); orderId = String(selected.rows[0].order_id); recipient = String(selected.rows[0].recipient); attempts = Number(selected.rows[0].attempt_count || 0) + 1;
    await client.query("UPDATE zavyro_notification_deliveries SET status='sending', attempt_count=$2, updated_at=now() WHERE id=$1", [deliveryId, attempts]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
  try {
    const orderResult = await pool.query("SELECT order_number, customer_name, total_amount, order_status FROM zavyro_order_records WHERE id=$1 LIMIT 1", [orderId]);
    const order = orderResult.rows[0]; if (!order) throw new Error("Order not found for WhatsApp delivery.");
    const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";
    if (!/^v[0-9]+\.[0-9]+$/.test(version)) throw new Error("WHATSAPP_GRAPH_API_VERSION must look like vXX.0.");
    const adminUrl = process.env.ADMIN_ORDER_URL?.trim();
    const body = {
      messaging_product: "whatsapp", to: recipient, type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME.trim(),
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en_US" },
        components: [{ type: "body", parameters: [
          { type: "text", text: String(order.order_number) },
          { type: "text", text: String(order.customer_name || "Customer").slice(0, 120) },
          { type: "text", text: money(order.total_amount) },
          { type: "text", text: String(order.order_status || "pending") },
          { type: "text", text: (adminUrl ? `${adminUrl}` : "Open the Zavyro admin dashboard").slice(0, 500) },
        ] }],
      },
    };
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID.trim())}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN.trim()}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12_000),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`WhatsApp API returned ${response.status}: ${JSON.stringify(responseBody).slice(0, 1500)}`);
    await pool.query("UPDATE zavyro_notification_deliveries SET status='sent', sent_at=now(), last_error=NULL, updated_at=now() WHERE id=$1", [deliveryId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); const exhausted = attempts >= MAX_ATTEMPTS; const delayMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
    await pool.query(`UPDATE zavyro_notification_deliveries SET status=$2, last_error=$3, next_attempt_at=now()+($4 * interval '1 minute'), updated_at=now() WHERE id=$1`, [deliveryId, exhausted ? "failed" : "pending", message.slice(0, 2000), delayMinutes]);
    console.error(`WhatsApp notification failed for delivery ${deliveryId} (attempt ${attempts}):`, message);
  }
  return true;
}

export function startEmailNotificationWorker(): void {
  if (workerStarted) return; workerStarted = true;
  const tick = async () => {
    try {
      await enqueueMissingPaidOrderEmails();
      await enqueueMissingWhatsAppDeliveries();
      for (let i = 0; i < 5; i += 1) { if (!(await processOneJob())) break; }
      for (let i = 0; i < 5; i += 1) { if (!(await processOneWhatsAppDelivery())) break; }
    } catch (error) { console.error("Order notification worker error:", error); }
  };
  void tick(); const timer = setInterval(() => { void tick(); }, POLL_INTERVAL_MS); timer.unref?.();
}
