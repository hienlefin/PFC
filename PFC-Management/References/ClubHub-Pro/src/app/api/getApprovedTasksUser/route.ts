import { connectMongoDB, disconnectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import Task from "@/models/task";

export async function POST(request: any, response: any) {
    const session = await getServerSession(authOptions)
    try {
        if (session) {
            // Signed in
            console.log("Session", JSON.stringify(session, null))
            const { assignee_id } = await request.json();
            await connectMongoDB();
            const data = await User.findOne({ assignee_id });
            console.log("Data", data)
            // await Task.create({ assigner_id, assigner_name, task_id, task_name, deadline, assignee_id, points  })
            const tasks = await Task.find({ assignee_id, isCompleted: true, isApproved: true });
            // await disconnectMongoDB()
            return NextResponse.json(tasks, { status: 200 });

        } else {
            // Not Signed in
            
            return NextResponse.json({ message: "User not found" }, { status: 403 });
        }

    }
    catch (e) {
        console.log("error in verified task retrival: ", e)
        return NextResponse.json({ message: "Error in verified task retrival" }, { status: 403 });
    }
    // return NextResponse.json({ message: "User not found" }, { status: 403 });
}