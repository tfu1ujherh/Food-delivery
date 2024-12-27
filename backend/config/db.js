import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI;

    if (!dbURI) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }

    console.log("Connecting to MongoDB with URI:", dbURI);

    await mongoose.connect(dbURI); // Simplified without deprecated options

    console.log("DB Connected Successfully");
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
    process.exit(1); // Exit process with failure
  }
};
