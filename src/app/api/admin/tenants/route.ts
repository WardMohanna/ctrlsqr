import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

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
 * Create a new tenant. Super Admin only.
 *
 * Body: { name: string, purchasedUsers?: number }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  const body = await req.json();
  const { name, purchasedUsers } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Tenant name is required" }, { status: 400 });
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

  const tenant = await Tenant.create({
    name: name.trim(),
    purchasedUsers: seats || 1,
    isActive: true,
  });

  return NextResponse.json(tenant, { status: 201 });
}
