import mongoose, { Schema, models } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    reg_no: {
      type: String,
    },

    user_image:{
      type: String,
    },
    dept: {
      type: String,
    },
    completedSignUp:{
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "user",
    },
    points: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

const User = models.User || mongoose.model("User", userSchema);
export default User;