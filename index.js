import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { action, query, url } = req.query;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  try {
    if (!action) return res.status(400).json({ status: false, message: "Action missing" });

    // 1️⃣ SEARCH ACTION
    if (action === "search") {
      const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const results = [];

      // Cineru සර්ච් රිසල්ට්ස් වල තියෙන හැම structure එකක්ම පරීක්ෂා කිරීම
      $("article, .result-item, .post-column").each((i, el) => {
        const titleTag = $(el).find(".entry-title a, .title a, h2 a").first();
        const title = titleTag.text().trim();
        const link = titleTag.attr("href");
        const image = $(el).find("img").attr("src");

        if (title && link) {
          results.push({
            title: title,
            link: link,
            image: image || "https://dummyimage.com/600x400/000/fff&text=No+Image"
          });
        }
      });

      // රිසල්ට්ස් ඩුප්ලිකේට් වෙන එක වැළැක්වීම
      const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);

      return res.json({ 
        status: true, 
        results: uniqueResults.length, 
        data: uniqueResults 
      });
    }

    // 2️⃣ MOVIE DETAILS
    if (action === "movie") {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const download_links = [];

      // Cineru වල තියෙන සියලුම Download Button ලින්ක්ස් (Direct & Table)
      $("a.wp-block-button__link, a[href*='dl.cineru.lk'], a[href*='pixeldrain']").each((i, el) => {
        const btnTitle = $(el).text().trim() || "Download Link";
        const btnLink = $(el).attr("href");
        
        if (btnLink && !download_links.some(d => d.direct_link === btnLink)) {
          download_links.push({
            quality: btnTitle.replace("📥", "").trim(),
            direct_link: btnLink
          });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $("h1.entry-title").first().text().trim() || $("h1").first().text().trim(),
          image: $(".poster img").attr("src") || $("article img").first().attr("src"),
          download_links: download_links
        }
      });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
