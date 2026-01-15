import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { action, query, url } = req.query;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  try {
    if (!action) return res.status(400).json({ status: false, message: "Action missing" });

    // 1️⃣ SEARCH: https://cinerut-j2r7.vercel.app/api?action=search&query=avatar
    if (action === "search") {
      const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const results = [];

      // Cineru අලුත් සර්ච් රිසල්ට්ස් වල තියෙන්නේ 'article' ටැග් එක ඇතුළේ
      $("article").each((i, el) => {
        const title = $(el).find(".entry-title a").text().trim() || $(el).find("h2 a").text().trim();
        const link = $(el).find(".entry-title a").attr("href") || $(el).find("h2 a").attr("href");
        const image = $(el).find("img").attr("src");

        if (title && link) {
          results.push({ title, link, image });
        }
      });

      return res.json({ status: true, results: results.length, data: results });
    }

    // 2️⃣ MOVIE DETAILS & DOWNLOAD LINKS
    if (action === "movie") {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const download_links = [];

      // Cineru download buttons (Video Copy, HC Video Copy, ආදිය)
      $("a.wp-block-button__link").each((i, el) => {
        const btnTitle = $(el).text().trim();
        const btnLink = $(el).attr("href");
        if (btnLink) {
          download_links.push({ quality: btnTitle, direct_link: btnLink });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
          image: $(".poster img").attr("src") || $("article img").first().attr("src"),
          download_links
        }
      });
    }

    // 3️⃣ BYPASS (Token ලින්ක් එකෙන් නියම ලින්ක් එකට)
    if (action === "get_direct") {
      const response = await axios.get(url, { headers, maxRedirects: 15 });
      const finalUrl = response.request.res.responseUrl || url;
      return res.json({ status: true, direct_link: finalUrl });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
