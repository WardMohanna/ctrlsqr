import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import { connectMongo } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const { id } = params;
    // Expect a payload: { employee: string, action: "start" | "stop" }
    const { employee, action } = await req.json();
    if (!employee || !action) {
      return NextResponse.json({ error: "Missing employee or action" }, { status: 400 });
    }

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date();

    // Find any active work log for this employee in this task (no endTime)
    const activeLogIndex = task.employeeWorkLogs.findIndex(
      (log: any) => log.employee.toString() === employee && !log.endTime
    );

    if (action === "start") {
      if (activeLogIndex !== -1) {
        return NextResponse.json({ error: "Work log already active for this employee" }, { status: 400 });
      }
      // Add a new work log entry for the employee.
      task.employeeWorkLogs.push({
        employee,
        startTime: now,
        laborPercentage: 0, // default, can be updated later
      });
      // Optionally mark the task as in progress.
      task.status = "InProgress";
    } else if (action === "stop") {
      if (activeLogIndex === -1) {
        return NextResponse.json({ error: "No active work log found for this employee" }, { status: 400 });
      }
      const activeLog = task.employeeWorkLogs[activeLogIndex];
      activeLog.endTime = now;
      const startTime = new Date(activeLog.startTime).getTime();
      activeLog.accumulatedDuration = now.getTime() - startTime;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await task.save();
    return NextResponse.json({ message: `Log ${action}ed successfully`, task });
  } catch (error: any) {
    console.error("Error updating task log:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
