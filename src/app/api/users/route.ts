import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import { applyTenantFilter } from "@/lib/tenantFilter";

/**
 * GET /api/users
 * - super_admin → all users across all tenants
 * - admin       → users within their own tenant
 */
export async function GET() {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  await connectMongo();

  const filter = applyTenantFilter({}, sessionUser!);

  // Non-super_admin users must never see super_admin accounts
  if (sessionUser!.role !== "super_admin") {
    (filter as any).role = { $ne: "super_admin" };
  }

  const users = await User.find(filter, { password: 0 }).lean();

  return NextResponse.json(users);
}

/**
 * POST /api/users
 * - super_admin → can create users in any tenant (pass tenantId in body)
 * - admin       → can only create users within their own tenant
 */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  const { name, lastname, role, password, tenantId: bodyTenantId } = await req.json();

  if (!name || !lastname || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  // SECURITY: tenantId is always taken from the session for non-super_admin.
  // super_admin may explicitly specify a tenantId in the request body.
  const resolvedTenantId =
    sessionUser!.role === "super_admin"
      ? (bodyTenantId ?? null)
      : sessionUser!.tenantId;

  // Non-super_admin users must have a tenantId
  if (sessionUser!.role !== "super_admin" && !resolvedTenantId) {
    return NextResponse.json(
      { error: "Your account has no tenantId. Contact a Super Admin." },
      { status: 400 }
    );
  }

  // Only super_admin can create another super_admin
  if (role === "super_admin" && sessionUser!.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only super_admin can create an admin user
  if (role === "admin" && sessionUser!.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userName = `${name.toLowerCase()}.${lastname.toLowerCase()}`;
  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  await connectMongo();

  await User.create({
    id,
    name,
    lastname,
    userName,
    role,
    password: hashedPassword,
    tenantId: resolvedTenantId,
  });

  return NextResponse.json({ message: "User added!", userName, id });
}

