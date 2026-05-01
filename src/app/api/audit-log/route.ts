import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import connectMongo from "@/lib/db";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

// Pages we deliberately skip to avoid noise (auth flows, API endpoints, etc.)
const SKIP_PATHS = new Set(["/", "/api"]);
const SKIP_PREFIXES = ["/api/", "/_next/"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Not authenticated — silently skip logging, don't expose 401 in browser console
      return NextResponse.json({ ok: true });
    }

    const body = await request.json().catch(() => ({}));
    const rawPath = typeof body?.path === "string" ? body.path : "/";
    // Clamp to 500 chars to prevent abuse
    const path = rawPath.slice(0, 500);

    if (
      SKIP_PATHS.has(path) ||
      SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      return NextResponse.json({ ok: true });
    }

    const user = session.user as {
      id?: string;
      name?: string;
      role?: string;
    };

    await connectMongo();
    await AuditLog.create({
      userId: user.id || "unknown",
      userName: user.name || "",
      role: user.role || "user",
      path,
      action: "page_visit",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
