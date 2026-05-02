import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string; userId: string }> };

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

  const { id, userId } = await params;
  const body = await req.json();
  const { newPassword } = body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  await connectMongo();

  const user = await User.findOneAndUpdate(
    { id: userId, tenantId: id },
    { $set: { password: await bcrypt.hash(newPassword, 10) } },
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Password updated" }, { status: 200 });
}
