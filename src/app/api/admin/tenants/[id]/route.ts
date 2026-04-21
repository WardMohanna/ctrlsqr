import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

type Params = { params: { id: string } };

/**
 * GET /api/admin/tenants/[id]
 * Fetch a single tenant. Super Admin only.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  await connectMongo();
  const tenant = await Tenant.findById(params.id).lean();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const tenantId = (tenant as any)._id.toString();
  const adminUser = await User.findOne({ tenantId, role: "admin" })
    .select("id name lastname userName role -_id")
    .lean();

  return NextResponse.json({ ...tenant, adminUser: adminUser ?? null }, { status: 200 });
}

/**
 * PATCH /api/admin/tenants/[id]
 * Update a tenant's name, purchasedUsers, or active status. Super Admin only.
 *
 * Body (all optional): { name?: string, purchasedUsers?: number, isActive?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  const body = await req.json();

  if (body.purchasedUsers !== undefined) {
    const seats = Number(body.purchasedUsers);
    if (!Number.isInteger(seats) || seats < 1) {
      return NextResponse.json({ error: "purchasedUsers must be a positive integer" }, { status: 400 });
    }
    body.purchasedUsers = seats;
  }

  const allowed = [
    "name",
    "slug",
    "ownerUserId",
    "purchasedUsers",
    "plan",
    "status",
    "trialEndsAt",
    "maxUsers",
    "maxProducts",
    "features",
    "contactEmail",
    "phone",
    "address",
    "isActive",
  ] as const;
  const update: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await connectMongo();

  const tenant = await Tenant.findByIdAndUpdate(
    params.id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant, { status: 200 });
}

/**
 * DELETE /api/admin/tenants/[id]
 * Permanently delete a tenant. Super Admin only.
 * Consider using PATCH { isActive: false } (soft-delete) instead.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  await connectMongo();

  const tenant = await Tenant.findByIdAndDelete(params.id).lean();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Tenant deleted" }, { status: 200 });
}
