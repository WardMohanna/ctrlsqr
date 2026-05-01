export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

/**
 * GET /api/settings/tenant
 * Returns the current admin's own tenant info.
 * Requires role: admin
 */
export async function GET() {
  const user = await getSessionUser();
  const guard = requireRole(user, "admin");
  if (guard) return guard;

  const tenantId = user!.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant associated" }, { status: 400 });
  }

  await connectMongo();
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant, { status: 200 });
}

/**
 * PATCH /api/settings/tenant
 * Updates the current admin's own tenant info.
 * Requires role: admin
 * Restricted fields only — plan/status/purchasedUsers are NOT editable by tenant admin.
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  const guard = requireRole(user, "admin");
  if (guard) return guard;

  const tenantId = user!.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant associated" }, { status: 400 });
  }

  const body = await req.json();

  const allowed = [
    "slug",
    "contactEmail",
    "phone",
    "address",
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
    tenantId,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant, { status: 200 });
}
