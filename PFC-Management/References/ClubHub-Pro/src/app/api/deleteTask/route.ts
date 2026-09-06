import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import Task from "@/models/task";

// to submit a task(user side)...
// we will get task_id, date_completed and make isCompleted true 
export async function POST(request: any, response: any) {
    const session = await getServerSession(authOptions)
    try {
        if (session) {
            // Signed in
            console.log("Session", JSON.stringify(session, null))
            const { assignee_id, task_id} = await request.json();
            await connectMongoDB();
            
            let tempdata = await User.findOne({ reg_no: assignee_id });
            if (!tempdata) {
                return NextResponse.json({ message: "assignee user not found" }, { status: 403 });
            }
            else {

                // await Task.updateOne({ assignee_id, task_id }, { isCompleted: true})
                // delete the task according to task_id
                await Task.deleteOne({ task_id  })

                return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
            }

        } else {
            // Not Signed in
            response.status(401)
            return NextResponse.json({ message: "User not found" }, { status: 403 });
        }

    }
    catch (e) {
        console.log("error in completeTask: ", e)
        return NextResponse.json({ message: "Error" }, { status: 403 });
    }
}