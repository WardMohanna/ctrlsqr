export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import { connectMongo } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectMongo();

    const { id } = context.params;
    const body = await request.json();
    const { action } = body;

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const dummyUser = "GeneralUser";

    if (action === "start") {
      task.employeeWorkLogs.push({
        employee: dummyUser,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log started" }, { status: 200 });

    } else if (action === "stop") {
      const logEntry = task.employeeWorkLogs.find((log: any) => !log.endTime);
      if (logEntry) {
        logEntry.endTime = new Date();
      }
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });

    } else if (action === "reopen") {
      task.employeeWorkLogs.push({
        employee: dummyUser,
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
