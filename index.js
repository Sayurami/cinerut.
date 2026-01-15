import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { action, query, url } = req.query;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    if (!action) return res.status(400).json({ status: false, message: "Action missing" });

    // 1️⃣ SEARCH ACTION
    if (action === "search") {
      // මෙන්න මේ URL එක පාවිච්චි කරමු (WordPress search path)
      const targetUrl = `https://cineru.lk/search/${encodeURIComponent(query)}`;
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const results = [];

      // වඩාත් පුළුල් selectors පාවිච්චි කරමු
      $("article, .post, .result-item, .post-column, .item").each((i, el) => {
        const titleTag = $(el).find("h2 a, h3 a, .entry-title a, .title a").first();
        const title = titleTag.text().trim();
        const link = titleTag.attr("href");
        
        // Image එක විවිධ තැන්වල තිබිය හැක
        const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");

        if (title && link && link.includes("cineru.lk")) {
          results.push({
            title: title,
            link: link,
            image: image || "https://dummyimage.com/600x400/000/fff&text=No+Thumbnail"
          });
        }
      });

      // Duplicate ඉවත් කිරීම
      const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i);

      return res.json({ 
        status: true, 
        results: uniqueResults.length, 
        data: uniqueResults 
      });
    }

    // 2️⃣ MOVIE DETAILS & DOWNLOAD LINKS
    if (action === "movie") {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const download_links = [];

      // Cineru download buttons
      $("a[href*='dl.cineru.lk'], a[href*='pixeldrain'], a.wp-block-button__link").each((i, el) => {
        const btnTitle = $(el).text().trim() || "Download Now";
        const btnLink = $(el).attr("href");
        
        if (btnLink && !download_links.some(d => d.direct_link === btnLink)) {
          download_links.push({
            quality: btnTitle.replace(/[📥⬇️]/g, "").trim(),
            direct_link: btnLink
          });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $("h1").first().text().trim(),
          image: $(".poster img").attr("src") || $("article img").first().attr("src"),
          download_links: download_links
        }
      });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: "Cineru is blocking the request. Try again later." });
  }
}
