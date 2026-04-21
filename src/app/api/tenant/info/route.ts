import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser } from "@/lib/sessionGuard";

/**
 * GET /api/tenant/info
 * Returns the current user's tenant name and logo.
 * Works for all authenticated roles (user, admin, manager, super_admin).
 * Super admins have no tenantId — returns null.
 */
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (sessionUser as any).tenantId as string | undefined;
  if (!tenantId) {
    // super_admin has no tenant
    return NextResponse.json({ tenant: null }, { status: 200 });
  }

  await connectMongo();
  const tenant = await Tenant.findById(tenantId)
    .select("name logo")
    .lean() as { name: string; logo?: string } | null;

  if (!tenant) {
    return NextResponse.json({ tenant: null }, { status: 200 });
  }

  return NextResponse.json(
    { tenant: { name: tenant.name, logo: tenant.logo ?? null } },
    { status: 200 }
  );
}
