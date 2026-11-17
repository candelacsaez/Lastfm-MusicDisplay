# Last 24h: my listening on a shelf

A web app that turns the songs I played in the last 24 hours into a shelf of
transparent disc cases, each disc printed with the album cover.
Data comes from [Last.fm](https://www.last.fm/) (`user.getRecentTracks`) through my own server.

## Run it

You need [Docker](https://www.docker.com/) and a free Last.fm account with an
[API key](https://www.last.fm/api/account/create).

```bash
git clone <this-repo-url>
cd <repo-folder>
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and fill in LASTFM_API_KEY and LASTFM_USER
docker compose up
```

Open http://localhost:3000

## The idea

A list of covers is not enough, so each song becomes a disc in a clear jewel
case on a shelf, over a collage-style page with hand-drawn red doodles.
The song playing right now gets a red scribbled box. Hover (or tap on a phone)
a disc to see the song and artist. Songs without a cover get a generated
colored disc.

## How it works

- The browser only talks to my server. The server talks to Last.fm.
- The API key lives in an environment variable (`.env`, never committed).
- `GET /api/recent` returns the last 24h of tracks, cleaned up. The answer is
  cached for 60 seconds, so many visitors mean at most one Last.fm call per minute.
- `GET /api/cover/:id` serves album covers through my server (downloaded once
  from Last.fm and kept in memory), so the browser never contacts Last.fm.
- If Last.fm fails: the server returns the last cached answer marked as
  "stale" if it has one, otherwise a clear error. The page shows a message,
  never a blank screen.
- Responsive grid: 4 columns on a laptop, 3 on tablets, 2 on small phones.

## Stack

Node.js 22 + Express, plain HTML/CSS/JS, Docker Compose.
