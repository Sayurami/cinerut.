import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    const { s } = req.query; 
    
    // වෙල්කම් මැසේජ් එකක්
    if (!s) {
        return res.status(200).json({ 
            creator: "Hansa Dewmina",
            message: "සෙවිය යුතු නම ලබා දෙන්න (Ex: ?s=maharaja)" 
        });
    }

    const BROWSERLESS_TOKEN = "2TneChv4ickxkIC8237b1c23e826534cc1208fa0821d20bf6"; 
    const targetUrl = `https://cineru.lk/?s=${encodeURIComponent(s)}`;

    let browser;
    try {
        // Browserless හරහා සම්බන්ධ වීම
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
        });

        const page = await browser.newPage();

        // සැබෑ Browser එකක් ලෙස පෙන්වීමට User-Agent එකක් යොදනවා
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // සයිට් එකට යනවා
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // HTML එක ඇතුළෙන් දත්ත ඇදලා ගැනීම (Web Scraping Logic)
        const movies = await page.evaluate(() => {
            const results = [];
            // Cineru සර්ච් රිසල්ට්ස් වල තියෙන article ටැග් එක ගන්නවා
            const items = document.querySelectorAll('article');
            
            items.forEach(item => {
                const titleNode = item.querySelector('.post-title a');
                const imgNode = item.querySelector('.post-thumbnail img');
                const descNode = item.querySelector('.entry p');

                if (titleNode) {
                    results.push({
                        title: titleNode.innerText.trim(),
                        url: titleNode.href,
                        image: imgNode ? (imgNode.getAttribute('src') || imgNode.getAttribute('data-src')) : null,
                        description: descNode ? descNode.innerText.trim() : ""
                    });
                }
            });
            return results;
        });

        await browser.close();

        // අවසන් ප්‍රතිඵලය JSON ලෙස ලබා දීම
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
            error: "Error: " + error.message 
        });
    }
}
