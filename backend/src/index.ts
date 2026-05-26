import express from "express"
import cors from "cors"
import { createServer } from "http"
import { WebSocketServer, WebSocket } from "ws"
import { spawn } from "child_process"
import { play, search } from "./script/tubidy"
import ffmpegStatic from "ffmpeg-static"

const app = express()
const server = createServer(app)
const port = process.env.PORT || 3000
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg"

console.log(`Using FFmpeg path: ${ffmpegPath}`)

app.use(cors())

app.get("/", (req, res) => {
	res.json({ response: "Server currently running" })
})

app.get("/search", async (req, res) => {
	const q = req.query.q
	if (typeof q !== "string") {
		return res.status(400).json({ error: "Please provide a valid search query" })
	}
	const lists = await search(q)
	res.json(lists)
})

app.get("/play", async (req, res) => {
	const id = req.query.id
	if (typeof id !== "string") {
		return res.status(400).send("Missing or invalid id")
	}
	try {
		// await play(id, res)
		const p = await play(id)
		res.json(p)
	} catch (err) {
		console.error(err)
		res.status(500).send("Failed to stream video")
	}
})

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: "Endpoint not found" })
})

// ✅ Attach WS to the SAME server (no separate port!)
const wss = new WebSocketServer({ server })

type ExtendedWebSocket = WebSocket & { isAlive: boolean; role?: string }
const channels = new Map<string, Set<ExtendedWebSocket>>()

wss.on("connection", (ws: ExtendedWebSocket, req) => {
	const url = new URL(req.url || "", `https://${req.headers.host}`)
	const streamKey = url.searchParams.get("key")

	// If a stream key is provided, handle it as a live stream connection
	if (url.pathname.startsWith("/live") && streamKey) {
		console.log(`Starting live stream relay for key: ${streamKey.substring(0, 5)}...`)

		const ffmpeg = spawn(ffmpegPath, [
			"-re",
			"-i", "-",
			"-c:v", "libx264",
			"-preset", "veryfast",
			"-tune", "zerolatency",
			"-pix_fmt", "yuv420p",
			"-c:a", "aac",
			"-ar", "44100",
			"-b:a", "128k",
			"-f", "flv",
			`rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`,
		])

		ffmpeg.on("error", (err) => {
			console.error("FFmpeg process failed to start:", err)
		})

		ffmpeg.stderr.on("data", (data) => {
			console.log(`FFmpeg: ${data}`)
		})

		ffmpeg.stdin.on("error", (err) => {
			console.error("FFmpeg stdin error (skipping):", err.message)
		})

		ws.on("message", (data) => {
			try {
				if (ffmpeg.stdin.writable) {
					ffmpeg.stdin.write(data)
				}
			} catch (err) {
				console.error("Error writing to FFmpeg (skipping chunk):", err)
			}
		})

		ws.on("close", () => {
			console.log("Live stream connection closed")
			ffmpeg.kill("SIGINT")
		})

		ffmpeg.on("close", (code) => {
			console.log(`FFmpeg process exited with code ${code}`)
			ws.close()
		})

		ws.on("error", (err) => {
			console.error("Live stream WebSocket error:", err)
		})

		return
	}

	const channel = url.pathname.replace(/^\/ws\/?/, "") || "default"
	const role = url.searchParams.get("role") || "book"

	if (!channels.has(channel)) {
		channels.set(channel, new Set())
	}

	const clients = channels.get(channel)!

	if (role === "video") {
		const hasVideo = Array.from(clients).some((client) => client.role === "video")
		if (hasVideo) {
			console.log(`Connection rejected: Video device already exists in channel ${channel}`)
			ws.close(1008, "Video device already connected")
			return
		}
	}

	ws.role = role
	clients.add(ws)

	ws.on("message", (data) => {
		try {
			// Normal room messages (JSON) are broadcast to all clients in the channel
			clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(data.toString())
				}
			})
		} catch (err) {
			console.error("Error broadcasting message:", err)
		}
	})

	ws.on("close", (code, reason) => {
		clients.delete(ws)
		console.log(`Client (${role}) disconnected from channel: ${channel}. Code: ${code}, Reason: ${reason}`)
	})

	ws.on("error", (err) => {
		console.error(`WebSocket error in channel ${channel} (${role}):`, err)
	})
})

// Prevent the process from crashing on unhandled errors
process.on("uncaughtException", (err) => {
	console.error("CRITICAL: Uncaught Exception (skipping):", err)
})

process.on("unhandledRejection", (reason, promise) => {
	console.error("CRITICAL: Unhandled Rejection at:", promise, "reason:", reason)
})

// ✅ Bind to 0.0.0.0 so your phone can reach it
server.listen(port as number, () => {
	console.log(`Listening on http://0.0.0.0:${port}`)
	console.log(`WebSocket on ws://0.0.0.0:${port}`)
})
