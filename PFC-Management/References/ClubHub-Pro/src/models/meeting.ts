import mongoose, { Schema, models } from "mongoose";

const meetSchema = new Schema(
    {
        assigner_id: {
            type: String,
            required: true,
        },

        assigner_name: {
            type: String,
            required: true,
        },
        meet_name: {
            type: String,
            required: true,
        },
        description: {
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
        priority: {
            type: String,
            required: true,
        },
        date :{
            type: Date,
            required: true,
        },
       


    },
    
  { timestamps: true }
);

const Meet = models.Task || mongoose.model("Meet", meetSchema);
export default Meet;