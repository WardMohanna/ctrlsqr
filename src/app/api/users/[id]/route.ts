import { NextResponse } from "next/server";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getSessionUser, requireRole } from "@/lib/sessionGuard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  req: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  const { id } = await context.params;
  const { name, lastname, role, password, hourPrice } = await req.json();

  if (!name || !lastname || !role) {
    return NextResponse.json(
      { error: "Name, lastname, and role are required" },
      { status: 400 },
    );
  }

  await connectMongo();

  const target = (await User.findOne({ id }).lean()) as any;
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (sessionUser.role !== "super_admin" && target.tenantId !== sessionUser.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target?.role === "super_admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (sessionUser.id === id && role !== sessionUser.role) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 403 },
    );
  }

  if (role === "super_admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateFields: any = { name, lastname, role };

  if (password && password.trim().length > 0) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateFields.password = hashedPassword;
  }

  if (hourPrice !== undefined && hourPrice !== null) {
    updateFields.hourPrice = hourPrice;
  }

  const updatedUser = await User.findOneAndUpdate(
    { id },
    { $set: updateFields },
    { new: true },
  );

  if (!updatedUser) {
    return NextResponse.json(
      { error: "User not found or no changes made" },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "User updated successfully!" });
}

export async function DELETE(
  req: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guard = requireRole(sessionUser, "admin", "super_admin");
  if (guard) return guard;

  const { id } = await context.params;

  if (sessionUser.id === id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 403 },
    );
  }

  await connectMongo();

  const target = (await User.findOne({ id }).lean()) as any;
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (sessionUser.role !== "super_admin" && target.tenantId !== sessionUser.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target?.role === "super_admin") {
    return NextResponse.json(
      { error: "Super Admin accounts cannot be deleted" },
      { status: 403 },
    );
  }

  const deletedUser = await User.findOneAndDelete({ id });

  if (!deletedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "User deleted successfully!" });
}

export async function PATCH(
  req: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  await connectMongo();

  const target = (await User.findOne({ id }).lean()) as any;
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (sessionUser.role !== "super_admin" && target.tenantId !== sessionUser.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target.role === "super_admin" && sessionUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate({ id }, { $set: { password: hashedPassword } });

  return NextResponse.json({ message: "Password updated successfully" });
}
