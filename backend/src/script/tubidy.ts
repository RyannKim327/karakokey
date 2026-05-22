import { Tubidy } from "tubidy-scrape";
import { SearchResults } from "tubidy-scrape/dist/interfaces";

export async function search(song: string) {
	const tubidy = Tubidy()
	const songs = await tubidy.search(`${song} karaoke`, 3)
	let results: SearchResults[] = []

	for (let i = 0; i < songs.length; i++) {
		const s = songs[i]
		const r = await tubidy.review(s.id)
		if (r.success && !r.error) {
			results.push(s)
		}
	}

	return results
}

export async function play(id: string) {
	const tubidy = Tubidy()
	const play = await tubidy.download(id, "video")
	if (play.play) {
		return {
			url: play.play
		}
	} else {
		return {
			error: play.error ?? "Something went wrong"
		}
	}
}
