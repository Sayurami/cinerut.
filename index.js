import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { s, url } = req.query;

    try {
        // 1. Download Links ලබා ගැනීම
        if (url) {
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await response.text();
            const $ = cheerio.load(html);
            const downloadLinks = [];

            $('a').each((i, el) => {
                let href = $(el).attr('href');
                if (href) {
                    if (href.includes('u=')) href = decodeURIComponent(href.split('u=')[1].split('&')[0]);
                    if (href.includes('drive.google.com') || href.includes('pixeldrain.com')) {
                        downloadLinks.push({
                            host: href.includes('google') ? 'GDrive' : 'Pixeldrain',
                            link: href
                        });
                    }
                }
            });
            return res.status(200).json({ creator: "Hansa Dewmina", success: true, download_links: downloadLinks });
        }

        // 2. Movie Search කිරීම (Enhanced Selectors)
        if (s) {
            const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;
            
            const response = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            // සෘජුවම article ඇතුළේ තියෙන ලින්ක්ස් පීරනවා
            $('article').each((i, el) => {
                const titleNode = $(el).find('h2 a, h3 a, .post-title a');
                const imgNode = $(el).find('img');
                
                let title = titleNode.text().trim();
                let link = titleNode.attr('href');
                let image = imgNode.attr('src') || imgNode.attr('data-src');

                if (title && link) {
                    if (link.includes('u=')) link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
                    
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
        }

        return res.status(200).json({ creator: "Hansa Dewmina", message: "API is Online! Use ?s=movie or ?url=link" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
