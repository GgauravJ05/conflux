import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
    {
        // Stores the owner's username; indexed because history is queried by it
        user_id: { type: String, required: true, index: true },
        meetingCode: { type: String, required: true },
        date: { type: Date, default: Date.now, required: true }
    },
    { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };
