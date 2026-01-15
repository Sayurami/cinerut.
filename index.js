import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    const { action, query, url } = req.query;
    const SRIHUB_KEY = "dew_YyT0KDc2boHDasFlmZCqDcPoeDHReD20aYmEsm1G";

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://cineru.lk/"
    };

    try {
        // 🚀 Root Path Message
        if (!action && !query && !url) {
            return res.status(200).json({ 
                status: true, 
                message: "Cineru API is Live 🚀",
                github: "https://github.com/your-repo" 
            });
        }

        // 1️⃣ Action: Search
        if (action === "search") {
            const searchUrl = `https://api.srihub.store/search/cineru?query=${encodeURIComponent(query)}&apikey=${SRIHUB_KEY}`;
            const response = await axios.get(searchUrl);
            const results = response.data.results || [];
            return res.json({ status: true, results: results.length, data: results });
        }

        // 2️⃣ Action: Movie Details (Scraping buttons from Movie Page)
        if (action === "movie" || action === "details") {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const response = await axios.get(proxyUrl, { headers });
            const $ = cheerio.load(response.data);
            const dl_links = [];

            // 🔍 Screenshot එකේ තිබුණු "Video Copy" වගේ buttons හඳුනාගැනීම
            $("a.wp-block-button__link").each((i, el) => {
                const btnTitle = $(el).text().trim();
                const btnLink = $(el).attr("href");

                if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain") || btnLink.includes("drive.google"))) {
                    dl_links.push({
                        quality: btnTitle.replace(/[📥⬇️]/g, "").trim(),
                        direct_link: btnLink
                    });
                }
            });

            return res.json({
                status: true,
                data: {
                    title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
                    image: $(".poster img").attr("src") || $("article img").first().attr("src"),
                    download_links: dl_links
                }
            });
        }

        // 3️⃣ Action: Get Direct (Bypass dl.cineru.lk tokens)
        if (action === "get_direct") {
            const response = await axios.get(url, { headers, maxRedirects: 15 });
            const finalUrl = response.request.res.responseUrl || url;
            return res.json({ status: true, direct_link: finalUrl });
        }

    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
}
