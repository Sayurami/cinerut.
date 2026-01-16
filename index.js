export default async function handler(req, res) {
    const { s, url } = req.query;

    // නිර්මාතෘගේ නම සහ මූලික තොරතුරු
    const creatorInfo = { creator: "Hansa Dewmina", success: true };

    try {
        // 1. Movie එක ඇතුළේ තියෙන Download Links ලබා ගැනීම
        if (url) {
            const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const html = await response.text();
            
            // සරල Regex එකකින් ලින්ක් ටික වෙන් කරගන්නවා
            const driveLinks = html.match(/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/g) || [];
            const pixelLinks = html.match(/pixeldrain\.com\/u\/[a-zA-Z0-9_-]+/g) || [];

            const uniqueLinks = [...new Set([...driveLinks, ...pixelLinks])].map(link => ({
                host: link.includes('google') ? 'GDrive' : 'Pixeldrain',
                link: `https://${link}`
            }));

            return res.status(200).json({ ...creatorInfo, download_links: uniqueLinks });
        }

        // 2. Movie Search කිරීම (WordPress API හරහා)
        if (s) {
            // WordPress JSON API එක පාවිච්චි කිරීම
            const wpApiUrl = `https://cineru.lk/wp-json/wp/v2/posts?search=${encodeURIComponent(s)}&_embed`;
            
            const response = await fetch(wpApiUrl);
            if (!response.ok) throw new Error("Cineru API Access Denied");

            const posts = await response.json();
            
            const results = posts.map(post => ({
                title: post.title.rendered
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8212;/g, '--'),
                url: post.link,
                image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
                posted_date: post.date
            }));

            return res.status(200).json({
                ...creatorInfo,
                total_results: results.length,
                results: results
            });
        }

        // Endpoint එකට නිකන්ම ආවොත් පෙන්වන මැසේජ් එක
        return res.status(200).json({ 
            ...creatorInfo, 
            status: "Running",
            usage: {
                search: "/?s=movie_name",
                links: "/?url=movie_url"
            }
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: "Error: " + error.message 
        });
    }
}
