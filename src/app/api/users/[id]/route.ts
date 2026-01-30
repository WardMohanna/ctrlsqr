import { NextResponse } from "next/server";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// Define a custom context type with params as a Promise
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  req: Request,
  context: RouteContext
): Promise<NextResponse> {
  // Await the params to obtain the id
  const { id } = await context.params;
  const { name, lastname, role, password } = await req.json();

  if (!name || !lastname || !role) {
    return NextResponse.json(
      { error: "Name, lastname, and role are required" },
      { status: 400 }
    );
  }

  // Ensure a Mongoose connection is established.
  await connectMongo();

  // Create update object
  const updateFields: any = { name, lastname, role };
  if (password) {
    // Hash the password if provided
    const hashedPassword = await bcrypt.hash(password, 10);
    updateFields.password = hashedPassword;
  }

  // Update user using the Mongoose model.
  // We query using the `id` field, which in our model is a string.
  const updatedUser = await User.findOneAndUpdate(
    { id },
    { $set: updateFields },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json(
      { error: "User not found or no changes made" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "User updated successfully!" });
}

export async function DELETE(
  req: Request,
  context: RouteContext
): Promise<NextResponse> {
  // Await the params to obtain the id
  const { id } = await context.params;

  // Ensure a Mongoose connection is established.
  await connectMongo();

  // Delete user using the Mongoose model.
  // We query using the `id` field, which in our model is a string.
  const deletedUser = await User.findOneAndDelete({ id });

  if (!deletedUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "User deleted successfully!" });
}
