/**
 * One-time script: drop the unique index "id_1" on the products collection
 * if it exists. That index causes E11000 duplicate key errors when inserting
 * products without an "id" field (dup key: { id: null }).
 *
 * Run: npx tsx scripts/drop-products-id-index.ts
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dubai-mobileshop";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No db");
  const coll = db.collection("products");
  const indexes = await coll.indexes();
  const idIndex = indexes.find((i) => i.name === "id_1");
  if (idIndex) {
    await coll.dropIndex("id_1");
    console.log("Dropped index 'id_1' on products collection.");
  } else {
    console.log("Index 'id_1' not found on products; nothing to drop.");
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
