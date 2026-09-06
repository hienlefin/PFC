import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession} from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(request: any, response: any) {
    const session = await getServerSession(authOptions)
    if (session) {
        // Signed in
        // console.log("Session", JSON.stringify(session, null))
        const { email } = await request.json();
        console.log(email)
        await connectMongoDB();
        const data = await User.findOne({ email });
        console.log("email:", email)
        console.log("Data", data)

        return NextResponse.json(data, { status: 207 });

    } else {
        // Not Signed in
        
        return NextResponse.json({ message: "User not found" }, { status: 403 });
    }
    // return NextResponse.json({ message: "User not found" }, { status: 403 });
}