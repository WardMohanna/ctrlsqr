import { NextResponse } from "next/server";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/sessionGuard";

// Define a custom context type with params as a Promise
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  req: Request,
  context: RouteContext
): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await the params to obtain the id
  const { id } = await context.params;
  const { name, lastname, role, password } = await req.json();

  if (!name || !lastname || !role) {
    return NextResponse.json(
      { error: "Name, lastname, and role are required" },
      { status: 400 }
    );
  }

  await connectMongo();

  // Only super_admin can edit another super_admin account
  const target = await User.findOne({ id }).lean() as any;
  if (target?.role === "super_admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent self-role-change
  if (sessionUser.id === id && role !== sessionUser.role) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 403 });
  }

  // Prevent privilege escalation: only super_admin can assign the super_admin role
  if (role === "super_admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await the params to obtain the id
  const { id } = await context.params;

  // Prevent self-deletion
  if (sessionUser.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 403 });
  }

  await connectMongo();

  // No one can delete a super_admin account
  const target = await User.findOne({ id }).lean() as any;
  if (target?.role === "super_admin") {
    return NextResponse.json(
      { error: "Super Admin accounts cannot be deleted" },
      { status: 403 }
    );
  }

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
