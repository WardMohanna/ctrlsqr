import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

type Params = { params: { id: string } };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/admin/tenants/[id]/logo
 * Upload or replace a tenant logo. Super Admin only.
 * Stored as a Base64 data URL in MongoDB — no filesystem writes.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

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
    params.id,
    { $set: { logo } },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ logo }, { status: 200 });
}

/**
 * DELETE /api/admin/tenants/[id]/logo
 * Remove the tenant's logo. Super Admin only.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  const guard = requireRole(user, "super_admin");
  if (guard) return guard;

  await connectMongo();

  const tenant = await Tenant.findById(params.id).lean();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await Tenant.findByIdAndUpdate(params.id, { $unset: { logo: "" } });

  return NextResponse.json({ message: "Logo removed" }, { status: 200 });
}
