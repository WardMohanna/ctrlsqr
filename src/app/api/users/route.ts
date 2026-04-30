import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import { applyTenantFilter } from "@/lib/tenantFilter";

export async function GET() {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  await connectMongo();

  const filter = applyTenantFilter({}, sessionUser!);
  if (sessionUser!.role !== "super_admin") {
    (filter as any).role = { $ne: "super_admin" };
  }

  const users = await User.find(filter, { password: 0 }).lean();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  const { name, lastname, role, password, hourPrice, tenantId: bodyTenantId } = await req.json();

  if (!name || !lastname || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const resolvedTenantId =
    sessionUser!.role === "super_admin" ? bodyTenantId ?? null : sessionUser!.tenantId;

  if (sessionUser!.role !== "super_admin" && !resolvedTenantId) {
    return NextResponse.json(
      { error: "Your account has no tenantId. Contact a Super Admin." },
      { status: 400 },
    );
  }

  if (role === "super_admin" && sessionUser!.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    hourPrice: hourPrice || 0,
  });

  return NextResponse.json({ message: "User added!", userName, id });
}
