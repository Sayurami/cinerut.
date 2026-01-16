export default async function handler(req, res) {
    const { s, url } = req.query;
    const creatorInfo = { creator: "Hansa Dewmina", success: true };

    try {
        // 1. Download Links ලබා ගැනීම
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

        // 2. Movie Search කිරීම (Cloudflare Bypass Trick)
        if (s) {
            const wpApiUrl = `https://cineru.lk/wp-json/wp/v2/posts?search=${encodeURIComponent(s)}&_embed`;
            
            // සෘජුවම යන්නේ නැතිව AllOrigins proxy එක හරහා යනවා
            const finalUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(wpApiUrl)}`;

            const response = await fetch(finalUrl);
            if (!response.ok) throw new Error("Cloudflare strongly blocking all proxies.");

            const jsonResponse = await response.json();
            const posts = JSON.parse(jsonResponse.contents); // Proxy එක ඇතුලේ එන්නේ string එකක් නිසා parse කරනවා
            
            const results = posts.map(post => ({
                title: post.title.rendered.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'"),
                url: post.link,
                image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
                date: post.date
            }));

            return res.status(200).json({
                ...creatorInfo,
                total_results: results.length,
                results: results
            });
        }

        return res.status(200).json({ ...creatorInfo, message: "Use ?s=name for search or ?url=link for links" });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Bypass Error: " + error.message,
            tip: "Try searching again in a few seconds."
        });
    }
}
