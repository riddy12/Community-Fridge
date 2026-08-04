const repository = "riddy12/Community-Fridge";
const updatesApiUrl = `https://api.github.com/repos/${repository}/issues?state=open&per_page=50`;

const searchInput = document.querySelector("#searchInput");
const locationList = document.querySelector("#locationList");
const locationRows = Array.from(document.querySelectorAll(".location-row"));
const noResults = document.querySelector("#noResults");
const resultCount = document.querySelector("#resultCount");
const locationButton = document.querySelector("#locationButton");
const locationButtonLabel = locationButton.querySelector(".button-label");
const locationMessage = document.querySelector("#locationMessage");
const activityList = document.querySelector("#activityList");
const updateStatus = document.querySelector("#updateStatus");
const refreshUpdatesButton = document.querySelector("#refreshUpdates");
const mapFallback = document.querySelector("#mapFallback");

const locations = locationRows.map((row, index) => ({
  id: row.dataset.id,
  name: row.querySelector("h3").textContent,
  address: row.querySelector(".address").textContent,
  lat: Number(row.dataset.lat),
  lng: Number(row.dataset.lng),
  index: index + 1,
  directions: row.querySelector(".location-actions a").href,
  row
}));

let map;
let visibleLocations = [...locations];
const markers = new Map();

function markerIcon(index, isActive = false) {
  return window.L.divIcon({
    className: `fridge-marker${isActive ? " is-active" : ""}`,
    html: `<span><b>${String(index).padStart(2, "0")}</b></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -31]
  });
}

function popupContent(location) {
  return `
    <div class="map-popup">
      <h3>${location.name}</h3>
      <p>${location.address}</p>
      <a href="${location.directions}" target="_blank" rel="noreferrer">Open directions ↗</a>
    </div>
  `;
}

function initializeMap() {
  if (!window.L) {
    mapFallback.classList.remove("hidden");
    return;
  }

  map = window.L.map("realMap", {
    zoomControl: true,
    scrollWheelZoom: false
  });

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
    subdomains: "abcd"
  }).addTo(map);

  locations.forEach((location) => {
    const marker = window.L.marker([location.lat, location.lng], {
      icon: markerIcon(location.index, location.index === 1),
      title: location.name
    });

    marker.bindPopup(popupContent(location), { maxWidth: 250, closeButton: false });
    marker.on("click", () => selectLocation(location.id, false));
    marker.addTo(map);
    markers.set(location.id, marker);
  });

  const bounds = window.L.latLngBounds(locations.map((location) => [location.lat, location.lng]));
  map.fitBounds(bounds, { padding: [42, 42] });
}

function selectLocation(id, moveMap = true) {
  const selected = locations.find((location) => location.id === id);
  if (!selected) return;

  locations.forEach((location) => {
    const isSelected = location.id === id;
    location.row.classList.toggle("is-selected", isSelected);
    const marker = markers.get(location.id);
    if (marker) marker.setIcon(markerIcon(location.index, isSelected));
  });

  const selectedMarker = markers.get(id);
  if (map && selectedMarker) {
    if (moveMap) map.flyTo([selected.lat, selected.lng], 15, { duration: 0.65 });
    selectedMarker.openPopup();
  }
}

function updateSearchResults() {
  const searchText = searchInput.value.toLowerCase().trim();
  visibleLocations = [];

  locations.forEach((location) => {
    const matches = location.row.dataset.search.includes(searchText);
    location.row.classList.toggle("hidden", !matches);

    const marker = markers.get(location.id);
    if (matches) {
      visibleLocations.push(location);
      if (map && marker && !map.hasLayer(marker)) marker.addTo(map);
    } else if (map && marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });

  const count = visibleLocations.length;
  resultCount.textContent = `${count} ${count === 1 ? "location" : "locations"}`;
  noResults.classList.toggle("hidden", count !== 0);

  if (map && searchText && count > 0) {
    const bounds = window.L.latLngBounds(visibleLocations.map((location) => [location.lat, location.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

function milesBetween(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusMiles = 3958.8;
  const latitudeDistance = toRadians(lat2 - lat1);
  const longitudeDistance = toRadians(lng2 - lng1);
  const firstLatitude = toRadians(lat1);
  const secondLatitude = toRadians(lat2);
  const value =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDistance / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(value));
}

function sortLocationsByDistance(position) {
  const userLatitude = position.coords.latitude;
  const userLongitude = position.coords.longitude;
  const sorted = locations
    .map((location) => ({
      location,
      distance: milesBetween(userLatitude, userLongitude, location.lat, location.lng)
    }))
    .sort((first, second) => first.distance - second.distance);

  sorted.forEach(({ location, distance }) => {
    location.row.querySelector(".distance").textContent = `${distance.toFixed(1)} mi`;
    locationList.insertBefore(location.row, noResults);
  });

  locationButtonLabel.textContent = "Sorted by distance";
  locationMessage.textContent = "Locations are ordered from closest to farthest.";

  if (map) {
    window.L.circleMarker([userLatitude, userLongitude], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#246bfe",
      fillOpacity: 1
    }).addTo(map).bindTooltip("Your approximate location");
  }
}

function getIssueField(body, label) {
  if (!body) return "";
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`### ${escapedLabel}\\s+([\\s\\S]*?)(?=\\n### |$)`, "i");
  const match = body.match(pattern);
  if (!match) return "";
  const value = match[1].trim();
  return value === "_No response_" ? "" : value;
}

function formatRelativeTime(dateValue) {
  const seconds = Math.round((new Date(dateValue).getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteSeconds < 60) return formatter.format(seconds, "second");
  if (absoluteSeconds < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

function normalizeIssue(issue) {
  return {
    location: getIssueField(issue.body, "Location") || "Community fridge",
    event: getIssueField(issue.body, "What happened") || "Community update",
    details: getIssueField(issue.body, "Details") || issue.title,
    createdAt: issue.created_at,
    url: issue.html_url
  };
}

function renderUpdates(updates) {
  activityList.replaceChildren();

  if (updates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No public reports yet. Add the first update after your next visit.";
    activityList.appendChild(empty);
    return;
  }

  updates.forEach((update) => {
    const row = document.createElement("article");
    row.className = "update-row";

    const kind = document.createElement("span");
    kind.className = "update-kind";
    kind.textContent = update.event;

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = update.url;
    titleLink.target = "_blank";
    titleLink.rel = "noreferrer";
    titleLink.textContent = update.location;
    title.appendChild(titleLink);

    const details = document.createElement("p");
    details.textContent = update.details;

    const time = document.createElement("time");
    time.dateTime = update.createdAt;
    time.textContent = formatRelativeTime(update.createdAt);

    row.append(kind, title, details, time);
    activityList.appendChild(row);
  });
}

function updateLocationSummaries(updates) {
  document.querySelectorAll(".location-update").forEach((summary) => {
    const latest = updates.find((update) => update.location === summary.dataset.location);
    summary.classList.toggle("has-update", Boolean(latest));
    summary.textContent = latest
      ? `${latest.event}, ${formatRelativeTime(latest.createdAt)}`
      : "No recent community update";
  });
}

async function loadPublicUpdates() {
  refreshUpdatesButton.disabled = true;
  updateStatus.textContent = "Checking for updates";

  try {
    const response = await fetch(updatesApiUrl, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

    const issues = await response.json();
    const updates = issues
      .filter((issue) => !issue.pull_request && issue.title.startsWith("[Fridge update]"))
      .map(normalizeIssue)
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

    renderUpdates(updates);
    updateLocationSummaries(updates);
    updateStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } catch (error) {
    console.error("Public updates could not be loaded.", error);
    activityList.replaceChildren();
    const errorState = document.createElement("div");
    errorState.className = "error-state";
    errorState.textContent = "Updates are temporarily unavailable. Try refreshing in a moment.";
    activityList.appendChild(errorState);
    updateStatus.textContent = "Could not refresh";
  } finally {
    refreshUpdatesButton.disabled = false;
  }
}

searchInput.addEventListener("input", updateSearchResults);

document.querySelectorAll(".show-map").forEach((button) => {
  button.addEventListener("click", () => selectLocation(button.dataset.id));
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationMessage.textContent = "Location access is not available in this browser.";
    return;
  }

  locationButton.disabled = true;
  locationButtonLabel.textContent = "Finding your location";
  locationMessage.textContent = "";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      sortLocationsByDistance(position);
      locationButton.disabled = false;
    },
    () => {
      locationButton.disabled = false;
      locationButtonLabel.textContent = "Use my location";
      locationMessage.textContent = "Location access was not available. Search by neighborhood instead.";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
});

refreshUpdatesButton.addEventListener("click", loadPublicUpdates);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadPublicUpdates();
});

initializeMap();
loadPublicUpdates();
window.setInterval(loadPublicUpdates, 120000);
