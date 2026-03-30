import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    const mime = (file as File).type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Allowed types: PDF, PNG, JPG, WEBP" },
        { status: 400 },
      );
    }

    const originalName = (file as File).name || "upload";
    const ext = path.extname(originalName) || (mime.includes("pdf") ? ".pdf" : ".bin");
    const name = `${randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "production");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buf);

    const url = `/uploads/production/${name}`;
    return NextResponse.json({
      url,
      originalName,
      mimeType: mime,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
