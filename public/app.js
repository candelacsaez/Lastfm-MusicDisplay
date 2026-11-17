const shelf = document.getElementById('shelf');
const statusEl = document.getElementById('status');

// Renders subtitle in a ransom-note magazine cutout collage format
function renderCollageStatus(text, isError = false) {
  statusEl.replaceChildren();
  statusEl.className = isError ? 'error' : '';
  const words = text.trim().split(/\s+/);
  let letterIndex = 0;
  const stylesCount = 6;

  words.forEach((word) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'collage-word';

    for (const char of word) {
      const letterSpan = document.createElement('span');
      letterSpan.className = `collage-letter c-style-${letterIndex % stylesCount}`;
      letterSpan.textContent = char;
      wordSpan.appendChild(letterSpan);
      letterIndex++;
    }
    statusEl.appendChild(wordSpan);
  });
}

// Fallback disc for tracks without cover: a color made from the song name
function fallbackBackground(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `conic-gradient(hsl(${h} 60% 45%), hsl(${(h + 60) % 360} 60% 30%), hsl(${h} 60% 45%))`;
}

function makeDisc(track) {
  const btn = document.createElement('button');
  btn.className = 'case' + (track.nowPlaying ? ' playing' : '');
  btn.setAttribute('aria-label', `${track.name} by ${track.artist}`);

  const disc = document.createElement('div');
  disc.className = 'disc';
  disc.style.backgroundImage = track.cover
    ? `url("${track.cover}")`
    : fallbackBackground(track.name + track.artist);

  const info = document.createElement('div');
  info.className = 'info';
  const title = document.createElement('b');
  title.textContent = track.name;      // textContent: song names can't inject HTML
  const artist = document.createElement('span');
  artist.textContent = track.artist;
  info.append(title, artist);

  btn.append(disc, info);
  btn.addEventListener('click', () => btn.classList.toggle('open')); // tap on phone
  return btn;
}

async function load() {
  renderCollageStatus('Loading your discs…');
  try {
    const res = await fetch('/api/recent');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    shelf.replaceChildren(...data.tracks.map(makeDisc));

    if (data.tracks.length === 0) {
      renderCollageStatus('No songs in the last 24 hours. Play something on Spotify!');
    } else if (data.stale) {
      renderCollageStatus(`${data.tracks.length} songs. Last.fm isn't answering, so this may be slightly out of date.`);
    } else {
      renderCollageStatus(`${data.tracks.length} songs in the last 24 hours`);
    }
  } catch (err) {
    renderCollageStatus(err.message || "Couldn't load your music right now.", true);
  }
}

load();