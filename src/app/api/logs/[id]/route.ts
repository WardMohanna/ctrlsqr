import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust the path if needed
import connectMongo from "@/lib/db";
import Log from "@/models/Logs";
import { endActiveLogForUser } from "@/lib/reusableFunctions";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json(); // Expect { text?, end?, reopen? }

  // Validate the log ID using Mongoose
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  // Connect using Mongoose
  await connectMongo();

  // Fetch the existing log for further processing
  const existingLog = await Log.findOne({ _id: id, userId });
  if (!existingLog) {
    return NextResponse.json({ error: "Log not found or unauthorized" }, { status: 404 });
  }

  let updateDoc: Record<string, any> = {};

  if (body.end) {
    // Ending the log: ensure there's a startTime and then end it.
    if (!existingLog.startTime) {
      return NextResponse.json({ error: "Log missing startTime" }, { status: 400 });
    }
    // End the active log (this function now uses Mongoose)
    await endActiveLogForUser(userId, existingLog);
  } else if (body.reopen) {
    // Reopen the log only if it is ended.
    if (!existingLog.endTime) {
      return NextResponse.json({ error: "Log is already active" }, { status: 400 });
    }
    // Check if there's an active log for this user
    const activeLog = await Log.findOne({
      userId,
      $or: [{ endTime: { $exists: false } }, { endTime: null }],
    });
    if (activeLog) {
      // End the active log if one exists
      await endActiveLogForUser(userId, activeLog);
    }
    updateDoc = {
      startTime: new Date(), // restart counting from now
      endTime: null,
      // Optionally preserve accumulatedDuration as is
    };
  } else if (body.text) {
    updateDoc = { text: body.text };
  } else {
    return NextResponse.json({ error: "No valid update provided" }, { status: 400 });
  }

  // Update the log using the Mongoose model
  const updatedLog = await Log.findOneAndUpdate({ _id: id, userId }, { $set: updateDoc }, { new: true });
  if (!updatedLog) {
    return NextResponse.json({ error: "Log not found or unauthorized" }, { status: 404 });
  }

  let message = "";
  if (body.end) {
    message = "Log ended!";
  } else if (body.reopen) {
    message = "Log reopened!";
  } else {
    message = "Log updated!";
  }

  return NextResponse.json({ message });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Validate the log ID using Mongoose
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  // Connect using Mongoose
  await connectMongo();

  // Delete the log using the Mongoose model
  const deletedLog = await Log.findOneAndDelete({ _id: id, userId });
  if (!deletedLog) {
    return NextResponse.json({ error: "Log not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({ message: "Log deleted!" });
}
