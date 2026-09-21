// ======================================================
// SAFESPHERE AI - FRONTEND API CONNECTION
// ======================================================

// If your backend uses a different port, change this URL.
const API_BASE = "http://127.0.0.1:8000";

// Demo convenience: token is stored in this browser tab's
// sessionStorage and removed when the tab session ends.
// For production, use a more secure authentication design.
const TOKEN_KEY = "safesphere_access_token";
const USER_KEY = "safesphere_user";

let currentUser = null;

// ======================================================
// DOM HELPERS
// ======================================================

const $ = (id) => document.getElementById(id);

function showMessage(elementId, message, type = "") {
  const element = $(elementId);
  element.textContent = message;
  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  currentUser = null;
}

// ======================================================
// API HELPER
// ======================================================

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running at " +
      API_BASE
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      showAuth();
    }

    const detail = data?.detail;

    let message = "Request failed.";

    if (Array.isArray(detail)) {
      message = detail
        .map((item) => item.msg || "Invalid input")
        .join(", ");
    } else if (typeof detail === "string") {
      message = detail;
    } else if (detail) {
      message = JSON.stringify(detail);
    }

    throw new Error(message);
  }

  return data;
}

// ======================================================
// AUTH UI
// ======================================================

function showAuth() {
  $("authSection").classList.remove("hidden");
  $("dashboardSection").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("userLabel").textContent = "Not signed in";

  showMessage("incidentMessage", "");
  showMessage("contactMessage", "");
}

function showDashboard() {
  $("authSection").classList.add("hidden");
  $("dashboardSection").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");

  const name = currentUser?.name || "there";
  $("userLabel").textContent = name;
  $("welcomeTitle").textContent = `Welcome, ${name}!`;
}

function setAuthTab(tabName) {
  const loginSelected = tabName === "login";

  $("loginForm").classList.toggle("hidden", !loginSelected);
  $("registerForm").classList.toggle("hidden", loginSelected);

  $("showLoginBtn").classList.toggle("active", loginSelected);
  $("showRegisterBtn").classList.toggle("active", !loginSelected);

  showMessage("authMessage", "");
}

$("showLoginBtn").addEventListener("click", () => {
  setAuthTab("login");
});

$("showRegisterBtn").addEventListener("click", () => {
  setAuthTab("register");
});

// ======================================================
// REGISTER
// ======================================================

$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;

  showMessage("authMessage", "Creating your account...");

  try {
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    showMessage(
      "authMessage",
      "Account created. You can now log in.",
      "success"
    );

    $("loginEmail").value = email;
    $("loginPassword").value = "";
    $("registerForm").reset();

    setAuthTab("login");
    showMessage(
      "authMessage",
      "Account created. Please log in.",
      "success"
    );
  } catch (error) {
    showMessage("authMessage", error.message, "error");
  }
});

// ======================================================
// LOGIN
// ======================================================

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  showMessage("authMessage", "Logging in...");

  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!data.access_token || !data.user) {
      throw new Error(
        "Login response is missing access_token or user. " +
        "Check the backend AuthResponse schema."
      );
    }

    saveSession(data.access_token, data.user);
    showDashboard();
    await loadDashboard();

    showMessage("authMessage", "");
    $("loginForm").reset();
  } catch (error) {
    showMessage("authMessage", error.message, "error");
  }
});

// ======================================================
// LOGOUT
// ======================================================

$("logoutBtn").addEventListener("click", () => {
  clearSession();
  showAuth();
  setAuthTab("login");
  showMessage("authMessage", "You have logged out.", "success");
});

// ======================================================
// INCIDENT REPORTING
// ======================================================

$("incidentForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const latitudeText = $("incidentLatitude").value.trim();
  const longitudeText = $("incidentLongitude").value.trim();

  const payload = {
    title: $("incidentTitle").value.trim(),
    description: $("incidentDescription").value.trim(),
    category: $("incidentCategory").value,
    severity: $("incidentSeverity").value,
    location_text: $("incidentLocation").value.trim() || null,
    latitude: latitudeText === "" ? null : Number(latitudeText),
    longitude: longitudeText === "" ? null : Number(longitudeText)
  };

  showMessage("incidentMessage", "Submitting incident...");

  try {
    await apiRequest("/api/incidents", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    $("incidentForm").reset();

    showMessage(
      "incidentMessage",
      "Incident report saved successfully.",
      "success"
    );

    await loadIncidents();
  } catch (error) {
    showMessage("incidentMessage", error.message, "error");
  }
});

// ======================================================
// LOAD INCIDENTS
// ======================================================

async function loadIncidents() {
  const container = $("incidentList");
  container.innerHTML = '<p class="muted">Loading incidents...</p>';

  try {
    const incidents = await apiRequest("/api/incidents");

    $("incidentCount").textContent = incidents.length;

    const openIncidents = incidents.filter(
      (incident) =>
        incident.status !== "Resolved" &&
        incident.status !== "Closed"
    );

    $("openCount").textContent = openIncidents.length;

    if (!incidents.length) {
      container.innerHTML =
        '<p class="empty-state">No incidents reported yet.</p>';
      return;
    }

    container.innerHTML = incidents.map((incident) => {
      const severityClass = String(incident.severity || "")
        .toLowerCase();

      const location = incident.location_text
        ? `<p><strong>Location:</strong> ${escapeHTML(incident.location_text)}</p>`
        : "";

      const coordinates =
        incident.latitude !== null &&
        incident.latitude !== undefined &&
        incident.longitude !== null &&
        incident.longitude !== undefined
          ? `<p><strong>Coordinates:</strong> ${escapeHTML(incident.latitude)}, ${escapeHTML(incident.longitude)}</p>`
          : "";

      const createdAt = incident.created_at
        ? new Date(incident.created_at).toLocaleString()
        : "Date unavailable";

      return `
        <article class="item-card">
          <h3>${escapeHTML(incident.title)}</h3>

          <div class="item-meta">
            <span class="pill ${escapeHTML(severityClass)}">
              ${escapeHTML(incident.severity)}
            </span>
            <span class="pill">${escapeHTML(incident.category)}</span>
            <span class="pill">${escapeHTML(incident.status)}</span>
          </div>

          <p>${escapeHTML(incident.description)}</p>
          ${location}
          ${coordinates}

          <p class="muted">Reported: ${escapeHTML(createdAt)}</p>

          <div class="item-actions">
            <select
              aria-label="New status for incident ${incident.id}"
              id="status-${incident.id}"
            >
              ${["Reported", "In Progress", "Resolved", "Closed"]
                .map((status) => `
                  <option
                    value="${escapeHTML(status)}"
                    ${incident.status === status ? "selected" : ""}
                  >
                    ${escapeHTML(status)}
                  </option>
                `).join("")}
            </select>

            <button
              class="button button-outline button-small"
              type="button"
              data-action="update-incident"
              data-id="${incident.id}"
            >
              Update status
            </button>

            <button
              class="button button-danger button-small"
              type="button"
              data-action="delete-incident"
              data-id="${incident.id}"
            >
              Delete
            </button>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML =
      `<p class="message error">${escapeHTML(error.message)}</p>`;
  }
}

// ======================================================
// INCIDENT ACTIONS
// ======================================================

$("incidentList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "update-incident") {
    const status = $(`status-${id}`).value;

    button.disabled = true;
    button.textContent = "Updating...";

    try {
      await apiRequest(`/api/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      await loadIncidents();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = "Update status";
    }
  }

  if (action === "delete-incident") {
    const confirmed = confirm(
      "Are you sure you want to delete this incident report?"
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
      await apiRequest(`/api/incidents/${id}`, {
        method: "DELETE"
      });

      await loadIncidents();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
    }
  }
});

// ======================================================
// ADD TRUSTED CONTACT
// ======================================================

$("contactForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("contactEmail").value.trim();

  const payload = {
    name: $("contactName").value.trim(),
    phone: $("contactPhone").value.trim(),
    email: email || null,
    relationship_label:
      $("contactRelationship").value.trim() || null
  };

  showMessage("contactMessage", "Saving contact...");

  try {
    await apiRequest("/api/contacts", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    $("contactForm").reset();

    showMessage(
      "contactMessage",
      "Trusted contact saved successfully.",
      "success"
    );

    await loadContacts();
  } catch (error) {
    showMessage("contactMessage", error.message, "error");
  }
});

// ======================================================
// LOAD TRUSTED CONTACTS
// ======================================================

async function loadContacts() {
  const container = $("contactList");
  container.innerHTML = '<p class="muted">Loading contacts...</p>';

  try {
    const contacts = await apiRequest("/api/contacts");

    $("contactCount").textContent = contacts.length;

    if (!contacts.length) {
      container.innerHTML =
        '<p class="empty-state">No trusted contacts added yet.</p>';
      return;
    }

    container.innerHTML = contacts.map((contact) => {
      const email = contact.email
        ? `<p><strong>Email:</strong> ${escapeHTML(contact.email)}</p>`
        : "";

      const relationship = contact.relationship_label
        ? `<span class="pill">${escapeHTML(contact.relationship_label)}</span>`
        : "";

      return `
        <article class="item-card">
          <h3>${escapeHTML(contact.name)}</h3>

          <div class="item-meta">
            ${relationship}
          </div>

          <p><strong>Phone:</strong> ${escapeHTML(contact.phone)}</p>
          ${email}

          <div class="item-actions">
            <button
              class="button button-danger button-small"
              type="button"
              data-action="delete-contact"
              data-id="${contact.id}"
            >
              Delete contact
            </button>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML =
      `<p class="message error">${escapeHTML(error.message)}</p>`;
  }
}

// ======================================================
// DELETE TRUSTED CONTACT
// ======================================================

$("contactList").addEventListener("click", async (event) => {
  const button = event.target.closest(
    'button[data-action="delete-contact"]'
  );

  if (!button) return;

  const id = button.dataset.id;

  const confirmed = confirm(
    "Are you sure you want to delete this trusted contact?"
  );

  if (!confirmed) return;

  button.disabled = true;

  try {
    await apiRequest(`/api/contacts/${id}`, {
      method: "DELETE"
    });

    await loadContacts();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
});

// ======================================================
// DASHBOARD LOAD / REFRESH
// ======================================================

async function loadDashboard() {
  await Promise.all([
    loadIncidents(),
    loadContacts()
  ]);
}

$("refreshBtn").addEventListener("click", async () => {
  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "Refreshing...";

  await loadDashboard();

  $("refreshBtn").disabled = false;
  $("refreshBtn").textContent = "↻ Refresh";
});

// ======================================================
// RESTORE CURRENT TAB SESSION
// ======================================================

async function restoreSession() {
  const token = getToken();
  const storedUser = sessionStorage.getItem(USER_KEY);

  if (!token || !storedUser) {
    showAuth();
    return;
  }

  try {
    currentUser = JSON.parse(storedUser);

    // Verify token against the backend.
    const user = await apiRequest("/api/auth/me");

    currentUser = user;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

    showDashboard();
    await loadDashboard();
  } catch (error) {
    clearSession();
    showAuth();
  }
}

// Start the app.
restoreSession();



/* ==========================================
   SAFESPHERE AI - GPS AND SOS
========================================== */

let safeSphereLocation = null;

// ------------------------------------------
// GET CURRENT LOCATION
// ------------------------------------------

const getLocationBtn = $("getLocationBtn");

if (getLocationBtn) {
  getLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage(
        "locationMessage",
        "Geolocation is not supported by this browser.",
        "error"
      );
      return;
    }

    showMessage(
      "locationMessage",
      "Requesting your location permission..."
    );

    getLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        safeSphereLocation = {
          latitude,
          longitude
        };

        $("incidentLatitude").value = latitude;
        $("incidentLongitude").value = longitude;

        $("latitudePreview").textContent =
          latitude.toFixed(6);

        $("longitudePreview").textContent =
          longitude.toFixed(6);

        const mapUrl =
          "https://www.google.com/maps?q=" +
          encodeURIComponent(`${latitude},${longitude}`);

        $("mapLink").href = mapUrl;
        $("locationPreview").classList.remove("hidden");

        showMessage(
          "locationMessage",
          "Location obtained and added to your incident form.",
          "success"
        );

        getLocationBtn.disabled = false;
      },

      (error) => {
        let message = "Unable to get your location.";

        if (error.code === 1) {
          message =
            "Location permission was denied. Allow location access " +
            "in your browser settings and try again.";
        } else if (error.code === 2) {
          message =
            "Your location is currently unavailable. Check your " +
            "device location settings and try again.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        showMessage("locationMessage", message, "error");
        getLocationBtn.disabled = false;
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}


/* ==========================================
   SAFESPHERE AI - SOS EMAIL + SMS ALERTS
========================================== */

// This must match the ID of your SOS alert button.
const sosButton = $("sosButton");
const sosMessage = $("sosMessage");

// Prevent multiple simultaneous SOS requests.
let sosRequestInProgress = false;

// ------------------------------------------
// DISPLAY INDIVIDUAL CONTACT RESULTS
// ------------------------------------------

function displaySOSResults(result) {
  if (!sosMessage) return;

  const lines = [];

  lines.push(result.message || "SOS request processed.");

  if (Array.isArray(result.results)) {
    result.results.forEach((contact) => {
      lines.push("");
      lines.push("Contact: " + (contact.contact_name || "Trusted contact"));

      const email = contact.email;
      const sms = contact.sms;

      if (email) {
        lines.push(
          "Email: " +
          (email.success ? "Accepted" : "Failed") +
          " - " +
          (email.detail || "")
        );
      }

      if (sms) {
        lines.push(
          "SMS: " +
          (sms.success ? "Accepted" : "Failed") +
          " - " +
          (sms.detail || "")
        );
      }
    });
  }

  sosMessage.textContent = lines.join("\n");
}

// ------------------------------------------
// SEND SOS ALERT
// ------------------------------------------

if (sosButton) {
  sosButton.addEventListener("click", async () => {
    if (sosRequestInProgress) return;

    if (!getToken()) {
      alert("Please log in before sending an SOS alert.");
      showAuth();
      return;
    }

    const confirmed = window.confirm(
      "SEND EMERGENCY SOS ALERT?\n\n" +
      "SafeSphere AI will attempt to send email and SMS " +
      "alerts to your saved trusted contacts.\n\n" +
      "Your GPS location may be included if available.\n\n" +
      "Continue?"
    );

    if (!confirmed) return;

    sosRequestInProgress = true;
    sosButton.disabled = true;

    if (sosMessage) {
      sosMessage.textContent = "Preparing SOS alert...";
    }

    try {
      let location = safeSphereLocation;

      // Request fresh GPS location if available.
      if (navigator.geolocation) {
        if (sosMessage) {
          sosMessage.textContent =
            "Getting your location. Please allow permission if asked...";
        }

        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            () => resolve(null),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
      }

      if (sosMessage) {
        sosMessage.textContent =
          "Sending SOS alerts to your trusted contacts...";
      }

      const result = await apiRequest("/api/alerts/sos", {
        method: "POST",
        body: JSON.stringify({
          title: "Emergency SOS Alert",
          message:
            "I need help. Please contact me and check my safety.",
          location_text: null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null
        })
      });

      displaySOSResults(result);

      // Do not claim delivery unless delivery is confirmed.
      if (result.success) {
        alert(
          "SOS request processed.\n\n" +
          "At least one notification was accepted for sending.\n\n" +
          "This does not confirm that the recipient received or read it."
        );
      } else {
        alert(
          result.message ||
          "No notification was accepted. Check the results."
        );
      }

      console.log("SafeSphere SOS results:", result);

    } catch (error) {
      if (sosMessage) {
        sosMessage.textContent =
          "SOS request failed: " + error.message;
      }

      alert(
        "SOS request failed.\n\n" +
        error.message
      );

    } finally {
      sosRequestInProgress = false;
      sosButton.disabled = false;
    }
  });

} else {
  console.error(
    "SOS alert button not found. " +
    "Add id='sosButton' to your SOS alert button."
  );
}
// ------------------------------------------
// OPTIONAL DIRECT EMERGENCY CALL
// ------------------------------------------

const emergencyCallBtn = $("emergencyCallBtn");

if (emergencyCallBtn) {
  emergencyCallBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "This will open your device's calling interface. " +
      "You must complete the call yourself.\n\n" +
      "If you are in India, the emergency number is 112.\n\n" +
      "Continue?"
    );

    if (confirmed) {
      window.location.href = "tel:112";
    }
  });
}

/* =========================================
   SAFESPHERE AI - HOLD SOS + EMERGENCY MENU
========================================= */

(() => {
  const sosButton = document.getElementById("sosButton");
  const sosHoldText = document.getElementById("sosHoldText");
  const sosModal = document.getElementById("sosModal");
  const closeSosModal = document.getElementById("closeSosModal");
  const trustedContactOptions =
    document.getElementById("trustedContactOptions");
  const sosMessage = document.getElementById("sosMessage");

  if (!sosButton || !sosModal) {
    console.error("SOS HTML elements were not found.");
    return;
  }

  const HOLD_REQUIRED_MS = 3000;
  const HOLD_MAX_MS = 5000;

  let holdStartedAt = 0;
  let holdTimer = null;
  let holdActivated = false;
  let pointerIsDown = false;

  let currentLocation = null;
  let trustedContacts = [];

  const emergencyServices = {
    ambulance: {
      name: "Hospital / Ambulance",
      phone: "108"
    },
    police: {
      name: "Police Emergency",
      phone: "112"
    },
    fire: {
      name: "Fire Brigade",
      phone: "101"
    }
  };

  function showStatus(message) {
    if (sosMessage) {
      sosMessage.textContent = message;
    }
  }

  function openModal() {
    sosModal.classList.remove("hidden");
  }

  function closeModal() {
    sosModal.classList.add("hidden");
  }

  closeSosModal?.addEventListener("click", closeModal);

  sosModal.addEventListener("click", (event) => {
    if (event.target === sosModal) {
      closeModal();
    }
  });

  // Get fresh GPS location if the user allows it.
  function getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  function buildEmergencyMessage() {
    let message =
      "EMERGENCY SOS! I need help. Please contact me immediately.";

    if (currentLocation) {
      const lat = currentLocation.latitude;
      const lng = currentLocation.longitude;

      message +=
        "\nMy location: https://maps.google.com/?q=" +
        encodeURIComponent(`${lat},${lng}`);
    } else {
      message += "\nMy GPS location is currently unavailable.";
    }

    return message;
  }

  // Create safe text-only contact buttons.
  function renderTrustedContacts() {
    trustedContactOptions.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Your Trusted Contacts";
    trustedContactOptions.appendChild(heading);

    if (!trustedContacts.length) {
      const empty = document.createElement("p");
      empty.textContent =
        "No trusted contacts with phone numbers were found.";
      trustedContactOptions.appendChild(empty);
      return;
    }

    trustedContacts.forEach((contact) => {
      const name =
        contact.name ||
        contact.contact_name ||
        "Trusted Contact";

      const phone =
        contact.phone ||
        contact.phone_number ||
        "";

      if (!phone) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "emergency-option";

      const title = document.createElement("span");
      title.textContent = "👤 " + name;

      const number = document.createElement("small");
      number.textContent = phone;

      button.appendChild(title);
      button.appendChild(number);

      button.addEventListener("click", () => {
        handleEmergencySelection(name, phone);
      });

      trustedContactOptions.appendChild(button);
    });
  }

  async function loadTrustedContacts() {
    trustedContactOptions.innerHTML = "";

    const loading = document.createElement("p");
    loading.textContent = "Loading your trusted contacts...";
    trustedContactOptions.appendChild(loading);

    if (typeof getToken !== "function" || !getToken()) {
      trustedContacts = [];
      renderTrustedContacts();
      return;
    }

    try {
      // This assumes your existing backend route is GET /api/contacts.
      const result = await apiRequest("/api/contacts", {
        method: "GET"
      });

      // Support either a plain array or { contacts: [...] }.
      trustedContacts = Array.isArray(result)
        ? result
        : Array.isArray(result.contacts)
          ? result.contacts
          : [];

      trustedContacts = trustedContacts.filter((contact) => {
        return Boolean(
          contact.phone ||
          contact.phone_number
        );
      });

      renderTrustedContacts();
    } catch (error) {
      console.error("Could not load trusted contacts:", error);

      trustedContacts = [];
      renderTrustedContacts();

      showStatus(
        "Could not load saved contacts. Check your login and API connection."
      );
    }
  }

  async function showEmergencyOptions() {
    holdActivated = true;

    sosButton.disabled = true;
    sosHoldText.textContent = "SOS options opened";

    showStatus("Preparing emergency options...");

    // Try to get the user's location before building the SMS.
    currentLocation = await getCurrentLocation();

    openModal();

    await loadTrustedContacts();

    sosButton.disabled = false;
    sosHoldText.textContent = "Hold for 3 seconds";
  }

  function startHold(event) {
    if (pointerIsDown || holdActivated) return;

    pointerIsDown = true;
    holdStartedAt = Date.now();

    sosButton.setPointerCapture?.(event.pointerId);

    sosHoldText.textContent = "Keep holding...";

    holdTimer = setTimeout(() => {
      if (pointerIsDown) {
        showEmergencyOptions();
      }
    }, HOLD_REQUIRED_MS);
  }

  function endHold() {
    if (!pointerIsDown) return;

    const heldFor = Date.now() - holdStartedAt;

    pointerIsDown = false;
    clearTimeout(holdTimer);

    if (holdActivated) {
      holdActivated = false;
      return;
    }

    if (heldFor < HOLD_REQUIRED_MS) {
      showStatus("SOS cancelled. Hold for at least 3 seconds.");
    } else if (heldFor > HOLD_MAX_MS) {
      showStatus("Hold duration exceeded. Please try again.");
    }

    sosHoldText.textContent = "Hold for 3 seconds";
  }

  sosButton.addEventListener("pointerdown", startHold);
  sosButton.addEventListener("pointerup", endHold);
  sosButton.addEventListener("pointercancel", endHold);
  sosButton.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  async function handleEmergencySelection(name, phone) {
    if (!phone) {
      showStatus("This emergency option has no phone number.");
      return;
    }

    const message = buildEmergencyMessage();

    const confirmed = window.confirm(
      `Emergency: ${name}\n\n` +
      `Phone: ${phone}\n\n` +
      "Open the phone dialer to call this number?\n\n" +
      "After the call, you can send an SMS with your location."
    );

    if (!confirmed) return;

    // Open the native phone dialer. The user confirms the call.
    window.location.href = `tel:${phone}`;

    // Do not silently send SMS. Offer the SMS composer after a brief delay.
    setTimeout(() => {
      const sendSms = window.confirm(
        `Prepare an emergency SMS for ${name}?\n\n` +
        "Your messaging app will open. You must tap Send."
      );

      if (sendSms) {
        openSmsComposer(phone, message);
      }
    }, 1000);
  }

  function openSmsComposer(phone, message) {
    const smsUrl =
      "sms:" +
      encodeURIComponent(phone) +
      "?body=" +
      encodeURIComponent(message);

    window.location.href = smsUrl;
  }

  // Emergency service buttons.
  document.querySelectorAll(".emergency-option[data-type]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.type;
        const service = emergencyServices[type];

        if (!service) return;

        handleEmergencySelection(
          service.name,
          service.phone
        );
      });
    });

})();