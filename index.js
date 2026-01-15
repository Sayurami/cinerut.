import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
    // CORS ප්‍රශ්න විසඳීම
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, query, url } = req.query;
    const SRIHUB_KEY = "dew_YyT0KDc2boHDasFlmZCqDcPoeDHReD20aYmEsm1G";
    const PROXY = "https://api.codetabs.com/v1/proxy?quest=";

    try {
        // කිසිම command එකක් නැත්නම්
        if (!action && !query && !url) {
            return res.status(200).json({ status: true, message: "Cineru API is Live 🚀" });
        }

        // --- Search කිරීම ---
        if (action === "search") {
            const searchUrl = `https://api.srihub.store/search/cineru?query=${encodeURIComponent(query)}&apikey=${SRIHUB_KEY}`;
            const response = await axios.get(searchUrl);
            return res.json({ 
                status: true, 
                results: response.data.results?.length || 0, 
                data: response.data.results || [] 
            });
        }

        // --- Movie Details සහ Links ගැනීම ---
        if (action === "movie") {
            if (!url) return res.status(400).json({ status: false, error: "URL is required" });

            // Headers දමා Request යැවීම (Block නොවී ඉන්න)
            const response = await axios.get(PROXY + encodeURIComponent(url), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const dl_links = [];

            // ලින්ක්ස් ෆිල්ටර් කිරීම (Select links containing specific keywords)
            $("a").each((i, el) => {
                const btnTitle = $(el).text().trim();
                const btnLink = $(el).attr("href");

                if (btnLink) {
                    // ලින්ක් එකේ මේ වචන තියෙනවද බලනවා
                    const isDownloadLink = btnLink.includes("dl.cineru.lk") || 
                                         btnLink.includes("pixeldrain") || 
                                         btnLink.includes("mega.nz") || 
                                         btnLink.includes("drive.google.com");

                    if (isDownloadLink) {
                        dl_links.push({ 
                            quality: btnTitle || "Download Link", 
                            link: btnLink 
                        });
                    }
                }
            });

            return res.json({
                status: true,
                data: {
                    title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
                    thumbnail: $(".wp-block-image img").attr("src"), // පින්තූරය ගන්න විදිහ
                    download_links: dl_links
                }
            });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, error: err.message });
    }
}
