import { pool } from "./db.js";

const tables = [
  "payments",
  "product_sizes",
  "carts",
  "cart_items",
  "coupons",
  "addresses",
];

for (const t of tables) {
  const c = await pool.query(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
    `,
    [t],
  );

  console.log(`\n== ${t} ==`);
  for (const col of c.rows) {
    console.log(
      `${col.column_name}: ${col.data_type}${
        col.is_nullable === "NO" ? " not null" : ""
      }`,
    );
  }
}

const checks = await pool.query(`
  SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid IN ('orders'::regclass, 'order_items'::regclass, 'payments'::regclass)
    AND contype IN ('c', 'f')
`);

console.log("\n== constraints ==");
for (const row of checks.rows) {
  console.log(row.table_name, row.conname, row.pg_get_constraintdef);
}

await pool.end();
