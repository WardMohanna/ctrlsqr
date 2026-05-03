import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";
import { applyTenantFilter } from "@/lib/tenantFilter";

function getTenantUserLimit(tenant: any): number | null {
  const maxUsers = Number(tenant?.maxUsers);
  if (Number.isFinite(maxUsers) && maxUsers > 0) return maxUsers;

  const purchasedUsers = Number(tenant?.purchasedUsers);
  if (Number.isFinite(purchasedUsers) && purchasedUsers > 0) return purchasedUsers;

  return null;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin", "production_manager");
  if (guard) return guard;

  await connectMongo();

  const filter = applyTenantFilter({}, sessionUser!);
  if (sessionUser!.role !== "super_admin") {
    (filter as any).role = { $ne: "super_admin" };
  }

  const users = await User.find(filter, { password: 0 }).lean();
  const response = NextResponse.json(users);

  if (sessionUser!.tenantId) {
    const tenant = await Tenant.findById(sessionUser!.tenantId)
      .select("purchasedUsers maxUsers")
      .lean();
    const userLimit = getTenantUserLimit(tenant);

    if (userLimit !== null) {
      response.headers.set("X-Users-Limit", String(userLimit));
      response.headers.set("X-Users-Count", String(users.length));
    }
  }

  return response;
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  const guard = requireRole(sessionUser, "admin", "super_admin", "production_manager");
  if (guard) return guard;

  const {
    name,
    lastname,
    role,
    password,
    hourPrice,
    tenantId: bodyTenantId,
    userName: bodyUserName,
  } = await req.json();
  const firstName = String(name ?? "").trim();
  const lastName = String(lastname ?? "").trim();

  if (!firstName || !lastName || !password) {
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

  await connectMongo();

  if (resolvedTenantId) {
    const tenant = await Tenant.findById(resolvedTenantId)
      .select("purchasedUsers maxUsers")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const userLimit = getTenantUserLimit(tenant);
    if (userLimit !== null) {
      const tenantUsersCount = await User.countDocuments({
        tenantId: resolvedTenantId,
        role: { $ne: "super_admin" },
      });

      if (tenantUsersCount >= userLimit) {
        return NextResponse.json(
          {
            code: "USER_LIMIT_REACHED",
            error: `User limit reached for this tenant (${tenantUsersCount}/${userLimit}).`,
            limit: userLimit,
            usersCount: tenantUsersCount,
          },
          { status: 409 },
        );
      }
    }
  }

  const generatedUserName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const userName =
    typeof bodyUserName === "string" && bodyUserName.trim()
      ? bodyUserName.trim().toLowerCase()
      : generatedUserName;
  const existingUser = await User.findOne({ userName }).lean();

  if (existingUser) {
    return NextResponse.json(
      { error: `Username "${userName}" already exists.` },
      { status: 409 },
    );
  }

  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    id,
    name: firstName,
    lastname: lastName,
    userName,
    role: role ?? "user",
    password: hashedPassword,
    tenantId: resolvedTenantId,
    hourPrice: hourPrice || 0,
  });

  return NextResponse.json({ message: "User added!", userName, id });
}
