import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession} from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

// export async function POST(request: any, response: any) {
//     const session = await getServerSession(authOptions)
//     if (session) {
//         // Signed in
//         // console.log("Session", JSON.stringify(session, null))
//         const { dept } = await request.json();
//         console.log(dept)
//         await connectMongoDB();
//         const data = await User.find({ dept });
//         console.log("Data", data)

//         return NextResponse.json(data, { status: 207 });

//     } else {
//         // Not Signed in
//         response.status(401)
//         return NextResponse.json({ message: "User not found" }, { status: 403 });
//     }
//     // return NextResponse.json({ message: "User not found" }, { status: 403 });
// }

export async function GET(request: any, response: any){
    const session = await getServerSession(authOptions)
    if (session){
        await connectMongoDB();
        const data = await User.find({ role: "user" });
        console.log("Data", data)
        return NextResponse.json(data, { status: 207 });
    }
}