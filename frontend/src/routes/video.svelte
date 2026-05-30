<script lang="ts">
	import Logo from "@/assets/karakokey.png";
	import { push } from "svelte-spa-router";
	import { fade } from "svelte/transition";
	import { API_HOST, WS_HOST } from "@/lib/config";
	import { YIN } from "pitchfinder";
	import axios from "axios";
	import toast, { Toaster } from "svelte-french-toast";

	interface SongInfo {
		title: {
			title: string;
			artist: string;
		};
		url: string;
		play?: boolean;
		check?: boolean;
	}

	let { params }: { params: { id: string } } = $props();

	const yin = YIN();

	let socket: WebSocket;
	let streamSocket: WebSocket | null = null;
	let sources = $state<SongInfo[]>([]);
	let source = $state("");
	let id = $state("");
	let video = $state<HTMLVideoElement>();
	let paused = $state(false);
	let currentBlobUrl: string | null = null;
	let score = $state<number | null>(null);
	let showScore = $state(false);
	let started = $state(false);
	let framesWithPitch = $state(0);
	let totalFrames = $state(0);
	// These don't need to be reactive — no template binding
	let analyzerActive = false;
	let micStream: MediaStream | null = null;
	let audioContext: AudioContext | null = null;
	let micSource: MediaStreamAudioSourceNode | null = null;
	let micGain: GainNode | null = null;
	let analyzerNode: AnalyserNode | null = null;

	let micLevel = $state(0);
	let monitorMic = $state(true);
	let showCamera = $state(true);
	let cameraVideo = $state<HTMLVideoElement>();

	let streamKey = $state("");
	let isStreaming = $state(false);

	$effect(() => {
		const hashParts = window.location.hash.split("?");
		if (hashParts.length > 1) {
			const searchParams = new URLSearchParams(hashParts[1]);
			streamKey = searchParams.get("key") || "";
		}
	});

	async function startStreaming() {
		if (!streamKey) return;

		try {
			const displayStream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					displaySurface: "browser",
					frameRate: 30,
				},
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
				preferCurrentTab: true,
				selfBrowserSurface: "include",
				systemAudio: "include",
				monitorTypeSurfaces: "exclude",
				surfaceSwitching: "include",
			});

			if (!audioContext) audioContext = new AudioContext();
			setupMicAudio();

			const dest = audioContext.createMediaStreamDestination();
			let displaySource: MediaStreamAudioSourceNode | null = null;

			if (displayStream.getAudioTracks().length > 0) {
				displaySource = audioContext.createMediaStreamSource(displayStream);
				displaySource.connect(dest);
			}

			if (micGain) {
				micGain.connect(dest);
			}

			const combinedStream = new MediaStream([
				...displayStream.getVideoTracks(),
				...dest.stream.getAudioTracks(),
			]);

			const mediaRecorder = new MediaRecorder(combinedStream, {
				mimeType: "video/webm;codecs=vp8,opus",
				videoBitsPerSecond: 3000000,
			});

			streamSocket = new WebSocket(`${WS_HOST}/live?key=${streamKey}`);

			streamSocket.onopen = () => {
				console.log("Streaming socket opened");
				isStreaming = true;
				mediaRecorder.start(1000); // Send chunks every second
				toast.success("Live stream started!");
			};

			mediaRecorder.ondataavailable = (event) => {
				if (
					event.data.size > 0 &&
					streamSocket?.readyState === WebSocket.OPEN
				) {
					streamSocket.send(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				isStreaming = false;
				streamSocket?.close();
				displayStream.getTracks().forEach((track) => track.stop());
				if (micGain) {
					try {
						micGain.disconnect(dest);
					} catch (e) {}
				}
				if (displaySource) {
					try {
						displaySource.disconnect(dest);
					} catch (e) {}
				}
				toast.error("Live stream stopped");
			};

			streamSocket.onclose = () => {
				isStreaming = false;
				if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
			};
		} catch (err) {
			console.error("Error starting stream:", err);
			toast.error("Failed to start stream. Make sure to allow screen capture.");
		}
	}

	function getScoreMessage(s: number) {
		if (s >= 90)
			return {
				msg: "Wow, you're a great singer! 🌟",
				color: "text-yellow-400",
			};
		if (s >= 75)
			return { msg: "Amazing performance! 🎉", color: "text-green-400" };
		if (s >= 60)
			return { msg: "Not bad, keep it up! 👏", color: "text-blue-400" };
		if (s >= 45)
			return {
				msg: "Getting there, practice more! 💪",
				color: "text-orange-400",
			};
		return { msg: "Maybe stick to the shower... 🚿", color: "text-red-400" };
	}

	function generateScore() {
		video?.pause();
		if (totalFrames > 10) {
			const ratio = framesWithPitch / totalFrames;
			score = Math.min(100, Math.floor(ratio * 300));
		} else {
			score = Math.floor(Math.random() * 20) + 10;
		}

		showScore = true;
		analyzerActive = false;
		framesWithPitch = 0;
		totalFrames = 0;

		setTimeout(() => {
			showScore = false;
			score = null;
		}, 5000);
	}

	function setupMicAudio() {
		if (!micStream) return;
		if (!audioContext) {
			audioContext = new AudioContext();
		}

		if (!micSource) {
			micSource = audioContext.createMediaStreamSource(micStream);
			micGain = audioContext.createGain();
			micGain.gain.value = monitorMic ? 1 : 0;
			// micGain.connect(audioContext.destination); // Mic stream output only in live

			analyzerNode = audioContext.createAnalyser();
			analyzerNode.fftSize = 2048;
			micSource.connect(analyzerNode);
			micSource.connect(micGain);
		}
	}

	function audioAnalyzer(stream: MediaStream) {
		if (analyzerActive) return;
		analyzerActive = true;

		setupMicAudio();

		const buffer = new Float32Array(analyzerNode!.fftSize);

		function tick() {
			if (!analyzerActive) {
				return;
			}

			if (audioContext?.state === "suspended") {
				audioContext.resume();
			}

			analyzerNode!.getFloatTimeDomainData(buffer);

			// Calculate volume level
			let sum = 0;
			for (let i = 0; i < buffer.length; i++) {
				sum += buffer[i] * buffer[i];
			}
			micLevel = Math.sqrt(sum / buffer.length);

			const pitch = yin(buffer);
			if (pitch && pitch > 50 && pitch < 2000) framesWithPitch++;
			totalFrames++;
			requestAnimationFrame(tick);
		}

		tick();
	}

	async function getUrl(link: string) {
		paused = false;
		if (sources.length > 0) {
			try {
				const { data } = await axios.get(`${API_HOST}/play?id=${link}`);
				console.log(data);
				if (!data.url || (Array.isArray(data.url) && data.url.length === 0)) {
					toast(data.error ?? "No Data Found", { position: "bottom-right" });
					nextSong();
					return;
				}
				source = Array.isArray(data.url) ? data.url[0].url : data.url;
				setTimeout(() => {
					video?.play()?.catch((e) => console.error("Video play failed:", e));
				}, 500);

				if (micStream) audioAnalyzer(micStream);
			} catch (e) {
				console.log(e);
			}
		} else {
			source = "";
		}
	}

	function nextSong() {
		paused = true;
		video?.pause();
		analyzerActive = false;
		framesWithPitch = 0;
		totalFrames = 0;
		sources = sources.slice(1); // reactive-safe removal
		setTimeout(() => {
			if (sources.length > 0) {
				console.log("Video");
				console.log(sources);
				id = sources[0].url;
				getUrl(id);
			} else {
				source = "";
				id = "";
				started = false;
			}
		}, 500);
	}

	function nativeNextSong() {
		paused = true;
		video?.pause();
		generateScore(); // shows score for 5s and hides it

		// Capture next song before mutating
		const nextSongs = sources.slice(1);
		sources = nextSongs;

		setTimeout(() => {
			if (sources.length > 0) {
				id = sources[0].url;
				getUrl(id);
			} else {
				source = "";
				id = "";
				started = false;
			}
		}, 5000); // aligns with generateScore's hide timeout
	}
	function startPlay() {
		if (!started && sources.length > 0) {
			id = sources[0].url;
			getUrl(id);
			started = true;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showScore) return;
		if (e.code === "Space") {
			e.preventDefault();
			if (paused) {
				paused = false;
				video?.play();
			} else {
				paused = true;
				video?.pause();
			}
		}
		if (e.code === "ArrowRight") nextSong();
		if (e.code === "KeyF") fullscreen();
		if (e.code === "KeyM") monitorMic = !monitorMic;
		if (e.code === "KeyC") showCamera = !showCamera;
	}

	function socketDetection() {
		socket = new WebSocket(`${WS_HOST}/${params.id.toLowerCase()}`);

		socket.onopen = () => {
			socket.send(JSON.stringify({ play: true }));
			fullscreen();
		};

		socket.onmessage = (event: MessageEvent) => {
			const data: SongInfo = JSON.parse(event.data);
			if (data.check) {
				socket.send(JSON.stringify({ play: true }));
				fullscreen();
			}
			if (data.title && data.url) {
				sources = [...sources, data];
				startPlay();
				fullscreen();
			}
		};

		socket.onerror = (error: Event) => console.error("Socket error:", error);

		socket.onclose = (event) => {
			console.log("Socket disconnected", event.reason);
			if (event.code === 1008) {
				toast.error("A video device is already connected to this room.", {
					position: "top-center",
					duration: 5000,
				});
				push("/");
			}
		};
	}

	async function fullscreen() {
		await document.documentElement.requestFullscreen();
	}

	$effect(() => {
		if (micGain) {
			micGain.gain.value = monitorMic ? 1 : 0;
		}
	});

	$effect(() => {
		(async () => {
			if (!micStream) {
				try {
					micStream = await navigator.mediaDevices.getUserMedia({
						audio: true,
						video: true,
					});
				} catch (e) {
					console.warn("Failed to get video, trying audio only", e);
					try {
						micStream = await navigator.mediaDevices.getUserMedia({
							audio: true,
						});
					} catch (e2) {
						console.error("Failed to get audio", e2);
						toast.error("Microphone access denied or not found");
					}
				}
			}

			if (micStream && cameraVideo && !cameraVideo.srcObject) {
				cameraVideo.srcObject = micStream;
			}
		})();

		window.addEventListener("keydown", handleKeydown);
		socketDetection();

		return () => {
			window.removeEventListener("keydown", handleKeydown);
			if (socket) socket.close();
			if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
			analyzerActive = false;
		};
	});
</script>

<div class="relative w-full h-screen overflow-hidden bg-black">
	{#if source}
		<video
			class="absolute inset-0 h-full w-full"
			src={source}
			autoplay={true}
			controls={false}
			onpause={() => {
				if (!paused && source) video?.play();
			}}
			playsinline
			onended={nativeNextSong}
			bind:this={video}
		></video>
	{:else}
		<div
			class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black"
		>
			<div class="text-center flex flex-col items-center">
				<div class="text-6xl mb-6 h-30 w-30">
					<img src={Logo} />
				</div>
				<h1 class="text-white text-5xl font-black tracking-tight mb-2">
					Kara Kokey
				</h1>
				<p class="text-zinc-400 text-lg mb-8">Scan to join and add songs</p>

				<div
					class="p-2 bg-white rounded-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-8"
				>
					<img
						src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(
							window.location.origin +
								window.location.pathname +
								'#/book/' +
								params.id,
						)}"
						alt="QR Code"
						class="w-25 h-25"
					/>
				</div>

				<div class="flex flex-col items-center gap-1">
					<p
						class="text-zinc-500 text-sm font-medium uppercase tracking-widest"
					>
						Room ID
					</p>
					<p class="text-white text-2xl font-mono font-bold">
						{params.id.toUpperCase()}
					</p>
				</div>

				{#if streamKey && !isStreaming}
					<button
						class="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition transform hover:scale-105"
						onclick={startStreaming}
					>
						Start Facebook Live
					</button>
				{:else}
					<div class="mt-8 flex items-center gap-2">
						{#if isStreaming}
							<div class="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
							<span
								class="text-red-500 font-bold uppercase tracking-widest text-sm"
								>Live on Facebook</span
							>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if showScore && score !== null}
		<div
			class="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm"
		>
			<div class="text-center animate-bounce">
				<p class="text-white/60 text-xl mb-2 font-medium">Your Score</p>
				<p class="text-8xl font-black text-white mb-4">{score}</p>
				<p class="text-2xl font-bold {getScoreMessage(score).color}">
					{getScoreMessage(score).msg}
				</p>
			</div>
		</div>
	{/if}

	<div class="absolute top-0 left-0 w-full p-4 md:p-6 z-10">
		<div
			class="flex items-center gap-3 px-4 py-3 overflow-hidden transition-all duration-500"
		>
			<div
				class="shrink-0 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold tracking-wider text-white shadow-lg"
			>
				{params.id.toUpperCase()}
			</div>
			<div
				class="min-w-0 flex-1 overflow-hidden"
				transition:fade={{ duration: 300 }}
			>
				<p
					class="truncate whitespace-nowrap text-sm md:text-base text-white/90
		[text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]"
				>
					{#if sources.length > 0}
						{sources
							.map((s) => `${s.title.title} - ${s.title.artist}`)
							.join(", ")}
					{:else}
						No songs in queue yet...
					{/if}
				</p>
			</div>
		</div>
	</div>

	<div
		class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none"
	/>

	{#if showCamera && micStream}
		<video
			bind:this={cameraVideo}
			autoplay
			playsinline
			muted
			class="absolute bottom-6 right-6 w-48 h-36 rounded-2xl border-2 border-white/20 shadow-2xl object-cover z-30 bg-zinc-900"
			transition:fade
		></video>
	{/if}

	<div class="absolute bottom-6 right-58 z-30 flex flex-col items-center gap-2">
		<div
			class="h-36 w-1.5 bg-zinc-800 rounded-full overflow-hidden flex flex-col justify-end"
		>
			<div
				class="w-full bg-green-500 transition-all duration-75"
				style="height: {Math.min(100, micLevel * 1000)}%"
			></div>
		</div>
		<p class="text-[10px] font-bold text-white/40 uppercase tracking-tighter">
			Mic
		</p>
	</div>

	<Toaster />
</div>
