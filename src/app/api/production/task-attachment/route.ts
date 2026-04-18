import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { connectMongo } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

/** PDF or Canva design file — match by MIME and/or extension (browsers often mislabel). */
function isAllowedPdfOrCanva(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (name.endsWith(".pdf")) return true;
  if (name.endsWith(".canva")) return true;
  if (mime === "application/pdf" || mime === "application/x-pdf") return true;
  return false;
}

function gridFsContentType(file: File): string {
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").trim();
  if (name.endsWith(".canva")) {
    return mime && mime !== "application/octet-stream" ? mime : "application/octet-stream";
  }
  if (mime && mime !== "application/octet-stream") return mime;
  return "application/pdf";
}

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

    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    if (!isAllowedPdfOrCanva(f)) {
      return NextResponse.json(
        { error: "Allowed types: PDF or Canva design file (.pdf, .canva)" },
        { status: 400 },
      );
    }

    await connectMongo();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not ready (mongoose.connection.db is undefined)");
    }

    const originalName = f.name || "upload";
    const contentType = gridFsContentType(f);
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const uploadStream = bucket.openUploadStream(originalName, {
      contentType,
    });

    const buffer = Buffer.from(await f.arrayBuffer());
    uploadStream.end(buffer);

    const fileId = await new Promise<string>((resolve, reject) => {
      uploadStream.on("finish", () => {
        // @ts-expect-error GridFS upload stream exposes id after finish (same as invoice route)
        const id = uploadStream.id;
        const hex = typeof id?.toHexString === "function" ? id.toHexString() : String(id);
        resolve(hex);
      });
      uploadStream.on("error", reject);
    });

    const url = `/api/uploads/${fileId}`;
    return NextResponse.json({
      url,
      originalName,
      mimeType: contentType,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
