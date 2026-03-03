import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";
import { Shop } from "../src/models/Shop";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dubai-mobileshop";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const hashed = await bcrypt.hash("admin123", 12);
  const staffHashed = await bcrypt.hash("staff123", 12);

  const existingAdmin = await User.findOne({ email: "superadmin@pos.local" });
  if (existingAdmin) {
    console.log("Super admin already exists. Checking demo shop...");
  } else {
    await User.create({
      name: "Super Admin",
      email: "superadmin@pos.local",
      password: hashed,
      role: "SUPER_ADMIN",
      isActive: true,
    });
    console.log("Created super admin: superadmin@pos.local / admin123");
  }

  let demoShop = await Shop.findOne({ slug: "demo" });
  if (!demoShop) {
    demoShop = await Shop.create({
      name: "Demo Mobile Shop",
      slug: "demo",
      address: "Dubai, UAE",
      phone: "+971-50-1234567",
      trnNumber: "100000000000003",
      vatRate: 5,
      currency: "AED",
      isActive: true,
    });
    console.log("Created demo shop (slug: demo)");
  } else {
    console.log("Demo shop already exists.");
  }

  // Migrate any existing OWNER users to VAT_STAFF (owner role removed)
  const ownerCount = await User.updateMany(
    { role: "OWNER" as never },
    { $set: { role: "VAT_STAFF" } }
  );
  if (ownerCount.modifiedCount > 0) {
    console.log(`Migrated ${ownerCount.modifiedCount} OWNER user(s) to VAT_STAFF`);
  }

  const existingVatStaff = await User.findOne({ email: "vat@demo.local" });
  if (!existingVatStaff) {
    await User.create({
      name: "Owner",
      email: "vat@demo.local",
      password: staffHashed,
      role: "VAT_STAFF",
      shopId: demoShop._id,
      isActive: true,
    });
    console.log("Created Owner: vat@demo.local / staff123");
  }

  const existingStaff = await User.findOne({ email: "staff@demo.local" });
  if (!existingStaff) {
    await User.create({
      name: "Demo Staff",
      email: "staff@demo.local",
      password: staffHashed,
      role: "STAFF",
      shopId: demoShop._id,
      isActive: true,
    });
    console.log("Created demo staff: staff@demo.local / staff123");
  }

  console.log("\nSeed complete! Access URLs:");
  console.log("  Super Admin:  http://admin.localhost:3000");
  console.log("  Demo Shop:    http://demo.localhost:3000");
  console.log("\nCredentials:");
  console.log("  Super Admin:  superadmin@pos.local / admin123");
  console.log("  Owner:        vat@demo.local / staff123");
  console.log("  Staff:        staff@demo.local / staff123");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
