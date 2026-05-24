const local = false
const HOST = local ? "http://192.168.0.116:3000" : "https://karakokey.osc-fr1.scalingo.io"
const WS = local ? "ws://192.168.0.116:8080" : "wss://karakokey.osc-fr1.scalingo.io"
export const API_HOST = HOST;
export const WS_HOST = WS;
