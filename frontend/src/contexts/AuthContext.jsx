import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// AI features live under a separate namespace and are optional on the server
const aiClient = axios.create({
    baseURL: `${server}/api/v1/ai`
});

// Turns any axios failure into a plain Error carrying a message worth showing the user.
// Without this a network failure throws on `err.response.data` and the UI shows nothing.
const toDisplayError = (err) => {
    if (err.response?.data?.message) return new Error(err.response.data.message);
    if (err.request) return new Error("Cannot reach the server. Is the backend running?");
    return new Error(err.message || "Something went wrong");
};

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            const request = await client.post("/register", { name, username, password });

            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
            return "User registered";
        } catch (err) {
            throw toDisplayError(err);
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const request = await client.post("/login", { username, password });

            if (request.status === httpStatus.OK) {
                const user = { name: request.data.name, username: request.data.username };
                localStorage.setItem("token", request.data.token);
                localStorage.setItem("user", JSON.stringify(user));
                setUserData(user);
                router("/home");
            }
        } catch (err) {
            throw toDisplayError(err);
        }
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            // Revoke the token server-side; a failure here must not trap the user in the app
            if (token) await client.post("/logout", { token });
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUserData(null);
            router("/auth");
        }
    };

    const getHistoryOfUser = async () => {
        try {
            const request = await client.get("/get_all_activity", {
                params: { token: localStorage.getItem("token") }
            });
            return request.data;
        } catch (err) {
            throw toDisplayError(err);
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            const request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request;
        } catch (err) {
            throw toDisplayError(err);
        }
    };

    // Reports whether the server has an Anthropic key configured, so the UI can
    // hide the summarise button instead of offering something that will fail.
    const getAiStatus = async () => {
        try {
            const request = await aiClient.get("/status");
            return Boolean(request.data?.enabled);
        } catch {
            return false;
        }
    };

    const summariseMeeting = async (transcript, meetingCode) => {
        try {
            const request = await aiClient.post("/summary", {
                token: localStorage.getItem("token"),
                transcript,
                meetingCode
            });
            return request.data;
        } catch (err) {
            throw toDisplayError(err);
        }
    };

    const data = {
        userData, setUserData, addToUserHistory, getHistoryOfUser,
        handleRegister, handleLogin, handleLogout,
        getAiStatus, summariseMeeting
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};
