import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import { connectMongo } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const { id } = params;
    const { action } = await req.json();
    
    // Find the production task by ID.
    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    
    // For testing, we use a fixed user value "text" for the log.
    const dummyUser = "text";
    
    if (action === "start") {
      // Add a new log entry with startTime.
      task.employeeWorkLogs.push({
        employee: dummyUser,
        startTime: new Date(),
        endTime: null,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log started" }, { status: 200 });
    } else if (action === "stop") {
      // Find the last log entry without an endTime and update it.
      const logEntry = task.employeeWorkLogs.find((log: any) => !log.endTime);
      if (logEntry) {
        logEntry.endTime = new Date();
      }
      // Optionally, update status to "Pending" if no active log remains.
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });
    } else if (action === "reopen") {
      // Reopen the task by adding a new log entry.
      task.employeeWorkLogs.push({
        employee: dummyUser,
        startTime: new Date(),
        endTime: null,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log reopened" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error updating task log:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}