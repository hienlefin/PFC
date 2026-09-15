import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession} from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: any, response: any) {
    const session = await getServerSession(authOptions)
    if (session) {
        // Signed in
        // console.log("Session", JSON.stringify(session, null))
        // const { email } = await request.json();
        // console.log(email)
        await connectMongoDB();
        // const data = await User.findOne({ email });
        // console.log("email:", email)
        // console.log("Data", data)

        // find all users whose role is not admin and core and return only name and registration number
        const data = await User.find({ role: { $nin: ['admin', 'core'] } }, { name: 1, reg_no: 1, _id: 0 })
        // rename name as label and reg_no as value
        let newData = data.map((user: any) => {
            return { label: user.name, value: user.reg_no }
        })
        console.log("Data", newData)

        return NextResponse.json(newData, { status: 207 });

    } else {
        // Not Signed in
        
        return NextResponse.json({ message: "User not found" }, { status: 403 });
    }
    // return NextResponse.json({ message: "User not found" }, { status: 403 });
}