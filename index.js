import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { action, query, url } = req.query;

  // 🛡️ User-Agent එක අනිවාර්යයි
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  try {
    if (!action) return res.status(400).json({ status: false, message: "Action missing" });

    // 1️⃣ SEARCH: https://cinerut-j2r7.vercel.app/api?action=search&query=නම
    if (action === "search") {
      const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
      // 🚀 CodeTabs Proxy එක හරහා Request එක යැවීම
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const results = [];

      $(".result-item").each((i, el) => {
        results.push({
          title: $(el).find(".title a").text().trim(),
          link: $(el).find(".title a").attr("href"),
          image: $(el).find("img").attr("src"),
          year: $(el).find(".year").text().trim()
        });
      });
      return res.json({ status: true, data: results });
    }

    // 2️⃣ MOVIE DETAILS: https://cinerut-j2r7.vercel.app/api?action=movie&url=CINERU_URL
    if (action === "movie") {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
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
          title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
          image: $(".poster img").attr("src"),
          download_links
        }
      });
    }

    // 3️⃣ BYPASS: https://cinerut-j2r7.vercel.app/api?action=get_direct&url=TOKEN_URL
    if (action === "get_direct") {
      // Direct Link එකට Proxy අවශ්‍ය නැහැ, Axios Redirects පාවිච්චි කරමු
      const response = await axios.get(url, { headers, maxRedirects: 15 });
      const finalUrl = response.request.res.responseUrl || url;
      return res.json({ status: true, direct_link: finalUrl });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
