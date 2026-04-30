export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/settings/tenant/logo
 * Upload or replace the logo for the current admin's own tenant.
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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `tenant-logo-${tenantId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  await connectMongo();

  const existing = await Tenant.findById(tenantId).select("logo").lean() as { logo?: string } | null;
  if (existing?.logo) {
    const oldFilename = existing.logo.split("/").pop();
    if (oldFilename) {
      unlink(path.join(uploadDir, oldFilename)).catch(() => {});
    }
  }

  const logo = `/uploads/${filename}`;
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { logo } },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    unlink(filePath).catch(() => {});
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

  const existing = await Tenant.findById(tenantId).select("logo").lean() as { logo?: string } | null;
  if (!existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (existing.logo) {
    const oldFilename = existing.logo.split("/").pop();
    if (oldFilename) {
      unlink(path.join(process.cwd(), "public", "uploads", oldFilename)).catch(() => {});
    }
  }

  await Tenant.findByIdAndUpdate(tenantId, { $unset: { logo: "" } });

  return NextResponse.json({ message: "Logo removed" }, { status: 200 });
}
