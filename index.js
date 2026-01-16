import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s } = req.query;

    if (!s) {
        return res.status(200).json({
            creator: "Hansa Dewmina",
            success: false,
            message: "සෙවිය යුතු නම ලබා දෙන්න (Ex: ?s=maharaja)"
        });
    }

    try {
        // Cloudflare Bypass කරන්න Google Translate Proxy එක පාවිච්චි කරනවා
        const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
        const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;

        const { data } = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        // Cineru සයිට් එකේ සර්ච් රිසල්ට්ස් තියෙන Selector එක
        $('article').each((i, el) => {
            const titleElement = $(el).find('h2.post-title a');
            const imgElement = $(el).find('.post-thumbnail img');
            const descElement = $(el).find('.entry p');

            let title = titleElement.text().trim();
            let link = titleElement.attr('href');
            let image = imgElement.attr('src') || imgElement.attr('data-src');

            // Google Translate ලින්ක් එක අස්සෙන් ඔරිජිනල් ලින්ක් එක ගලවා ගැනීම
            if (link && link.includes('u=')) {
                link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
            }

            if (title) {
                results.push({
                    title: title,
                    url: link,
                    image: image,
                    description: descElement.text().trim() || ""
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
            error: "Error fetching data: " + error.message
        });
    }
}
