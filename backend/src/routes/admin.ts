import { Router, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import type { PoolClient } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../db.js";
import { hashPassword } from "../utils/auth.js";
import { getHomepageContent, saveHomepageContent } from "../homepageContent.js";
import {
  requireAuth,
  requireRoles,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const adminAccess = requireRoles("owner", "admin", "staff");
const manageProductsAccess = requireRoles("owner", "admin", "staff");

/* ============================================================
   CLOUDINARY POSTER IMAGE STORAGE
   ============================================================ */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function configuredUploadLimitMb(raw: string | undefined): number {
  const parsed = Number(raw ?? 25);
  return Number.isFinite(parsed)
    ? Math.min(25, Math.max(1, Math.floor(parsed)))
    : 25;
}

const MAX_POSTER_UPLOAD_MB = configuredUploadLimitMb(
  process.env.MAX_POSTER_UPLOAD_MB,
);
const MAX_POSTER_UPLOAD_BYTES = MAX_POSTER_UPLOAD_MB * 1024 * 1024;

const posterUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_POSTER_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ]);

    if (!allowed.has(file.mimetype)) {
      callback(
        new Error("Only JPG, PNG, WEBP and AVIF images are allowed."),
      );
      return;
    }

    callback(null, true);
  },
});

async function uploadPosterToCloudinary(
  buffer: Buffer,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "zavyro-posters/posters",
        resource_type: "image",
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary did not return an image URL."));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    stream.end(buffer);
  });
}

/* Protected image upload. */
router.post(
  "/uploads",
  requireAuth,
  manageProductsAccess,
  (req, res) => {
    posterUpload.single("file")(req, res, async (error) => {
      if (error) {
        console.error("Poster image upload error:", error);

        return res.status(400).json({
          success: false,
          message:
            error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
              ? `Image must be ${MAX_POSTER_UPLOAD_MB} MB or smaller.`
              : error instanceof Error
                ? error.message
                : "Image upload failed.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select an image file.",
        });
      }

      try {
        const uploaded = await uploadPosterToCloudinary(req.file.buffer);

        return res.status(201).json({
          success: true,
          message: "Image uploaded successfully.",
          filename: uploaded.publicId,
          url: uploaded.url,
        });
      } catch (uploadError) {
        console.error("Cloudinary poster upload failed:", uploadError);

        return res.status(502).json({
          success: false,
          message: "Image storage failed. Please try again.",
        });
      }
    });
  },
);

const DEFAULT_PRICES = {
  A3: 79,
  A4: 49,
  A5: 39,
  A6: 29,
} as const;

const VALID_SIZE_CODES = [
  "A3",
  "A4",
  "A5",
  "A6",
  "A5_PANEL",
  "A4_PANEL",
] as const;

type SizeCode = (typeof VALID_SIZE_CODES)[number];

const SIZE_DIMENSIONS: Record<
  SizeCode,
  { width: number; height: number }
> = {
  A3: {
    width: 297,
    height: 420,
  },
  A4: {
    width: 210,
    height: 297,
  },
  A5: {
    width: 148,
    height: 210,
  },
  A6: {
    width: 105,
    height: 148,
  },
  A5_PANEL: {
    width: 444,
    height: 210,
  },
  A4_PANEL: {
    width: 630,
    height: 297,
  },
};

function numberOrDefault(
  value: unknown,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function integerOrDefault(
  value: unknown,
  fallback: number,
  minimum = 1,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    return fallback;
  }

  return parsed;
}

function cleanString(
  value: unknown,
  fallback = "",
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function calculateDiscount(
  originalPrice: number,
  offerPrice: number,
): number {
  if (
    originalPrice <= 0 ||
    offerPrice >= originalPrice
  ) {
    return 0;
  }

  return Math.round(
    ((originalPrice - offerPrice) / originalPrice) * 100,
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function normaliseSizeCode(value: unknown): SizeCode | null {
  const code = cleanString(value).toUpperCase();

  if (
    VALID_SIZE_CODES.includes(
      code as SizeCode,
    )
  ) {
    return code as SizeCode;
  }

  return null;
}

function getPanelPrice(
  basePrice: number,
  splitCount: number,
): number {
  return Number(
    (basePrice * splitCount).toFixed(2),
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => String(row.column_name)));
}

async function countRows(
  tableName: string,
  columns: Set<string>,
  whereClause = "",
): Promise<number> {
  if (columns.size === 0) return 0;

  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM ${tableName} ${whereClause}`,
  );

  return Number(result.rows[0]?.count ?? 0);
}

router.get(
  "/dashboard",
  requireAuth,
  adminAccess,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const [productColumns, orderColumns, userColumns] =
        await Promise.all([
          getTableColumns("products"),
          getTableColumns("orders"),
          getTableColumns("users"),
        ]);

      const productWhere = productColumns.has("is_active")
        ? "WHERE is_active = true"
        : "";

      const [products, orders, users] = await Promise.all([
        countRows("products", productColumns, productWhere),
        countRows("orders", orderColumns),
        countRows("users", userColumns),
      ]);

      let revenue = 0;

      if (orderColumns.has("total_amount")) {
        const revenueCondition = orderColumns.has("payment_status")
          ? "WHERE COALESCE(payment_status, '') = 'paid'"
          : "";

        const revenueResult = await pool.query(
          `
            SELECT COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            ${revenueCondition}
          `,
        );

        revenue = Number(revenueResult.rows[0]?.revenue ?? 0);
      }

      const orderStatuses: Record<string, number> = {};

      const statusColumn = orderColumns.has("order_status")
        ? "order_status"
        : orderColumns.has("status")
          ? "status"
          : null;

      if (statusColumn) {
        const statusResult = await pool.query(
          `
            SELECT COALESCE(${statusColumn}, 'pending') AS status,
                   COUNT(*)::int AS count
            FROM orders
            GROUP BY COALESCE(${statusColumn}, 'pending')
          `,
        );

        for (const row of statusResult.rows) {
          orderStatuses[String(row.status)] = Number(row.count ?? 0);
        }
      }

      let recentOrders: Array<Record<string, unknown>> = [];

      if (
        orderColumns.size > 0 &&
        orderColumns.has("created_at")
      ) {
        const select = [
          "id",
          orderColumns.has("order_number")
            ? "order_number"
            : "NULL AS order_number",
          orderColumns.has("customer_name")
            ? "customer_name"
            : "NULL AS customer_name",
          orderColumns.has("customer_phone")
            ? "customer_phone"
            : "NULL AS customer_phone",
          orderColumns.has("total_amount")
            ? "total_amount"
            : "0 AS total_amount",
          orderColumns.has("payment_status")
            ? "payment_status"
            : "'pending' AS payment_status",
          statusColumn
            ? `${statusColumn} AS status`
            : "'pending' AS status",
          "created_at",
          orderColumns.has("items")
            ? "items"
            : "NULL AS items",
        ].join(", ");

        const recentResult = await pool.query(`
          SELECT ${select}
          FROM orders
          ORDER BY created_at DESC
          LIMIT 5
        `);

        recentOrders = recentResult.rows.map((order) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: "",
          customer_phone: order.customer_phone,
          total_amount: order.total_amount,
          payment_status: order.payment_status,
          status: order.status,
          created_at: order.created_at,
          customizations: orderColumns.has("items")
            ? getCustomOrderData(parseOrderItems(order.items))
            : [],
        }));
      }

      return res.json({
        success: true,
        user: req.user,
        stats: {
          products,
          orders,
          users,
          customers: users,
          revenue,
        },
        orderStatuses,
        recentOrders,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load admin dashboard.",
      });
    }
  },
);

/* ============================================================
   ADMIN ORDERS
   ============================================================ */

function parseOrderItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getCustomOrderData(items: any[]) {
  return items.flatMap((item, index) => {
    const product =
      item?.product ??
      item?.productData ??
      {};

    const source = item?.customStoragePath
      ? item
      : product?.customStoragePath
        ? product
        : item?.customSourcePath
          ? item
          : product?.customSourcePath
            ? product
            : null;

    if (
      !source?.customStoragePath &&
      !source?.customSourcePath
    ) {
      return [];
    }

    return [
      {
        itemIndex: index,
        title:
          item?.title ||
          product?.title ||
          "Custom Poster",
        fileName:
          item?.customFileName ||
          product?.customFileName ||
          "custom-poster",
        url:
          source.customStoragePath ||
          source.customSourcePath,
        previewUrl:
          source.customPreviewPath ||
          item?.image ||
          product?.image ||
          null,
        size:
          item?.size ||
          product?.customSize ||
          null,
        format:
          item?.format ||
          product?.customFormat ||
          "single",
      },
    ];
  });
}

router.get(
  "/orders",
  requireAuth,
  adminAccess,
  async (_req, res) => {
    try {
      const current = await pool.query(`
        SELECT id, order_number, customer_name, customer_email, customer_phone,
               total_amount, subtotal, delivery_charge, discount_amount,
               payment_status, order_status AS status, source, payment_method,
               created_at, updated_at, shipping_address, notes
        FROM zavyro_order_records
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const currentIds = current.rows.map((row) => row.id);
      const itemResult = currentIds.length
        ? await pool.query(
            `SELECT id, order_id, product_id, title, quantity, unit_price, size,
                    format, image_url, customization_url, customization_filename,
                    metadata
             FROM zavyro_order_items
             WHERE order_id = ANY($1::uuid[])
             ORDER BY created_at ASC`,
            [currentIds],
          )
        : { rows: [] as any[] };

      const grouped = new Map<string, any[]>();
      for (const item of itemResult.rows) {
        const list = grouped.get(String(item.order_id)) || [];
        list.push(item);
        grouped.set(String(item.order_id), list);
      }

      const currentOrders = current.rows.map((order) => {
        const items = grouped.get(String(order.id)) || [];
        return {
          ...order,
          items,
          customizations: items
            .filter((item) => item.customization_url)
            .map((item, index) => ({
              itemIndex: index,
              title: item.title,
              fileName: item.customization_filename || "customization",
              url: item.customization_url,
              previewUrl: item.customization_url,
              size: item.size,
              format: item.format,
            })),
        };
      });

      // Read older orders too. The old behaviour returned only the new table
      // whenever it contained at least one row, hiding older valid orders.
      let legacyOrders: any[] = [];
      const columns = await getTableColumns("orders");
      if (columns.size > 0 && columns.has("created_at") && columns.has("id")) {
        const statusColumn = columns.has("order_status")
          ? "order_status"
          : columns.has("status") ? "status" : null;
        const select = [
          "id",
          columns.has("order_number") ? "order_number" : "NULL AS order_number",
          columns.has("customer_name") ? "customer_name" : "NULL AS customer_name",
          columns.has("customer_email") ? "customer_email" : "NULL AS customer_email",
          columns.has("customer_phone") ? "customer_phone" : "NULL AS customer_phone",
          columns.has("total_amount") ? "total_amount" : "0 AS total_amount",
          columns.has("subtotal") ? "subtotal" : "0 AS subtotal",
          columns.has("delivery_charge") ? "delivery_charge" : "0 AS delivery_charge",
          columns.has("discount_amount") ? "discount_amount" : "0 AS discount_amount",
          columns.has("payment_status") ? "payment_status" : "'pending' AS payment_status",
          statusColumn ? `${statusColumn} AS order_status` : "'pending' AS order_status",
          columns.has("source") ? "source" : "'legacy' AS source",
          columns.has("payment_method") ? "payment_method" : "NULL AS payment_method",
          "created_at",
          columns.has("updated_at") ? "updated_at" : "created_at AS updated_at",
          columns.has("shipping_address") ? "shipping_address" : "NULL AS shipping_address",
          columns.has("notes") ? "notes" : "NULL AS notes",
          columns.has("items") ? "items" : "NULL AS items",
        ].join(", ");
        const result = await pool.query(`SELECT ${select} FROM orders ORDER BY created_at DESC LIMIT 100`);
        const currentNumbers = new Set(currentOrders.map((o) => String(o.order_number || "").trim()).filter(Boolean));
        const currentIdsSet = new Set(currentOrders.map((o) => String(o.id)));
        legacyOrders = result.rows
          .filter((order) => !currentIdsSet.has(String(order.id)) && !(order.order_number && currentNumbers.has(String(order.order_number).trim())))
          .map((order) => {
            const items = columns.has("items") ? parseOrderItems(order.items) : [];
            return {
              ...order,
              id: String(order.id),
              status: order.order_status,
              source: order.source || "legacy",
              items,
              customizations: getCustomOrderData(items),
              legacy_order: true,
            };
          });
      }

      const orders = [...currentOrders, ...legacyOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);
      return res.json({ success: true, orders });
    } catch (error) {
      console.error("Admin orders error:", error);
      return res.status(500).json({ success: false, message: "Failed to load orders." });
    }
  },
);

/* ============================================================
   MANUAL / OFFLINE ORDER CREATION
   Every order gets its own backend-generated Order ID.
   ============================================================ */
router.post(
  "/orders/manual",
  requireAuth,
  adminAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      customerUserId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus = "paid",
      orderStatus = "confirmed",
      deliveryCharge = 0,
      discountAmount = 0,
      notes,
    } = req.body ?? {};

    if (!String(customerName || "").trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one order item." });
    }

    const normalizedItems = items.map((item: any) => ({
      productId: item.productId || null,
      title: String(item.title || "Poster").trim(),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      size: item.size ? String(item.size) : null,
      format: item.format ? String(item.format) : "single",
      imageUrl: item.imageUrl ? String(item.imageUrl) : null,
      customizationUrl: item.customizationUrl ? String(item.customizationUrl) : null,
      customizationFilename: item.customizationFilename ? String(item.customizationFilename) : null,
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : null,
    }));
    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const delivery = Math.max(0, Number(deliveryCharge) || 0);
    const discount = Math.max(0, Number(discountAmount) || 0);
    const total = Math.max(0, subtotal + delivery - discount);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const linkedUser = customerUserId
        ? await client.query("SELECT id FROM users WHERE id=$1 LIMIT 1", [customerUserId])
        : customerEmail
          ? await client.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [String(customerEmail).trim()])
          : { rows: [] as Array<{ id: string }> };
      const linkedCustomerUserId = linkedUser.rows[0]?.id || null;
      const sequence = await client.query<{ value: string }>("SELECT nextval('zavyro_order_number_seq')::text AS value");
      const sequenceValue = sequence.rows[0].value;
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const orderNumber = `ZV-${datePart}-${sequenceValue.padStart(4, "0")}`;

      const orderResult = await client.query(
        `INSERT INTO zavyro_order_records
          (order_number, customer_user_id, customer_name, customer_email, customer_phone,
           source, order_status, payment_status, payment_method, subtotal,
           delivery_charge, discount_amount, total_amount, shipping_address, notes)
         VALUES ($1,$2,$3,$4,$5,'offline',$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          orderNumber,
          linkedCustomerUserId,
          String(customerName).trim(),
          customerEmail ? String(customerEmail).trim().toLowerCase() : null,
          customerPhone ? String(customerPhone).trim() : null,
          String(orderStatus),
          String(paymentStatus),
          paymentMethod ? String(paymentMethod) : null,
          subtotal,
          delivery,
          discount,
          total,
          shippingAddress && typeof shippingAddress === "object" ? shippingAddress : null,
          notes ? String(notes) : null,
        ],
      );

      for (const item of normalizedItems) {
        await client.query(
          `INSERT INTO zavyro_order_items
            (order_id, product_id, title, quantity, unit_price, size, format,
             image_url, customization_url, customization_filename, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            orderResult.rows[0].id,
            item.productId,
            item.title,
            item.quantity,
            item.unitPrice,
            item.size,
            item.format,
            item.imageUrl,
            item.customizationUrl,
            item.customizationFilename,
            item.metadata,
          ],
        );
      }

      await client.query("COMMIT");
      return res.status(201).json({
        success: true,
        message: "Manual order created successfully.",
        order: orderResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("Manual order error:", error);
      return res.status(500).json({ success: false, message: "Could not create manual order." });
    } finally {
      client.release();
    }
  },
);

/* ============================================================
   ADMIN PROFILE
   ============================================================ */

router.get(
  "/profile",
  requireAuth,
  adminAccess,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    return res.json({
      success: true,
      user: req.user,
    });
  },
);

/* ============================================================
   CATEGORIES
   ============================================================ */

router.get(
  "/categories",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
      const result = await pool.query(
        `SELECT id, name, slug, is_active FROM categories ${includeInactive ? "" : "WHERE is_active = true"} ORDER BY name ASC`,
      );

      return res.json({
        success: true,
        categories: result.rows,
      });
    } catch (error) {
      console.error(
        "Load categories error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load categories.",
      });
    }
  },
);

router.post(
  "/categories",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const name = cleanString(req.body?.name);
    const slug = slugify(cleanString(req.body?.slug) || name);
    if (name.length < 2 || !slug) return res.status(400).json({ success: false, message: "Enter a category name with at least two characters." });
    try {
      const result = await pool.query(`INSERT INTO categories (name, slug, is_active) VALUES ($1,$2,true) RETURNING id,name,slug,is_active`, [name, slug]);
      return res.status(201).json({ success: true, category: result.rows[0] });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ success: false, message: "A category with that name or slug already exists." });
      console.error("Create category error:", error);
      return res.status(500).json({ success: false, message: "Could not create category." });
    }
  },
);

router.patch(
  "/categories/:id",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const id = cleanString(req.params.id);
    const name = cleanString(req.body?.name);
    const slug = slugify(cleanString(req.body?.slug) || name);
    const rawActive = req.body?.isActive ?? req.body?.is_active;
    const isActive = rawActive === undefined ? undefined : rawActive === true || rawActive === 1 || rawActive === "1" || String(rawActive).toLowerCase() === "true";
    if (!id || (name && (name.length < 2 || !slug))) return res.status(400).json({ success: false, message: "Enter a valid category name." });
    try {
      const result = await pool.query(
        `UPDATE categories SET name=COALESCE(NULLIF($1,''),name), slug=COALESCE(NULLIF($2,''),slug), is_active=COALESCE($3,is_active) WHERE id=$4 RETURNING id,name,slug,is_active`,
        [name, slug, isActive ?? null, id],
      );
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Category not found." });
      return res.json({ success: true, category: result.rows[0] });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ success: false, message: "A category with that name or slug already exists." });
      console.error("Update category error:", error);
      return res.status(500).json({ success: false, message: "Could not update category." });
    }
  },
);

/* ============================================================
   SUBCATEGORIES
   ============================================================ */

router.get(
  "/subcategories",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const categoryId = cleanString(req.query.categoryId);
      const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";

      if (!categoryId) {
        return res.json({
          success: true,
          subcategories: [],
        });
      }

      const result = await pool.query(
        `
        SELECT id, category_id, name, slug, is_active
        FROM subcategories
        WHERE category_id = $1 ${includeInactive ? "" : "AND is_active = true"}
        ORDER BY name ASC
        `,
        [categoryId],
      );

      return res.json({
        success: true,
        subcategories: result.rows,
      });
    } catch (error) {
      console.error(
        "Load subcategories error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load subcategories.",
      });
    }
  },
);

router.post(
  "/subcategories",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const categoryId = cleanString(req.body?.categoryId ?? req.body?.category_id);
    const name = cleanString(req.body?.name);
    const slug = slugify(cleanString(req.body?.slug) || name);
    if (!categoryId || name.length < 2 || !slug) return res.status(400).json({ success: false, message: "Choose a category and enter a subcategory name." });
    try {
      const parent = await pool.query("SELECT id FROM categories WHERE id=$1 AND is_active=true LIMIT 1", [categoryId]);
      if (!parent.rows.length) return res.status(400).json({ success: false, message: "Choose an active category." });
      const result = await pool.query(`INSERT INTO subcategories (category_id,name,slug,is_active) VALUES ($1,$2,$3,true) RETURNING id,category_id,name,slug,is_active`, [categoryId,name,slug]);
      return res.status(201).json({ success: true, subcategory: result.rows[0] });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ success: false, message: "A subcategory with that name or slug already exists." });
      console.error("Create subcategory error:", error);
      return res.status(500).json({ success: false, message: "Could not create subcategory." });
    }
  },
);

router.patch(
  "/subcategories/:id",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const id = cleanString(req.params.id);
    const name = cleanString(req.body?.name);
    const slug = slugify(cleanString(req.body?.slug) || name);
    const categoryId = cleanString(req.body?.categoryId ?? req.body?.category_id);
    const rawActive = req.body?.isActive ?? req.body?.is_active;
    const isActive = rawActive === undefined ? undefined : rawActive === true || rawActive === 1 || rawActive === "1" || String(rawActive).toLowerCase() === "true";
    if (!id || (name && (name.length < 2 || !slug))) return res.status(400).json({ success: false, message: "Enter a valid subcategory name." });
    try {
      if (categoryId) {
        const parent = await pool.query("SELECT id FROM categories WHERE id=$1 AND is_active=true LIMIT 1", [categoryId]);
        if (!parent.rows.length) return res.status(400).json({ success: false, message: "Choose an active category." });
      }
      const result = await pool.query(
        `UPDATE subcategories SET category_id=COALESCE(NULLIF($1,'')::uuid,category_id), name=COALESCE(NULLIF($2,''),name), slug=COALESCE(NULLIF($3,''),slug), is_active=COALESCE($4,is_active) WHERE id=$5 RETURNING id,category_id,name,slug,is_active`,
        [categoryId, name, slug, isActive ?? null, id],
      );
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Subcategory not found." });
      return res.json({ success: true, subcategory: result.rows[0] });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") return res.status(409).json({ success: false, message: "A subcategory with that name or slug already exists." });
      console.error("Update subcategory error:", error);
      return res.status(500).json({ success: false, message: "Could not update subcategory." });
    }
  },
);

/* ============================================================
   PRODUCT LIST
   ============================================================ */

router.get(
  "/products",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const search = cleanString(
        req.query.search,
      );

      const categoryId = cleanString(
        req.query.categoryId,
      );

      const status = cleanString(
        req.query.status,
      );

      const params: unknown[] = [];
      const where: string[] = [];

      if (search) {
        params.push(`%${search}%`);

        where.push(`
          (
            p.name ILIKE $${params.length}
            OR p.slug ILIKE $${params.length}
            OR COALESCE(
              p.search_keywords,
              ''
            ) ILIKE $${params.length}
            OR COALESCE(
              p.sku,
              ''
            ) ILIKE $${params.length}
          )
        `);
      }

      if (categoryId) {
        params.push(categoryId);

        where.push(
          `p.category_id = $${params.length}`,
        );
      }

      if (status === "published") {
        where.push(
          `p.is_active = true`,
        );
      }

      if (status === "draft") {
        where.push(
          `p.is_active = false`,
        );
      }

      if (status === "featured") {
        where.push(
          `p.is_featured = true`,
        );
      }

      const whereSql =
        where.length > 0
          ? `WHERE ${where.join(" AND ")}`
          : "";

      const result = await pool.query(
        `
        SELECT
          p.id,
          p.category_id,
          p.subcategory_id,
          p.name,
          p.slug,
          p.description,
          p.base_price,
          p.sku,
          p.is_active,
          p.is_featured,
          p.stock_status,
          p.search_keywords,
          p.panel_split_count,
          p.created_at,
          p.updated_at,

          c.name AS category_name,
          sc.name AS subcategory_name,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'size_code', ps.size_code,
                  'width_mm', ps.width_mm,
                  'height_mm', ps.height_mm,
                  'original_price',
                    ps.original_price,
                  'offer_price',
                    ps.offer_price,
                  'price',
                    COALESCE(
                      ps.offer_price,
                      ps.original_price,
                      ps.price
                    ),
                  'is_available',
                    ps.is_available
                )
                ORDER BY
                  CASE ps.size_code
                    WHEN 'A3' THEN 1
                    WHEN 'A4' THEN 2
                    WHEN 'A5' THEN 3
                    WHEN 'A6' THEN 4
                    WHEN 'A5_PANEL' THEN 5
                    WHEN 'A4_PANEL' THEN 6
                    ELSE 99
                  END
              )
              FROM product_sizes ps
              WHERE ps.product_id = p.id
            ),
            '[]'::json
          ) AS sizes,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', pi.id,
                  'image_url', pi.image_url,
                  'alt_text', pi.alt_text,
                  'image_type', pi.image_type,
                  'sort_order', pi.sort_order,
                  'is_primary', pi.is_primary
                )
                ORDER BY
                  pi.sort_order ASC,
                  pi.created_at ASC
              )
              FROM product_images pi
              WHERE pi.product_id = p.id
            ),
            '[]'::json
          ) AS images

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        LEFT JOIN subcategories sc
          ON sc.id = p.subcategory_id

        ${whereSql}

        ORDER BY
          p.created_at DESC
        `,
        params,
      );

      const products = result.rows.map(
        (product) => {
          const sizes =
            product.sizes ?? [];

          const images =
            product.images ?? [];

          const mainImage =
            images.find(
              (image: {
                image_type: string;
                is_primary: boolean;
              }) =>
                image.is_primary ||
                image.image_type ===
                  "product",
            ) ?? null;

          const hoverImage =
            images.find(
              (image: {
                image_type: string;
              }) =>
                image.image_type ===
                "shop_hover",
            ) ?? null;

          return {
            ...product,
            main_image:
              mainImage?.image_url ??
              null,
            hover_image:
              hoverImage?.image_url ??
              null,
            sizes,
            images,
          };
        },
      );

      return res.json({
        success: true,
        products,
      });
    } catch (error) {
      console.error(
        "Load products error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load products.",
      });
    }
  },
);

/* ============================================================
   GET SINGLE PRODUCT
   ============================================================ */

router.get(
  "/products/:id",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const productId =
        cleanString(req.params.id);

      const result = await pool.query(
        `
        SELECT
          p.*,
          c.name AS category_name,
          sc.name AS subcategory_name,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'size_code', ps.size_code,
                  'width_mm', ps.width_mm,
                  'height_mm', ps.height_mm,
                  'original_price',
                    ps.original_price,
                  'offer_price',
                    ps.offer_price,
                  'price',
                    COALESCE(
                      ps.offer_price,
                      ps.original_price,
                      ps.price
                    ),
                  'is_available',
                    ps.is_available
                )
                ORDER BY
                  CASE ps.size_code
                    WHEN 'A3' THEN 1
                    WHEN 'A4' THEN 2
                    WHEN 'A5' THEN 3
                    WHEN 'A6' THEN 4
                    WHEN 'A5_PANEL' THEN 5
                    WHEN 'A4_PANEL' THEN 6
                    ELSE 99
                  END
              )
              FROM product_sizes ps
              WHERE ps.product_id = p.id
            ),
            '[]'::json
          ) AS sizes,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', pi.id,
                  'image_url', pi.image_url,
                  'alt_text', pi.alt_text,
                  'image_type', pi.image_type,
                  'sort_order', pi.sort_order,
                  'is_primary', pi.is_primary
                )
                ORDER BY
                  pi.sort_order ASC,
                  pi.created_at ASC
              )
              FROM product_images pi
              WHERE pi.product_id = p.id
            ),
            '[]'::json
          ) AS images

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        LEFT JOIN subcategories sc
          ON sc.id = p.subcategory_id

        WHERE p.id = $1
        LIMIT 1
        `,
        [productId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      return res.json({
        success: true,
        product: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Get product error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load product.",
      });
    }
  },
);

/* ============================================================
   CREATE PRODUCT
   ============================================================ */

router.post(
  "/products",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const body = req.body ?? {};

      const name = cleanString(
        body.name,
      );

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Poster name is required.",
        });
      }

      const categoryId = cleanString(
        body.categoryId ??
          body.category_id,
      );

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category is required.",
        });
      }

      const subcategoryId =
        cleanString(
          body.subcategoryId ??
            body.subcategory_id,
        ) || null;

      const description =
        cleanString(
          body.description,
        ) || null;

      const sku =
        cleanString(body.sku) ||
        null;

      const requestedSlug =
        cleanString(body.slug);

      const slug =
        requestedSlug ||
        slugify(name);

      const searchKeywords =
        cleanString(
          body.searchKeywords ??
            body.search_keywords,
        ) || null;

      /*
       * IMPORTANT:
       * panel_split_count must never be 0 because
       * the database has a CHECK constraint requiring
       * a valid positive split count.
       */
      const panelSplitCount =
        integerOrDefault(
          body.panelSplitCount ??
            body.panel_split_count,
          2,
          2,
        );

      const isActive =
        body.isActive ??
        body.is_active ??
        true;

      const isFeatured =
        body.isFeatured ??
        body.is_featured ??
        false;

      const stockStatus =
        cleanString(
          body.stockStatus ??
            body.stock_status,
          "available",
        ) || "available";

      const sizes =
        Array.isArray(body.sizes)
          ? body.sizes
          : [];

      await client.query(
        "BEGIN",
      );

      const productResult =
        await client.query(
          `
          INSERT INTO products (
            category_id,
            subcategory_id,
            name,
            slug,
            description,
            base_price,
            sku,
            is_active,
            is_featured,
            stock_status,
            search_keywords,
            panel_split_count
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12
          )
          RETURNING *
          `,
          [
            categoryId,
            subcategoryId,
            name,
            slug,
            description,
            DEFAULT_PRICES.A6,
            sku,
            Boolean(isActive),
            Boolean(isFeatured),
            stockStatus,
            searchKeywords,
            panelSplitCount,
          ],
        );

      const product =
        productResult.rows[0];

      const suppliedSizes =
        new Map<
          SizeCode,
          {
            originalPrice: number;
            offerPrice: number;
            isAvailable: boolean;
          }
        >();

      for (const rawSize of sizes) {
        const sizeCode =
          normaliseSizeCode(
            rawSize?.sizeCode ??
              rawSize?.size_code,
          );

        if (!sizeCode) {
          continue;
        }

        const defaultPrice =
          sizeCode === "A3"
            ? DEFAULT_PRICES.A3
            : sizeCode === "A4"
              ? DEFAULT_PRICES.A4
              : sizeCode === "A5"
                ? DEFAULT_PRICES.A5
                : sizeCode === "A6"
                  ? DEFAULT_PRICES.A6
                  : sizeCode ===
                      "A5_PANEL"
                    ? getPanelPrice(
                        DEFAULT_PRICES.A5,
                        panelSplitCount,
                      )
                    : getPanelPrice(
                        DEFAULT_PRICES.A4,
                        panelSplitCount,
                      );

        const originalPrice =
          numberOrDefault(
            rawSize?.originalPrice ??
              rawSize?.original_price,
            defaultPrice,
          );

        const offerPrice =
          numberOrDefault(
            rawSize?.offerPrice ??
              rawSize?.offer_price,
            originalPrice,
          );

        if (
          offerPrice >
          originalPrice
        ) {
          throw new Error(
            `${sizeCode} offer price cannot be greater than original price.`,
          );
        }

        suppliedSizes.set(
          sizeCode,
          {
            originalPrice,
            offerPrice,
            isAvailable:
              rawSize?.isAvailable ??
              rawSize?.is_available ??
              true,
          },
        );
      }

      const baseCodes: SizeCode[] = [
        "A3",
        "A4",
        "A5",
        "A6",
      ];

      for (const sizeCode of baseCodes) {
        const provided =
          suppliedSizes.get(sizeCode);

        const defaultPrice =
          sizeCode === "A3"
            ? DEFAULT_PRICES.A3
            : sizeCode === "A4"
              ? DEFAULT_PRICES.A4
              : sizeCode === "A5"
                ? DEFAULT_PRICES.A5
                : DEFAULT_PRICES.A6;

        const originalPrice =
          provided?.originalPrice ??
          defaultPrice;

        const offerPrice =
          provided?.offerPrice ??
          originalPrice;

        const dimensions =
          SIZE_DIMENSIONS[sizeCode];

        await client.query(
          `
          INSERT INTO product_sizes (
            product_id,
            size_code,
            width_mm,
            height_mm,
            price,
            original_price,
            offer_price,
            is_available
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          `,
          [
            product.id,
            sizeCode,
            dimensions.width,
            dimensions.height,
            offerPrice,
            originalPrice,
            offerPrice,
            provided?.isAvailable ??
              true,
          ],
        );
      }

      const panelDefinitions: Array<{
        code: "A5_PANEL" | "A4_PANEL";
        baseCode: "A5" | "A4";
      }> = [
        {
          code: "A5_PANEL",
          baseCode: "A5",
        },
        {
          code: "A4_PANEL",
          baseCode: "A4",
        },
      ];

      for (const panel of panelDefinitions) {
        const base =
          suppliedSizes.get(
            panel.baseCode,
          );

        const defaultBase =
          panel.baseCode === "A5"
            ? DEFAULT_PRICES.A5
            : DEFAULT_PRICES.A4;

        const panelOriginal =
          base
            ? getPanelPrice(
                base.originalPrice,
                panelSplitCount,
              )
            : getPanelPrice(
                defaultBase,
                panelSplitCount,
              );

        const panelOffer =
          base
            ? getPanelPrice(
                base.offerPrice,
                panelSplitCount,
              )
            : panelOriginal;

        const dimensions =
          SIZE_DIMENSIONS[
            panel.code
          ];

        await client.query(
          `
          INSERT INTO product_sizes (
            product_id,
            size_code,
            width_mm,
            height_mm,
            price,
            original_price,
            offer_price,
            is_available
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          `,
          [
            product.id,
            panel.code,
            dimensions.width,
            dimensions.height,
            panelOffer,
            panelOriginal,
            panelOffer,
            true,
          ],
        );
      }

      await saveProductImages(
        client,
        product.id,
        body.images,
      );

      await client.query(
        "COMMIT",
      );

      return res.status(201).json({
        success: true,
        message: "Poster created successfully.",
        product: {
          ...product,
          discount_preview: {
            A3: calculateDiscount(
              DEFAULT_PRICES.A3,
              DEFAULT_PRICES.A3,
            ),
            A4: calculateDiscount(
              DEFAULT_PRICES.A4,
              DEFAULT_PRICES.A4,
            ),
            A5: calculateDiscount(
              DEFAULT_PRICES.A5,
              DEFAULT_PRICES.A5,
            ),
            A6: calculateDiscount(
              DEFAULT_PRICES.A6,
              DEFAULT_PRICES.A6,
            ),
          },
        },
      });
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );

      console.error(
        "Create product error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create product.";

      return res.status(400).json({
        success: false,
        message,
      });
    } finally {
      client.release();
    }
  },
);

/* ============================================================
   UPDATE PRODUCT
   ============================================================ */

router.put(
  "/products/:id",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const productId =
        cleanString(req.params.id);

      const body = req.body ?? {};

      const name = cleanString(
        body.name,
      );

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Poster name is required.",
        });
      }

      const categoryId = cleanString(
        body.categoryId ??
          body.category_id,
      );

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category is required.",
        });
      }

      const subcategoryId =
        cleanString(
          body.subcategoryId ??
            body.subcategory_id,
        ) || null;

      const description =
        cleanString(
          body.description,
        ) || null;

      const sku =
        cleanString(body.sku) ||
        null;

      const slug =
        cleanString(body.slug) ||
        slugify(name);

      const searchKeywords =
        cleanString(
          body.searchKeywords ??
            body.search_keywords,
        ) || null;

      /*
       * Preserve the existing panel split count when editing a poster if
       * the edit form does not send one. The database constraint requires
       * panel_split_count to be at least 2.
       */
      const requestedPanelSplitCount =
        body.panelSplitCount ??
        body.panel_split_count;

      const isActive =
        Boolean(
          body.isActive ??
            body.is_active ??
            true,
        );

      const isFeatured =
        Boolean(
          body.isFeatured ??
            body.is_featured ??
            false,
        );

      const stockStatus =
        cleanString(
          body.stockStatus ??
            body.stock_status,
          "available",
        ) || "available";

      const sizes =
        Array.isArray(body.sizes)
          ? body.sizes
          : [];

      await client.query(
        "BEGIN",
      );

      const existing =
        await client.query(
          `
          SELECT id, panel_split_count
          FROM products
          WHERE id = $1
          LIMIT 1
          `,
          [productId],
        );

      if (
        existing.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const existingPanelSplitCount =
        integerOrDefault(
          existing.rows[0].panel_split_count,
          2,
          2,
        );

      const panelSplitCount =
        integerOrDefault(
          requestedPanelSplitCount,
          existingPanelSplitCount,
          2,
        );

      const productResult =
        await client.query(
          `
          UPDATE products
          SET
            category_id = $1,
            subcategory_id = $2,
            name = $3,
            slug = $4,
            description = $5,
            sku = $6,
            is_active = $7,
            is_featured = $8,
            stock_status = $9,
            search_keywords = $10,
            panel_split_count = $11,
            updated_at = NOW()
          WHERE id = $12
          RETURNING *
          `,
          [
            categoryId,
            subcategoryId,
            name,
            slug,
            description,
            sku,
            isActive,
            isFeatured,
            stockStatus,
            searchKeywords,
            panelSplitCount,
            productId,
          ],
        );

      const suppliedSizes =
        new Map<
          SizeCode,
          {
            originalPrice: number;
            offerPrice: number;
            isAvailable: boolean;
          }
        >();

      for (const rawSize of sizes) {
        const sizeCode =
          normaliseSizeCode(
            rawSize?.sizeCode ??
              rawSize?.size_code,
          );

        if (!sizeCode) {
          continue;
        }

        const fallback =
          sizeCode === "A3"
            ? DEFAULT_PRICES.A3
            : sizeCode === "A4"
              ? DEFAULT_PRICES.A4
              : sizeCode === "A5"
                ? DEFAULT_PRICES.A5
                : sizeCode === "A6"
                  ? DEFAULT_PRICES.A6
                  : sizeCode ===
                      "A5_PANEL"
                    ? getPanelPrice(
                        DEFAULT_PRICES.A5,
                        panelSplitCount,
                      )
                    : getPanelPrice(
                        DEFAULT_PRICES.A4,
                        panelSplitCount,
                      );

        const originalPrice =
          numberOrDefault(
            rawSize?.originalPrice ??
              rawSize?.original_price,
            fallback,
          );

        const offerPrice =
          numberOrDefault(
            rawSize?.offerPrice ??
              rawSize?.offer_price,
            originalPrice,
          );

        if (
          offerPrice >
          originalPrice
        ) {
          throw new Error(
            `${sizeCode} offer price cannot be greater than original price.`,
          );
        }

        suppliedSizes.set(
          sizeCode,
          {
            originalPrice,
            offerPrice,
            isAvailable:
              rawSize?.isAvailable ??
              rawSize?.is_available ??
              true,
          },
        );
      }

      const baseCodes: SizeCode[] = [
        "A3",
        "A4",
        "A5",
        "A6",
      ];

      for (const sizeCode of baseCodes) {
        const supplied =
          suppliedSizes.get(sizeCode);

        if (supplied) {
          const dimensions =
            SIZE_DIMENSIONS[
              sizeCode
            ];

          await client.query(
            `
            INSERT INTO product_sizes (
              product_id,
              size_code,
              width_mm,
              height_mm,
              price,
              original_price,
              offer_price,
              is_available
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
            ON CONFLICT (
              product_id,
              size_code
            )
            DO UPDATE SET
              width_mm =
                EXCLUDED.width_mm,
              height_mm =
                EXCLUDED.height_mm,
              price =
                EXCLUDED.offer_price,
              original_price =
                EXCLUDED.original_price,
              offer_price =
                EXCLUDED.offer_price,
              is_available =
                EXCLUDED.is_available,
              updated_at =
                NOW()
            `,
            [
              productId,
              sizeCode,
              dimensions.width,
              dimensions.height,
              supplied.offerPrice,
              supplied.originalPrice,
              supplied.offerPrice,
              supplied.isAvailable,
            ],
          );
        }
      }

      /*
       * Panels always derive from the corresponding
       * base-size prices.
       */

      for (const panel of [
        {
          code: "A5_PANEL" as const,
          baseCode: "A5" as const,
        },
        {
          code: "A4_PANEL" as const,
          baseCode: "A4" as const,
        },
      ]) {
        const baseResult =
          await client.query(
            `
            SELECT
              original_price,
              offer_price,
              is_available
            FROM product_sizes
            WHERE
              product_id = $1
              AND size_code = $2
            LIMIT 1
            `,
            [
              productId,
              panel.baseCode,
            ],
          );

        if (
          baseResult.rows.length === 0
        ) {
          continue;
        }

        const base =
          baseResult.rows[0];

        const panelOriginal =
          getPanelPrice(
            Number(
              base.original_price,
            ),
            panelSplitCount,
          );

        const panelOffer =
          getPanelPrice(
            Number(
              base.offer_price,
            ),
            panelSplitCount,
          );

        const dimensions =
          SIZE_DIMENSIONS[
            panel.code
          ];

        await client.query(
          `
          INSERT INTO product_sizes (
            product_id,
            size_code,
            width_mm,
            height_mm,
            price,
            original_price,
            offer_price,
            is_available
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          ON CONFLICT (
            product_id,
            size_code
          )
          DO UPDATE SET
            width_mm =
              EXCLUDED.width_mm,
            height_mm =
              EXCLUDED.height_mm,
            price =
              EXCLUDED.offer_price,
            original_price =
              EXCLUDED.original_price,
            offer_price =
              EXCLUDED.offer_price,
            is_available =
              EXCLUDED.is_available,
            updated_at =
              NOW()
          `,
          [
            productId,
            panel.code,
            dimensions.width,
            dimensions.height,
            panelOffer,
            panelOriginal,
            panelOffer,
            base.is_available,
          ],
        );
      }

      await saveProductImages(
        client,
        productId,
        body.images,
      );

      await client.query(
        "COMMIT",
      );

      return res.json({
        success: true,
        message: "Poster updated successfully.",
        product:
          productResult.rows[0],
      });
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );

      console.error(
        "Update product error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update product.";

      return res.status(400).json({
        success: false,
        message,
      });
    } finally {
      client.release();
    }
  },
);

/* ============================================================
   PUBLISH / UNPUBLISH
   ============================================================ */

router.patch(
  "/products/:id/status",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const productId =
        cleanString(req.params.id);

      const activeValue = req.body?.isActive ?? req.body?.is_active;
      const isActive = activeValue === true || activeValue === 1 || activeValue === "1" || String(activeValue).toLowerCase() === "true";

      const result = await pool.query(
        `
        UPDATE products
        SET
          is_active = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING id, is_active
        `,
        [
          isActive,
          productId,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      return res.json({
        success: true,
        message: isActive
          ? "Poster published."
          : "Poster moved to draft.",
        product:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Product status error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update product status.",
      });
    }
  },
);

/* ============================================================
   FEATURED
   ============================================================ */

router.patch(
  "/products/:id/featured",
  requireAuth,
  manageProductsAccess,
  async (req, res) => {
    try {
      const productId =
        cleanString(req.params.id);

      const isFeatured = Boolean(
        req.body?.isFeatured ??
          req.body?.is_featured,
      );

      const result = await pool.query(
        `
        UPDATE products
        SET
          is_featured = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING id, is_featured
        `,
        [
          isFeatured,
          productId,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      return res.json({
        success: true,
        message: isFeatured
          ? "Poster marked as featured."
          : "Poster removed from featured.",
        product:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "Featured update error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update featured status.",
      });
    }
  },
);

/* ============================================================
   DELETE PRODUCT
   ============================================================ */

router.delete(
  "/products/:id",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const productId =
        cleanString(req.params.id);

      await client.query(
        "BEGIN",
      );

      const result =
        await client.query(
          `
          DELETE FROM products
          WHERE id = $1
          RETURNING id, name
          `,
          [productId],
        );

      if (
        result.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      await client.query(
        "COMMIT",
      );

      return res.json({
        success: true,
        message: "Poster deleted successfully.",
        product:
          result.rows[0],
      });
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );

      console.error(
        "Delete product error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete product.",
      });
    } finally {
      client.release();
    }
  },
);

/* ============================================================
   HOMEPAGE MANAGEMENT
   ============================================================ */

router.get(
  "/homepage",
  requireAuth,
  adminAccess,
  async (_req, res) => {
    try {
      const content = await getHomepageContent();

      return res.json({
        success: true,
        content,
      });
    } catch (error) {
      console.error(
        "Load homepage content error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load homepage content.",
      });
    }
  },
);

router.put(
  "/homepage",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const content =
        await saveHomepageContent(
          req.body?.content,
        );

      return res.json({
        success: true,
        message:
          "Homepage settings saved successfully.",
        content,
      });
    } catch (error) {
      console.error(
        "Save homepage content error:",
        error,
      );

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save homepage content.",
      });
    }
  },
);

/* ============================================================
   ORDER FULFILMENT STATUS
   ============================================================ */

router.patch(
  "/orders/:orderId/status",
  requireAuth,
  adminAccess,
  async (req, res) => {
    const orderId = cleanString(req.params.orderId);
    const status = cleanString(req.body?.status).toLowerCase();
    const allowedStatuses = new Set(["pending", "confirmed", "processing", "printing", "shipped", "delivered", "cancelled"]);
    const transitions: Record<string, Set<string>> = {
      pending: new Set(["confirmed", "cancelled"]),
      confirmed: new Set(["processing", "printing", "cancelled"]),
      processing: new Set(["printing", "shipped", "cancelled"]),
      printing: new Set(["processing", "shipped", "cancelled"]),
      shipped: new Set(["delivered"]),
      delivered: new Set(),
      cancelled: new Set(["confirmed"]),
    };
    if (!orderId || !allowedStatuses.has(status)) {
      return res.status(400).json({ success: false, message: "Choose a valid order status." });
    }
    try {
      const current = await pool.query("SELECT id, order_status FROM zavyro_order_records WHERE id=$1 LIMIT 1", [orderId]);
      if (!current.rows.length) {
        const legacyColumns = await getTableColumns("orders");
        const legacyStatusColumn = legacyColumns.has("order_status") ? "order_status" : legacyColumns.has("status") ? "status" : null;
        if (!legacyColumns.has("id") || !legacyStatusColumn) return res.status(404).json({ success: false, message: "Order not found." });
        const legacy = await pool.query(`SELECT id, ${legacyStatusColumn} AS order_status FROM orders WHERE id::text=$1 LIMIT 1`, [orderId]);
        if (!legacy.rows.length) return res.status(404).json({ success: false, message: "Order not found." });
        const legacyCurrent = String(legacy.rows[0].order_status || "pending").toLowerCase();
        if (legacyCurrent !== status && !transitions[legacyCurrent]?.has(status)) return res.status(409).json({ success: false, message: `Cannot change an order from ${legacyCurrent} to ${status}. Use the allowed status sequence or contact support if a correction is needed.` });
        const updatedAt = legacyColumns.has("updated_at") ? ", updated_at=NOW()" : "";
        const updated = await pool.query(`UPDATE orders SET ${legacyStatusColumn}=$1${updatedAt} WHERE id::text=$2 RETURNING id, ${legacyStatusColumn} AS order_status`, [status, orderId]);
        return res.json({ success: true, order: { ...updated.rows[0], payment_status: null, updated_at: new Date().toISOString() } });
      }
      const currentStatus = String(current.rows[0].order_status || "pending").toLowerCase();
      if (currentStatus !== status && !transitions[currentStatus]?.has(status)) {
        return res.status(409).json({ success: false, message: `Cannot change an order from ${currentStatus} to ${status}. Use the allowed status sequence or contact support if a correction is needed.` });
      }
      const result = await pool.query(
        `UPDATE zavyro_order_records SET order_status=$1, updated_at=NOW() WHERE id=$2 RETURNING id, order_number, order_status, payment_status, updated_at`,
        [status, orderId],
      );
      return res.json({ success: true, order: result.rows[0] });
    } catch (error) {
      console.error("Update order fulfilment status error:", error);
      return res.status(500).json({ success: false, message: "Could not update order status." });
    }
  },
);

/* ============================================================
   OWNER ACCOUNT MANAGEMENT
   ============================================================ */

router.get(
  "/users",
  requireAuth,
  requireRoles("owner"),
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at, ar.role
        FROM users u
        LEFT JOIN admin_roles ar ON ar.user_id = u.id
        ORDER BY u.created_at DESC
      `);
      return res.json({ success: true, users: result.rows.map((user) => ({ ...user, role: user.role || "customer" })) });
    } catch (error) {
      console.error("Load admin users error:", error);
      return res.status(500).json({ success: false, message: "Failed to load accounts." });
    }
  },
);

router.post(
  "/users",
  requireAuth,
  requireRoles("owner"),
  async (req: AuthenticatedRequest, res) => {
    const { fullName, email, phone, password, role } = req.body ?? {};
    const allowedRoles = new Set(["admin", "staff", "customer"]);
    if (!fullName || !email || !password || !allowedRoles.has(String(role))) return res.status(400).json({ success: false, message: "Full name, email, password and a valid role are required." });
    if (String(password).length < 8) return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
    const client = await pool.connect();
    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const exists = await client.query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1", [normalizedEmail]);
      if (exists.rows.length) return res.status(409).json({ success: false, message: "An account with this email already exists." });
      await client.query("BEGIN");
      const passwordHash = await hashPassword(String(password));
      const userResult = await client.query(`INSERT INTO users (full_name,email,phone,password_hash,email_verified,status) VALUES ($1,$2,$3,$4,true,'active') RETURNING id,full_name,email,phone,status,created_at`, [String(fullName).trim(), normalizedEmail, phone ? String(phone).trim() : null, passwordHash]);
      const user = userResult.rows[0];
      if (role !== "customer") await client.query("INSERT INTO admin_roles (user_id, role) VALUES ($1,$2)", [user.id, role]);
      await client.query("COMMIT");
      return res.status(201).json({ success: true, message: "Account created successfully.", user: { ...user, role } });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("Create account error:", error);
      return res.status(500).json({ success: false, message: "Could not create account." });
    } finally { client.release(); }
  },
);

router.patch(
  "/users/:userId",
  requireAuth,
  requireRoles("owner"),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.userId;
    if (userId === req.user?.id) return res.status(400).json({ success: false, message: "The owner account cannot be changed here." });
    const role = req.body?.role;
    const status = req.body?.status;
    const allowedRoles = new Set(["admin", "staff", "customer"]);
    const allowedStatuses = new Set(["active", "suspended"]);
    if (role !== undefined && !allowedRoles.has(String(role))) return res.status(400).json({ success: false, message: "Invalid role." });
    if (status !== undefined && !allowedStatuses.has(String(status))) return res.status(400).json({ success: false, message: "Invalid status." });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (status !== undefined) await client.query("UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2", [status, userId]);
      if (role !== undefined) {
        if (role === "customer") await client.query("DELETE FROM admin_roles WHERE user_id=$1", [userId]);
        else await client.query("INSERT INTO admin_roles (user_id,role) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role", [userId, role]);
      }
      const result = await client.query(`SELECT u.id,u.full_name,u.email,u.phone,u.status,u.created_at,ar.role FROM users u LEFT JOIN admin_roles ar ON ar.user_id=u.id WHERE u.id=$1`, [userId]);
      await client.query("COMMIT");
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Account not found." });
      return res.json({ success: true, user: { ...result.rows[0], role: result.rows[0].role || "customer" } });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("Update account error:", error);
      return res.status(500).json({ success: false, message: "Could not update account." });
    } finally { client.release(); }
  },
);


// Persistent, admin-managed mockup template registry. Frame coordinates are
// normalized to the full background image (0..1), independent of preview size.
router.get("/mockup-templates", requireAuth, manageProductsAccess, async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, name AS label, note, image_url AS src, frame, true AS custom FROM zavyro_mockup_templates ORDER BY created_at DESC`);
    return res.json({ success: true, templates: result.rows });
  } catch (error) {
    console.error("Load mockup templates error:", error);
    return res.status(500).json({ success: false, message: "Could not load mockup templates." });
  }
});

router.post("/mockup-templates", requireAuth, manageProductsAccess, async (req: AuthenticatedRequest, res) => {
  const name = String(req.body?.name ?? "").trim();
  const imageUrl = String(req.body?.imageUrl ?? "").trim();
  const note = String(req.body?.note ?? "").trim().slice(0, 255) || null;
  const frame = req.body?.frame;
  if (!name || name.length > 100 || !imageUrl || imageUrl.length > 2000) return res.status(400).json({ success: false, message: "A template name and uploaded image URL are required." });
  if (!frame || ![frame.x, frame.y, frame.w, frame.h].every((v) => Number.isFinite(Number(v))) || Number(frame.x) < 0 || Number(frame.y) < 0 || Number(frame.w) <= 0 || Number(frame.h) <= 0 || Number(frame.x) + Number(frame.w) > 1.001 || Number(frame.y) + Number(frame.h) > 1.001) return res.status(400).json({ success: false, message: "Select a valid poster frame area before saving." });
  let parsedUrl: URL;
  try { parsedUrl = new URL(imageUrl, `${req.protocol}://${req.get("host")}`); } catch { return res.status(400).json({ success: false, message: "Invalid uploaded image URL." }); }
  const isCloudinaryUrl =
  parsedUrl.protocol === "https:" &&
  (
    parsedUrl.hostname === "res.cloudinary.com" ||
    parsedUrl.hostname.endsWith(".res.cloudinary.com")
  );

const isLegacyLocalUpload =
  parsedUrl.origin === `${req.protocol}://${req.get("host")}` &&
  parsedUrl.pathname.startsWith("/api/admin/uploads/");

if (!isCloudinaryUrl && !isLegacyLocalUpload) {
  return res.status(400).json({
    success: false,
    message: "Template images must use Cloudinary or an existing local upload.",
  });
}
  try {
    const result = await pool.query(`INSERT INTO zavyro_mockup_templates (name,note,image_url,frame,created_by) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id,name AS label,note,image_url AS src,frame,true AS custom`, [name,note,imageUrl,JSON.stringify({x:Number(frame.x),y:Number(frame.y),w:Number(frame.w),h:Number(frame.h)}),req.user?.id ?? null]);
    return res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error("Save mockup template error:", error);
    return res.status(500).json({ success: false, message: "Could not save mockup template." });
  }
});

router.delete("/mockup-templates/:templateId", requireAuth, manageProductsAccess, async (req, res) => {
  const templateId = Array.isArray(req.params.templateId)
    ? req.params.templateId[0]
    : req.params.templateId;
  if (!templateId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(templateId)) return res.status(400).json({ success: false, message: "Invalid template ID." });
  try {
    const result = await pool.query(`DELETE FROM zavyro_mockup_templates WHERE id = $1 RETURNING id`, [templateId]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Template not found." });
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete mockup template error:", error);
    return res.status(500).json({ success: false, message: "Could not remove mockup template." });
  }
});

export default router;
