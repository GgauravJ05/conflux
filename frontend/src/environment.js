// Point the app at a deployed backend by setting REACT_APP_SERVER_URL at build time
// (e.g. in frontend/.env). Falls back to a local backend for development.
const server = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

export default server;
