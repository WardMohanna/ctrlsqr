import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import { initTenantDb } from "@/lib/initTenantDb";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/**
 * GET /api/admin/tenants
 * List all tenants. Super Admin only.
 */
export async function GET() {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  await connectMongo();
  const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json(tenants, { status: 200 });
}

/**
 * POST /api/admin/tenants
 * Create a new tenant AND its first admin user. Super Admin only.
 *
 * Body: {
 *   name: string,
 *   purchasedUsers?: number,
 *   adminName: string,
 *   adminLastname: string,
 *   adminUserName?: string,
 *   adminPassword: string
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  const body = await req.json();
  const { name, purchasedUsers, adminName, adminLastname, adminUserName, adminPassword } = body;
  const adminFirstName = String(adminName ?? "").trim();
  const adminLastName = String(adminLastname ?? "").trim();

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Tenant name is required" }, { status: 400 });
  }

  if (!adminFirstName || !adminLastName || !adminPassword) {
    return NextResponse.json(
      { error: "Admin first name, last name, and password are required" },
      { status: 400 }
    );
  }

  if (typeof adminPassword !== "string" || adminPassword.length < 6) {
    return NextResponse.json(
      { error: "Admin password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const seats = Number(purchasedUsers);
  if (purchasedUsers !== undefined && (!Number.isInteger(seats) || seats < 1)) {
    return NextResponse.json({ error: "purchasedUsers must be a positive integer" }, { status: 400 });
  }

  await connectMongo();

  const existing = await Tenant.findOne({ name: name.trim() }).lean();
  if (existing) {
    return NextResponse.json({ error: "A tenant with that name already exists" }, { status: 409 });
  }

  const generatedUserName = `${adminFirstName.toLowerCase()}.${adminLastName.toLowerCase()}`;
  const userName =
    typeof adminUserName === "string" && adminUserName.trim()
      ? adminUserName.trim().toLowerCase()
      : generatedUserName;

  // Ensure userName is unique within the collection before creating tenant records.
  const userNameExists = await User.findOne({ userName }).lean();
  if (userNameExists) {
    return NextResponse.json(
      { error: `Username "${userName}" already exists. Choose a different username.` },
      { status: 409 }
    );
  }

  // Create the tenant
  const tenant = await Tenant.create({
    name: name.trim(),
    purchasedUsers: seats || 1,
    isActive: true,
  });

  const tenantId = (tenant._id as any).toString();

  // Initialize the tenant's own DB with all collections + indexes
  try {
    await initTenantDb(tenantId);
  } catch (err) {
    await Tenant.findByIdAndDelete(tenant._id);
    throw err;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create the tenant admin user
  await User.create({
    id: randomUUID(),
    name: adminFirstName,
    lastname: adminLastName,
    userName,
    role: "admin",
    password: hashedPassword,
    tenantId,
  });

  return NextResponse.json({ tenant, adminUserName: userName }, { status: 201 });
}
