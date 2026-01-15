import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { action, query, url } = req.query;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    };

    if (!action) return res.status(400).json({ status: false, message: "action missing" });

    // 1. Search Action (Cineru එකේ සෙවීම)
    if (action === "search") {
      const { data } = await axios.get(`https://cineru.lk/?s=${encodeURIComponent(query)}`, { headers });
      const $ = cheerio.load(data);
      const results = [];

      $(".result-item").each((i, el) => {
        results.push({
          title: $(el).find(".title a").text().trim(),
          link: $(el).find(".title a").attr("href"),
          image: $(el).find("img").attr("src"),
          type: $(el).find(".post-type").text().trim() || "Movie"
        });
      });
      return res.json({ status: true, data: results });
    }

    // 2. Movie/Details Action (ලින්ක් බටන්ස් ලබා ගැනීම)
    if (action === "movie" || action === "details") {
      const { data } = await axios.get(url, { headers });
      const $ = cheerio.load(data);
      const download_links = [];

      // Cineru එකේ බටන්ස් ඇතුළේ තියෙන Download ලින්ක්ස්
      $("a.wp-block-button__link").each((i, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr("href");

        if (href && (href.includes("dl.cineru.lk") || href.includes("pixeldrain") || href.includes("drive.google"))) {
          download_links.push({
            quality: title,
            direct_link: href
          });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $(".entry-title").text().trim() || $("h1").first().text().trim(),
          image: $(".poster img").attr("src"),
          download_links: download_links
        }
      });
    }

    // 3. Direct Bypass (Token එකෙන් නියම ලින්ක් එක ගැනීම)
    if (action === "get_direct") {
      const response = await axios.head(url, { maxRedirects: 15, headers });
      const finalUrl = response.request.res.responseUrl || url;
      return res.json({ status: true, direct_link: finalUrl });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
