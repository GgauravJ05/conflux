import { Server } from "socket.io";

// roomPath -> array of socket ids (ordering matters for the WebRTC offer flow)
let connections = {};
// roomPath -> array of { sender, data, "socket-id-sender", at }
let messages = {};
// socket id -> { room, username, joinedAt }
let participants = {};

// Keep the in-memory chat backlog bounded so a long-lived room cannot grow without limit
const MAX_MESSAGES_PER_ROOM = 200;
const MAX_USERNAME_LENGTH = 32;
const ALLOWED_REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "😮"];

const findRoomOfSocket = (socketId) => participants[socketId]?.room;

const sanitiseUsername = (name) => {
    if (typeof name !== "string") return "Guest";
    const trimmed = name.trim().slice(0, MAX_USERNAME_LENGTH);
    return trimmed || "Guest";
};

// The roster the client renders in the participant panel and on each video tile
const rosterFor = (room) =>
    (connections[room] || []).map((id) => ({
        socketId: id,
        username: participants[id]?.username || "Guest",
        handRaised: Boolean(participants[id]?.handRaised)
    }));

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("join-call", (path, username) => {
            if (typeof path !== "string" || !path) return;

            if (connections[path] === undefined) {
                connections[path] = [];
            }

            // Guard against a duplicate join re-adding the same socket to the room
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }

            participants[socket.id] = {
                room: path,
                username: sanitiseUsername(username),
                handRaised: false,
                joinedAt: new Date()
            };

            // Existing peers need the joiner's id to open a peer connection to it
            connections[path].forEach((id) => {
                io.to(id).emit("user-joined", socket.id, connections[path]);
            });

            // Names are sent separately so the WebRTC handshake stays independent of them
            const roster = rosterFor(path);
            connections[path].forEach((id) => {
                io.to(id).emit("participants", roster);
            });

            // Replay the room's chat backlog to the socket that just joined
            (messages[path] || []).forEach((msg) => {
                io.to(socket.id).emit(
                    "chat-message",
                    msg.data,
                    msg.sender,
                    msg["socket-id-sender"],
                    msg.at
                );
            });
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const room = findRoomOfSocket(socket.id);
            if (!room || typeof data !== "string" || !data.trim()) return;

            if (messages[room] === undefined) {
                messages[room] = [];
            }

            const at = new Date().toISOString();
            const entry = {
                sender: sanitiseUsername(sender),
                data: data.slice(0, 2000),
                "socket-id-sender": socket.id,
                at
            };

            messages[room].push(entry);
            if (messages[room].length > MAX_MESSAGES_PER_ROOM) {
                messages[room].shift();
            }

            connections[room].forEach((id) => {
                io.to(id).emit("chat-message", entry.data, entry.sender, socket.id, at);
            });
        });

        // Relayed so peers can grey out a tile the moment someone mutes,
        // rather than waiting to infer it from the media stream.
        socket.on("media-state", (state) => {
            const room = findRoomOfSocket(socket.id);
            if (!room || typeof state !== "object" || state === null) return;

            const payload = {
                video: Boolean(state.video),
                audio: Boolean(state.audio)
            };

            connections[room].forEach((id) => {
                if (id !== socket.id) io.to(id).emit("media-state", socket.id, payload);
            });
        });

        // Ephemeral emoji reaction - broadcast, never stored
        socket.on("reaction", (emoji) => {
            const room = findRoomOfSocket(socket.id);
            if (!room || !ALLOWED_REACTIONS.includes(emoji)) return;

            const username = participants[socket.id]?.username || "Guest";
            connections[room].forEach((id) => {
                io.to(id).emit("reaction", { socketId: socket.id, username, emoji });
            });
        });

        socket.on("raise-hand", (raised) => {
            const room = findRoomOfSocket(socket.id);
            if (!room || !participants[socket.id]) return;

            participants[socket.id].handRaised = Boolean(raised);

            const roster = rosterFor(room);
            connections[room].forEach((id) => {
                io.to(id).emit("participants", roster);
            });
        });

        // Live captions from the browser's speech recognition. Interim results are
        // relayed but never stored; only finalised lines join the transcript.
        socket.on("caption", (payload) => {
            const room = findRoomOfSocket(socket.id);
            if (!room || typeof payload?.text !== "string" || !payload.text.trim()) return;

            const entry = {
                socketId: socket.id,
                speaker: participants[socket.id]?.username || "Guest",
                text: payload.text.slice(0, 500),
                isFinal: Boolean(payload.isFinal),
                at: new Date().toISOString()
            };

            connections[room].forEach((id) => {
                if (id !== socket.id) io.to(id).emit("caption", entry);
            });
        });

        socket.on("disconnect", () => {
            const room = findRoomOfSocket(socket.id);
            delete participants[socket.id];

            if (!room || !connections[room]) return;

            connections[room] = connections[room].filter((id) => id !== socket.id);

            connections[room].forEach((id) => {
                io.to(id).emit("user-left", socket.id);
                io.to(id).emit("participants", rosterFor(room));
            });

            // Drop the room (and its chat backlog) once the last participant leaves
            if (connections[room].length === 0) {
                delete connections[room];
                delete messages[room];
            }
        });
    });

    return io;
};
