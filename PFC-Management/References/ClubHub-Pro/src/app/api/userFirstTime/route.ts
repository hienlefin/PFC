import { connectMongoDB, disconnectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(request: any) {
    const { name, email, reg_no, dept, user_image } = await request.json();
    await connectMongoDB();
    console.log({ name, email, reg_no, dept, user_image })
    const user = await User.findOne({ email });
    // console.log(user)
    console.log(dept)
    let admin_emails = [
        // dept leads emails
    ]

    let core_emails = [
    //    cabinet core emails
    ]
    try {
        if (user.completedSignUp === false && !(admin_emails.includes(email)) && !(core_emails.includes(email))) {
            // so it is a user

            // Save the updated document back to the database
            const result = await User.updateOne({ email }, { $set: { name: name, reg_no: reg_no, dept: dept, user_image: user_image, completedSignUp: true } });
            const newUser = await User.findOne({ email });
            if (result.modifiedCount === 1) {
                console.log('User details updated successfully');
                console.log(newUser);
                return NextResponse.json({ message: "User updated successfully", newUser }, { status: 201 });

            } else {
                console.log('User not found or details not updated');
                return NextResponse.json({ message: "Not updated" }, { status: 403 });
            }
        }
        else if (user.completedSignUp === false && (admin_emails.includes(email))) {
            // it is a lead/colead
            const result = await User.updateOne({ email }, { $set: { name: name, reg_no: reg_no, dept: dept, user_image: user_image, completedSignUp: true, role: "admin" } });
            const newUser = await User.findOne({ email });
            if (result.modifiedCount === 1) {
                console.log('User details updated successfully');
                console.log(newUser);
                return NextResponse.json({ message: "User updated successfully", newUser }, { status: 201 });

            } else {
                console.log('User not found or details not updated');
                return NextResponse.json({ message: "Not updated" }, { status: 403 });
            }
        }
        else if (user.completedSignUp === false && (core_emails.includes(email))) {
            // it is core
            const result = await User.updateOne({ email }, { $set: { name: name, reg_no: reg_no, dept: dept, user_image: user_image, completedSignUp: true, role: "core" } });
            const newUser = await User.findOne({ email });
            if (result.modifiedCount === 1) {
                console.log('User details updated successfully');
                console.log(newUser);
                return NextResponse.json({ message: "User updated successfully", newUser }, { status: 201 });

            } else {
                console.log('User not found or details not updated');
                return NextResponse.json({ message: "Not updated" }, { status: 403 });
            }
        }
        else if (user.completedSignUp === true) {
            return NextResponse.json({ message: "User already completed the signup" }, { status: 403 });
        }
        else {
            console.log('User not found');
        }
    } catch (err) {
        console.error('Error updating user details:', err);
        return NextResponse.json({ message: "Error updating user details" }, { status: 500 });
    }
    disconnectMongoDB();
    return NextResponse.json({ message: "Error updating user details" }, { status: 500 });
}
