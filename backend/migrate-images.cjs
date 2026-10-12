const fs = require("node:fs");
const path = require("node:path");

const uploadsDir = path.join(__dirname, "uploads");
const outputFile = path.join(__dirname, "image-migration-inventory.json");

if (!fs.existsSync(uploadsDir)) {
  console.error("ERROR: uploads directory not found:", uploadsDir);
  process.exit(1);
}

const files = fs.readdirSync(uploadsDir, { recursive: true })
  .filter(file => /\.(jpe?g|png|webp|avif)$/i.test(String(file)))
  .map(file => {
    const fullPath = path.join(uploadsDir, String(file));
    const stat = fs.statSync(fullPath);
    return {
      filename: path.basename(String(file)),
      relativePath: String(file),
      fullPath,
      sizeBytes: stat.size
    };
  });

fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));

console.log(`Inventory created: ${files.length} image files`);
console.log(`Saved to: ${outputFile}`);
console.log("No database or Cloudinary changes were made.");