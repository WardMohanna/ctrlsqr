import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { ensureAllDefaultEpics } from "@/lib/defaultEpics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }
    const db = await getDbForTenant(tenantId);
    const { Epic } = getTenantModels(db);
    await ensureAllDefaultEpics(Epic);
    const epics = await Epic.find({ active: true }).sort({ title: 1 }).lean();
    return NextResponse.json(epics, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }
    const db = await getDbForTenant(tenantId);
    const { Epic } = getTenantModels(db);
    const epic = await Epic.create({
      title,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      active: true,
    });

    return NextResponse.json(epic, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
