import mongoose, { Connection } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI in .env.local");
}

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connects to the master DB (ctrlsqr).
 * Used for Tenant and User collections.
 */
export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, { dbName: "ctrlsqr" });
  }
  await connectionPromise;
}

/**
 * Returns a DB connection scoped to a specific tenant.
 * Reuses the single underlying TCP connection — no extra connections per tenant.
 */
export async function getDbForTenant(tenantId: string): Promise<Connection> {
  if (!tenantId) {
    throw new Error("tenantId is required to get a tenant DB connection");
  }
  await connectMongo();
  return mongoose.connection.useDb(tenantId, { useCache: true });
}

export default connectMongo;
