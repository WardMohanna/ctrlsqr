// app/api/uploads/[id]/route.ts
export const runtime = "nodejs";

import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { GridFSBucket, ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  let fileId: ObjectId;
  try {
    fileId = new ObjectId(id);
  } catch {
    return new NextResponse("Invalid id", { status: 400 });
  }

  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });

  // Use bucket.find to get file metadata directly from GridFS
  const fileDoc = await bucket.find({ _id: fileId }).next();
  if (!fileDoc) {
    return new NextResponse("Not found", { status: 404 });
  }

  const downloadStream = bucket.openDownloadStream(fileId);

  const headers = new Headers();
  headers.set(
    "Content-Type",
    fileDoc.contentType || "application/octet-stream"
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (fileDoc.length) {
    headers.set("Content-Length", fileDoc.length.toString());
  }

  // Node Readable → Web ReadableStream
  // Next.js on nodejs runtime will accept a Node.js Readable
  const stream = Readable.toWeb(downloadStream) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, { headers });
}
