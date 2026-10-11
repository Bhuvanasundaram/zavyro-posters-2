import { Router, type Response } from "express";
import { pool } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

async function getOrder(orderNumber: string, phone: string) {
  const result = await pool.query(
    `SELECT * FROM zavyro_order_records WHERE order_number=$1 AND regexp_replace(customer_phone,'[^0-9]','','g')=regexp_replace($2,'[^0-9]','','g') LIMIT 1`,
    [orderNumber.trim(), phone.trim()],
  );
  if (!result.rows[0]) return null;
  const items = await pool.query(`SELECT * FROM zavyro_order_items WHERE order_id=$1 ORDER BY created_at ASC`, [result.rows[0].id]);
  return { ...result.rows[0], items: items.rows };
}

router.post("/track", async (req, res) => {
  try {
    const orderNumber = String(req.body?.orderId || "").trim();
    const phone = String(req.body?.phone || "").trim();
    if (!orderNumber || !phone) return res.status(400).json({ success: false, message: "Order ID and phone number are required." });
    const order = await getOrder(orderNumber, phone);
    if (!order) return res.status(404).json({ success: false, message: "We couldn't find an order with those details." });
    return res.json({ success: true, order });
  } catch (error) {
    console.error("Track order error:", error);
    return res.status(500).json({ success: false, message: "Could not track the order." });
  }
});

router.get("/:orderId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM zavyro_order_records WHERE order_number=$1 AND customer_user_id=$2 LIMIT 1`, [req.params.orderId, req.user!.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Order not found." });
    const items = await pool.query(`SELECT * FROM zavyro_order_items WHERE order_id=$1 ORDER BY created_at ASC`, [result.rows[0].id]);
    return res.json({ success: true, order: { ...result.rows[0], items: items.rows } });
  } catch (error) {
    console.error("Order details error:", error);
    return res.status(500).json({ success: false, message: "Could not load order details." });
  }
});

export default router;
