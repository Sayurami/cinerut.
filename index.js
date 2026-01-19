import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = 'https://cinesubz.co';

const API_INFO = {
  developer: 'Mr Senal',
  version: 'v1.5 - Mega Fix',
  api_name: 'CineSubz Movie Downloader API'
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://cinesubz.co/'
};

app.use(express.json());

// --- URL Transformer (Sonic Cloud Fix) ---
function transformDownloadUrl(originalUrl) {
  if (!originalUrl) return null;
  
  let modifiedUrl = originalUrl;
  const mappings = [
    { s: 'google.com/server1', r: 'cloud.sonic-cloud.online/server1/' },
    { s: 'google.com/server2', r: 'cloud.sonic-cloud.online/server2/' },
    { s: 'google.com/server3', r: 'cloud.sonic-cloud.online/server3/' },
    { s: 'google.com/server4', r: 'cloud.sonic-cloud.online/server4/' },
    { s: 'google.com/server5', r: 'cloud.sonic-cloud.online/server5/' }
  ];

  mappings.forEach(m => {
    if (modifiedUrl.includes(m.s)) {
      modifiedUrl = modifiedUrl.replace(/https:\/\/google\.com\/server\d+\/\d+:\//, `https://${m.r}`);
      // Extension fix
      if (modifiedUrl.includes('.mp4')) modifiedUrl = modifiedUrl.replace('.mp4', '?ext=mp4');
      if (modifiedUrl.includes('.mkv')) modifiedUrl = modifiedUrl.replace('.mkv', '?ext=mkv');
    }
  });

  return modifiedUrl.replace('srilank222', 'srilanka2222');
}

// --- Endpoints ---

app.get('/', (req, res) => res.json(API_INFO));

// Search & Details simplified for brevity
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const { data } = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(q)}`, { headers });
    const $ = cheerio.load(data);
    const results = [];
    $('article').each((i, el) => {
      results.push({
        title: $(el).find('h3').text().trim(),
        url: $(el).find('a').attr('href')
      });
    });
    res.json({ results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- THE MAIN FIX: Scrape Button Links ---
app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL එක දීපන් පකෝ' });

    const response = await axios.get(url, { headers, timeout: 15000 });
    const html = response.data;
    const $ = cheerio.load(html);

    // 1. ගන්න පුළුවන් File Info ටික ගන්නවා (The First Snow...)
    const file_info = {
      name: $('.file-info span').eq(0).text().trim() || 'Unknown',
      size: $('.file-info span').eq(1).text().trim() || 'Unknown'
    };

    // 2. JavaScript Variable එක අස්සේ තියෙන 'links' Array එක Regex වලින් අල්ලනවා
    // උඹ එවපු HTML එකේ බටන් ජෙනරේට් වෙන්නේ මේ Script එකෙන්
    const scriptText = $('script').text();
    const linksRegex = /const\s+links\s*=\s*(\[[\s\S]*?\]);/;
    const match = scriptText.match(linksRegex);

    let finalButtons = [];

    if (match && match[1]) {
      try {
        const rawLinks = JSON.parse(match[1]);
        finalButtons = rawLinks.map(l => ({
          name: l.name,
          url: l.url.includes('google.com/server') ? transformDownloadUrl(l.url) : l.url,
          type: l.name.toLowerCase().includes('google') ? 'Google' : (l.name.toLowerCase().includes('pix') ? 'Pix' : 'Direct')
        }));
      } catch (err) {
        console.error("JSON Error");
      }
    }

    // 3. Fallback: Script එකේ නැත්නම් HTML එකේ බටන් තියෙනවද බලනවා
    if (finalButtons.length === 0) {
      $('#dl-links a, .download-section a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) {
          finalButtons.push({
            name: $(el).text().trim(),
            url: href.includes('google.com/server') ? transformDownloadUrl(href) : href
          });
        }
      });
    }

    // 4. CSPlayer Direct Detection
    const csplayerPattern = /https?:\/\/[^"'\s]+\.csplayer\d+\.store\/[^"'\s]+/gi;
    const csMatches = html.match(csplayerPattern);
    if (csMatches) {
      csMatches.forEach(l => {
        const cleanLink = l.replace(/["'\]\s]/g, '');
        if (!finalButtons.some(b => b.url === cleanLink)) {
          finalButtons.push({ name: 'CSPlayer Direct', url: cleanLink, type: 'Direct' });
        }
      });
    }

    if (finalButtons.length > 0) {
      res.json({
        success: true,
        developer: API_INFO.developer,
        file: file_info,
        buttons: finalButtons
      });
    } else {
      res.json({ success: false, message: 'බටන් මුකුත් හම්බුනේ නෑ මචං' });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`CineSubz API Fix Running on ${PORT}`));
