/* DISPLAY SCRIPT — CBBC SCOREBOARD */

/* ------------------------------
   LOCAL STORAGE HELPERS
------------------------------ */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/* ------------------------------
   LISTEN FOR ADMIN REFRESH SIGNAL
------------------------------ */

window.addEventListener("storage", (e) => {
  if (e.key === "cbbcForceRefresh") {
    window.location.reload();
  }
});

/* ------------------------------
   SAFE FETCH (prevents display crashes)
------------------------------ */

async function safeFetchJSON(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Bad response");
    return await res.json();
  } catch {
    return fallback;
  }
}

/* ------------------------------
   GLOBAL STATE
------------------------------ */

let sponsorScrollPos = 0;
let sponsorSpeed = 0.3;
let backgroundIndex = 0;
let backgroundTimer = null;

/* ------------------------------
   INITIAL LOAD
------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  renderClubLogo();
  renderSponsors();
  renderBackgrounds();
  renderLadder();
  renderResults();
  startBackgroundRotation();
  loadSponsorSpeed();
  startSponsorScroll();
});

/* ------------------------------
   CLUB LOGO
------------------------------ */

function renderClubLogo() {
  const logo = loadJSON("cbbcLogo", null);
  const img = document.getElementById("clubLogoImg");
  if (!img) return;

  if (logo && logo.url) {
    img.src = `http://localhost:3000${logo.url}`;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
}

/* ------------------------------
   SPONSORS — SCROLLING CAROUSEL
------------------------------ */

function loadSponsorSpeed() {
  const speed = localStorage.getItem("cbbcSponsorSpeed") || "slow";
  if (speed === "slow") sponsorSpeed = 0.2;
  if (speed === "medium") sponsorSpeed = 0.4;
  if (speed === "fast") sponsorSpeed = 0.7;
}

function renderSponsors() {
  const sponsors = loadJSON("cbbcSponsors", []);
  const bar = document.getElementById("sponsorsBar");
  if (!bar) return;

  bar.innerHTML = "";

  sponsors
    .filter((s) => s.active)
    .forEach((s) => {
      const img = document.createElement("img");
      img.className = "sponsor-logo";
      img.src = `http://localhost:3000${s.url}`;
      bar.appendChild(img);
    });
}

function startSponsorScroll() {
  const bar = document.getElementById("sponsorsBar");
  if (!bar) return;

  function animate() {
    const logos = Array.from(bar.children);
    if (logos.length === 0) return;

    sponsorScrollPos -= sponsorSpeed;
    bar.style.transform = `translateX(${sponsorScrollPos}px)`;

    const first = logos[0];
    const firstRect = first.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();

    if (firstRect.right < barRect.left) {
      bar.appendChild(first);
      sponsorScrollPos += firstRect.width + 32;
    }

    const centerX = barRect.left + barRect.width / 2;

    logos.forEach((logo) => {
      const rect = logo.getBoundingClientRect();
      const logoCenter = rect.left + rect.width / 2;
      const distance = Math.abs(centerX - logoCenter);

      if (distance < rect.width) {
        logo.classList.add("spotlight");
      } else {
        logo.classList.remove("spotlight");
      }
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/* ------------------------------
   BACKGROUNDS — ROTATION
------------------------------ */

function renderBackgrounds() {
  const backgrounds = loadJSON("cbbcBackgrounds", []);
  const active = backgrounds.filter((b) => b.active);
  const bgEl = document.getElementById("backgroundImage");

  if (!bgEl || active.length === 0) return;

  const bg = active[backgroundIndex % active.length];
  bgEl.style.backgroundImage = `url("http://localhost:3000${bg.url}")`;
}

function startBackgroundRotation() {
  const backgrounds = loadJSON("cbbcBackgrounds", []);
  const active = backgrounds.filter((b) => b.active);

  if (active.length <= 1) return;

  if (backgroundTimer) clearInterval(backgroundTimer);

  backgroundTimer = setInterval(() => {
    backgroundIndex++;
    renderBackgrounds();
  }, 8000);
}

/* ------------------------------
   LADDER CALCULATION
------------------------------ */

async function computeLadder() {
  const teams = await safeFetchJSON("http://localhost:3000/data/teams", []);
  const results = await safeFetchJSON("http://localhost:3000/data/results", []);
  const scoring = loadJSON("cbbcScoring", {
    win: 4,
    draw: 2,
    loss: 0,
    usePercentage: true
  });

  const table = {};

  teams.forEach((t) => {
    table[t] = {
      team: t,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      shotsFor: 0,
      shotsAgainst: 0,
      points: 0,
      percentage: 0
    };
  });

  results.forEach((r) => {
    const t1 = table[r.team1];
    const t2 = table[r.team2];
    if (!t1 || !t2) return;

    t1.played++;
    t2.played++;

    t1.shotsFor += r.shots1;
    t1.shotsAgainst += r.shots2;

    t2.shotsFor += r.shots2;
    t2.shotsAgainst += r.shots1;

    if (r.result === "team1") {
      t1.won++;
      t2.lost++;
      t1.points += scoring.win;
      t2.points += scoring.loss;
    } else if (r.result === "team2") {
      t2.won++;
      t1.lost++;
      t2.points += scoring.win;
      t1.points += scoring.loss;
    } else {
      t1.drawn++;
      t2.drawn++;
      t1.points += scoring.draw;
      t2.points += scoring.draw;
    }
  });

  Object.values(table).forEach((t) => {
    if (t.shotsAgainst === 0) {
      t.percentage = t.shotsFor > 0 ? 999 : 0;
    } else {
      t.percentage = (t.shotsFor / t.shotsAgainst) * 100;
    }
  });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.shotsFor - a.shotsFor;
  });
}

/* ------------------------------
   RENDER LADDER
------------------------------ */

async function renderLadder() {
  const ladder = await computeLadder();
  const body = document.getElementById("ladderBody");
  if (!body) return;

  body.innerHTML = "";

  ladder.forEach((t, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${t.team}</td>
      <td>${t.played}</td>
      <td>${t.won}</td>
      <td>${t.drawn}</td>
      <td>${t.lost}</td>
      <td>${t.shotsFor}</td>
      <td>${t.shotsAgainst}</td>
      <td>${t.points}</td>
      <td>${t.percentage.toFixed(1)}%</td>
    `;

    body.appendChild(tr);
  });
}

/* ------------------------------
   RENDER RESULTS LIST
------------------------------ */

async function renderResults() {
  const results = await safeFetchJSON("http://localhost:3000/data/results", []);
  const body = document.getElementById("resultsList");
  if (!body) return;

  const sorted = results
    .slice()
    .sort(
      (a, b) =>
        (b.round || 0) - (a.round || 0) ||
        (b.timestamp || 0) - (a.timestamp || 0)
    );

  body.innerHTML = "";

  sorted.forEach((r) => {
    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <div class="result-round">Round ${r.round}</div>
      <div class="result-teams">
        <span>${r.team1}</span>
        <strong>${r.shots1} - ${r.shots2}</strong>
        <span>${r.team2}</span>
      </div>
      <div class="result-sheet">${r.sheet || ""}</div>
    `;

    body.appendChild(div);
  });
}

/* -------------------------------------------
   AUTO‑REFRESH DISPLAY EVERY 10 SECONDS
------------------------------------------- */
setInterval(() => {
  window.location.reload();
}, 10000);
