const local = false
const HOST = local ? `http://${window.location.hostname}:3000` : "https://karakokey.osc-fr1.scalingo.io"
const WS = HOST.replace(/^http/, "ws")

export const API_HOST = HOST;
export const WS_HOST = WS;

