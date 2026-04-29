const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

async function createSuperAdmin() {
  const password = "12345678";
  const name = "System";
  const lastname = "Administrator";
  const userName = "system.administrator";

  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not found in .env.local");
    }

    await mongoose.connect(MONGODB_URI, { dbName: "ctrlsqr" });
    console.log("✓ Connected to master database (ctrlsqr)");

    const db = mongoose.connection;
    const usersCollection = db.collection("users");

    // Check if super_admin already exists
    const existing = await usersCollection.findOne({ userName });
    if (existing) {
      console.log(`⚠️  Super admin user "${userName}" already exists`);
      console.log(`   ID: ${existing.id}`);
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    // Create super admin user
    const result = await usersCollection.insertOne({
      id: userId,
      name,
      lastname,
      userName,
      role: "super_admin",
      password: hashedPassword,
      tenantId: null,
    });

    console.log("\n✅ Super Admin Created Successfully!\n");
    console.log("User Details:");
    console.log(`  Username: ${userName}`);
    console.log(`  Password: ${password}`);
    console.log(`  User ID:  ${userId}`);
    console.log(`  Role:     super_admin`);
    console.log("\n📝 You can now log in with these credentials.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createSuperAdmin();
