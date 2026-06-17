const local = false
const HOST = local ? `http://${window.location.hostname}:3000` : "https://karaoke-ls7t.onrender.com"
const WS = HOST.replace(/^http/, "ws")

export const API_HOST = HOST;
export const WS_HOST = WS;

