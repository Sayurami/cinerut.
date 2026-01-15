import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    const { action, query, url } = req.query;
    const SRIHUB_KEY = "dew_YyT0KDc2boHDasFlmZCqDcPoeDHReD20aYmEsm1G";
    const PROXY = "https://api.codetabs.com/v1/proxy?quest=";

    try {
        if (!action && !query && !url) {
            return res.status(200).json({ status: true, message: "Cineru API is Live 🚀" });
        }

        // --- Search ---
        if (action === "search") {
            const searchUrl = `https://api.srihub.store/search/cineru?query=${encodeURIComponent(query)}&apikey=${SRIHUB_KEY}`;
            const response = await axios.get(searchUrl);
            return res.json({ status: true, results: response.data.results?.length || 0, data: response.data.results || [] });
        }

        // --- Movie Details ---
        if (action === "movie") {
            const response = await axios.get(PROXY + encodeURIComponent(url));
            const $ = cheerio.load(response.data);
            const dl_links = [];

            $("a.wp-block-button__link").each((i, el) => {
                const btnTitle = $(el).text().trim();
                const btnLink = $(el).attr("href");
                if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain"))) {
                    dl_links.push({ quality: btnTitle, link: btnLink });
                }
            });

            return res.json({
                status: true,
                data: {
                    title: $("h1").first().text().trim(),
                    download_links: dl_links
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
}
