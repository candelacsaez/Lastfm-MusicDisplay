const express = require('express');

const { LASTFM_API_KEY, LASTFM_USER, PORT = 3000 } = process.env;

if (!LASTFM_API_KEY || !LASTFM_USER) {
  console.error('Missing LASTFM_API_KEY or LASTFM_USER in environment');
  process.exit(1);
}

const CACHE_TTL_MS = 60 * 1000; // keep Last.fm's answer for 60 seconds
let cache = { tracks: null, time: 0 };

// The grey star Last.fm uses when a track has no real cover
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

const coverUrls = new Map();  // id -> original Last.fm image URL
const coverCache = new Map(); // id -> { type, buf } (images kept in memory)

function coverId(url) {
  const m = url.match(/\/([0-9a-f]{32})\.(?:jpg|jpeg|png|gif|webp)$/i);
  return m ? m[1] : null;
}

async function fetchFromLastFm() {
  console.log('Calling Last.fm…'); 
  const params = new URLSearchParams({
    method: 'user.getRecentTracks',
    user: LASTFM_USER,
    api_key: LASTFM_API_KEY,
    format: 'json',
    limit: '200',
    from: String(Math.floor(Date.now() / 1000) - 86400), // last 24h
  });

  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
    signal: AbortSignal.timeout(5000), // don't wait forever
  });
  if (!res.ok) throw new Error(`Last.fm answered HTTP ${res.status}`);

  const json = await res.json();
  if (json.error) throw new Error(`Last.fm error ${json.error}: ${json.message}`);

    return json.recenttracks.track.map((t) => {
    const raw = t.image?.[3]?.['#text'] || '';
    const id = raw ? coverId(raw) : null;
    const hasCover = id && id !== PLACEHOLDER;
    if (hasCover) coverUrls.set(id, raw);
    return {
      name: t.name,
      artist: t.artist['#text'],
      album: t.album['#text'],
      cover: hasCover ? `/api/cover/${id}` : null,
      nowPlaying: t['@attr']?.nowplaying === 'true',
      playedAt: t.date ? Number(t.date.uts) : null,
    };
  });
  
}

const app = express();
app.use(express.static('public'));

app.get('/api/recent', async (req, res) => {
  const fresh = cache.tracks && Date.now() - cache.time < CACHE_TTL_MS;

  if (fresh) {
    return res.json({ tracks: cache.tracks, cached: true, stale: false });
  }

  try {
    const tracks = await fetchFromLastFm();
    cache = { tracks, time: Date.now() };
    res.json({ tracks, cached: false, stale: false });
  } catch (err) {
    console.error('Last.fm failed:', err.message);
    if (cache.tracks) {
      // Last.fm is down, but we still have an older answer
      return res.json({ tracks: cache.tracks, cached: true, stale: true });
    }
    res.status(502).json({ error: 'Last.fm is not answering right now. Try again in a minute.' });
  }
});

app.get('/api/cover/:id', async (req, res) => {
  const { id } = req.params;
  // Only ids we got from Last.fm are allowed (no arbitrary URLs)
  if (!/^[0-9a-f]{32}$/i.test(id) || !coverUrls.has(id)) return res.sendStatus(404);
  try {
    if (!coverCache.has(id)) {
      const r = await fetch(coverUrls.get(id), { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      coverCache.set(id, {
        type: r.headers.get('content-type') || 'image/jpeg',
        buf: Buffer.from(await r.arrayBuffer()),
      });
    }
    const c = coverCache.get(id);
    res.set('Content-Type', c.type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(c.buf);
  } catch (err) {
    console.error('Cover failed:', err.message);
    res.sendStatus(502);
  }
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));