import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

type Params = { params: { id: string } };

/**
 * GET /api/admin/tenants/[id]/users
 * List all users belonging to a tenant. Super Admin only.
 * Passwords are never returned.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  await connectMongo();

  const users = await User.find({ tenantId: params.id })
    .select("id name lastname userName role -_id")
    .sort({ role: 1, name: 1 })
    .lean();

  return NextResponse.json(users, { status: 200 });
}
