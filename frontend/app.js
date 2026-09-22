// ======================================================
// SAFESPHERE AI - FRONTEND API CONNECTION
// ======================================================

const API_BASE = "https://safesphere-ai-qg3h.onrender.com";

const TOKEN_KEY = "safesphere_access_token";
const USER_KEY = "safesphere_user";

let currentUser = null;


// ======================================================
// DOM HELPERS
// ======================================================

const $ = (id) => document.getElementById(id);

function showMessage(elementId, message, type = "") {
  const element = $(elementId);

  if (!element) {
    console.warn(`Element not found: #${elementId}`);
    return;
  }

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

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
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
    console.error(
      "SafeSphere API connection error:",
      error
    );

    throw new Error(
      "Cannot connect to the SafeSphere backend. " +
      "Make sure the Render backend is running and the URL is correct."
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

      if (typeof showAuth === "function") {
        showAuth();
      }
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
  const authSection = $("authSection");
  const dashboardSection = $("dashboardSection");
  const logoutBtn = $("logoutBtn");
  const userLabel = $("userLabel");

  if (authSection) {
    authSection.classList.remove("hidden");
  }

  if (dashboardSection) {
    dashboardSection.classList.add("hidden");
  }

  if (logoutBtn) {
    logoutBtn.classList.add("hidden");
  }

  if (userLabel) {
    userLabel.textContent = "Not signed in";
  }

  showMessage("incidentMessage", "");
  showMessage("contactMessage", "");
}

function showDashboard() {
  const authSection = $("authSection");
  const dashboardSection = $("dashboardSection");
  const logoutBtn = $("logoutBtn");
  const userLabel = $("userLabel");
  const welcomeTitle = $("welcomeTitle");

  if (authSection) {
    authSection.classList.add("hidden");
  }

  if (dashboardSection) {
    dashboardSection.classList.remove("hidden");
  }

  if (logoutBtn) {
    logoutBtn.classList.remove("hidden");
  }

  const name = currentUser?.name || "there";

  if (userLabel) {
    userLabel.textContent = name;
  }

  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome, ${name}!`;
  }
}

function setAuthTab(tabName) {
  const loginSelected = tabName === "login";

  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  const showLoginBtn = $("showLoginBtn");
  const showRegisterBtn = $("showRegisterBtn");

  if (loginForm) {
    loginForm.classList.toggle(
      "hidden",
      !loginSelected
    );
  }

  if (registerForm) {
    registerForm.classList.toggle(
      "hidden",
      loginSelected
    );
  }

  if (showLoginBtn) {
    showLoginBtn.classList.toggle(
      "active",
      loginSelected
    );
  }

  if (showRegisterBtn) {
    showRegisterBtn.classList.toggle(
      "active",
      !loginSelected
    );
  }

  showMessage("authMessage", "");
}


// ======================================================
// AUTH TABS
// ======================================================

$("showLoginBtn")?.addEventListener(
  "click",
  () => {
    setAuthTab("login");
  }
);

$("showRegisterBtn")?.addEventListener(
  "click",
  () => {
    setAuthTab("register");
  }
);


// ======================================================
// REGISTER
// ======================================================

$("registerForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const name =
      $("registerName")?.value.trim() || "";

    const email =
      $("registerEmail")?.value.trim() || "";

    const password =
      $("registerPassword")?.value || "";

    showMessage(
      "authMessage",
      "Creating your account..."
    );

    try {

      await apiRequest(
        "/api/auth/register",
        {
          method: "POST",

          body: JSON.stringify({
            name,
            email,
            password
          })
        }
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

      showMessage(
        "authMessage",
        error.message,
        "error"
      );
    }
  }
);


// ======================================================
// LOGIN
// ======================================================

$("loginForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      $("loginEmail")?.value.trim() || "";

    const password =
      $("loginPassword")?.value || "";

    showMessage(
      "authMessage",
      "Logging in..."
    );

    try {

      const data = await apiRequest(
        "/api/auth/login",
        {
          method: "POST",

          body: JSON.stringify({
            email,
            password
          })
        }
      );

      if (
        !data.access_token ||
        !data.user
      ) {
        throw new Error(
          "Login response is missing access_token or user."
        );
      }

      saveSession(
        data.access_token,
        data.user
      );

      showDashboard();

      await loadDashboard();

      $("loginForm").reset();

      showMessage(
        "authMessage",
        ""
      );

    } catch (error) {

      showMessage(
        "authMessage",
        error.message,
        "error"
      );
    }
  }
);


// ======================================================
// LOGOUT
// ======================================================

$("logoutBtn")?.addEventListener(
  "click",
  () => {

    clearSession();

    showAuth();

    setAuthTab("login");

    showMessage(
      "authMessage",
      "You have logged out.",
      "success"
    );
  }
);


// ======================================================
// INCIDENT REPORTING
// ======================================================

$("incidentForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const latitudeText =
      $("incidentLatitude")?.value.trim() || "";

    const longitudeText =
      $("incidentLongitude")?.value.trim() || "";

    const payload = {

      title:
        $("incidentTitle")?.value.trim() || "",

      description:
        $("incidentDescription")?.value.trim() || "",

      category:
        $("incidentCategory")?.value || "",

      severity:
        $("incidentSeverity")?.value || "",

      location_text:
        $("incidentLocation")?.value.trim() || null,

      latitude:
        latitudeText === ""
          ? null
          : Number(latitudeText),

      longitude:
        longitudeText === ""
          ? null
          : Number(longitudeText)
    };

    showMessage(
      "incidentMessage",
      "Submitting incident..."
    );

    try {

      await apiRequest(
        "/api/incidents",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      $("incidentForm").reset();

      showMessage(
        "incidentMessage",
        "Incident report saved successfully.",
        "success"
      );

      await loadIncidents();

    } catch (error) {

      showMessage(
        "incidentMessage",
        error.message,
        "error"
      );
    }
  }
);


// ======================================================
// LOAD INCIDENTS
// ======================================================

async function loadIncidents() {

  const container = $("incidentList");

  if (!container) return;

  container.innerHTML =
    '<p class="muted">Loading incidents...</p>';

  try {

    const incidents =
      await apiRequest("/api/incidents");

    if ($("incidentCount")) {
      $("incidentCount").textContent =
        incidents.length;
    }

    const openIncidents =
      incidents.filter(
        (incident) =>
          incident.status !== "Resolved" &&
          incident.status !== "Closed"
      );

    if ($("openCount")) {
      $("openCount").textContent =
        openIncidents.length;
    }

    if (!incidents.length) {

      container.innerHTML =
        '<p class="empty-state">No incidents reported yet.</p>';

      return;
    }

    container.innerHTML =
      incidents.map(
        (incident) => {

          const severityClass =
            String(
              incident.severity || ""
            ).toLowerCase();

          const location =
            incident.location_text
              ? `
                <p>
                  <strong>Location:</strong>
                  ${escapeHTML(
                    incident.location_text
                  )}
                </p>
              `
              : "";

          const coordinates =
            incident.latitude !== null &&
            incident.latitude !== undefined &&
            incident.longitude !== null &&
            incident.longitude !== undefined
              ? `
                <p>
                  <strong>Coordinates:</strong>
                  ${escapeHTML(
                    incident.latitude
                  )},
                  ${escapeHTML(
                    incident.longitude
                  )}
                </p>
              `
              : "";

          const createdAt =
            incident.created_at
              ? new Date(
                  incident.created_at
                ).toLocaleString()
              : "Date unavailable";

          return `
            <article class="item-card">

              <h3>
                ${escapeHTML(
                  incident.title
                )}
              </h3>

              <div class="item-meta">

                <span class="pill ${escapeHTML(
                  severityClass
                )}">
                  ${escapeHTML(
                    incident.severity
                  )}
                </span>

                <span class="pill">
                  ${escapeHTML(
                    incident.category
                  )}
                </span>

                <span class="pill">
                  ${escapeHTML(
                    incident.status
                  )}
                </span>

              </div>

              <p>
                ${escapeHTML(
                  incident.description
                )}
              </p>

              ${location}

              ${coordinates}

              <p class="muted">
                Reported:
                ${escapeHTML(createdAt)}
              </p>

              <div class="item-actions">

                <select
                  aria-label="New status for incident ${incident.id}"
                  id="status-${incident.id}"
                >

                  ${[
                    "Reported",
                    "In Progress",
                    "Resolved",
                    "Closed"
                  ]
                    .map(
                      (status) => `
                        <option
                          value="${escapeHTML(
                            status
                          )}"
                          ${
                            incident.status ===
                            status
                              ? "selected"
                              : ""
                          }
                        >
                          ${escapeHTML(
                            status
                          )}
                        </option>
                      `
                    )
                    .join("")}

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
        }
      ).join("");

  } catch (error) {

    container.innerHTML =
      `<p class="message error">
        ${escapeHTML(error.message)}
      </p>`;
  }
}


// ======================================================
// INCIDENT ACTIONS
// ======================================================

$("incidentList")?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    // ------------------------------------------
    // UPDATE INCIDENT
    // ------------------------------------------

    if (
      action === "update-incident"
    ) {

      const statusElement =
        $(`status-${id}`);

      if (!statusElement) return;

      const status =
        statusElement.value;

      button.disabled = true;
      button.textContent = "Updating...";

      try {

        await apiRequest(
          `/api/incidents/${id}/status`,
          {
            method: "PATCH",

            body: JSON.stringify({
              status
            })
          }
        );

        await loadIncidents();

      } catch (error) {

        alert(error.message);

        button.disabled = false;
        button.textContent =
          "Update status";
      }
    }

    // ------------------------------------------
    // DELETE INCIDENT
    // ------------------------------------------

    if (
      action === "delete-incident"
    ) {

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this incident report?"
        );

      if (!confirmed) return;

      button.disabled = true;

      try {

        await apiRequest(
          `/api/incidents/${id}`,
          {
            method: "DELETE"
          }
        );

        await loadIncidents();

      } catch (error) {

        alert(error.message);

        button.disabled = false;
      }
    }
  }
);


// ======================================================
// ADD TRUSTED CONTACT
// ======================================================

$("contactForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      $("contactEmail")?.value.trim() || "";

    const payload = {

      name:
        $("contactName")?.value.trim() || "",

      phone:
        $("contactPhone")?.value.trim() || "",

      email:
        email || null,

      relationship_label:
        $("contactRelationship")
          ?.value.trim() || null
    };

    showMessage(
      "contactMessage",
      "Saving contact..."
    );

    try {

      await apiRequest(
        "/api/contacts",
        {
          method: "POST",

          body: JSON.stringify(
            payload
          )
        }
      );

      $("contactForm").reset();

      showMessage(
        "contactMessage",
        "Trusted contact saved successfully.",
        "success"
      );

      await loadContacts();

    } catch (error) {

      showMessage(
        "contactMessage",
        error.message,
        "error"
      );
    }
  }
);


// ======================================================
// LOAD TRUSTED CONTACTS
// ======================================================

async function loadContacts() {

  const container =
    $("contactList");

  if (!container) return;

  container.innerHTML =
    '<p class="muted">Loading contacts...</p>';

  try {

    const result =
      await apiRequest(
        "/api/contacts"
      );

    const contacts =
      Array.isArray(result)
        ? result
        : Array.isArray(result?.contacts)
          ? result.contacts
          : [];

    if ($("contactCount")) {
      $("contactCount").textContent =
        contacts.length;
    }

    if (!contacts.length) {

      container.innerHTML =
        '<p class="empty-state">No trusted contacts added yet.</p>';

      return;
    }

    container.innerHTML =
      contacts.map(
        (contact) => {

          const email =
            contact.email
              ? `
                <p>
                  <strong>Email:</strong>
                  ${escapeHTML(
                    contact.email
                  )}
                </p>
              `
              : "";

          const relationship =
            contact.relationship_label
              ? `
                <span class="pill">
                  ${escapeHTML(
                    contact.relationship_label
                  )}
                </span>
              `
              : "";

          return `
            <article class="item-card">

              <h3>
                ${escapeHTML(
                  contact.name ||
                  contact.contact_name ||
                  "Trusted Contact"
                )}
              </h3>

              <div class="item-meta">
                ${relationship}
              </div>

              <p>
                <strong>Phone:</strong>
                ${escapeHTML(
                  contact.phone ||
                  contact.phone_number ||
                  ""
                )}
              </p>

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
        }
      ).join("");

  } catch (error) {

    container.innerHTML =
      `<p class="message error">
        ${escapeHTML(error.message)}
      </p>`;
  }
}


// ======================================================
// DELETE TRUSTED CONTACT
// ======================================================

$("contactList")?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        'button[data-action="delete-contact"]'
      );

    if (!button) return;

    const id =
      button.dataset.id;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this trusted contact?"
      );

    if (!confirmed) return;

    button.disabled = true;

    try {

      await apiRequest(
        `/api/contacts/${id}`,
        {
          method: "DELETE"
        }
      );

      await loadContacts();

    } catch (error) {

      alert(error.message);

      button.disabled = false;
    }
  }
);


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

  await Promise.all([
    loadIncidents(),
    loadContacts()
  ]);
}


// ======================================================
// REFRESH
// ======================================================

$("refreshBtn")?.addEventListener(
  "click",
  async () => {

    const refreshBtn =
      $("refreshBtn");

    if (!refreshBtn) return;

    refreshBtn.disabled = true;
    refreshBtn.textContent =
      "Refreshing...";

    try {

      await loadDashboard();

    } finally {

      refreshBtn.disabled = false;
      refreshBtn.textContent =
        "↻ Refresh";
    }
  }
);


// ======================================================
// RESTORE CURRENT SESSION
// ======================================================

async function restoreSession() {

  const token =
    getToken();

  const storedUser =
    sessionStorage.getItem(
      USER_KEY
    );

  if (
    !token ||
    !storedUser
  ) {

    showAuth();
    return;
  }

  try {

    currentUser =
      JSON.parse(
        storedUser
      );

    const user =
      await apiRequest(
        "/api/auth/me"
      );

    currentUser =
      user;

    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    showDashboard();

    await loadDashboard();

  } catch (error) {

    console.warn(
      "Session restore failed:",
      error
    );

    clearSession();

    showAuth();
  }
}


// ======================================================
// GPS
// ======================================================

let safeSphereLocation = null;


// ------------------------------------------------------
// GET CURRENT LOCATION
// ------------------------------------------------------

const getLocationBtn =
  $("getLocationBtn");

if (getLocationBtn) {

  getLocationBtn.addEventListener(
    "click",
    () => {

      if (
        !navigator.geolocation
      ) {

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

      getLocationBtn.disabled =
        true;

      navigator.geolocation.getCurrentPosition(

        (position) => {

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          safeSphereLocation = {
            latitude,
            longitude
          };

          if ($("incidentLatitude")) {
            $("incidentLatitude").value =
              latitude;
          }

          if ($("incidentLongitude")) {
            $("incidentLongitude").value =
              longitude;
          }

          if ($("latitudePreview")) {
            $("latitudePreview").textContent =
              latitude.toFixed(6);
          }

          if ($("longitudePreview")) {
            $("longitudePreview").textContent =
              longitude.toFixed(6);
          }

          const mapUrl =
            "https://www.google.com/maps?q=" +
            encodeURIComponent(
              `${latitude},${longitude}`
            );

          if ($("mapLink")) {
            $("mapLink").href =
              mapUrl;
          }

          if ($("locationPreview")) {
            $("locationPreview")
              .classList
              .remove("hidden");
          }

          showMessage(
            "locationMessage",
            "Location obtained and added to your incident form.",
            "success"
          );

          getLocationBtn.disabled =
            false;
        },

        (error) => {

          let message =
            "Unable to get your location.";

          if (error.code === 1) {

            message =
              "Location permission was denied. " +
              "Allow location access in your browser settings and try again.";

          } else if (error.code === 2) {

            message =
              "Your location is currently unavailable. " +
              "Check your device location settings and try again.";

          } else if (error.code === 3) {

            message =
              "Location request timed out. Please try again.";
          }

          showMessage(
            "locationMessage",
            message,
            "error"
          );

          getLocationBtn.disabled =
            false;
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    }
  );
}


// ======================================================
// SAFESPHERE AI
// HOLD SOS + EMERGENCY MENU
// ======================================================

(() => {

  const sosButton =
    $("sosButton");

  const sosHoldText =
    $("sosHoldText");

  const sosModal =
    $("sosModal");

  const closeSosModal =
    $("closeSosModal");

  const trustedContactOptions =
    $("trustedContactOptions");

  const sosMessage =
    $("sosMessage");


  // ----------------------------------------------------
  // CHECK REQUIRED HTML
  // ----------------------------------------------------

  if (
    !sosButton ||
    !sosModal
  ) {

    console.warn(
      "SafeSphere SOS elements were not found. " +
      "Make sure your index.html contains the SOS HTML."
    );

    return;
  }


  // ----------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------

  const HOLD_REQUIRED_MS = 3000;

  let holdStartedAt = 0;

  let holdTimer = null;

  let pointerIsDown = false;

  let emergencyMenuOpened =
    false;

  let currentLocation = null;

  let trustedContacts = [];


  // ----------------------------------------------------
  // EMERGENCY SERVICES
  // ----------------------------------------------------

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


  // ----------------------------------------------------
  // STATUS
  // ----------------------------------------------------

  function showSOSStatus(message) {

    if (sosMessage) {
      sosMessage.textContent =
        message;
    }
  }


  // ----------------------------------------------------
  // OPEN MODAL
  // ----------------------------------------------------

  function openSOSModal() {

    sosModal
      .classList
      .remove("hidden");
  }


  // ----------------------------------------------------
  // CLOSE MODAL
  // ----------------------------------------------------

  function closeSOSModal() {

    sosModal
      .classList
      .add("hidden");

    emergencyMenuOpened =
      false;

    if (sosHoldText) {
      sosHoldText.textContent =
        "Hold for 3 seconds";
    }
  }


  closeSosModal?.addEventListener(
    "click",
    closeSOSModal
  );


  // ----------------------------------------------------
  // CLICK OUTSIDE MODAL
  // ----------------------------------------------------

  sosModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        sosModal
      ) {

        closeSOSModal();
      }
    }
  );


  // ----------------------------------------------------
  // GET FRESH LOCATION
  // ----------------------------------------------------

  function getCurrentLocation() {

    return new Promise(
      (resolve) => {

        if (
          !navigator.geolocation
        ) {

          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(

          (position) => {

            resolve({
              latitude:
                position.coords.latitude,

              longitude:
                position.coords.longitude
            });
          },

          () => {

            resolve(null);
          },

          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    );
  }


  // ----------------------------------------------------
  // BUILD EMERGENCY SMS
  // ----------------------------------------------------

  function buildEmergencyMessage() {

    let message =
      "EMERGENCY SOS! I need help. Please contact me immediately.";

    if (currentLocation) {

      const lat =
        currentLocation.latitude;

      const lng =
        currentLocation.longitude;

      message +=
        "\nMy location: " +
        "https://maps.google.com/?q=" +
        encodeURIComponent(
          `${lat},${lng}`
        );

    } else {

      message +=
        "\nMy GPS location is currently unavailable.";
    }

    return message;
  }


  // ----------------------------------------------------
  // RENDER TRUSTED CONTACTS
  // ----------------------------------------------------

  function renderTrustedContacts() {

    if (
      !trustedContactOptions
    ) {
      return;
    }

    trustedContactOptions.innerHTML =
      "";

    const heading =
      document.createElement(
        "h3"
      );

    heading.textContent =
      "Your Trusted Contacts";

    trustedContactOptions
      .appendChild(
        heading
      );


    if (
      !trustedContacts.length
    ) {

      const empty =
        document.createElement(
          "p"
        );

      empty.textContent =
        "No trusted contacts with phone numbers were found.";

      trustedContactOptions
        .appendChild(
          empty
        );

      return;
    }


    trustedContacts.forEach(
      (contact) => {

        const name =
          contact.name ||
          contact.contact_name ||
          "Trusted Contact";

        const phone =
          contact.phone ||
          contact.phone_number ||
          "";

        if (!phone) {
          return;
        }


        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "emergency-option";


        const title =
          document.createElement(
            "span"
          );

        title.textContent =
          "👤 " + name;


        const number =
          document.createElement(
            "small"
          );

        number.textContent =
          phone;


        button.appendChild(
          title
        );

        button.appendChild(
          number
        );


        button.addEventListener(
          "click",
          () => {

            handleEmergencySelection(
              name,
              phone
            );
          }
        );


        trustedContactOptions
          .appendChild(
            button
          );
      }
    );
  }


  // ----------------------------------------------------
  // LOAD TRUSTED CONTACTS
  // ----------------------------------------------------

  async function loadTrustedContacts() {

    if (
      !trustedContactOptions
    ) {
      return;
    }

    trustedContactOptions.innerHTML =
      "";

    const loading =
      document.createElement(
        "p"
      );

    loading.textContent =
      "Loading your trusted contacts...";

    trustedContactOptions
      .appendChild(
        loading
      );


    if (
      !getToken()
    ) {

      trustedContacts =
        [];

      renderTrustedContacts();

      return;
    }


    try {

      const result =
        await apiRequest(
          "/api/contacts"
        );


      trustedContacts =
        Array.isArray(result)
          ? result
          : Array.isArray(
              result?.contacts
            )
              ? result.contacts
              : [];


      trustedContacts =
        trustedContacts.filter(
          (contact) => {

            return Boolean(
              contact.phone ||
              contact.phone_number
            );
          }
        );


      renderTrustedContacts();

    } catch (error) {

      console.error(
        "Could not load trusted contacts:",
        error
      );

      trustedContacts =
        [];

      renderTrustedContacts();

      showSOSStatus(
        "Could not load saved contacts. Check your login and API connection."
      );
    }
  }


  // ----------------------------------------------------
  // OPEN EMERGENCY OPTIONS
  // ----------------------------------------------------

  async function showEmergencyOptions() {

    emergencyMenuOpened =
      true;

    if (sosHoldText) {

      sosHoldText.textContent =
        "Loading emergency options...";
    }

    showSOSStatus(
      "Getting your location..."
    );


    // Get fresh GPS
    currentLocation =
      await getCurrentLocation();


    if (currentLocation) {

      showSOSStatus(
        "Location obtained. Choose an emergency option."
      );

    } else {

      showSOSStatus(
        "GPS unavailable. You can still choose an emergency option."
      );
    }


    openSOSModal();


    // Load saved contacts
    await loadTrustedContacts();


    if (sosHoldText) {

      sosHoldText.textContent =
        "Hold for 3 seconds";
    }
  }


  // ----------------------------------------------------
  // START SOS HOLD
  // ----------------------------------------------------

  function startHold(event) {

    if (
      pointerIsDown ||
      emergencyMenuOpened
    ) {
      return;
    }


    // Only primary mouse button
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }


    pointerIsDown =
      true;

    holdStartedAt =
      Date.now();


    try {

      sosButton.setPointerCapture?.(
        event.pointerId
      );

    } catch {
      // Ignore pointer capture errors
    }


    if (sosHoldText) {

      sosHoldText.textContent =
        "Keep holding...";
    }


    showSOSStatus(
      "Keep holding the SOS button..."
    );


    holdTimer =
      setTimeout(
        () => {

          if (
            pointerIsDown
          ) {

            showEmergencyOptions();
          }

        },
        HOLD_REQUIRED_MS
      );
  }


  // ----------------------------------------------------
  // END SOS HOLD
  // ----------------------------------------------------

  function endHold(event) {

    if (!pointerIsDown) {
      return;
    }


    const heldFor =
      Date.now() -
      holdStartedAt;


    pointerIsDown =
      false;


    if (holdTimer) {

      clearTimeout(
        holdTimer
      );

      holdTimer =
        null;
    }


    // If emergency menu already opened,
    // don't treat pointer release as cancellation.
    if (
      emergencyMenuOpened
    ) {

      return;
    }


    if (
      heldFor <
      HOLD_REQUIRED_MS
    ) {

      showSOSStatus(
        "SOS cancelled. Hold for at least 3 seconds."
      );

    } else {

      showSOSStatus(
        "Please wait..."
      );
    }


    if (sosHoldText) {

      sosHoldText.textContent =
        "Hold for 3 seconds";
    }
  }


  // ----------------------------------------------------
  // SOS POINTER EVENTS
  // ----------------------------------------------------

  sosButton.addEventListener(
    "pointerdown",
    startHold
  );

  sosButton.addEventListener(
    "pointerup",
    endHold
  );

  sosButton.addEventListener(
    "pointercancel",
    endHold
  );

  sosButton.addEventListener(
    "pointerleave",
    (event) => {

      // For touch devices pointerleave can
      // behave differently, so don't cancel
      // automatically there.
      if (
        event.pointerType === "mouse"
      ) {

        endHold(event);
      }
    }
  );


  // ----------------------------------------------------
  // PREVENT RIGHT CLICK
  // ----------------------------------------------------

  sosButton.addEventListener(
    "contextmenu",
    (event) => {

      event.preventDefault();
    }
  );


  // ----------------------------------------------------
  // PREVENT DOUBLE TAP ZOOM / SELECTION
  // ----------------------------------------------------

  sosButton.style.touchAction =
    "none";

  sosButton.style.userSelect =
    "none";


  // ----------------------------------------------------
  // OPEN SMS COMPOSER
  // ----------------------------------------------------

  function openSmsComposer(
    phone,
    message
  ) {

    const smsUrl =
      "sms:" +
      encodeURIComponent(phone) +
      "?body=" +
      encodeURIComponent(message);


    window.location.href =
      smsUrl;
  }


  // ----------------------------------------------------
  // EMERGENCY SELECTION
  // ----------------------------------------------------

  async function handleEmergencySelection(
    name,
    phone
  ) {

    if (!phone) {

      showSOSStatus(
        "This emergency option has no phone number."
      );

      return;
    }


    const message =
      buildEmergencyMessage();


    const confirmed =
      window.confirm(

        `Emergency: ${name}\n\n` +

        `Phone: ${phone}\n\n` +

        "Open your phone dialer to call this number?\n\n" +

        "You must press the call button yourself."
      );


    if (!confirmed) {
      return;
    }


    // ----------------------------------------------
    // OPEN PHONE DIALER
    // ----------------------------------------------

    showSOSStatus(
      `Opening phone dialer for ${name}...`
    );


    window.location.href =
      `tel:${phone}`;


    // ----------------------------------------------
    // IMPORTANT:
    // Do NOT automatically send SMS here.
    //
    // The browser may leave the page when the
    // phone dialer opens.
    //
    // Therefore, SMS is offered when the user
    // returns to the app.
    // ----------------------------------------------

    setTimeout(
      () => {

        const sendSms =
          window.confirm(

            `Prepare an emergency SMS for ${name}?\n\n` +

            "Your messaging app will open with the emergency message and location.\n\n" +

            "You must tap Send yourself."
          );


        if (sendSms) {

          openSmsComposer(
            phone,
            message
          );
        }

      },
      1500
    );
  }


  // ----------------------------------------------------
  // EMERGENCY SERVICE BUTTONS
  // ----------------------------------------------------

  document
    .querySelectorAll(
      ".emergency-option[data-type]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;

            const service =
              emergencyServices[type];


            if (!service) {

              console.error(
                "Unknown emergency service:",
                type
              );

              return;
            }


            handleEmergencySelection(
              service.name,
              service.phone
            );
          }
        );
      }
    );


  // ----------------------------------------------------
  // ESCAPE KEY CLOSES MODAL
  // ----------------------------------------------------

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        !sosModal.classList.contains(
          "hidden"
        )
      ) {

        closeSOSModal();
      }
    }
  );

})();


// ======================================================
// START SAFESPHERE
// ======================================================

restoreSession();