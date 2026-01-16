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
        const query = encodeURIComponent(s);
        const targetUrl = `https://cineru.lk/?s=${query}`;
        
        // Cloudflare bypass කිරීමට Google Proxy පාවිච්චි කිරීම
        const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;

        const { data } = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000 // තත්පර 15ක කාලයක් ලබා දෙනවා
        });

        const $ = cheerio.load(data);
        const results = [];

        // Cineru එකේ HTML එක පීරන ක්‍රමය
        $('article').each((i, el) => {
            const titleNode = $(el).find('h2.post-title a');
            const imgNode = $(el).find('.post-thumbnail img');
            
            let title = titleNode.text().trim();
            let link = titleNode.attr('href');
            let image = imgNode.attr('src') || imgNode.attr('data-src') || imgNode.attr('srcset');

            // Google translate හරහා එන ලින්ක් එකෙන් ඔරිජිනල් එක වෙන් කර ගැනීම
            if (link && link.includes('u=')) {
                link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
            }

            // Image එක srcset එකක තිබුණොත් පළමු image එක තෝරා ගැනීම
            if (image && image.includes(',')) {
                image = image.split(' ')[0];
            }

            if (title) {
                results.push({
                    title: title,
                    url: link,
                    image: image
                });
            }
        });

        // දත්ත ලැබුනේ නැතිනම් සෘජුවම සයිට් එකෙන් උත්සාහ කිරීම (Fallback)
        if (results.length === 0) {
            // මෙතනදී සෘජුවම Fetch කරන්න උත්සාහ කරනවා
            const directData = await axios.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const _$ = cheerio.load(directData.data);
            _$('article').each((i, el) => {
                const t = _$(el).find('h2.post-title a');
                if (t.text()) {
                    results.push({
                        title: t.text().trim(),
                        url: t.attr('href'),
                        image: _$(el).find('img').attr('src')
                    });
                }
            });
        }

        return res.status(200).json({
            creator: "Hansa Dewmina",
            success: true,
            total_results: results.length,
            results: results
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error: " + error.message
        });
    }
}
