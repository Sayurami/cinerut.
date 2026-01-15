import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { action, query, url } = req.query;

    // 🛡️ Cloudflare/Bot Protection Bypass කරන්න ශක්තිමත් Headers
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Referer": "https://cineru.lk/",
      "Cache-Control": "max-age=0"
    };

    if (!action) return res.status(400).json({ status: false, message: "action missing" });

    // 1. Search
    if (action === "search") {
      const { data } = await axios.get(`https://cineru.lk/?s=${encodeURIComponent(query)}`, { headers, timeout: 10000 });
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

    // 2. Movie Details
    if (action === "movie" || action === "details") {
      const { data } = await axios.get(url, { headers, timeout: 10000 });
      const $ = cheerio.load(data);
      const download_links = [];

      $("a.wp-block-button__link").each((i, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr("href");
        if (href) {
          download_links.push({ quality: title, direct_link: href });
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

    // 3. Direct Link / Token Bypass
    if (action === "get_direct") {
      const response = await axios.get(url, { 
        headers, 
        maxRedirects: 15, 
        timeout: 15000,
        validateStatus: false // Redirects වලදී error නොදී ඉදිරියට යන්න
      });
      const finalUrl = response.request.res.responseUrl || url;
      return res.json({ status: true, direct_link: finalUrl });
    }

  } catch (err) {
    // Error එකේ විස්තර පෙන්වන්න
    return res.status(err.response?.status || 500).json({ 
      status: false, 
      error: err.message,
      code: err.response?.status 
    });
  }
}
