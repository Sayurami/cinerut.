import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s } = req.query;

    if (!s) {
        return res.status(200).json({ 
            creator: "Hansa Dewmina", 
            message: "සෙවිය යුතු නම ලබා දෙන්න (Ex: ?s=lucky)" 
        });
    }

    try {
        const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
        // AllOrigins Proxy එක පාවිච්චි කරලා Cloudflare Bypass කරනවා
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        const json = await response.json();
        const html = json.contents; // Proxy එකෙන් එන HTML එක මෙතන තියෙන්නේ

        const $ = cheerio.load(html);
        const results = [];

        // Cineru එකේ ඕනෑම ලින්ක් එකක් පීරනවා
        $('article, .post-item, .item-list').each((i, el) => {
            const titleNode = $(el).find('h2 a, h3 a, a').first();
            const imgNode = $(el).find('img').first();
            
            let title = titleNode.text().trim();
            let link = titleNode.attr('href');
            let image = imgNode.attr('src') || imgNode.attr('data-src');

            // අනවශ්‍ය ලින්ක් අයින් කරලා මූවී ලින්ක් විතරක් ගන්නවා
            if (title && title.length > 5 && link && link.includes('cineru.lk') && !link.includes('?s=')) {
                if (!results.some(r => r.url === link)) {
                    results.push({
                        title: title,
                        url: link,
                        image: image
                    });
                }
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
            error: "Error: " + error.message 
        });
    }
}
