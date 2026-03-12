async function loadState() {
    const res = await fetch("/api/load");
    const data = await res.json();

    document.getElementById("homeTeam").value = data.homeTeam || "";
    document.getElementById("awayTeam").value = data.awayTeam || "";
    document.getElementById("homeScore").value = data.homeScore || 0;
    document.getElementById("awayScore").value = data.awayScore || 0;
}

async function saveState() {
    const payload = {
        homeTeam: document.getElementById("homeTeam").value,
        awayTeam: document.getElementById("awayTeam").value,
        homeScore: parseInt(document.getElementById("homeScore").value),
        awayScore: parseInt(document.getElementById("awayScore").value)
    };

    await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    alert("Saved");
}

async function uploadImage() {
    const fileInput = document.getElementById("imageUpload");
    if (!fileInput.files.length) {
        alert("Choose a file first");
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    await fetch("/api/upload", {
        method: "POST",
        body: formData
    });

    alert("Uploaded");
}

document.getElementById("saveBtn").onclick = saveState;
document.getElementById("uploadBtn").onclick = uploadImage;

loadState();
