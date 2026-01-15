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
            return res.status(200).json({ status: true, message: "Cineru API is Live 🚀" });
        }

        // --- Search Action ---
        if (action === "search") {
            const searchUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
            const response = await axios.get(PROXY + encodeURIComponent(searchUrl));
            const $ = cheerio.load(response.data);
            const results = [];

            // Cineru සයිට් එකේ Search results අල්ලගන්න පුළුවන් හැම විදිහක්ම මෙතන තියෙනවා
            $("article, .post, .result-item").each((i, el) => {
                const titleElement = $(el).find("h2 a, h3 a, .entry-title a").first();
                const title = titleElement.text().trim();
                const link = titleElement.attr("href");
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

            // ඩවුන්ලෝඩ් ලින්ක්ස් සෙවීම
            $("a").each((i, el) => {
                const btnTitle = $(el).text().trim();
                const btnLink = $(el).attr("href");

                // Download Button එකක් කියලා හඳුනාගන්න පුළුවන් වචන
                if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain") || btnLink.includes("mega.nz"))) {
                    dl_links.push({ name: btnTitle || "Download Link", link: btnLink });
                }
            });

            return res.json({
                status: true,
                data: {
                    title: $("h1").first().text().trim(),
                    image: $(".wp-block-image img, .featured-media img").attr("src"),
                    download_links: dl_links
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
}
