// =============================================================
//  display.js — Go Backend Version
//  Loads ALL data from /api/* endpoints
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
  sponsorSpeed: "/api/sponsorSpeed"
};

// Helper: GET JSON
async function apiGet(url) {
  const res = await fetch(url);
  return await res.json();
}

// =============================================================
//  MAIN REFRESH LOOP
// =============================================================

async function refreshDisplay() {
  const [
    teams,
    results,
    sponsors,
    backgrounds,
    logo,
    scoring,
    theme,
    displayStyle,
    sponsorSpeed
  ] = await Promise.all([
    apiGet(API.teams),
    apiGet(API.results),
    apiGet(API.sponsors),
    apiGet(API.backgrounds),
    apiGet(API.logo),
    apiGet(API.scoring),
    apiGet(API.theme),
    apiGet(API.displayStyle),
    apiGet(API.sponsorSpeed)
  ]);

  renderTheme(theme, displayStyle);
  renderLogo(logo);
  renderBackground(backgrounds);
  renderSponsors(sponsors, sponsorSpeed);
  renderLadder(teams, results, scoring);
  renderRecentResults(results);
}

// =============================================================
//  THEME + DISPLAY STYLE
// =============================================================

function renderTheme(themeObj, styleObj) {
  const theme = themeObj.value || "dark";
  const content = themeObj.content || "light";
  const style = styleObj.value || "default";

  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
  document.body.classList.add(`content-${content}`);
  document.body.classList.add(`display-${style}`);
}

// =============================================================
//  LOGO
// =============================================================

function renderLogo(logo) {
  const el = document.getElementById("clubLogo");
  if (!el) return;

  if (logo && logo.url) {
    el.src = logo.url;
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}

// =============================================================
//  BACKGROUND
// =============================================================

function renderBackground(backgrounds) {
  const active = backgrounds.filter((b) => b.active);
  const el = document.getElementById("backgroundImage");
  if (!el) return;

  if (active.length > 0) {
    el.src = active[0].url;
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}

// =============================================================
//  SPONSORS (scrolling strip)
// =============================================================

function renderSponsors(sponsors, speedObj) {
  const active = sponsors.filter((s) => s.active);
  const container = document.getElementById("sponsorStrip");
  if (!container) return;

  container.innerHTML = "";

  active.forEach((s) => {
    const img = document.createElement("img");
    img.src = s.url;
    img.className = "sponsor-logo";
    container.appendChild(img);
  });

  const speed = speedObj.value || "slow";
  container.style.animationDuration =
    speed === "fast" ? "10s" : speed === "medium" ? "20s" : "30s";
}

// =============================================================
//  LADDER CALCULATION
// =============================================================

function renderLadder(teams, results, scoring) {
  const table = document.getElementById("ladderTableBody");
  if (!table) return;

  const stats = {};

  teams.forEach((t) => {
    stats[t] = {
      team: t,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      shotsFor: 0,
      shotsAgainst: 0,
      diff: 0,
      pct: 0,
      points: 0
    };
  });

  results.forEach((r) => {
    const t1 = stats[r.team1];
    const t2 = stats[r.team2];
    if (!t1 || !t2) return;

    t1.played++;
    t2.played++;

    t1.shotsFor += r.shots1;
    t1.shotsAgainst += r.shots2;
    t2.shotsFor += r.shots2;
    t2.shotsAgainst += r.shots1;

    if (r.shots1 > r.shots2) {
      t1.wins++;
      t2.losses++;
      t1.points += scoring.win;
      t2.points += scoring.loss;
    } else if (r.shots2 > r.shots1) {
      t2.wins++;
      t1.losses++;
      t2.points += scoring.win;
      t1.points += scoring.loss;
    } else {
      t1.draws++;
      t2.draws++;
      t1.points += scoring.draw;
      t2.points += scoring.draw;
    }
  });

  teams.forEach((t) => {
    const s = stats[t];
    s.diff = s.shotsFor - s.shotsAgainst;
    s.pct =
      s.shotsAgainst === 0
        ? 100
        : ((s.shotsFor / s.shotsAgainst) * 100).toFixed(1);
  });

  const sorted = Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (scoring.usePercentage) return b.pct - a.pct;
    return a.team.localeCompare(b.team);
  });

  table.innerHTML = "";

  sorted.forEach((s, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.team}</td>
      <td>${s.played}</td>
      <td>${s.wins}</td>
      <td>${s.draws}</td>
      <td>${s.losses}</td>
      <td>${s.shotsFor}</td>
      <td>${s.shotsAgainst}</td>
      <td>${s.diff}</td>
      <td>${s.pct}</td>
      <td>${s.points}</td>
    `;

    table.appendChild(tr);
  });
}

// =============================================================
//  RECENT RESULTS
// =============================================================

function renderRecentResults(results) {
  const table = document.getElementById("recentResultsBody");
  if (!table) return;

  const sorted = results
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 10);

  table.innerHTML = "";

  sorted.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.round || ""}</td>
      <td>${r.team1}</td>
      <td>${r.shots1} - ${r.shots2}</td>
      <td>${r.team2}</td>
      <td>${r.sheet || ""}</td>
    `;
    table.appendChild(tr);
  });
}

// =============================================================
//  AUTO REFRESH
// =============================================================

setInterval(refreshDisplay, 2000);
refreshDisplay();
