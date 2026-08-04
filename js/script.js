const storageKey = "communityFridgeUpdates";

const searchInput = document.querySelector("#searchInput");
const fridgeCards = Array.from(document.querySelectorAll(".fridge-card"));
const fridgeList = document.querySelector(".fridge-list");
const filterButtons = document.querySelectorAll(".filter-button");
const noResults = document.querySelector("#noResults");
const resultCount = document.querySelector("#resultCount");
const fridgeSelect = document.querySelector("#fridgeName");
const logForm = document.querySelector("#logForm");
const formMessage = document.querySelector("#formMessage");
const activityList = document.querySelector("#activityList");
const clearUpdatesButton = document.querySelector("#clearUpdates");
const mapTitle = document.querySelector("#mapTitle");
const mapMessage = document.querySelector("#mapMessage");
const mapNumber = document.querySelector("#mapNumber");
const directionsLink = document.querySelector("#directionsLink");
const locationButton = document.querySelector("#locationButton");
const locationMessage = document.querySelector("#locationMessage");

let currentFilter = "all";

const directions = {
  "Oak Street Fridge": "124 Oak Street Queens NY",
  "Community Center Pantry": "469 Main Street Queens NY",
  "Pine Park Fridge": "Pine Park North Entrance Queens NY"
};

const sampleUpdates = [
  {
    fridge: "Oak Street Fridge",
    action: "Donated food",
    details: "Fresh vegetables and bread were added.",
    notes: "Everything is on the middle shelf.",
    time: "10 min ago"
  },
  {
    fridge: "Community Center Pantry",
    action: "Reported a problem",
    details: "The pantry is running low on canned food.",
    notes: "Bottled water would also be helpful.",
    time: "2 hr ago"
  }
];

function getSavedUpdates() {
  try {
    const savedData = localStorage.getItem(storageKey);
    const parsedData = savedData ? JSON.parse(savedData) : [];
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.warn("Saved fridge updates could not be read.", error);
    return [];
  }
}

function saveUpdates(updates) {
  localStorage.setItem(storageKey, JSON.stringify(updates));
}

function getActionLabel(action) {
  if (action.includes("Donated")) return "GIVE";
  if (action.includes("Picked")) return "TAKE";
  if (action.includes("Cleaned")) return "CARE";
  return "FLAG";
}

function displayUpdates() {
  const allUpdates = getSavedUpdates().concat(sampleUpdates);
  activityList.replaceChildren();

  if (allUpdates.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No reports yet. Be the first neighbor to add one.";
    activityList.appendChild(emptyState);
    return;
  }

  allUpdates.forEach((update) => {
    const item = document.createElement("article");
    item.className = "activity-item";

    const actionLabel = document.createElement("div");
    actionLabel.className = "activity-icon";
    actionLabel.textContent = getActionLabel(update.action);

    const content = document.createElement("div");
    const title = document.createElement("h4");
    const details = document.createElement("p");
    const notes = document.createElement("p");
    title.textContent = `${update.action} · ${update.fridge}`;
    details.textContent = update.details;
    notes.textContent = update.notes;
    content.append(title, details, notes);

    const time = document.createElement("time");
    time.textContent = update.time || "Just now";

    item.append(actionLabel, content, time);
    activityList.appendChild(item);
  });
}

function updateVisibleCards() {
  const searchText = searchInput.value.toLowerCase().trim();
  let visibleCards = 0;

  fridgeCards.forEach((card) => {
    const matchesSearch = card.dataset.search.includes(searchText);
    const matchesFilter = currentFilter === "all" || card.dataset.status === currentFilter;
    const isVisible = matchesSearch && matchesFilter;
    card.classList.toggle("hidden", !isVisible);
    if (isVisible) visibleCards += 1;
  });

  noResults.classList.toggle("hidden", visibleCards !== 0);
  resultCount.textContent = `${visibleCards} ${visibleCards === 1 ? "place" : "places"} found`;
}

function selectLocation(button) {
  const fridgeName = button.dataset.name;
  const cardNumber = button.dataset.card;

  mapTitle.textContent = fridgeName;
  mapMessage.textContent = button.dataset.message;
  mapNumber.textContent = cardNumber;
  directionsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directions[fridgeName])}`;
  directionsLink.setAttribute("aria-label", `Get directions to ${fridgeName}`);

  fridgeCards.forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.fridge === fridgeName);
  });

  document.querySelectorAll(".map-pin").forEach((pin) => {
    pin.classList.toggle("is-active", pin.dataset.fridgeName === fridgeName);
  });
}

function milesBetween(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusMiles = 3958.8;
  const latitudeDistance = toRadians(lat2 - lat1);
  const longitudeDistance = toRadians(lng2 - lng1);
  const startLatitude = toRadians(lat1);
  const endLatitude = toRadians(lat2);
  const value =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDistance / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(value));
}

function sortByCurrentLocation(position) {
  const userLatitude = position.coords.latitude;
  const userLongitude = position.coords.longitude;

  const sortedCards = fridgeCards
    .map((card) => ({
      card,
      distance: milesBetween(
        userLatitude,
        userLongitude,
        Number(card.dataset.lat),
        Number(card.dataset.lng)
      )
    }))
    .sort((first, second) => first.distance - second.distance);

  sortedCards.forEach(({ card, distance }) => {
    card.querySelector(".distance").textContent = `${distance.toFixed(1)} mi`;
    fridgeList.insertBefore(card, noResults);
  });

  locationButton.textContent = "Sorted by distance";
  locationMessage.textContent = "Locations are now ordered from closest to farthest.";
}

searchInput.addEventListener("input", updateVisibleCards);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    updateVisibleCards();
  });
});

document.querySelectorAll(".select-fridge").forEach((button) => {
  button.addEventListener("click", () => {
    fridgeSelect.value = button.dataset.fridge;
    document.querySelector("#updates").scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => fridgeSelect.focus({ preventScroll: true }), 500);
  });
});

document.querySelectorAll(".show-map").forEach((button) => {
  button.addEventListener("click", () => selectLocation(button));
});

document.querySelectorAll(".map-pin").forEach((pin) => {
  pin.addEventListener("click", () => {
    const matchingButton = document.querySelector(
      `.show-map[data-name="${pin.dataset.fridgeName}"]`
    );
    if (matchingButton) selectLocation(matchingButton);
  });
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationMessage.textContent = "Location is not supported in this browser. You can still search by neighborhood.";
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "Finding you…";
  locationMessage.textContent = "";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      sortByCurrentLocation(position);
      locationButton.disabled = false;
    },
    () => {
      locationButton.disabled = false;
      locationButton.textContent = "Use my location";
      locationMessage.textContent = "We couldn’t access your location. Search by neighborhood instead.";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
});

logForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const update = {
    fridge: fridgeSelect.value,
    action: document.querySelector("#action").value,
    details: document.querySelector("#details").value.trim(),
    notes: document.querySelector("#notes").value.trim() || "No extra notes.",
    time: "Just now"
  };

  const savedUpdates = getSavedUpdates();
  savedUpdates.unshift(update);
  saveUpdates(savedUpdates);

  formMessage.textContent = "Update posted. Thanks for looking out for your neighbors.";
  logForm.reset();
  displayUpdates();

  window.setTimeout(() => {
    formMessage.textContent = "";
  }, 4000);
});

clearUpdatesButton.addEventListener("click", () => {
  const shouldClear = window.confirm("Clear the updates you added on this browser?");
  if (shouldClear) {
    localStorage.removeItem(storageKey);
    displayUpdates();
  }
});

updateVisibleCards();
displayUpdates();
