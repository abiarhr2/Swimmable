// Beach swim-safety app — backend
// Finds beaches near the user's chosen point, pulls live wave + wind data
// from Open-Meteo (free, no API key), and turns the raw numbers into a
// plain-language status: Convenient / Modest / Dangerous.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const beaches = JSON.parse(fs.readFileSync(path.join(__dirname, 'beaches.json'), 'utf8'));

app.use(express.static(path.join(__dirname, 'public')));

// --- distance between two lat/lon points, in km (haversine formula) ---
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- this is the whole "brain": raw numbers in, plain label out ---
function classify(waveHeight, windSpeed) {
  if (waveHeight == null || windSpeed == null) {
    return { label: 'Unknown', why: 'No live data available for this beach right now.' };
  }
  if (waveHeight < 0.5 && windSpeed < 15) {
    return { label: 'Convenient', why: 'Small waves and light wind — a calm, easy swim.' };
  }
  if (waveHeight <= 1.2 && windSpeed <= 30) {
    return { label: 'Modest', why: 'Some chop today. Fine close to shore; watch children closely.' };
  }
  return { label: 'Dangerous', why: 'Waves or wind are strong enough to overpower a swimmer. Best to stay out today.' };
}

// --- fetch with a timeout, so one slow/unreachable API can't hang a request ---
async function fetchWithTimeout(url, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// --- pull live marine + wind data for one beach ---
async function fetchConditions(lat, lon) {
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height`;
  const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m`;

  try {
    const [marineRes, windRes] = await Promise.all([fetchWithTimeout(marineUrl), fetchWithTimeout(windUrl)]);
    const marine = await marineRes.json();
    const wind = await windRes.json();
    return {
      waveHeight: marine?.current?.wave_height ?? null,
      windSpeed: wind?.current?.wind_speed_10m ?? null,
    };
  } catch (err) {
    console.error('Weather fetch failed for', lat, lon, err.message);
    return { waveHeight: null, windSpeed: null };
  }
}

// --- API: beaches near a given point ---
app.get('/api/beaches', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radiusKm = parseFloat(req.query.radius) || 150;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'lat and lon query params are required' });
  }

  const nearby = beaches
    .map(b => ({ ...b, distanceKm: distanceKm(lat, lon, b.lat, b.lon) }))
    .filter(b => b.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const results = await Promise.all(
    nearby.map(async b => {
      const conditions = await fetchConditions(b.lat, b.lon);
      const status = classify(conditions.waveHeight, conditions.windSpeed);
      return {
        name: b.name,
        lat: b.lat,
        lon: b.lon,
        distanceKm: Math.round(b.distanceKm),
        waveHeight: conditions.waveHeight,
        windSpeed: conditions.windSpeed,
        status: status.label,
        why: status.why,
      };
    })
  );

  res.json({ count: results.length, beaches: results });
});

app.listen(PORT, () => {
  console.log(`Beach safety app running: http://localhost:${PORT}`);
});
