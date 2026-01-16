import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s, url } = req.query;

    try {
        // 1. Download Links ලබා ගැනීම
        if (url) {
            const target = decodeURIComponent(url);
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(target)}`;
            
            const response = await fetch(proxyUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            const $ = cheerio.load(html);
            const downloadLinks = [];

            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    // Google translate link එක අස්සෙන් original link එක වෙන් කර ගැනීම
                    let finalLink = href;
                    if (href.includes('u=')) {
                        finalLink = decodeURIComponent(href.split('u=')[1].split('&')[0]);
                    }

                    if (finalLink.includes('drive.google.com') || finalLink.includes('pixeldrain.com')) {
                        downloadLinks.push({
                            host: finalLink.includes('google') ? 'GDrive' : 'Pixeldrain',
                            link: finalLink
                        });
                    }
                }
            });

            return res.status(200).json({ 
                creator: "Hansa Dewmina", 
                success: true, 
                download_links: downloadLinks 
            });
        }

        // 2. Movie Search කිරීම
        if (s) {
            const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;
            
            const response = await fetch(proxyUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            $('article').each((i, el) => {
                const titleNode = $(el).find('h2.post-title a');
                if (titleNode.length > 0) {
                    let link = titleNode.attr('href');
                    if (link && link.includes('u=')) {
                        link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
                    }
                    results.push({
                        title: titleNode.text().trim(),
                        url: link,
                        image: $(el).find('img').attr('src')
                    });
                }
            });

            return res.status(200).json({ 
                creator: "Hansa Dewmina", 
                success: true, 
                total_results: results.length,
                results 
            });
        }

        // Default Message
        return res.status(200).json({ 
            creator: "Hansa Dewmina", 
            message: "වැඩේ එලකිරි වගේ වැඩ! පාවිච්චි කරන්න: ?s=මූවී_නම හෝ ?url=ලින්ක්_එක" 
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "අවුලක් වුණා මචං: " + error.message 
        });
    }
}
