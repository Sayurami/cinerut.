import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { action, query, url } = req.query;
  // 🔑 ඔයාගේ SriHub API Key එක මෙතනට දාන්න (ඔයා එවපු එක මම මේකේ දාලා තියෙන්නේ)
  const SRIHUB_KEY = "dew_YyT0KDc2boHDasFlmZCqDcPoeDHReD20aYmEsm1G";

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://cineru.lk/"
  };

  try {
    if (!action) return res.status(400).json({ status: false, message: "action missing" });

    // --- 1. SEARCH ACTION ---
    if (action === "search") {
      // 🛡️ Cloudflare bypass කරන්න SriHub Search API එක පාවිච්චි කරමු
      const searchUrl = `https://api.srihub.store/search/cineru?query=${encodeURIComponent(query)}&apikey=${SRIHUB_KEY}`;
      const response = await axios.get(searchUrl);
      
      if (response.data && response.data.results) {
        return res.json({ 
          status: true, 
          results: response.data.results.length, 
          data: response.data.results 
        });
      } else {
        return res.json({ status: true, results: 0, data: [] });
      }
    }

    // --- 2. MOVIE DETAILS & DOWNLOAD BUTTONS ---
    if (action === "movie") {
      // මෙතනදී සයිට් එකේ Page එකට ගිහින් HTML එක ගන්නවා
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { headers });
      const $ = cheerio.load(response.data);
      const dl_links = [];

      // 🔍 Screenshot එකේ තියෙන 'Video Copy', 'HC Video Copy' වගේ බටන් හොයාගැනීම
      $("a.wp-block-button__link").each((i, el) => {
        const btnTitle = $(el).text().trim();
        const btnLink = $(el).attr("href");

        if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain") || btnLink.includes("drive.google"))) {
          dl_links.push({
            quality: btnTitle.replace(/[📥⬇️]/g, "").trim(),
            direct_link: btnLink
          });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $("h1.entry-title").text().trim() || $("h1").first().text().trim(),
          image: $(".poster img").attr("src") || $("article img").first().attr("src"),
          download_links: dl_links
        }
      });
    }

    // --- 3. TOKEN BYPASS ---
    if (action === "get_direct") {
      const response = await axios.get(url, { headers, maxRedirects: 15 });
      const finalUrl = response.request.res.responseUrl || url;
      return res.json({ status: true, direct_link: finalUrl });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
