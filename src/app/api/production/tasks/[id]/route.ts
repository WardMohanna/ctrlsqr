export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import { connectMongo } from "@/lib/db";
import mongoose from "mongoose";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectMongo();

    // Retrieve the dynamic route parameter from context
    const { id } = context.params;
    const { action } = await request.json();

    // Find the production task by ID
    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const dummyUser = "GeneralUser";

    if (action === "start") {
      // Add a new log entry with startTime
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
      // Find the last log entry without an endTime and update it
      const logEntry = task.employeeWorkLogs.find((log: any) => !log.endTime);
      if (logEntry) {
        logEntry.endTime = new Date();
      }
      // Optionally update status to Pending
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });

    } else if (action === "reopen") {
      // Reopen the task by adding a new log entry
      task.employeeWorkLogs.push({
        employee: dummyUser,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log reopened" }, { status: 200 });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("Error updating task log:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
