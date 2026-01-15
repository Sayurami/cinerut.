import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { action, query, url } = req.query;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    };

    if (!action) return res.status(400).json({ status: false, message: "action missing" });

    // --- 1. SEARCH ACTION ---
    if (action === "search") {
      const { data } = await axios.get(`https://cineru.lk/?s=${encodeURIComponent(query)}`, { headers });
      const $ = cheerio.load(data);
      const results = [];

      $(".result-item").each((i, el) => {
        results.push({
          title: $(el).find(".title a").text().trim(),
          link: $(el).find(".title a").attr("href"),
          image: $(el).find("img").attr("src") || $(el).find(".poster img").attr("src"),
          rating: $(el).find(".rating").text().trim(),
          year: $(el).find(".year").text().trim()
        });
      });
      return res.json({ status: true, data: results });
    }

    // --- 2. MOVIE DETAILS & DOWNLOAD BUTTONS ---
    if (action === "movie" || action === "details") {
      if (!url) return res.status(400).json({ status: false, message: "url missing" });
      
      const { data } = await axios.get(url, { headers });
      const $ = cheerio.load(data);
      const download_options = [];

      // Cineru එකේ බටන්ස් (HC Video, Video Copy, etc.)
      $("a.wp-block-button__link").each((i, el) => {
        const btnText = $(el).text().trim();
        const btnLink = $(el).attr("href");

        if (btnLink && (btnLink.includes("dl.cineru.lk") || btnLink.includes("pixeldrain") || btnLink.includes("drive"))) {
            download_options.push({
            quality: btnText,
            link: btnLink
          });
        }
      });

      return res.json({
        status: true,
        data: {
          title: $(".data h1").text().trim() || $("h1.entry-title").text().trim(),
          image: $(".poster img").attr("src"),
          description: $(".wp-content p").first().text().trim(),
          download_links: download_options
        }
      });
    }

    // --- 3. TOKEN BYPASS (Optional - Direct Link Generation) ---
    // සටහන: dl.cineru.lk ලින්ක් බොට් එකෙන්ම Headers check කරලා ගන්න පුළුවන් නිසා 
    // මේ API එකෙන් ඩිරෙක්ට් බටන් ලින්ක් එක දෙන එක තමයි ලේසිම.
    if (action === "get_direct") {
        if (!url) return res.status(400).json({ status: false, message: "url missing" });
        
        // Headers පරීක්ෂා කරලා Redirect වන අවසාන URL එක ලබා ගැනීම
        const response = await axios.head(url, { maxRedirects: 15, headers });
        const direct = response.request.res.responseUrl || url;
        
        return res.json({ status: true, direct_link: direct });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
