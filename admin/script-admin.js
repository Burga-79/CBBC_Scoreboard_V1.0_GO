// =============================================================
//  script-admin.js (Go Backend Version)
//  COMPLETE — NO LOCALSTORAGE — ALL DATA STORED IN /data/*.json
// =============================================================

const API = {
  teams: "/api/teams",
  results: "/api/results",
  sponsors: "/api/sponsors",
  backgrounds: "/api/backgrounds",
  logo: "/api/logo",
  scoring: "/api/scoring",
  theme: "/api/theme",
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

// Helper: POST JSON
async function apiPost(url, data) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

// Helper: POST file upload
async function apiUpload(url, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, { method: "POST", body: form });
  return await res.json();
}

// =============================================================
//  INIT
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupThemes();
  setupPreview();
  setupForceRefreshDisplay();
  setupTeams();
  setupResults();
  setupSponsors();
  setupBackgrounds();
  setupLogo();
  setupScoring();
  setupDisplayStyle();
  setupSponsorSpeed();
  setupStats();
  setupReset();
});

// =============================================================
//  NAVIGATION
// =============================================================

function setupNavigation() {
  const buttons = document.querySelectorAll(".sidebar-nav button");
  const panels = document.querySelectorAll(".panel");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panelId = btn.getAttribute("data-panel");

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      panels.forEach((p) => {
        p.classList.toggle("active", p.id === `panel-${panelId}`);
      });
    });
  });
}

// =============================================================
//  THEMES (stored in Go backend)
// =============================================================

async function applyTheme() {
  const themeObj = await apiGet(API.theme);
  const contentObj = await apiGet("/api/contentTheme");

  const theme = themeObj.value || "dark";
  const contentTheme = contentObj.value || "light";

  document.body.classList.remove(
    "theme-dark",
    "theme-accent-blue",
    "theme-accent-green",
    "theme-accent-dual"
  );
  document.body.classList.add(`theme-${theme}`);

  document.body.classList.remove("content-light", "content-dark");
  document.body.classList.add(`content-${contentTheme}`);

  const themeRadio = document.querySelector(
    `input[name="themeSelect"][value="${theme}"]`
  );
  if (themeRadio) themeRadio.checked = true;

  const contentRadio = document.querySelector(
    `input[name="contentTheme"][value="${contentTheme}"]`
  );
  if (contentRadio) contentRadio.checked = true;
}

function setupThemes() {
  // Sidebar theme
  document.querySelectorAll('input[name="themeSelect"]').forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      await apiPost(API.theme, { value: e.target.value });
      applyTheme();
    });
  });

  // Content theme
  document.querySelectorAll('input[name="contentTheme"]').forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      await apiPost("/api/contentTheme", { value: e.target.value });
      applyTheme();
    });
  });

  applyTheme();
}

// =============================================================
//  PREVIEW
// =============================================================

let previewIntervalId = null;

function setupPreview() {
  const frame = document.getElementById("previewFrame");
  const wrapper = document.getElementById("previewFrameWrapper");
  const container = document.getElementById("previewContainer");
  const refreshBtn = document.getElementById("previewRefreshBtn");

  function refreshPreview() {
    frame.src = `/display/display.html?ts=${Date.now()}`;
  }

  function resizePreview() {
    const scale = container.clientWidth / 1920;
    wrapper.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", resizePreview);
  resizePreview();

  refreshBtn.addEventListener("click", refreshPreview);

  if (previewIntervalId) clearInterval(previewIntervalId);
  previewIntervalId = setInterval(refreshPreview, 15000);
}

// =============================================================
//  FORCE REFRESH DISPLAY
// =============================================================

function setupForceRefreshDisplay() {
  const btn = document.getElementById("forceRefreshDisplayBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    localStorage.setItem("cbbcForceRefresh", Date.now().toString());
    alert("Display refresh triggered.");
  });
}

// =============================================================
//  TEAMS
// =============================================================

function setupTeams() {
  const nameInput = document.getElementById("teamNameInput");
  const addBtn = document.getElementById("addTeamBtn");
  const tableBody = document.getElementById("teamsTableBody");
  const sortSelect = document.getElementById("teamsSortSelect");

  async function getTeams() {
    return await apiGet(API.teams); // returns array of objects
  }

  async function setTeams(teams) {
    await apiPost(API.teams, teams);
    updateStats();
    refreshResultsTeamDropdowns();
  }

  function parseLeadingNumber(name) {
    const match = name.match(/^(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function getSortedTeams(teams) {
    const mode = sortSelect.value;
    const copy = teams.slice();

    if (mode === "none") return copy;

    if (mode === "az" || mode === "za") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
      if (mode === "za") copy.reverse();
      return copy;
    }

    if (mode === "numAsc" || mode === "numDesc") {
      copy.sort((a, b) => {
        const na = parseLeadingNumber(a.name);
        const nb = parseLeadingNumber(b.name);
        if (na == null && nb == null) return a.name.localeCompare(b.name);
        if (na == null) return 1;
        if (nb == null) return -1;
        return na - nb;
      });
      if (mode === "numDesc") copy.reverse();
      return copy;
    }

    return copy;
  }

  async function renderTeams() {
    const teams = await getTeams();
    const sorted = getSortedTeams(teams);

    tableBody.innerHTML = "";

    sorted.forEach((team, index) => {
      const tr = document.createElement("tr");

      const idxTd = document.createElement("td");
      idxTd.textContent = index + 1;

      const nameTd = document.createElement("td");
      nameTd.textContent = team.name;

      const actionsTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.className = "primary";
      editBtn.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";

      editBtn.addEventListener("click", async () => {
        const newName = prompt("Edit team name:", team.name);
        if (!newName) return;

        const all = await getTeams();
        const idx = all.findIndex(t => t.name === team.name);
        if (idx >= 0) {
          all[idx].name = newName.trim();
          await setTeams(all);
          renderTeams();
        }
      });

      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Delete team "${team.name}"?`)) return;
        const all = (await getTeams()).filter(t => t.name !== team.name);
        await setTeams(all);
        renderTeams();
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(idxTd);
      tr.appendChild(nameTd);
      tr.appendChild(actionsTd);

      tableBody.appendChild(tr);
    });
  }

  addBtn.addEventListener("click", async () => {
    const value = nameInput.value.trim();
    if (!value) return;

    const teams = await getTeams();
    teams.push({ name: value });

    await setTeams(teams);

    nameInput.value = "";
    sortSelect.value = "none";
    renderTeams();
  });

  sortSelect.addEventListener("change", renderTeams);

  renderTeams();
}

// =============================================================
//  RESULTS
// =============================================================

function setupResults() {
  const roundInput = document.getElementById("resultRoundInput");
  const sheetInput = document.getElementById("resultSheetInput");
  const team1Select = document.getElementById("resultTeam1Select");
  const team2Select = document.getElementById("resultTeam2Select");
  const shots1Input = document.getElementById("resultShots1Input");
  const shots2Input = document.getElementById("resultShots2Input");
  const addBtn = document.getElementById("addResultBtn");
  const tableBody = document.getElementById("resultsTableBody");

  async function getTeams() {
    return await apiGet(API.teams); // array of { name: "Team" }
  }

  async function getResults() {
    return await apiGet(API.results); // array of result objects
  }

  async function setResults(results) {
    await apiPost(API.results, results);
    updateStats();
  }

  async function refreshTeamDropdowns() {
    const teams = await getTeams();

    [team1Select, team2Select].forEach((select) => {
      select.innerHTML = "";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "-- Select team --";
      select.appendChild(placeholder);

      teams.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        select.appendChild(opt);
      });
    });
  }

  window.refreshResultsTeamDropdowns = refreshTeamDropdowns;

  function computeOutcome(s1, s2, scoring) {
    if (!scoring.autoWinner) return null;
    if (s1 > s2) return "team1";
    if (s2 > s1) return "team2";
    return "draw";
  }

  async function renderResults() {
    const results = await getResults();
    const sorted = results
      .slice()
      .sort(
        (a, b) =>
          (b.round || 0) - (a.round || 0) ||
          (b.timestamp || 0) - (a.timestamp || 0)
      );

    tableBody.innerHTML = "";

    sorted.forEach((r) => {
      const tr = document.createElement("tr");

      const roundTd = document.createElement("td");
      roundTd.textContent = r.round || "";

      const team1Td = document.createElement("td");
      team1Td.textContent = r.team1;

      const scoreTd = document.createElement("td");
      scoreTd.textContent = `${r.shots1} - ${r.shots2}`;

      const team2Td = document.createElement("td");
      team2Td.textContent = r.team2;

      const sheetTd = document.createElement("td");
      sheetTd.textContent = r.sheet || "";

      const actionsTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.className = "primary";
      editBtn.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";

      editBtn.addEventListener("click", async () => {
        const newRound = prompt("Round:", r.round ?? "");
        if (newRound === null) return;

        const newSheet = prompt("Sheet / Rink:", r.sheet ?? "");
        if (newSheet === null) return;

        const newShots1 = prompt("Shots (Team 1):", r.shots1);
        if (newShots1 === null) return;

        const newShots2 = prompt("Shots (Team 2):", r.shots2);
        if (newShots2 === null) return;

        const roundVal = Number(newRound) || 0;
        const s1 = Number(newShots1);
        const s2 = Number(newShots2);

        if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
          alert("Invalid scores.");
          return;
        }

        const scoring = await apiGet(API.scoring);
        const outcome = computeOutcome(s1, s2, scoring);

        const all = await getResults();
        const idx = all.findIndex(
          (x) =>
            x.team1 === r.team1 &&
            x.team2 === r.team2 &&
            x.timestamp === r.timestamp
        );

        if (idx >= 0) {
          all[idx] = {
            ...all[idx],
            round: roundVal,
            sheet: newSheet || "",
            shots1: s1,
            shots2: s2,
            result: outcome ?? all[idx].result
          };

          await setResults(all);
          renderResults();
        }
      });

      deleteBtn.addEventListener("click", async () => {
        if (
          !confirm(
            `Delete result: ${r.team1} ${r.shots1} - ${r.shots2} ${r.team2}?`
          )
        )
          return;

        const all = (await getResults()).filter(
          (x) =>
            !(
              x.team1 === r.team1 &&
              x.team2 === r.team2 &&
              x.shots1 === r.shots1 &&
              x.shots2 === r.shots2 &&
              x.round === r.round &&
              x.sheet === r.sheet &&
              x.timestamp === r.timestamp
            )
        );

        await setResults(all);
        renderResults();
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(roundTd);
      tr.appendChild(team1Td);
      tr.appendChild(scoreTd);
      tr.appendChild(team2Td);
      tr.appendChild(sheetTd);
      tr.appendChild(actionsTd);

      tableBody.appendChild(tr);
    });
  }

  addBtn.addEventListener("click", async () => {
    const roundVal = Number(roundInput.value) || 0;
    const sheetVal = sheetInput.value.trim();
    const team1 = team1Select.value;
    const team2 = team2Select.value;
    const s1 = Number(shots1Input.value);
    const s2 = Number(shots2Input.value);

    if (!team1 || !team2) {
      alert("Please select both teams.");
      return;
    }
    if (team1 === team2) {
      alert("Teams must be different.");
      return;
    }
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      alert("Invalid scores.");
      return;
    }

    const scoring = await apiGet(API.scoring);
    const outcome = computeOutcome(s1, s2, scoring);

    const results = await getResults();
    results.push({
      team1,
      team2,
      shots1: s1,
      shots2: s2,
      round: roundVal,
      sheet: sheetVal,
      timestamp: Date.now(),
      result: outcome
    });

    await setResults(results);

    shots1Input.value = "";
    shots2Input.value = "";
    sheetInput.value = "";

    renderResults();
  });

  refreshTeamDropdowns();
  renderResults();
}
// =============================================================
//  SPONSORS
// =============================================================

function setupSponsors() {
  const uploadInput = document.getElementById("sponsorUploadInput");
  const uploadBtn = document.getElementById("sponsorUploadBtn");
  const listEl = document.getElementById("sponsorList");

  async function renderSponsors() {
    const sponsors = await apiGet(API.sponsors);
    listEl.innerHTML = "";

    sponsors.forEach((s, index) => {
      const item = document.createElement("div");
      item.className = "thumb-item";

      const img = document.createElement("img");
      img.src = s.url;
      img.alt = s.filename;

      const meta = document.createElement("div");
      meta.className = "thumb-meta";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = s.filename;

      const pathSpan = document.createElement("span");
      pathSpan.textContent = s.filename;
      pathSpan.style.fontSize = "11px";
      pathSpan.style.color = "var(--muted)";

      meta.appendChild(nameSpan);
      meta.appendChild(pathSpan);

      const actions = document.createElement("div");
      actions.className = "thumb-actions";

      const visibleLabel = document.createElement("label");
      const visibleCheckbox = document.createElement("input");
      visibleCheckbox.type = "checkbox";
      visibleCheckbox.checked = !!s.active;

      visibleCheckbox.addEventListener("change", async () => {
        const all = await apiGet(API.sponsors);
        all[index].active = visibleCheckbox.checked;
        await apiPost(API.sponsors, all);
        updateStats();
      });

      visibleLabel.appendChild(visibleCheckbox);
      visibleLabel.appendChild(document.createTextNode("Visible"));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";

      deleteBtn.addEventListener("click", async () => {
        const all = await apiGet(API.sponsors);
        all.splice(index, 1);
        await apiPost(API.sponsors, all);
        renderSponsors();
        updateStats();
      });

      actions.appendChild(visibleLabel);
      actions.appendChild(deleteBtn);

      item.appendChild(img);
      item.appendChild(meta);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  }

  uploadBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) {
      alert("Please select an image first.");
      return;
    }

    const data = await apiUpload(API.uploadSponsor, file);
    if (!data || !data.url) {
      alert("Upload failed.");
      return;
    }

    const sponsors = await apiGet(API.sponsors);
    sponsors.push({
      url: data.url,
      filename: data.filename,
      active: true
    });

    await apiPost(API.sponsors, sponsors);
    uploadInput.value = "";
    renderSponsors();
    updateStats();
  });

  renderSponsors();
}

// =============================================================
//  BACKGROUNDS
// =============================================================

function setupBackgrounds() {
  const uploadInput = document.getElementById("backgroundUploadInput");
  const uploadBtn = document.getElementById("backgroundUploadBtn");
  const gridEl = document.getElementById("backgroundGrid");

  async function renderBackgrounds() {
    const backgrounds = await apiGet(API.backgrounds);
    gridEl.innerHTML = "";

    backgrounds.forEach((bg, index) => {
      const item = document.createElement("div");
      item.className = "bg-item";

      const img = document.createElement("img");
      img.src = bg.url;
      img.alt = bg.filename;

      const footer = document.createElement("div");
      footer.className = "bg-item-footer";

      const visibleLabel = document.createElement("label");
      const visibleCheckbox = document.createElement("input");
      visibleCheckbox.type = "checkbox";
      visibleCheckbox.checked = !!bg.active;

      visibleCheckbox.addEventListener("change", async () => {
        const all = await apiGet(API.backgrounds);
        all[index].active = visibleCheckbox.checked;
        await apiPost(API.backgrounds, all);
        updateStats();
      });

      visibleLabel.appendChild(visibleCheckbox);
      visibleLabel.appendChild(document.createTextNode("Use"));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";

      deleteBtn.addEventListener("click", async () => {
        const all = await apiGet(API.backgrounds);
        all.splice(index, 1);
        await apiPost(API.backgrounds, all);
        renderBackgrounds();
        updateStats();
      });

      footer.appendChild(visibleLabel);
      footer.appendChild(deleteBtn);

      item.appendChild(img);
      item.appendChild(footer);

      gridEl.appendChild(item);
    });
  }

  uploadBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) {
      alert("Please select an image first.");
      return;
    }

    const data = await apiUpload(API.uploadBackground, file);
    if (!data || !data.url) {
      alert("Upload failed.");
      return;
    }

    const backgrounds = await apiGet(API.backgrounds);
    backgrounds.push({
      url: data.url,
      filename: data.filename,
      active: true
    });

    await apiPost(API.backgrounds, backgrounds);
    uploadInput.value = "";
    renderBackgrounds();
    updateStats();
  });

  renderBackgrounds();
}

// =============================================================
//  LOGO
// =============================================================

function setupLogo() {
  const uploadInput = document.getElementById("logoUploadInput");
  const uploadBtn = document.getElementById("logoUploadBtn");
  const preview = document.getElementById("logoPreview");

  async function renderLogo() {
    const logo = await apiGet(API.logo);
    if (logo && logo.url) {
      preview.src = logo.url;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  }

  uploadBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) {
      alert("Please select a logo image first.");
      return;
    }

    const data = await apiUpload(API.uploadLogo, file);
    if (!data || !data.url) {
      alert("Upload failed.");
      return;
    }

    await apiPost(API.logo, {
      url: data.url,
      filename: data.filename
    });

    uploadInput.value = "";
    renderLogo();
    updateStats();
  });

  renderLogo();
}

// =============================================================
//  SCORING SETTINGS
// =============================================================

function setupScoring() {
  const winInput = document.getElementById("pointsWin");
  const drawInput = document.getElementById("pointsDraw");
  const lossInput = document.getElementById("pointsLoss");
  const pctCheckbox = document.getElementById("usePercentageTiebreak");
  const autoCheckbox = document.getElementById("autoDetermineWinner");
  const saveBtn = document.getElementById("saveScoringBtn");

  async function loadScoring() {
    const scoring = await apiGet(API.scoring);

    winInput.value = scoring.win ?? 4;
    drawInput.value = scoring.draw ?? 2;
    lossInput.value = scoring.loss ?? 0;
    pctCheckbox.checked = scoring.usePercentage ?? true;
    autoCheckbox.checked = scoring.autoWinner ?? true;
  }

  saveBtn.addEventListener("click", async () => {
    const scoring = {
      win: Number(winInput.value),
      draw: Number(drawInput.value),
      loss: Number(lossInput.value),
      usePercentage: pctCheckbox.checked,
      autoWinner: autoCheckbox.checked
    };

    await apiPost(API.scoring, scoring);
    alert("Scoring settings saved.");
  });

  loadScoring();
}

// =============================================================
//  DISPLAY STYLE
// =============================================================

function setupDisplayStyle() {
  const radios = document.querySelectorAll('input[name="displayStyle"]');

  async function apply() {
    const obj = await apiGet(API.displayStyle);
    const style = obj.value || "default";
    const radio = document.querySelector(
      `input[name="displayStyle"][value="${style}"]`
    );
    if (radio) radio.checked = true;
  }

  radios.forEach((r) => {
    r.addEventListener("change", async (e) => {
      await apiPost(API.displayStyle, { value: e.target.value });
      alert("Display style saved. Refresh display to apply.");
    });
  });

  apply();
}

// =============================================================
//  SPONSOR SPEED
// =============================================================

function setupSponsorSpeed() {
  const radios = document.querySelectorAll('input[name="sponsorSpeed"]');

  async function apply() {
    const obj = await apiGet(API.sponsorSpeed);
    const speed = obj.value || "slow";
    const radio = document.querySelector(
      `input[name="sponsorSpeed"][value="${speed}"]`
    );
    if (radio) radio.checked = true;
  }

  radios.forEach((r) => {
    r.addEventListener("change", async (e) => {
      await apiPost(API.sponsorSpeed, { value: e.target.value });
      alert("Sponsor scroll speed saved.");
    });
  });

  apply();
}

// =============================================================
//  STATS
// =============================================================

function setupStats() {
  const teamsEl = document.getElementById("statTeams");
  const resultsEl = document.getElementById("statResults");

  window.updateStats = async function () {
    const teams = await apiGet(API.teams).catch(() => []);
    const results = await apiGet(API.results).catch(() => []);

    teamsEl.textContent = teams.length;
    resultsEl.textContent = results.length;
  };

  updateStats();
}

// =============================================================
//  RESET EVENT
// =============================================================

function setupReset() {
  const btn = document.getElementById("resetEventBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const ok = confirm(
      "This will clear ALL teams and ALL results.\n" +
        "Sponsors, backgrounds, logo, and settings are kept.\n\n" +
        "Are you sure?"
    );
    if (!ok) return;

    await fetch(API.resetEvent, { method: "POST" });

    updateStats();
    if (typeof refreshResultsTeamDropdowns === "function") {
      refreshResultsTeamDropdowns();
    }

    alert("Event data cleared.");
  });
}
