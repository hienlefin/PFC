import mongoose from "mongoose";

export const connectMongoDB = async () => {
  try {
   
    await mongoose.connect(process.env.MONGODB_URI as string)
    
    console.log("Connected to MONGODB");
  } catch (error) {
    console.log("Erro connecting to database: ", error);
  }
};

export const disconnectMongoDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MONGODB");
  } catch (error) {
    console.log("Error disconnecting from database: ", error);
  }
}