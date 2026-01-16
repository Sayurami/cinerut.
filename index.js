import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s, url } = req.query;
    const creatorInfo = { creator: "Hansa Dewmina", success: true };

    try {
        // 1. Download Links (Directly trying Pixeldrain/GDrive search within the page)
        if (url) {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const html = data.contents;
            
            const driveLinks = html.match(/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/g) || [];
            const pixelLinks = html.match(/pixeldrain\.com\/u\/[a-zA-Z0-9_-]+/g) || [];

            const uniqueLinks = [...new Set([...driveLinks, ...pixelLinks])].map(link => ({
                host: link.includes('google') ? 'GDrive' : 'Pixeldrain',
                link: `https://${link}`
            }));

            return res.status(200).json({ ...creatorInfo, download_links: uniqueLinks });
        }

        // 2. Movie Search (Using Google Search to bypass Cloudflare)
        if (s) {
            const googleSearchUrl = `https://www.google.com/search?q=site:cineru.lk+${encodeURIComponent(s)}`;
            
            const response = await fetch(googleSearchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36' }
            });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            // Google Search Results වලින් Cineru ලින්ක් ටික වෙන් කරගැනීම
            $('div.g').each((i, el) => {
                const title = $(el).find('h3').text();
                const link = $(el).find('a').attr('href');

                if (title && link && link.includes('cineru.lk')) {
                    results.push({
                        title: title.replace(' - සිනෙරූ - සිංහල උපසිරැසි', '').trim(),
                        url: link
                    });
                }
            });

            return res.status(200).json({
                ...creatorInfo,
                total_results: results.length,
                results: results
            });
        }

        return res.status(200).json({ ...creatorInfo, message: "Use ?s=name for Google-Powered search" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
