import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s } = req.query;

    if (!s) {
        return res.status(200).json({
            creator: "Hansa Dewmina",
            success: false,
            message: "සෙවිය යුතු නම ලබා දෙන්න (Ex: ?s=Good News)"
        });
    }

    try {
        // Cineru සයිට් එකේ Search URL එක
        const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
        
        // Cloudflare bypass කරන්න Google Translate Proxy එක හරහා යනවා
        const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;

        const { data } = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        // Screenshot එකේ තියෙන විදිහට article tags පීරනවා
        $('article').each((i, el) => {
            const titleElement = $(el).find('h2.post-title a, h3.post-title a');
            const imgElement = $(el).find('.post-thumbnail img, .entry-thumb img');
            
            let title = titleElement.text().trim();
            let link = titleElement.attr('href');
            let image = imgElement.attr('src') || imgElement.attr('data-src');

            // Google translate link එක අස්සෙන් original link එක ගලවා ගැනීම
            if (link && link.includes('u=')) {
                link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
            }

            if (title) {
                results.push({
                    title: title,
                    url: link,
                    image: image
                });
            }
        });

        return res.status(200).json({
            creator: "Hansa Dewmina",
            success: true,
            total_results: results.length,
            results: results
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "දත්ත ලබා ගැනීමේදී ගැටලුවක්: " + error.message
        });
    }
}
