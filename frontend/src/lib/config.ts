const local = false
const HOST = local ? `http://192.168.0.101:3000` : "https://karaoke-ls7t.onrender.com"
const WS = local ? "http://192.168.0.101:8080" : "wss://karaoke-ls7t.onrender.com"

export const API_HOST = HOST;
export const WS_HOST = WS;

