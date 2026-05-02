import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * PATCH /api/admin/tenants/[id]/users/[userId]
 * Toggle a user's isActive status. Super Admin only.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  const { id, userId } = await params;
  const body = await req.json();
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  await connectMongo();

  const targetUser = await User.findOneAndUpdate(
    { id: userId, tenantId: id },
    { $set: { isActive: body.isActive } },
    { new: true },
  );
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: targetUser.id,
      name: targetUser.name,
      lastname: targetUser.lastname,
      userName: targetUser.userName,
      role: targetUser.role,
      isActive: targetUser.isActive,
    },
    { status: 200 }
  );
}
