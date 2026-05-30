<div align="center">
  <img src="karakokey.png" alt="Karakokey Logo" width="200" />
  <h1>Karakokey</h1>
  <p>Developed by <strong>RyannKim327</strong> under <i>MPOP Reverse II</i></p>

  [![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte)](https://svelte.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
</div>

Karakokey is a modern, web-based karaoke platform that transforms any device into a digitalized KTV machine. Designed with the Filipino karaoke culture in mind, it leverages Tubidy/YouTube for its song library and features real-time synchronization between the "Video" screen and multiple "Songbook" (remote) devices.

---

## ✨ Key Features

- 🎤 **Real-time Synchronization:** Seamlessly queue songs from your phone and see them appear on the main screen via WebSockets.
- 🎯 **Pitch Detection & Scoring:** Uses the YIN algorithm to analyze your voice and give you a performance score after every song.
- 📺 **Facebook Live Integration:** Stream your karaoke session directly to Facebook Live with a single click, including your screen and microphone audio.
- 📸 **Camera Overlay:** See yourself on the big screen with a built-in camera overlay.
- 📱 **QR Code Easy Join:** Quickly connect remote devices by scanning a QR code displayed on the main screen.
- 🔊 **Mic Monitoring:** Real-time microphone level meter and audio monitoring.
- 🔍 **Smart Search:** Automatically filters and cleans YouTube titles to show only the song and artist.

---

## 📖 How to Use

1. **Visit the App:** Go to [ryannkim327.github.io/karakokey](https://ryannkim327.github.io/karakokey).
2. **Create a Room:** Click on **"Create Room"**. Optionally, enter a **Facebook Stream Key** if you wish to go live.
3. **Connect Devices:**
   - Scan the **QR Code** on the screen with your phone.
   - Or manually enter the **Room ID** on the home page and click **"Join Session"**.
4. **Start Singing:** Use your phone to search for songs and hit the **"+"** button to add them to the queue!

---

## ⌨️ Controls (Video Screen)

| Key | Action |
|-----|--------|
| `Space` | Pause / Play |
| `Arrow Right` | Skip current song |
| `F` | Toggle Fullscreen |
| `M` | Toggle Microphone Monitoring |
| `C` | Toggle Camera Overlay |

---

## 🚀 Tech Stack

### Frontend
- **Framework:** [Svelte 5](https://svelte.dev/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Audio Processing:** [Pitchfinder](https://github.com/peterkhayes/pitchfinder) (YIN Algorithm)
- **Routing:** [svelte-spa-router](https://github.com/luizpostiga/svelte-spa-router)
- **Notifications:** [svelte-french-toast](https://github.com/clack-community/svelte-french-toast)

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Real-time:** [WebSockets (ws)](https://github.com/websockets/ws)
- **Web Scraping:** [Puppeteer Extra](https://github.com/berstend/puppeteer-extra) (with Stealth Plugin)
- **Media Processing:** [FFmpeg](https://ffmpeg.org/) (for RTMP relay)

---

## 📁 Project Structure

```text
karakokey/
├── frontend/           # Svelte application
│   ├── src/
│   │   ├── routes/     # App views (Home, Book, Video)
│   │   ├── lib/        # Shared logic and config
│   │   └── assets/     # Images and global styles
├── backend/            # Node.js Express server
│   ├── src/
│   │   ├── script/     # Scrapers and external integrations
│   │   └── index.ts    # Server and WebSocket logic
├── CHANGELOG.md        # Track changes and updates
├── LICENSE.md          # Non-Commercial License
└── README.md           # Project documentation
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm
- FFmpeg (for streaming features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RyannKim327/karakokey.git
   cd karakokey
   ```

2. Install dependencies:
   ```bash
   # Install Frontend
   cd frontend && npm install
   
   # Install Backend
   cd ../backend && npm install
   ```

### Running Locally

**1. Start Backend:**
```bash
cd backend
npm start
```
The server will start on `http://localhost:3000`.

**2. Start Frontend:**
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📜 License & Changelog

- **License:** This project is licensed under a [Non-Commercial License](LICENSE.md). It **must not** be commercialized or sold.
- **Changelog:** Stay updated with the latest changes in the [CHANGELOG.md](CHANGELOG.md).

---

## 🤖 AI Guide

- **Claude AI:** Youtubei.js implementation
- **ChatGPT:** UI/UX Design patterns
- **Gemini:** WebSocket architecture, Webscraping, and Documentation
