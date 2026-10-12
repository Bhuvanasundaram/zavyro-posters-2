require("dotenv").config({ path: ".env.neon" });

const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const { v2: cloudinary } = require("cloudinary");

const uploadsDir = path.join(__dirname, "uploads");
const inventoryPath = path.join(__dirname, "image-migration-inventory.json");

const required = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env.neon`);
    process.exit(1);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function uploadFile(filePath, filename) {
  return cloudinary.uploader.upload(filePath, {
    folder: "zavyro-posters/migrated",
    public_id: path.parse(filename).name,
    resource_type: "image",
    overwrite: false,
  });
}

async function main() {
  if (!fs.existsSync(uploadsDir) || !fs.existsSync(inventoryPath)) {
    throw new Error("Uploads directory or migration inventory is missing.");
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const client = await pool.connect();

  try {
    const dbInfo = await client.query(
      "SELECT current_database() AS database, current_user AS username"
    );

    console.log("Connected database:", dbInfo.rows[0].database);
    console.log("Database user:", dbInfo.rows[0].username);

    if (dbInfo.rows[0].database !== "neondb") {
      throw new Error("Safety stop: connected database is not neondb.");
    }

    const legacy = await client.query(`
      SELECT id, image_url
      FROM product_images
      WHERE image_url LIKE '%/api/admin/uploads/%'
    `);

    const templates = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('image_url', 'thumbnail_url')
        AND table_name ILIKE '%template%'
    `);

    console.log("Legacy product image records:", legacy.rowCount);
    console.log("Template image columns found:", templates.rows);

    const byFilename = new Map(
      inventory.map((file) => [file.filename.toLowerCase(), file])
    );

    const urls = new Map();
    let uploaded = 0;
    let failed = 0;

    for (const row of legacy.rows) {
      const filename = path.basename(new URL(row.image_url).pathname);
      const file = byFilename.get(filename.toLowerCase());

      if (!file) {
        console.error("No local file found for database image:", filename);
        failed++;
        continue;
      }

      if (!urls.has(filename.toLowerCase())) {
        try {
          const result = await uploadFile(file.fullPath, filename);
          urls.set(filename.toLowerCase(), result.secure_url);
          uploaded++;
          console.log(`Uploaded ${uploaded}: ${filename}`);
        } catch (error) {
          // If the file was previously uploaded, try to reuse its existing asset.
          if (error.http_code === 409) {
            const result = await cloudinary.api.resource(
              `zavyro-posters/migrated/${path.parse(filename).name}`,
              { resource_type: "image" }
            );
            urls.set(filename.toLowerCase(), result.secure_url);
          } else {
            console.error("Upload failed:", filename, error.message);
            failed++;
          }
        }
      }
    }

    console.log("\nUpload summary:", { uploaded, failed });
    console.log(
      "Template columns require separate schema inspection before modifying template records."
    );

    if (failed > 0) {
      throw new Error("Some images failed; database URLs were not modified.");
    }

    await client.query("BEGIN");

    try {
      let updated = 0;

      for (const row of legacy.rows) {
        const filename = path.basename(new URL(row.image_url).pathname);
        const url = urls.get(filename.toLowerCase());

        if (!url) continue;

        await client.query(
          "UPDATE product_images SET image_url = $1 WHERE id = $2",
          [url, row.id]
        );
        updated++;
      }

      await client.query("COMMIT");
      console.log(`Updated ${updated} product image records in Neon.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Migration stopped:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());