const siteConfig = window.COMMUNITY_FRIDGE_CONFIG || {};
const supabaseUrl = (siteConfig.supabaseUrl || "").replace(/\/$/, "");
const supabasePublishableKey = siteConfig.supabasePublishableKey || "";
const reportsApiUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/fridge_reports` : "";
const databaseIsConfigured = Boolean(reportsApiUrl && supabasePublishableKey);

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
const coverageCount = document.querySelector("#coverageCount");
const mapFallback = document.querySelector("#mapFallback");
const reportForm = document.querySelector("#reportForm");
const reportLocation = document.querySelector("#reportLocation");
const reportActivity = document.querySelector("#reportActivity");
const reportDetails = document.querySelector("#reportDetails");
const reportWebsite = document.querySelector("#reportWebsite");
const detailsCount = document.querySelector("#detailsCount");
const reportStatus = document.querySelector("#reportStatus");
const reportSubmitButton = reportForm.querySelector("button[type='submit']");

const locations = locationRows.map((row, index) => ({
  id: row.dataset.id,
  name: row.querySelector("h3").textContent,
  address: row.querySelector(".address").textContent,
  lat: Number(row.dataset.lat),
  lng: Number(row.dataset.lng),
  index: index + 1,
  directions: row.querySelector(".location-actions a").href,
  latestReport: null,
  row
}));

let map;
let visibleLocations = [...locations];
const markers = new Map();
const currentReportWindow = 7 * 24 * 60 * 60 * 1000;
const minimumSubmitInterval = 60 * 1000;
const lastSubmissionKey = "community-fridge-last-report";

function markerIcon(index, isActive = false) {
  return window.L.divIcon({
    className: `fridge-marker${isActive ? " is-active" : ""}`,
    html: `<span><b>${String(index).padStart(2, "0")}</b></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -31]
  });
}

function isCurrentReport(report) {
  return report && Date.now() - new Date(report.createdAt).getTime() <= currentReportWindow;
}

function popupContent(location) {
  const condition = isCurrentReport(location.latestReport)
    ? location.latestReport.condition
    : "No report in the last 7 days";

  return `
    <div class="map-popup">
      <h3>${location.name}</h3>
      <p>${location.address}</p>
      <p><strong>${condition}</strong></p>
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

function formatRelativeTime(dateValue) {
  const seconds = Math.round((new Date(dateValue).getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteSeconds < 60) return formatter.format(seconds, "second");
  if (absoluteSeconds < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

function conditionClassName(condition) {
  if (condition === "Well stocked" || condition === "Some food available") return "is-good";
  if (condition === "Low or empty") return "is-low";
  if (condition === "Needs cleaning" || condition === "Mechanical issue") return "is-problem";
  return "is-unknown";
}

function normalizeReport(report) {
  return {
    id: report.id,
    location: report.location,
    condition: report.condition,
    activity: report.activity,
    details: report.details,
    createdAt: report.created_at
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

  updates.slice(0, 20).forEach((update) => {
    const row = document.createElement("article");
    row.className = "update-row";

    const condition = document.createElement("span");
    condition.className = `update-kind ${conditionClassName(update.condition)}`;
    condition.textContent = update.condition;

    const title = document.createElement("h3");
    title.textContent = update.location;

    const details = document.createElement("p");
    details.textContent = `${update.activity}. ${update.details}`;

    const time = document.createElement("time");
    time.dateTime = update.createdAt;
    time.title = new Date(update.createdAt).toLocaleString();
    time.textContent = formatRelativeTime(update.createdAt);

    row.append(condition, title, details, time);
    activityList.appendChild(row);
  });
}

function updateLocationSummaries(updates) {
  let currentLocations = 0;

  locations.forEach((location) => {
    const latest = updates.find((update) => update.location === location.name) || null;
    const summary = location.row.querySelector(".location-update");
    const isCurrent = isCurrentReport(latest);
    location.latestReport = latest;

    if (isCurrent) {
      currentLocations += 1;
      summary.className = `location-update ${conditionClassName(latest.condition)}`;
      summary.textContent = `${latest.condition}, ${formatRelativeTime(latest.createdAt)}`;
    } else {
      summary.className = "location-update is-unknown";
      summary.textContent = latest
        ? `Last report ${formatRelativeTime(latest.createdAt)}`
        : "No report in the last 7 days";
    }

    const marker = markers.get(location.id);
    if (marker) marker.setPopupContent(popupContent(location));
  });

  coverageCount.textContent = `${currentLocations} of ${locations.length} fridges reported this week`;
}

function showUpdatesError(message) {
  activityList.replaceChildren();
  const errorState = document.createElement("div");
  errorState.className = "error-state";
  errorState.textContent = message;
  activityList.appendChild(errorState);
}

async function loadPublicUpdates() {
  if (!databaseIsConfigured) {
    showUpdatesError("The shared database is being connected. Check back shortly.");
    updateLocationSummaries([]);
    updateStatus.textContent = "Database connection needed";
    refreshUpdatesButton.disabled = true;
    return;
  }

  refreshUpdatesButton.disabled = true;
  updateStatus.textContent = "Checking for updates";

  try {
    const query = "?select=id,location,condition,activity,details,created_at&order=created_at.desc&limit=50";
    const response = await fetch(`${reportsApiUrl}${query}`, {
      cache: "no-store",
      headers: { apikey: supabasePublishableKey }
    });

    if (!response.ok) throw new Error(`The report service returned ${response.status}`);

    const reports = (await response.json()).map(normalizeReport);
    renderUpdates(reports);
    updateLocationSummaries(reports);
    updateStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } catch (error) {
    console.error("Public updates could not be loaded.", error);
    showUpdatesError("Updates are temporarily unavailable. Try refreshing in a moment.");
    updateStatus.textContent = "Could not refresh";
  } finally {
    refreshUpdatesButton.disabled = false;
  }
}

function setReportStatus(message, isError = false) {
  reportStatus.textContent = message;
  reportStatus.classList.toggle("is-error", isError);
}

function getLastSubmissionTime() {
  try {
    return Number(window.localStorage.getItem(lastSubmissionKey) || 0);
  } catch {
    return 0;
  }
}

function saveLastSubmissionTime() {
  try {
    window.localStorage.setItem(lastSubmissionKey, String(Date.now()));
  } catch {
    // The database still prevents invalid rows if browser storage is unavailable.
  }
}

async function submitReport(event) {
  event.preventDefault();
  setReportStatus("");

  if (reportWebsite.value) {
    reportForm.reset();
    detailsCount.textContent = "0";
    return;
  }

  if (!databaseIsConfigured) {
    setReportStatus("Shared reporting is being connected. Please try again soon.", true);
    return;
  }

  const timeSinceLastSubmission = Date.now() - getLastSubmissionTime();
  if (timeSinceLastSubmission < minimumSubmitInterval) {
    const seconds = Math.ceil((minimumSubmitInterval - timeSinceLastSubmission) / 1000);
    setReportStatus(`Please wait ${seconds} seconds before posting another update.`, true);
    return;
  }

  const selectedCondition = reportForm.querySelector("input[name='condition']:checked");
  if (!selectedCondition || !reportForm.reportValidity()) return;

  const report = {
    location: reportLocation.value,
    condition: selectedCondition.value,
    activity: reportActivity.value,
    details: reportDetails.value.trim()
  };

  reportSubmitButton.disabled = true;
  reportSubmitButton.textContent = "Publishing";

  try {
    const response = await fetch(reportsApiUrl, {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(report)
    });

    if (!response.ok) throw new Error(`The report service returned ${response.status}`);

    saveLastSubmissionTime();
    reportForm.reset();
    detailsCount.textContent = "0";
    setReportStatus("Update published. Everyone can see it in the activity log below.");
    await loadPublicUpdates();
  } catch (error) {
    console.error("The report could not be published.", error);
    setReportStatus("Your update could not be published. Please try again in a moment.", true);
  } finally {
    reportSubmitButton.disabled = false;
    reportSubmitButton.textContent = "Publish update";
  }
}

searchInput.addEventListener("input", updateSearchResults);

document.querySelectorAll(".show-map").forEach((button) => {
  button.addEventListener("click", () => selectLocation(button.dataset.id));
});

document.querySelectorAll(".report-location").forEach((button) => {
  button.addEventListener("click", () => {
    reportLocation.value = button.dataset.location;
    document.querySelector("#report").scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => reportLocation.focus(), 450);
  });
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

reportDetails.addEventListener("input", () => {
  detailsCount.textContent = String(reportDetails.value.length);
});

reportForm.addEventListener("submit", submitReport);
refreshUpdatesButton.addEventListener("click", loadPublicUpdates);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadPublicUpdates();
});

initializeMap();
loadPublicUpdates();
window.setInterval(loadPublicUpdates, 60000);
