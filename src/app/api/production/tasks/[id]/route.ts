import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions"; // Adjust the path as needed
import ProductionTask from "@/models/ProductionTask";
import { connectMongo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// We keep your context type, though ideally it should be { params: { id: string } } (not a Promise)
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id || session.user.email;

    // Await the parameters (as your context is defined as a Promise)
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Helper function: finish an active log by setting its endTime and calculating accumulatedDuration.
    function finishLog(activeLog: any) {
      const currentTime = new Date();
      activeLog.endTime = currentTime;
      const startTime = new Date(activeLog.startTime);
      activeLog.accumulatedDuration = currentTime.getTime() - startTime.getTime();
      activeLog.status = "Pending"; // Optionally, mark as finished
    }

    // Function to finalize any active log in any task (other than the current one)
    async function finalizeOtherActiveLogs() {
      const otherActiveTasks = await ProductionTask.find({
        _id: { $ne: id },
        "employeeWorkLogs": { $elemMatch: { employee: userId, endTime: { $in: [null, ""] } } },
      });
      for (const otherTask of otherActiveTasks) {
        let modified = false;
        otherTask.employeeWorkLogs.forEach((log: any) => {
          if ((log.endTime == null || log.endTime === "") && String(log.employee) === userId) {
            finishLog(log);
            modified = true;
          }
        });
        if (modified) {
          await otherTask.save();
        }
      }
    }

    // In "start" and "reopen", we want to finalize any other active logs before opening a new one.
    if (action === "start") {
      await finalizeOtherActiveLogs();

      // Add a new log entry to mark the start of work.
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
      // Finish any active log in the current task.
      const activeLog = task.employeeWorkLogs.find(
        (log: any) =>
          (log.endTime == null || log.endTime === "") &&
          String(log.employee) === userId
      );
      if (activeLog) {
        finishLog(activeLog);
      }
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });

    } else if (action === "reopen") {
      await finalizeOtherActiveLogs();
      
      // Start a new log session.
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

    } else if (action === "unclaim") {
      // Remove this user's work logs from the task.
      task.employeeWorkLogs = task.employeeWorkLogs.filter(
        (log: any) => log.employee !== userId
      );
      if (task.employeeWorkLogs.length === 0) {
        task.status = "Pending";
      }
      await task.save();
      return NextResponse.json({ message: "Task unclaimed successfully" }, { status: 200 });
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
