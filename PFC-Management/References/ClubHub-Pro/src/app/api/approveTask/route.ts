import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import Task from "@/models/task";

// to approve a task(admin side)
// we will get task_id and make isApproved true

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
    const session = await getServerSession(authOptions)
    try {
        if (session) {
            // Signed in
            console.log("Session", JSON.stringify(session, null))
            const { assigner_id, task_id, task_name, assignee_id } = await request.json();
            console.log("From server:  ", assigner_id)
            // await connectMongoDB();
            const tempdata = await User.findOne({ reg_no: assigner_id });
            const assigneeTempdata = await User.findOne({ reg_no: assignee_id });
            let name = assigneeTempdata.name
            console.log("Temp Data", tempdata.name)
            // console.log("Data", data)
            // let tempdata = await User.findOne({ id: assignee_id });
            if (!tempdata) {
                return NextResponse.json({ message: "assigner user not found" }, { status: 403 });
            }
            else {
                let points = getPoints(task_name)
                console.log("Points from server:  ", points)
                // update the task
                await Task.updateOne({ assigner_id, task_id }, { isApproved: true })
                // add the points to the user
                console.log("assignee_id from server: ", assignee_id)
                await User.updateOne({ reg_no: assignee_id }, { $inc: { points: points } })

                const res = await fetch('https://cyscom-leaderboard.azurewebsites.net/leaderboard-add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        points: getPoints(task_name)
                    })
                });

                return NextResponse.json({ message: "Task completed successfully entered into database" }, { status: 200 });
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