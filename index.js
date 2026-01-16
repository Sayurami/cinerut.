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

        // 2. Movie Search කිරීම (Updated Logic)
        if (s) {
            const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(targetUrl)}`;
            
            const response = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            // මෙතනදී අපි සෘජුවම post titles තියෙන classes පීරනවා
            $('.post-title a, .entry-title a, article a').each((i, el) => {
                const title = $(el).text().trim();
                let link = $(el).attr('href');

                if (title && title.length > 10 && link) { // නම ටිකක් දිග එකක් නම් විතරක් ගන්නවා (Menu items අයින් කරන්න)
                    if (link.includes('u=')) link = decodeURIComponent(link.split('u=')[1].split('&')[0]);
                    
                    // එකම ලින්ක් එක දෙපාරක් ඇඩ් වීම වළක්වනවා
                    if (!results.some(r => r.url === link)) {
                        results.push({
                            title: title,
                            url: link
                        });
                    }
                }
            });

            return res.status(200).json({ 
                creator: "Hansa Dewmina", 
                success: true, 
                total_results: results.length,
                results: results.slice(0, 20) // මුල් රිසල්ට්ස් 20 විතරක් දෙනවා
            });
        }

        return res.status(200).json({ creator: "Hansa Dewmina", message: "API is Online! Use ?s=movie or ?url=link" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
