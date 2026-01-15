import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, query, url } = req.query;
    const PROXY = "https://api.codetabs.com/v1/proxy?quest=";

    try {
        if (!action && !query && !url) {
            return res.status(200).json({ status: true, message: "Cineru API is Live  now 🚀" });
        }

        // --- Search Action (Direct Scrape from Cineru) ---
        if (action === "search") {
            const searchUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
            const response = await axios.get(PROXY + encodeURIComponent(searchUrl));
            const $ = cheerio.load(response.data);
            const results = [];

            // සයිට් එකේ Search results තියෙන කොටස් සොයා ගැනීම
            $("article").each((i, el) => {
                const title = $(el).find(".entry-title a").text().trim();
                const link = $(el).find(".entry-title a").attr("href");
                const image = $(el).find("img").attr("src");

                if (title && link) {
                    results.push({ title, link, image });
                }
            });

            return res.json({ status: true, results: results.length, data: results });
        }

        // --- Movie Details Action ---
        if (action === "movie") {
            if (!url) return res.status(400).json({ status: false, error: "URL is required" });

            const response = await axios.get(PROXY + encodeURIComponent(url));
            const $ = cheerio.load(response.data);
            const dl_links = [];

            // ලින්ක් එක ඇතුලේ තියෙන ඩවුන්ලෝඩ් බටන් සෙවීම
            $("a").each((i, el) => {
                const btnTitle = $(el).text().trim();
                const btnLink = $(el).attr("href");

                if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain") || btnLink.includes("mega.nz"))) {
                    dl_links.push({ 
                        name: btnTitle || "Download Link", 
                        link: btnLink 
                    });
                }
            });

            return res.json({
                status: true,
                data: {
                    title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
                    image: $(".wp-block-image img").attr("src"),
                    download_links: dl_links
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ status: false, error: "Cineru Site Error: " + err.message });
    }
}
