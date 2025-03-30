import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions"; // Adjust the path as needed
import ProductionTask from "@/models/ProductionTask";
import { connectMongo } from "@/lib/db";

// These export settings remain the same
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// Define a custom context type with params as a Promise
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Use the authenticated user's ID (or email if no id is provided)
    const userId = session.user.id || session.user.email;

    // Await the params since Next.js expects them as a Promise
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (action === "start") {
      task.employeeWorkLogs.push({
        employee: userId,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log started" }, { status: 200 });

    } else if (action === "stop") {
      // Look for an active log for this user
      const logEntry = task.employeeWorkLogs.find(
        (log: any) => !log.endTime && log.employee === userId
      );
      if (logEntry) {
        logEntry.endTime = new Date();
      }
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });

    } else if (action === "reopen") {
      task.employeeWorkLogs.push({
        employee: userId,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log reopened" }, { status: 200 });

    } else if (action === "setQuantities") {
      const produced = body.producedQuantity ?? 0;
      const defected = body.defectedQuantity ?? 0;

      console.log("📝 Setting quantities:", produced, defected);

      task.producedQuantity = produced;
      task.defectedQuantity = defected;
      await task.save();

      return NextResponse.json({ message: "Quantities updated" }, { status: 200 });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("❌ Error updating task log:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
