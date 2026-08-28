import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        // Indexed because every authenticated request looks the user up by token
        token: { type: String, index: true }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export { User };
