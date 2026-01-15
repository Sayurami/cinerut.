const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

const CREATOR = 'VAJIRA';
const API_BASE = "https://api.codetabs.com/v1/proxy?quest="; // 403 Bypass කිරීමට

module.exports = class Cineru {
    constructor() {}

    // ================== SEARCH METHOD ==================
    async search(query) {
        try {
            const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(query)}`;
            // Proxy එක හරහා Request එක යැවීම
            const response = await axios.get(API_BASE + encodeURIComponent(targetUrl));
            const $ = cheerio.load(response.data);
            const movies = [];

            // Cineru සර්ච් රිසල්ට් Selector එක
            $(".result-item").each((i, el) => {
                const title = $(el).find(".title a").text().trim();
                const link = $(el).find(".title a").attr("href");
                const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
                const year = $(el).find(".year").text().trim();
                const imdb = $(el).find(".rating").text().trim() || "N/A";
                const type = "Movie"; 

                if (title && link) {
                    movies.push({ title, imdb, year, link, image, type });
                }
            });

            if (movies.length === 0) {
                return { status: false, message: "No movies found." };
            }

            return { status: true, creator: CREATOR, data: movies };

        } catch (error) {
            console.log({ status: false, creator: CREATOR, error: error.message });
            return { status: false, error: error.message };
        }
    }

    // ================== DOWNLOAD METHOD ==================
    async movieDl(url) {
        try {
            const response = await axios.get(API_BASE + encodeURIComponent(url));
            const $ = cheerio.load(response.data);

            const title = $("h1.entry-title").text().trim() || $("h1").first().text().trim();
            const description = $(".wp-content p").first().text().trim();
            const image = $(".poster img").attr("src") || $("article img").first().attr("src");
            
            // Cineru වල Category සහ Cast සොයාගැනීම (Selectors වෙනස් විය හැක)
            const category = [];
            $(".sgeneros a").each((i, el) => { category.push($(el).text().trim()); });

            const dl_links = [];
            // "Video Copy" හෝ "HC Video Copy" බටන් වල ලින්ක් ගැනීම
            $("a.wp-block-button__link").each((i, el) => {
                const quality = $(el).text().trim();
                const link = $(el).attr("href");

                if (link && (link.includes("dl.cineru.lk") || link.includes("pixeldrain"))) {
                    dl_links.push({ quality, link });
                }
            });

            // බටන් වල තියෙන Direct ලින්ක් එක (Token bypass) ලබා ගැනීමට අමතර පියවරක්
            const detailedLinks = await Promise.all(dl_links.map(async (item) => {
                try {
                    // dl.cineru.lk ලින්ක් එකේ Redirect URL එක ගැනීම
                    const res = await axios.get(item.link, { maxRedirects: 5 });
                    return { ...item, direct_link: res.request.res.responseUrl || item.link };
                } catch {
                    return item;
                }
            }));

            return {
                status: true,
                creator: CREATOR,
                data: {
                    title,
                    image,
                    description,
                    category,
                    dl_links: detailedLinks
                }
            };

        } catch (error) {
            console.log({ status: false, creator: CREATOR, error: error.message });
            return { status: false, error: error.message };
        }
    }
}
