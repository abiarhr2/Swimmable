# Swimmable — beach safety app

Tells an ordinary swimmer whether a nearby beach is **Convenient**, **Modest**, or
**Dangerous** today — no wave-period or swell-direction jargon.

## What it does

1. You enter your name and either tap a spot on the map or hit "Use my location."
2. The backend finds the tracked beaches within 250km of that point.
3. For each one, it pulls live wave height and wind speed from
   [Open-Meteo](https://open-meteo.com) (free, no API key needed).
4. A simple rule turns those two numbers into one word:
   - **Convenient** — wave < 0.5m and wind < 15 km/h
   - **Modest** — wave ≤ 1.2m and wind ≤ 30 km/h
   - **Dangerous** — anything rougher

That rule lives in one place: the `classify()` function in `server.js`. Tune the
thresholds there if you want it stricter or looser.

## Run it on your computer

You need [Node.js](https://nodejs.org) version 18 or later (check with `node -v`).

```bash
cd beach-safety-app
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

## Project structure

```
beach-safety-app/
├── server.js        # backend: distance search + live data + classification
├── beaches.json      # the list of tracked beaches (name, lat, lon)
├── package.json
└── public/
    ├── index.html     # name entry + map
    ├── app.js          # map interaction, calls the API, renders results
    └── style.css
```

## Adding more beaches

Open `beaches.json` and add an entry with a name and coordinates:

```json
{ "name": "Sidi Kaouki", "lat": 31.3833, "lon": -9.8667 }
```

No restart-proof database needed for this scale — the file is read once when the
server starts.

## Notes

- The map uses OpenStreetMap tiles via Leaflet — free, no API key.
- If the weather API is slow or unreachable, a beach shows as **Unknown**
  rather than hanging the page (there's a 6-second timeout on each request).
- This is a good base for later additions: push notifications, user-submitted
  reports, more beaches, tide data, or a proper database once the beach list
  grows large.
