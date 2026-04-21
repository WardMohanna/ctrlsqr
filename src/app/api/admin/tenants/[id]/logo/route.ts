export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { connectMongo } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

type Params = { params: { id: string } };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/admin/tenants/[id]/logo
 * Upload or replace a tenant logo. Super Admin only.
 * Body: multipart/form-data with field "logo" (image file)
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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `tenant-logo-${params.id}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  await connectMongo();

  // Delete the old logo file if it exists on disk
  const existing = await Tenant.findById(params.id).select("logo").lean() as { logo?: string } | null;
  if (existing?.logo) {
    const oldFilename = existing.logo.split("/").pop();
    if (oldFilename) {
      const oldPath = path.join(uploadDir, oldFilename);
      unlink(oldPath).catch(() => {
        // Ignore errors — file may have been removed already
      });
    }
  }

  const logo = `/uploads/${filename}`;
  const tenant = await Tenant.findByIdAndUpdate(
    params.id,
    { $set: { logo } },
    { new: true, runValidators: true }
  ).lean();

  if (!tenant) {
    // Clean up the just-written file since the tenant wasn't found
    unlink(filePath).catch(() => {});
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

  const existing = await Tenant.findById(params.id).select("logo").lean() as { logo?: string } | null;
  if (!existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (existing.logo) {
    const oldFilename = existing.logo.split("/").pop();
    if (oldFilename) {
      const oldPath = path.join(process.cwd(), "public", "uploads", oldFilename);
      unlink(oldPath).catch(() => {});
    }
  }

  await Tenant.findByIdAndUpdate(params.id, { $unset: { logo: "" } });

  return NextResponse.json({ message: "Logo removed" }, { status: 200 });
}
