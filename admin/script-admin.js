// =============================================================
//  API ENDPOINTS
// =============================================================

const API = {
  teams: "/api/teams",
  results: "/api/results",
  sponsors: "/api/sponsors",
  backgrounds: "/api/backgrounds",
  logo: "/api/logo",
  scoring: "/api/scoring",
  theme: "/api/theme",
  contentTheme: "/api/contentTheme",
  displayStyle: "/api/displayStyle",
  sponsorSpeed: "/api/sponsorSpeed",
  uploadSponsor: "/api/upload/sponsor",
  uploadBackground: "/api/upload/background",
  uploadLogo: "/api/upload/logo",
  resetEvent: "/api/resetEvent"
};

// Helper: GET JSON
async function apiGet(url) {
  const res = await fetch(url);
  return await res.json();
}

// Helper: POST form data
async function apiPostForm(url, formData) {
  const res = await fetch(url, { method: "POST", body: formData });
  return await res.json();
}

// Helper: POST JSON
async function apiPostJSON(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return await res.json();
}

// =============================================================
//  PANEL SWITCHING
// =============================================================

document.querySelectorAll(".sidebar-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const panel = btn.dataset.panel;
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    document.getElementById(`panel-${panel}`).classList.add("active");
  });
});

// =============================================================
//  DISPLAY PREVIEW — SINGLE BUTTON FIX
// =============================================================

let previewIntervalId = null;

function setupPreview() {
  const frame = document.getElementById("previewFrame");
  const wrapper = document.getElementById("previewFrameWrapper");
  const container = document.getElementById("previewContainer");
  const refreshBtn = document.getElementById("previewRefreshBtn");

  function refreshPreview() {
    // Reload iframe
    frame.src = `/display/display.html?ts=${Date.now()}`;

    // Trigger display refresh
    localStorage.setItem("cbbcForceRefresh", Date.now().toString());
  }

  function resizePreview() {
    const scale = container.clientWidth / 1920;
    wrapper.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", resizePreview);
  resizePreview();

  refreshBtn.addEventListener("click", refreshPreview);

  // Auto-refresh every 15 seconds
  if (previewIntervalId) clearInterval(previewIntervalId);
  previewIntervalId = setInterval(refreshPreview, 15000);
}

// =============================================================
//  TEAMS
// =============================================================

async function loadTeams() {
  const teams = await apiGet(API.teams);
  const tbody = document.getElementById("teamsTableBody");
  const select1 = document.getElementById("resultTeam1Select");
  const select2 = document.getElementById("resultTeam2Select");

  tbody.innerHTML = "";
  select1.innerHTML = "";
  select2.innerHTML = "";

  teams.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${t.name}</td>
      <td>
        <button class="danger" data-team="${t.name}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    const opt1 = document.createElement("option");
    opt1.value = t.name;
    opt1.textContent = t.name;
    select1.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = t.name;
    opt2.textContent = t.name;
    select2.appendChild(opt2);
  });

  document.querySelectorAll("#teamsTableBody button.danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPostJSON(API.teams, { delete: btn.dataset.team });
      loadTeams();
    });
  });
}

document.getElementById("addTeamBtn").addEventListener("click", async () => {
  const name = document.getElementById("teamNameInput").value.trim();
  if (!name) return;
  await apiPostJSON(API.teams, { add: name });
  document.getElementById("teamNameInput").value = "";
  loadTeams();
});

// =============================================================
//  RESULTS
// =============================================================

async function loadResults() {
  const results = await apiGet(API.results);
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = "";

  results.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.round}</td>
      <td>${r.team1}</td>
      <td>${r.shots1} - ${r.shots2}</td>
      <td>${r.team2}</td>
      <td>${r.sheet}</td>
      <td><button class="danger" data-id="${r.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll("#resultsTableBody button.danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPostJSON(API.results, { delete: btn.dataset.id });
      loadResults();
    });
  });
}

document.getElementById("addResultBtn").addEventListener("click", async () => {
  const round = parseInt(document.getElementById("resultRoundInput").value);
  const sheet = document.getElementById("resultSheetInput").value.trim();
  const team1 = document.getElementById("resultTeam1Select").value;
  const team2 = document.getElementById("resultTeam2Select").value;
  const shots1 = parseInt(document.getElementById("resultShots1Input").value);
  const shots2 = parseInt(document.getElementById("resultShots2Input").value);

  if (!round || !sheet || !team1 || !team2) return;

  await apiPostJSON(API.results, {
    round,
    sheet,
    team1,
    team2,
    shots1,
    shots2
  });

  loadResults();
});

// =============================================================
//  SPONSORS
// =============================================================

async function loadSponsors() {
  const sponsors = await apiGet(API.sponsors);
  const list = document.getElementById("sponsorList");
  list.innerHTML = "";

  sponsors.forEach((s) => {
    const div = document.createElement("div");
    div.className = "thumb-item";

    div.innerHTML = `
      <img src="${s.url}" />
      <div class="thumb-meta">
        <span>${s.filename}</span>
      </div>
      <div class="thumb-actions">
        <label><input type="checkbox" data-id="${s.id}" ${s.active ? "checked" : ""} /> Active</label>
        <button class="danger" data-id="${s.id}">Delete</button>
      </div>
    `;

    list.appendChild(div);
  });

  document.querySelectorAll("#sponsorList input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      await apiPostJSON(API.sponsors, { toggle: cb.dataset.id });
      loadSponsors();
    });
  });

  document.querySelectorAll("#sponsorList button.danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPostJSON(API.sponsors, { delete: btn.dataset.id });
      loadSponsors();
    });
  });
}

document.getElementById("sponsorUploadBtn").addEventListener("click", async () => {
  const file = document.getElementById("sponsorUploadInput").files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  await apiPostForm(API.uploadSponsor, form);
  loadSponsors();
});

// =============================================================
//  BACKGROUNDS
// =============================================================

async function loadBackgrounds() {
  const backgrounds = await apiGet(API.backgrounds);
  const grid = document.getElementById("backgroundGrid");
  grid.innerHTML = "";

  backgrounds.forEach((b) => {
    const div = document.createElement("div");
    div.className = "bg-item";

    div.innerHTML = `
      <img src="${b.url}" />
      <div class="bg-item-footer">
        <label><input type="checkbox" data-id="${b.id}" ${b.active ? "checked" : ""} /> Active</label>
        <button class="danger" data-id="${b.id}">Delete</button>
      </div>
    `;

    grid.appendChild(div);
  });

  document.querySelectorAll("#backgroundGrid input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      await apiPostJSON(API.backgrounds, { toggle: cb.dataset.id });
      loadBackgrounds();
    });
  });

  document.querySelectorAll("#backgroundGrid button.danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await apiPostJSON(API.backgrounds, { delete: btn.dataset.id });
      loadBackgrounds();
    });
  });
}

document.getElementById("backgroundUploadBtn").addEventListener("click", async () => {
  const file = document.getElementById("backgroundUploadInput").files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  await apiPostForm(API.uploadBackground, form);
  loadBackgrounds();
});

// =============================================================
//  LOGO
// =============================================================

async function loadLogo() {
  const logo = await apiGet(API.logo);
  const preview = document.getElementById("logoPreview");

  if (logo && logo.url) {
    preview.src = logo.url;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

document.getElementById("logoUploadBtn").addEventListener("click", async () => {
  const file = document.getElementById("logoUploadInput").files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  await apiPostForm(API.uploadLogo, form);
  loadLogo();
});

// =============================================================
//  SCORING SETTINGS
// =============================================================

async function loadScoring() {
  const scoring = await apiGet(API.scoring);

  document.getElementById("pointsWin").value = scoring.win;
  document.getElementById("pointsDraw").value = scoring.draw;
  document.getElementById("pointsLoss").value = scoring.loss;

  document.getElementById("usePercentageTiebreak").checked = scoring.usePercentage;
  document.getElementById("autoDetermineWinner").checked = scoring.autoDetermineWinner;
}

document.getElementById("saveScoringBtn").addEventListener("click", async () => {
  await apiPostJSON(API.scoring, {
    win: parseInt(document.getElementById("pointsWin").value),
    draw: parseInt(document.getElementById("pointsDraw").value),
    loss: parseInt(document.getElementById("pointsLoss").value),
    usePercentage: document.getElementById("usePercentageTiebreak").checked,
    autoDetermineWinner: document.getElementById("autoDetermineWinner").checked
  });
});

// =============================================================
//  SPONSOR SPEED
// =============================================================

async function loadSponsorSpeed() {
  const speed = await apiGet(API.sponsorSpeed);
  document.querySelectorAll("input[name=sponsorSpeed]").forEach((r) => {
    r.checked = r.value === speed.value;
  });
}

document.querySelectorAll("input[name=sponsorSpeed]").forEach((r) => {
  r.addEventListener("change", async () => {
    await apiPostJSON(API.sponsorSpeed, { value: r.value });
  });
});

// =============================================================
//  RESET EVENT
// =============================================================

document.getElementById("resetEventBtn").addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear all event data?")) return;
  await apiPostJSON(API.resetEvent, {});
  loadTeams();
  loadResults();
});

// =============================================================
//  INIT
// =============================================================

setupPreview();
loadTeams();
loadResults();
loadSponsors();
loadBackgrounds();
loadLogo();
loadScoring();
loadSponsorSpeed();
