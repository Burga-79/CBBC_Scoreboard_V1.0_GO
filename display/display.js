async function refresh() {
    const res = await fetch("/api/load");
    const data = await res.json();

    document.getElementById("teams").textContent =
        `${data.homeTeam || ""} vs ${data.awayTeam || ""}`;

    document.getElementById("scores").textContent =
        `${data.homeScore || 0} - ${data.awayScore || 0}`;
}

// Refresh every 2 seconds
setInterval(refresh, 2000);
refresh();
