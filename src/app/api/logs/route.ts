import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongo from "@/lib/db";
import Log from "@/models/Logs";
import { endActiveLogForUser } from "@/lib/reusableFunctions";

export async function GET(req: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  // Connect with Mongoose
  await connectMongo();

  // Optionally: Limit to today's logs only.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Query using the Mongoose model. Using .lean() returns plain JS objects.
  const logs = await Log.find({
    userId,
    startTime: { $gte: startOfDay, $lt: endOfDay },
  }).lean();

  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const { text, type } = await req.json();
  if (!text || !type) {
    return NextResponse.json({ error: "Text and type are required" }, { status: 400 });
  }

  // Connect using Mongoose
  await connectMongo();
  const now = new Date();

  // Check if the user has an active log (one without an endTime or with endTime as null)
  const activeLog = await Log.findOne({
    userId,
    $or: [{ endTime: { $exists: false } }, { endTime: null }],
  });

  if (activeLog) {
    // End the active log using our reusable function
    await endActiveLogForUser(userId, activeLog);
  }

  // Create a new log using the Mongoose model
  const newLog = await Log.create({ userId, text, type, startTime: now });

  return NextResponse.json({ message: "Log added!", log: newLog }, { status: 201 });
}
