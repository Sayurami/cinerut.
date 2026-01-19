import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = 'https://cinesubz.co';

const API_INFO = {
  developer: 'Mr Senal',
  version: 'v1.4 - Fixed',
  api_name: 'CineSubz Movie Downloader API'
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Referer': 'https://cinesubz.co/'
};

app.use(express.json());

// --- Helper: URL Transformation Logic ---
const urlMappings = [
  { search: ['https://google.com/server11/1:/', 'https://google.com/server12/1:/', 'https://google.com/server13/1:/'], replace: 'https://cloud.sonic-cloud.online/server1/' },
  { search: ['https://google.com/server21/1:/', 'https://google.com/server22/1:/', 'https://google.com/server23/1:/'], replace: 'https://cloud.sonic-cloud.online/server2/' },
  { search: ['https://google.com/server3/1:/'], replace: 'https://cloud.sonic-cloud.online/server3/' },
  { search: ['https://google.com/server4/1:/'], replace: 'https://cloud.sonic-cloud.online/server4/' },
  { search: ['https://google.com/server5/1:/'], replace: 'https://cloud.sonic-cloud.online/server5/' }
];

function transformDownloadUrl(originalUrl) {
  let modifiedUrl = originalUrl;
  for (const mapping of urlMappings) {
    for (const searchUrl of mapping.search) {
      if (originalUrl.includes(searchUrl)) {
        modifiedUrl = originalUrl.replace(searchUrl, mapping.replace);
        modifiedUrl = modifiedUrl.replace(/\.(mp4|mkv|zip)(\?.*)?$/, (match, ext) => `?ext=${ext}${match.includes('?') ? '&' + match.split('?')[1] : ''}`);
        return modifiedUrl;
      }
    }
  }
  return modifiedUrl.replace('srilank222', 'srilanka2222').replace('https://tsadsdaas.me/', 'http://tdsdfasdaddd.me/');
}

// --- Endpoints ---

app.get('/', (req, res) => {
  res.json({ status: "Running", developer: API_INFO.developer, version: API_INFO.version });
});

// Search & Details endpoints remain mostly the same but ensure they call the new download logic
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Missing query' });
        const response = await axios.get(`${BASE_URL}/?s=${encodeURIComponent(query)}`, { headers });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.item-box, .display-item, article').each((i, el) => {
            const url = $(el).find('a').first().attr('href');
            if (url && url.includes('cinesubz.co')) {
                results.push({
                    title: $(el).find('.title, h3, .entry-title').text().trim(),
                    movie_url: url,
                    type: url.includes('/tvshows/') ? 'tvshow' : 'movie'
                });
            }
        });
        res.json({ results: [...new Map(results.map(r => [r.movie_url, r])).values()] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/details', async (req, res) => {
    try {
        const url = req.query.url;
        const response = await axios.get(url, { headers });
        const $ = cheerio.load(response.data);
        const downloadLinks = [];
        
        $('a[href*="/api-"], a[href*="cinesubz.co/"]').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (href && (text.match(/480p|720p|1080p/i) || href.includes('/api-'))) {
                downloadLinks.push({ quality: text.match(/480p|720p|1080p/i)?.[0] || 'Unknown', countdown_url: href });
            }
        });

        res.json({
            title: $('h1').first().text().trim(),
            download_links: downloadLinks
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- THE FIX: Download Endpoint for Button Links ---
app.get('/download', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    const response = await axios.get(url, { headers, timeout: 15000 });
    const html = response.data;
    const $ = cheerio.load(html);

    // 1. ගන්න පුළුවන් File Info ටික ගන්නවා
    const fileInfo = {
      name: $('.file-info span').first().text().trim() || 'N/A',
      size: $('.file-info span').last().text().trim() || 'N/A'
    };

    let extractedLinks = [];

    // 2. Strategy: JavaScript ඇතුලේ තියෙන 'links' Array එක Regex වලින් අල්ලනවා
    // උඹ එවපු HTML එකේ බටන් ජෙනරේට් වෙන්නේ මේ Array එකෙන්.
    const scriptContent = $('script').text();
    const linksRegex = /const\s+links\s*=\s*(\[[\s\S]*?\]);/;
    const match = scriptContent.match(linksRegex);

    if (match && match[1]) {
      try {
        const rawLinks = JSON.parse(match[1]);
        extractedLinks = rawLinks.map(link => ({
          server: link.name || 'Download',
          link: link.url.includes('google.com/server') ? transformDownloadUrl(link.url) : link.url
        }));
      } catch (err) {
        console.error("JSON Parse Error on Links");
      }
    }

    // 3. Backup Strategy: HTML එකේ කෙලින්ම <a> tags තියෙනවද බලනවා
    if (extractedLinks.length === 0) {
      $('#dl-links a, .download-section a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) {
          extractedLinks.push({
            server: $(el).text().trim() || 'Download Server',
            link: href.includes('google.com/server') ? transformDownloadUrl(href) : href
          });
        }
      });
    }

    // 4. CSPlayer Direct Extraction (Regex fallback)
    const csplayerPattern = /https?:\/\/[^"'\s]+\.csplayer\d+\.store\/[^"'\s]+/gi;
    const csMatches = html.match(csplayerPattern);
    if (csMatches) {
        csMatches.forEach(l => {
            const clean = l.replace(/["'\]\s]/g, '');
            if(!extractedLinks.some(e => e.link === clean)) {
                extractedLinks.push({ server: 'CSPlayer Direct', link: clean });
            }
        });
    }

    if (extractedLinks.length > 0) {
      res.json({
        developer: API_INFO.developer,
        success: true,
        file_info: fileInfo,
        download_links: extractedLinks
      });
    } else {
      res.json({ success: false, message: 'No download buttons found. Check if the countdown finished.' });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CineSubz API Fixed v${API_INFO.version} started on port ${PORT}`);
});

export default app;
