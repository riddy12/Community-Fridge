
const storageKey = "studentPremiumFridgeUpdates";

const searchInput = document.querySelector("#searchInput");
const fridgeCards = document.querySelectorAll(".fridge-card");
const noResults = document.querySelector("#noResults");
const fridgeSelect = document.querySelector("#fridgeName");
const logForm = document.querySelector("#logForm");
const formMessage = document.querySelector("#formMessage");
const activityList = document.querySelector("#activityList");
const clearUpdatesButton = document.querySelector("#clearUpdates");
const mapTitle = document.querySelector("#mapTitle");
const mapMessage = document.querySelector("#mapMessage");

const sampleUpdates = [
  {
    fridge: "Oak Street Fridge",
    action: "Donated food",
    details: "Fresh vegetables and bread were added.",
    notes: "Everything was placed on the middle shelf."
  },
  {
    fridge: "Community Center Pantry",
    action: "Reported a problem",
    details: "The pantry is running low on canned food.",
    notes: "Bottled water would also be helpful."
  }
];

function getSavedUpdates() {
  const savedData = localStorage.getItem(storageKey);

  if (savedData === null) {
    return [];
  }

  return JSON.parse(savedData);
}

function saveUpdates(updates) {
  localStorage.setItem(storageKey, JSON.stringify(updates));
}

function getIcon(action) {
  if (action.includes("Donated")) {
    return "🥕";
  }

  if (action.includes("Picked")) {
    return "🛍️";
  }

  if (action.includes("Cleaned")) {
    return "✨";
  }

  return "🛠️";
}

function displayUpdates() {
  const savedUpdates = getSavedUpdates();
  const allUpdates = savedUpdates.concat(sampleUpdates);

  activityList.innerHTML = "";

  if (allUpdates.length === 0) {
    activityList.innerHTML = '<div class="empty-state">No updates have been added yet.</div>';
    return;
  }

  allUpdates.forEach(function (update) {
    const item = document.createElement("article");
    item.className = "activity-item";

    const icon = document.createElement("div");
    icon.className = "activity-icon";
    icon.textContent = getIcon(update.action);

    const content = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = update.action + " at " + update.fridge;

    const details = document.createElement("p");
    details.textContent = update.details;

    const notes = document.createElement("p");
    notes.textContent = update.notes;

    content.appendChild(title);
    content.appendChild(details);
    content.appendChild(notes);

    item.appendChild(icon);
    item.appendChild(content);

    activityList.appendChild(item);
  });
}

searchInput.addEventListener("input", function () {
  const searchText = searchInput.value.toLowerCase().trim();
  let visibleCards = 0;

  fridgeCards.forEach(function (card) {
    const cardText = card.dataset.search;
    const matches = cardText.includes(searchText);

    card.classList.toggle("hidden", !matches);

    if (matches) {
      visibleCards += 1;
    }
  });

  noResults.classList.toggle("hidden", visibleCards !== 0);
});

document.querySelectorAll(".select-fridge").forEach(function (button) {
  button.addEventListener("click", function () {
    fridgeSelect.value = button.dataset.fridge;
    document.querySelector("#log").scrollIntoView({
      behavior: "smooth"
    });
  });
});

document.querySelectorAll(".show-map").forEach(function (button) {
  button.addEventListener("click", function () {
    mapTitle.textContent = button.dataset.name;
    mapMessage.textContent = button.dataset.message;

    fridgeCards.forEach(function (card) {
      card.classList.remove("selected-card");
    });

    button.closest(".fridge-card").classList.add("selected-card");
  });
});

document.querySelectorAll(".map-pin").forEach(function (pin) {
  pin.addEventListener("click", function () {
    const fridgeName = pin.dataset.fridgeName;

    document.querySelectorAll(".show-map").forEach(function (button) {
      if (button.dataset.name === fridgeName) {
        button.click();
      }
    });
  });
});

logForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const update = {
    fridge: fridgeSelect.value,
    action: document.querySelector("#action").value,
    details: document.querySelector("#details").value.trim(),
    notes: document.querySelector("#notes").value.trim() || "No extra notes."
  };

  const savedUpdates = getSavedUpdates();
  savedUpdates.unshift(update);
  saveUpdates(savedUpdates);

  formMessage.textContent = "Your community update was saved.";
  logForm.reset();
  displayUpdates();

  setTimeout(function () {
    formMessage.textContent = "";
  }, 3000);
});

clearUpdatesButton.addEventListener("click", function () {
  const shouldClear = confirm("Clear the updates you added on this browser?");

  if (shouldClear) {
    localStorage.removeItem(storageKey);
    displayUpdates();
  }
});

displayUpdates();
