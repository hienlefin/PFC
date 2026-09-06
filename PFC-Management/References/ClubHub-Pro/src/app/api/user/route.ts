import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(request: any) {
  const { name, email } = await request.json();
  await connectMongoDB();
  const data = await User.findOne({ email });
  if (data) {
    return NextResponse.json({ message: "User already exists" }, { status: 403 });
  }
  else{
    await User.create({ name, email });
    return NextResponse.json({ message: "User Registered" }, { status: 201 });

  }
}