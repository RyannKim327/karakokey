<script lang="ts">
	import axios from "axios";
	import { API_HOST, WS_HOST } from "@/lib/config";

	interface SongInfo {
		title: string;
		url: string;
	}

	let { params }: { params: { id: string } } = $props();

	let socket: WebSocket;
	let search = $state("");
	let activated = $state(false);
	let loading = $state(true);
	let isSearching = $state(false);
	let songs = $state<Record<string, any>[]>([]);

	$effect(() => {
		socket = new WebSocket(`${WS_HOST}/${params.id.toLowerCase()}?role=book`);

		socket.onopen = () => {
			console.log("Initiated");
			loading = false;
			socket.send(JSON.stringify({ check: true }));
		};

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (typeof data.play === "boolean") {
				activated = data.play ?? false;
			}
			if (activated) {
				loading = false;
			}
		};

		socket.onerror = (error: Event) => {
			console.error(error);
			loading = false;
		};

		socket.onclose = () => {
			console.log("Disconnected");
		};

		return () => {
			socket.close();
		};
	});

	function send(song: SongInfo) {
		socket.send(
			JSON.stringify({ title: parseSongInfo(song.title), url: song.url }),
		);
	}

	async function searchSong() {
		isSearching = true;
		const { data } = await axios.get(`${API_HOST}/search?q=${search}`);
		songs = data;
		isSearching = false;
	}

	function parseSongInfo(rawTitle: string): { title: string; artist: string } {
		const cleaned = rawTitle
			.replace(/\(.*?\)/gi, "") // remove (Karaoke)
			.replace(/\[.*?\]/gi, "") // remove [Karaoke Instrumental]
			.replace(
				/karaoke|instrumental|karafun|piano|version|lower key|higher key/gi,
				"",
			)
			.replace(/\|.*/g, "") // remove after pipe
			.replace(/\s{2,}/g, " ") // collapse spaces
			.trim();

		// Split on "--" first, then fall back to " - " (with spaces, to avoid "Gloc-9")
		const parts = cleaned.split(/\s*--\s*|\s+-\s+/);

		if (parts.length >= 2) {
			const [first, second] = parts.map((p) => p.trim());
			return { title: first, artist: second };
		}

		return { title: cleaned, artist: "Unknown Artist" };
	}
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center text-zinc-400">
		Loading session...
	</div>
{:else if !activated}
	<div class="min-h-screen flex items-center justify-center text-red-400">
		Waiting for host to activate room...
	</div>
{:else}
	<div
		class="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 text-white p-4 md:p-6"
	>
		<div class="mx-auto max-w-3xl">
			<div
				class="mb-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl"
			>
				<div
					class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
				>
					<div>
						<p class="text-sm uppercase tracking-[0.3em] text-zinc-400">
							Room ID
						</p>

						<h1 class="text-4xl font-black tracking-tight text-red-400">
							{params.id.toUpperCase()}
						</h1>
					</div>

					<div class="text-sm text-zinc-400">🎤 Songbook Queue System</div>
				</div>

				<div class="mt-6 relative">
					<input
						type="search"
						disabled={loading}
						bind:value={search}
						placeholder="Search songs..."
						class="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 pr-12 text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/30 placeholder:text-zinc-500"
						onkeydown={(e) => e.key === "Enter" && searchSong()}
					/>
					<div
						class="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 cursor-pointer"
						onclick={() => {
							searchSong();
						}}
					>
						🔍
					</div>
				</div>
			</div>

			<div class="space-y-3">
				{#if isSearching}
					<div
						class="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-zinc-500"
					>
						Please Wait
					</div>
				{:else}
					{#each songs as song}
						<div
							class="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md transition hover:border-red-500/40 hover:bg-white/10"
						>
							<div class="min-w-0">
								<h2 class="truncate text-lg font-semibold text-white">
									{parseSongInfo(song.title).title} - {parseSongInfo(song.title)
										.artist}
								</h2>

								<p class="text-sm text-zinc-500 truncate">Ready to Queue</p>
							</div>

							<button
								class="ml-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-2xl font-bold text-white shadow-lg shadow-red-500/20 transition hover:scale-105 hover:bg-red-400 active:scale-95"
								onclick={() =>
									send({
										title: song.title,
										url: song.id,
									})}
							>
								+
							</button>
						</div>
					{/each}

					{#if songs.length === 0}
						<div
							class="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-zinc-500"
						>
							No songs found.
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
