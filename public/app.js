// --- name gate ---
const nameGate = document.getElementById('nameGate');
const mainApp = document.getElementById('mainApp');
const greeting = document.getElementById('greeting');
const nameInput = document.getElementById('nameInput');

let userName = localStorage.getItem('swimmable_name');

function startApp(name) {
  userName = name;
  localStorage.setItem('swimmable_name', name);
  greeting.textContent = `Hi ${name} — pick a spot and we'll check the water for you.`;
  nameGate.classList.add('hidden');
  mainApp.classList.remove('hidden');
  initMap();
}

document.getElementById('nameSubmit').addEventListener('click', () => {
  const val = nameInput.value.trim();
  if (val) startApp(val);
});
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('nameSubmit').click();
});

// --- map ---
let map, marker;

function initMap() {
  if (map) return; // already set up
  map = L.map('map').setView([31.5, -7.5], 5); // centered on Morocco
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  map.on('click', e => placeMarker(e.latlng.lat, e.latlng.lng));
}

function placeMarker(lat, lon) {
  if (marker) marker.remove();
  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 8);
  loadBeaches(lat, lon);
}

function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus('Your browser does not support geolocation — tap the map instead.');
    return;
  }
  setStatus('Finding you…');
  navigator.geolocation.getCurrentPosition(
    pos => placeMarker(pos.coords.latitude, pos.coords.longitude),
    err => {
      setStatus(
        err.code === 1
          ? 'Location permission denied — tap the map to pick a spot instead.'
          : 'Could not get your location — tap the map instead.'
      );
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

document.getElementById('useLocation').addEventListener('click', useMyLocation);

// --- fetch + render ---
const statusEl = document.getElementById('status');
const listEl = document.getElementById('beaches');

function setStatus(msg) { statusEl.textContent = msg; }

const badgeClass = { Convenient: 'b-foam', Modest: 'b-coral', Dangerous: 'b-danger', Unknown: 'b-grey' };

async function loadBeaches(lat, lon) {
  listEl.innerHTML = '';
  setStatus('Checking nearby beaches…');
  try {
    const res = await fetch(`/api/beaches?lat=${lat}&lon=${lon}&radius=250`);
    const data = await res.json();

    if (!data.beaches || data.beaches.length === 0) {
      setStatus('No tracked beaches within 250km of that spot yet.');
      return;
    }

    setStatus(`${data.count} beach${data.count > 1 ? 'es' : ''} nearby:`);
    data.beaches.forEach(b => {
      const card = document.createElement('div');
      card.className = 'beach-card';
      card.innerHTML = `
        <div class="name">${b.name}</div>
        <span class="badge ${badgeClass[b.status] || 'b-grey'}">${b.status}</span>
        <div class="meta">${b.distanceKm} km away</div>
        <div class="why">${b.why}</div>`;
      listEl.appendChild(card);
    });
  } catch (err) {
    setStatus('Could not reach the server. Is it running?');
    console.error(err);
  }
}

if (userName) startApp(userName);