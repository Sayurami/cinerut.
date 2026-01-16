import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    const { s } = req.query; // Search query එක මෙතනින් ගන්නවා
    if (!s) return res.status(400).json({ error: "සෙවිය යුතු නම ලබා දෙන්න (Ex: ?s=spider)" });

    // ඔයා දීපු Token එක
    const BROWSERLESS_TOKEN = "2TneChv4ickxkIC8237b1c23e826534cc1208fa0821d20bf6"; 
    const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;

    let browser;
    try {
        // Browserless Remote Browser එකට සම්බන්ධ වීම
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
        });

        const page = await browser.newPage();

        // සැබෑ Browser එකක් වගේ පෙන්වීමට User-Agent එකක් සෙට් කරනවා
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // සයිට් එකට යනවා
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // HTML එක ඇතුළෙන් දත්ත ටික ඇදලා ගන්නවා
        const movies = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('article.item-list');
            
            items.forEach(item => {
                const titleNode = item.querySelector('.post-title a');
                const imgNode = item.querySelector('.post-thumbnail img');
                const descNode = item.querySelector('.entry p');

                if (titleNode) {
                    results.push({
                        title: titleNode.innerText.trim(),
                        url: titleNode.href,
                        image: imgNode ? imgNode.src : null,
                        description: descNode ? descNode.innerText.trim() : ""
                    });
                }
            });
            return results;
        });

        await browser.close();

        // ප්‍රතිඵල ලබා දීම
        return res.status(200).json({
            creator: "Hansa Dewmina",
            success: true,
            total_results: movies.length,
            results: movies
        });

    } catch (error) {
        if (browser) await browser.close();
        console.error(error);
        return res.status(500).json({ 
            success: false, 
            error: "Browserless Error: " + error.message 
        });
    }
}
