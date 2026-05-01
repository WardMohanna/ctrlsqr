const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: ".env.local" });

const MASTER_DB_NAME = "ctrlsqr";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function normalizePart(value) {
  return String(value || "").trim();
}

function buildUserName(name, lastname) {
  return `${normalizePart(name).toLowerCase()}.${normalizePart(lastname).toLowerCase()}`;
}

function getConfig() {
  const args = parseArgs(process.argv.slice(2));
  const name = normalizePart(args.name || process.env.SUPERADMIN_NAME || "System");
  const lastname = normalizePart(
    args.lastname || process.env.SUPERADMIN_LASTNAME || "Administrator",
  );
  const password = String(
    args.password || process.env.SUPERADMIN_PASSWORD || "12345678",
  ).trim();
  const userName = normalizePart(
    args.username || process.env.SUPERADMIN_USERNAME || buildUserName(name, lastname),
  ).toLowerCase();

  return {
    mongoUri: process.env.MONGODB_URI || "",
    name,
    lastname,
    password,
    userName,
  };
}

function validateConfig(config) {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI not found in .env.local");
  }
  if (!config.name || !config.lastname) {
    throw new Error("name and lastname are required");
  }
  if (!config.userName) {
    throw new Error("username is required");
  }
  if (!config.password || config.password.length < 6) {
    throw new Error("password must be at least 6 characters");
  }
}

async function createSuperAdmin() {
  const config = getConfig();

  try {
    validateConfig(config);

    await mongoose.connect(config.mongoUri, {
      dbName: MASTER_DB_NAME,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`Connected to master database (${MASTER_DB_NAME})`);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Mongo connection is ready but db handle is missing");
    }

    const usersCollection = db.collection("users");
    const existing = await usersCollection.findOne({ userName: config.userName });

    if (existing) {
      console.log(`Super admin "${config.userName}" already exists`);
      console.log(`  id: ${existing.id}`);
      console.log(`  role: ${existing.role}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(config.password, 10);
    const userId = randomUUID();

    await usersCollection.insertOne({
      id: userId,
      name: config.name,
      lastname: config.lastname,
      userName: config.userName,
      role: "super_admin",
      password: hashedPassword,
      tenantId: null,
      hourPrice: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("");
    console.log("Super admin created successfully");
    console.log(`  database: ${MASTER_DB_NAME}`);
    console.log(`  username: ${config.userName}`);
    console.log(`  password: ${config.password}`);
    console.log(`  user id : ${userId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create super admin: ${message}`);

    if (message.includes("ETIMEOUT") || message.includes("ENOTFOUND")) {
      console.error(
        "MongoDB network lookup failed. Check MONGODB_URI, DNS access, VPN/firewall, or Atlas IP access list.",
      );
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createSuperAdmin();
