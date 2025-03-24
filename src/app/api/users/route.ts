import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  // Connect with Mongoose
  await connectMongo();

  // Fetch all users using the Mongoose model
  const users = await User.find({}).lean();

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const { name, lastname, role, password } = await req.json();

  if (!name || !lastname || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }
  
  // Create a username and generate a unique ID
  const userName = `${name.toLowerCase()}.${lastname.toLowerCase()}`;
  const id = crypto.randomUUID();

  // Hash the password using bcryptjs with a salt of 10 rounds
  const hashedPassword = await bcrypt.hash(password, 10);

  // Connect with Mongoose
  await connectMongo();

  // Create a new user using the Mongoose model
  const newUser = await User.create({
    id,
    name,
    lastname,
    userName,
    role,
    password: hashedPassword,
  });


  return NextResponse.json({ message: "User added!", userName, id });
}
