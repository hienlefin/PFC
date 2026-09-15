import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import Meet from "@/models/meeting";

// to approve a task(admin side)
// we will get task_id and make isApproved true
export async function POST(request: any, response: any) {
    const session = await getServerSession(authOptions)
    try {
        if (session) {
            // Signed in
            console.log("Session", JSON.stringify(session, null))
            // date here is the system date..
            const { assigner_id, department, date} = await request.json();
            console.log("From server:  ", assigner_id)
            await connectMongoDB();
            const tempdata = await User.findOne({ reg_no: assigner_id });
            console.log("Temp Data",tempdata)
            // console.log("Data", data)
            // let tempdata = await User.findOne({ id: assignee_id });
            if (!tempdata) {
                return NextResponse.json({ message: "assigner user not found" }, { status: 403 });
            }
            else {
                // date should be greater than current date
                let meets = await Meet.find({ department: department, date: { $gte: date }  })

                return NextResponse.json(meets, { status: 200 });
            }

        } else {
            // Not Signed in
           
            return NextResponse.json({ message: "User not found" }, { status: 403 });
        }

    }
    catch (e) {
        console.log("error in assignTask: ", e)
        return NextResponse.json({ message: "Error" }, { status: 403 });
    }
}