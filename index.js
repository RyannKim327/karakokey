const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        await page.goto('https://en.savefrom.net/', { waitUntil: 'networkidle2' });

        // Type the URL
        await page.waitForSelector('#sf_url');
        await page.type('#sf_url', videoUrl);
        await page.click('#sf_submit');

        // Wait for results
        try {
            await page.waitForSelector('.link-download', { timeout: 30000 });
        } catch (e) {
            // Check if error message appeared instead
            const isError = await page.$('.error-box');
            if (isError) {
                const errorMsg = await page.$eval('.error-box', el => el.innerText.trim());
                throw new Error(errorMsg);
            }
            throw new Error('Timeout waiting for download links. The site might be slow or the URL might be invalid.');
        }

        // Extract data
        const data = await page.evaluate(() => {
            const title = document.querySelector('.info-box .title')?.innerText.trim() || 
                          document.querySelector('.name')?.innerText.trim();
            const thumbnail = document.querySelector('.info-box .thumb img')?.src ||
                              document.querySelector('.img-video img')?.src;
            const duration = document.querySelector('.info-box .duration')?.innerText.trim() ||
                             document.querySelector('.duration')?.innerText.trim();
            
            const links = Array.from(document.querySelectorAll('.link-download')).map(link => ({
                name: link.getAttribute('title') || link.innerText.trim() || 'Download',
                subname: link.innerText.trim(),
                url: link.getAttribute('href'),
                type: link.getAttribute('data-type') || 'mp4'
            })).filter(l => l.url && l.url !== '#');

            return {
                meta: { title, thumbnail, duration, source: 'SaveFrom' },
                url: links
            };
        });

        await browser.close();
        res.json(data);
    } catch (error) {
        if (browser) await browser.close();
        console.error('Scraping Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
