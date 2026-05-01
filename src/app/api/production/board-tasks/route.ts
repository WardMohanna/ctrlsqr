import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { parseLocalDateKey } from "@/lib/productionBoard";
import { enrichTasksWithUsers } from "@/lib/productionTaskPeople";
import { resolveCanonicalUserIdFromSession } from "@/lib/productionTaskPeople";

export const dynamic = "force-dynamic";

/**
 * GET /api/production/board-tasks?from=YYYY-MM-DD&to=YYYY-MM-DD&epicId=optional
 * epicId: omit = all, "none" = tasks without epic, else Mongo ObjectId string
 */
export async function GET(req: NextRequest) {
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
    const { ProductionTask } = getTenantModels(db);

    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const epicId = searchParams.get("epicId");

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "Query params from and to are required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const { start: rangeStart } = parseLocalDateKey(from);
    const { end: rangeEnd } = parseLocalDateKey(to);
    const role = String((session.user as { role?: string }).role || "").toLowerCase();
    const isAdmin = role === "admin";
    const canonicalUserId = await resolveCanonicalUserIdFromSession(session);
    const sessionUserId = String(
      canonicalUserId || session.user.id || session.user.email || "",
    );

    const query: Record<string, unknown> = {
      productionDate: { $gte: rangeStart, $lte: rangeEnd },
      status: { $in: ["Pending", "InProgress", "Completed"] },
    };

    if (!isAdmin) {
      query.$and = [
        {
          $or: [
            { ownerId: sessionUserId },
            { assigneeIds: sessionUserId },
            { createdBy: sessionUserId },
          ],
        },
      ];
    }

    if (epicId === "none") {
      query.$or = [{ epic: null }, { epic: { $exists: false } }];
    } else if (epicId && epicId !== "all") {
      if (!mongoose.Types.ObjectId.isValid(epicId)) {
        return NextResponse.json({ error: "Invalid epicId" }, { status: 400 });
      }
      query.epic = new mongoose.Types.ObjectId(epicId);
    }

    const tasks = await ProductionTask.find(query)
      .populate("product", "itemName")
      .populate("epic", "title")
      .populate({ path: "orderLines.product", select: "itemName" })
      .sort({ productionDate: 1, createdAt: -1 })
      .lean();

    const enriched = await enrichTasksWithUsers(
      tasks as Record<string, unknown>[],
    );
    return NextResponse.json(enriched, { status: 200 });
  } catch (error: unknown) {
    console.error("board-tasks GET:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
