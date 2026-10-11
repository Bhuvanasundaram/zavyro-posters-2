import { Router, type Response } from "express";
import { pool } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await pool.query(
      `SELECT id, order_number, customer_name, customer_email, customer_phone,
              source, order_status, payment_status, payment_method,
              subtotal, delivery_charge, discount_amount, total_amount,
              shipping_address, notes, created_at, updated_at
       FROM zavyro_order_records
       WHERE customer_user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user!.id],
    );

    const items = await pool.query(
      `SELECT id, order_id, product_id, title, quantity, unit_price, size, format,
              image_url, customization_url, customization_filename, metadata
       FROM zavyro_order_items
       WHERE order_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [orders.rows.map((row) => row.id)],
    );

    const grouped = new Map<string, any[]>();
    for (const item of items.rows) {
      const list = grouped.get(item.order_id) || [];
      list.push(item);
      grouped.set(item.order_id, list);
    }

    return res.json({
      success: true,
      orders: orders.rows.map((order) => ({
        ...order,
        items: grouped.get(order.id) || [],
      })),
    });
  } catch (error) {
    console.error("Account orders error:", error);
    return res.status(500).json({ success: false, message: "Failed to load order history." });
  }
});


export default router;
