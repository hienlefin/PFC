import mongoose, { Schema, models } from "mongoose";

const taskSchema = new Schema(
    {
        assigner_id: {
            type: String,
            required: true,
        },

        assigner_name: {
            type: String,
            required: true,
        },
        task_id : {
            type: String,
            required: true,
        },
        task_name: {
            type: String,
            required: true,
        },
        task_description: {
            type: String,
            required: true,
        },
        department:{
            type: String,
            required: true,
        } ,
        assigner_image_url :{
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        priority: {
            type: String,
            required: true,
        },
        deadline :{
            type: Date,
            required: true,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        completedDate: {
            type: Date,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        assignee_id: {
            type: String,
            required: true,
        },
        assignee_name: {
            type: String,
           
        },
        points: {
            type: Number,
            required: true,
        },
        pow: {
            type: String,
        }


    },
    
  { timestamps: true }
);

const Task = models.Task || mongoose.model("Task", taskSchema);
export default Task;