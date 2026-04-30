import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import User from "@/models/User";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * User list for owner transfer (owner) or full assignment UI (admin).
 * Allowed if caller is admin or current task owner.
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }
    const db = await getDbForTenant(tenantId);
    const { ProductionTask } = getTenantModels(db);

    const task = (await ProductionTask.findById(id)
      .select("ownerId createdBy")
      .lean()) as { ownerId?: string; createdBy?: string } | null;
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const role = (session.user as { role?: string }).role;
    const uid = String(session.user.id || session.user.email);
    const isAdmin = role === "admin";
    const isOwner =
      task.ownerId === uid ||
      (!task.ownerId && task.createdBy === uid);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await User.find({ tenantId })
      .select("id name lastname userName role")
      .sort({ name: 1, lastname: 1 })
      .lean();

    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
