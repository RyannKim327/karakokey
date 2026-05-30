import * as pup from "puppeteer-extra";
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const puppet = pup.default

export default async function SaveFromNet(videoID: string) {
	puppet.use(StealthPlugin())

	let browser
	try {
		browser = await puppet.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox'
			]
		})
		const page = await browser.newPage()

		await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
		await page.goto("https://en.savefrom.net/", {
			waitUntil: 'networkidle2'
		})

		await page.waitForSelector('#sf_url')
		await page.type('#sf_url', `https://youtube.com/watch?v=${videoID}`)
		await page.click('#sf_submit')

		try {
			await page.waitForSelector('.link-download', {
				timeout: 30000
			})
		} catch (e) {
			const isError = await page.$('.error-box')
			if (isError) {
				const error = await page.$eval('.error-box', el => el.innerText.trim())
				throw new Error(error)
			}
			throw new Error('Timeout waiting for download links. The site might be slow or the URL might be invalid')
		}

		const data = await page.evaluate(() => {
			const title = document.querySelector('.info-box .title')?.innerText.trim() ||
				document.querySelector('.name')?.innerText?.trim();
			const thumbnail = document.querySelector('.info-box .thumb img')?.src ||
				document.querySelector('.img-video img')?.src;
			const duration = document.querySelector('.info-box .duration')?.innerText.trim() ||
				document.querySelector('.duration')?.innerText?.trim();

			const links = Array.from(document.querySelectorAll('.link-download')).map(link => ({
				name: title, //(link.getAttribute('title') || link.innerText?.trim() || 'Download') && !link.innerText.trim().includes("without audio"),
				subname: link.innerText.trim(),
				url: link.getAttribute('href'),
				type: link.getAttribute('data-type') || 'mp4'
			})).filter(l => l.url && l.url !== '#' && (l.type.toLowerCase().includes("mp4") && !l.type.toLowerCase().includes("dash")));

			return {
				url: links
			}
			// meta: { title, thumbnail, duration, source: 'SaveFrom' },
		})
		await browser.close()
		return data

	} catch (e) {
		if (browser) await browser.close()
		return {
			error: e.message
		}
	}
}
