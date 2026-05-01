import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/settings/tenant/logo
 * Upload or replace the logo for the current admin's own tenant.
 * Stored as a Base64 data URL in MongoDB — no filesystem writes.
 * Requires role: admin
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const guard = requireRole(user, "admin");
  if (guard) return guard;

  const tenantId = user!.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant associated" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("logo");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No logo file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 2 MB" }, { status: 400 });
  }

  const logo = `data:${file.type};base64,${buffer.toString("base64")}`;

  await connectMongo();

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { logo } },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ logo }, { status: 200 });
}

/**
 * DELETE /api/settings/tenant/logo
 * Remove the logo for the current admin's own tenant.
 * Requires role: admin
 */
export async function DELETE(_req: NextRequest) {
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

  await Tenant.findByIdAndUpdate(tenantId, { $unset: { logo: "" } });

  return NextResponse.json({ message: "Logo removed" }, { status: 200 });
}
