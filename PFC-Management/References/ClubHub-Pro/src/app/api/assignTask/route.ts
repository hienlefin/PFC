import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import Task from "@/models/task";

function getPoints(task_name: string) {
    let points = 0;
    const taskName = task_name.toLowerCase();

    switch (taskName) {
        case 'pull request':
        case 'blog medium':
            points = 20;
            break;

        case 'blog':
            points = 15;
            break;

        case 'sm posting':
            points = 7;
            break;

        case 'weekly work':
            points = 5;
            break;

        case 'idea':
            points = 3;
            break;

        case 'brochure':
            points = 10;
            break;

        case 'news':
            points = 5;
            break;

        case 'demos':
            points = 20;
            break;

        case 'oc volunteer':
            points = 30;
            break;

        case 'oc assigned':
            points = 20;
            break;

        case 'oc no work':
            points = -10;
            break;

        case 'oc manager':
            points = 50;
            break;

        case 'wtf':
            points = 50;
            break;

        case 'discord':
            points = 10;
            break;

        case 'marketing':
            points = 2;
            break;

        case 'mini project':
            points = 100;
            break;

        case 'complete project':
            points = 200;
            break;

        case 'promotion medium':
            points = 25;
            break;

        case 'promotion large':
            points = 50;
            break;

        // Add more cases as needed

        default:
            // Handle the default case (if task is not matched)
            points = 0;
            break;
    }
    return points
}

export async function POST(request: any, response: any) {
    const session: any = await getServerSession(authOptions)
    try {
        if (session) {
            // Signed in
            console.log("Session", JSON.stringify(session, null))
            // let session_details: any = JSON.stringify(session, null)
            // console.log("Session image", session.user.image)
            // let assigner_image_url = session_details.image
            // capitalise each word in task name
            
            
            let { assigner_id, assigner_name, points,  task_name,task_description, deadline, category, assignee_id, priority } = await request.json();
            await connectMongoDB();
            const data = await User.findOne({ reg_no: assigner_id });
            let assigner_image_url = data.user_image
            console.log("Data", data)
            let tempdata = await User.findOne({ reg_no: assignee_id });
            console.log("tempdata", tempdata)
            if (!tempdata) {
                return NextResponse.json({ message: "assignee user not found" }, { status: 403 });
            }
            else {
                // lets get the last entered task, if we have a last entered task, add 1 to the new task_id
                // or else start from 1000
                let task_id 
                let last_task = await Task.findOne().sort({ task_id: -1 }).limit(1)
                if (last_task) {
                    // convert last task to integer
                    task_id = parseInt(last_task.task_id)
                    task_id = task_id + 1
                }
                else{
                    task_id = 1000
                }
                console.log("task_id", task_id)
                console.log("task_name", task_name)

                // getting from function, instead of user input
                // let points = getPoints(task_name);
                console.log("points", points)
                
                task_name = task_name.replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c: string) => c.toUpperCase())));

                await Task.create({ assigner_id, assigner_name, assigner_image_url,task_id, task_name,task_description, deadline,department : tempdata.dept, category, assignee_id, priority, points: points })

                return NextResponse.json({ message: "Task assigned successfully" }, { status: 200 });
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