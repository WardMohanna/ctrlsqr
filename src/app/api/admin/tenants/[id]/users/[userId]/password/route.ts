import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import bcrypt from "bcryptjs";

type Params = { params: { id: string; userId: string } };

/**
 * PATCH /api/admin/tenants/[id]/users/[userId]/password
 * Set a new password for a tenant user. Super Admin only.
 * The current password is never read or returned.
 *
 * Body: { newPassword: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "super_admin");
  if (guard) return guard;

  const body = await req.json();
  const { newPassword } = body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  await connectMongo();

  const user = await User.findOne({ id: params.userId, tenantId: params.id });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return NextResponse.json({ message: "Password updated" }, { status: 200 });
}
