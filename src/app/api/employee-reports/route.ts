import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import EmployeeReport from "@/models/EmployeeReport";
import ProductionTask from "@/models/ProductionTask";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");

    const query: any = {};
    if (status) query.status = status;
    if (date) query.date = date;
    if (employeeId) query.employeeId = employeeId;

    const reports = await EmployeeReport.find(query).sort({ date: -1, createdAt: -1 });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching employee reports:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { taskIds, date } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "taskIds array is required" }, { status: 400 });
    }

    // Fetch the completed tasks
    const tasks = await ProductionTask.find({
      _id: { $in: taskIds }
    }).populate('product');

    if (tasks.length === 0) {
      return NextResponse.json({ error: "No tasks found" }, { status: 404 });
    }

    // Build tasksCompleted array from the tasks
    const tasksCompleted = tasks.map(task => {
      // Find the employee's work log
      const employeeLog = task.employeeWorkLogs?.find(
        (log: any) => log.employee === session.user.id || log.employee === session.user.email
      );

      const startTime = employeeLog?.startTime ? new Date(employeeLog.startTime) : new Date();
      const endTime = employeeLog?.endTime ? new Date(employeeLog.endTime) : new Date();
      const timeWorked = employeeLog?.accumulatedDuration || 0;

      return {
        taskId: task._id.toString(),
        taskName: task.taskName || (task.product as any)?.itemName || 'Unknown Task',
        productName: (task.product as any)?.itemName,
        quantityProduced: task.producedQuantity || 0,
        quantityDefected: task.defectedQuantity || 0,
        timeWorked,
        startTime,
        endTime,
      };
    });

    // Calculate total time worked
    const totalTimeWorked = tasksCompleted.reduce((sum, task) => sum + task.timeWorked, 0);

    const report = await EmployeeReport.create({
      employeeId: session.user.id || session.user.email,
      employeeName: session.user.name || session.user.email,
      date: date || new Date().toISOString().split('T')[0],
      status: 'pending',
      tasksCompleted,
      totalTimeWorked,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating employee report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectMongo();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Only managers can approve reports" }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, status, managerNotes, timeAdjustments } = body;

    const updateData: any = {
      status,
      approvedBy: session.user.id || session.user.email,
      approvedAt: new Date(),
    };

    if (managerNotes) updateData.managerNotes = managerNotes;
    if (timeAdjustments) {
      updateData.timeAdjustments = timeAdjustments;
      updateData.adjustedTimeWorked = timeAdjustments.reduce(
        (sum: number, adj: any) => sum + adj.adjustedTime, 
        0
      );
    }

    const report = await EmployeeReport.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating employee report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
