import { NextResponse } from "next/server";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
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
  // We query using the `id` field, which in our model is a string (e.g., generated by crypto.randomUUID).
  const updatedUser = await User.findOneAndUpdate(
    { id }, // query by id
    { $set: updateFields },
    { new: true } // return the updated document
  );

  if (!updatedUser) {
    return NextResponse.json(
      { error: "User not found or no changes made" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "User updated successfully!" });
}
