// ============================================================
// ZAVYRO POSTERS 2.0
// PUBLIC SHOP API
//
// Customer-facing product catalog.
// Reads from PostgreSQL.
// Does NOT require admin authentication.
// ============================================================

import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const router = Router();
const customUploadMbParsed = Number(process.env.MAX_CUSTOM_UPLOAD_MB ?? 25);
const MAX_CUSTOM_UPLOAD_MB = Number.isFinite(customUploadMbParsed)
  ? Math.min(25, Math.max(1, Math.floor(customUploadMbParsed)))
  : 25;

const customUploadDirectory = fileURLToPath(
  new URL("../../uploads/custom/", import.meta.url),
);

fs.mkdirSync(customUploadDirectory, { recursive: true });

const customUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, customUploadDirectory);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
      callback(null, `custom-${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  }),
  // Keep high-resolution customization uploads useful without allowing an
  // unbounded request to exhaust disk/memory resources.
  limits: { files: 1, fileSize: MAX_CUSTOM_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ]);
    callback(null, allowed.has(file.mimetype));
  },
});

router.post("/custom-uploads", (req, res) => {
  customUpload.single("file")(req, res, (error) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? `Customization image must be ${MAX_CUSTOM_UPLOAD_MB} MB or smaller.`
        : error instanceof Error ? error.message : "Custom image upload failed.";
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file.",
      });
    }

    return res.status(201).json({
      success: true,
      url: `/api/shop/custom-uploads/${encodeURIComponent(req.file.filename)}`,
      filename: req.file.filename,
    });
  });
});

router.get("/custom-uploads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || filename !== req.params.filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ success: false, message: "Invalid custom image filename." });
  }

  const filePath = path.join(customUploadDirectory, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Custom image not found." });
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.sendFile(filePath);
});

/* ============================================================
   GET PUBLIC PRODUCTS
   ============================================================ */

router.get("/products", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
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
                'original_price', ps.original_price,
                'offer_price', ps.offer_price,
                'price',
                  COALESCE(
                    ps.offer_price,
                    ps.original_price,
                    ps.price
                  ),
                'is_available', ps.is_available
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

      WHERE p.is_active = true
        AND COALESCE(c.is_active, true) = true
        AND (p.subcategory_id IS NULL OR COALESCE(sc.is_active, true) = true)

      ORDER BY
        p.is_featured DESC,
        p.created_at DESC
    `);

    const products = result.rows.map((product) => {
      const images = Array.isArray(product.images)
        ? product.images
        : [];

      const sizes = Array.isArray(product.sizes)
        ? product.sizes
        : [];

      const mainImage =
        images.find(
          (image: {
            image_type?: string;
            is_primary?: boolean;
          }) =>
            image.is_primary === true ||
            image.image_type === "product",
        ) ?? null;

      const hoverImage =
        images.find(
          (image: { image_type?: string }) => image.image_type === "shop_hover",
        ) ?? null;

      const shopMockup = images.find(
        (image: { image_type?: string }) => image.image_type === "shop_mockup",
      ) ?? null;

      return {
        ...product,

        main_image:
          mainImage?.image_url ?? null,

        // Keep the uploaded print artwork as the primary image. The Mockup Studio
        // result is the hover image so the room preview appears on hover instead
        // of being confused with the original artwork.
        hover_image:
          shopMockup?.image_url ?? hoverImage?.image_url ?? null,

        shop_image: mainImage?.image_url ?? null,

        images,

        sizes,
      };
    });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error(
      "Public shop products error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load shop products.",
    });
  }
});

export default router;