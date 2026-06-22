function showDashboard() {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    renderDashboard();
}

function showIntro() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("intro").classList.remove("hidden");
}

function renderDashboard() {
    document.getElementById("mission").innerText = riverwatch.mission;
    document.getElementById("status").innerText = riverwatch.status;
    document.getElementById("currentStrategy").innerText = riverwatch.currentStrategy;
    document.getElementById("daysSinceAction").innerText = riverwatch.daysSinceAction;
    document.getElementById("lastRebalance").innerText = riverwatch.lastRebalance;
    document.getElementById("disciplineScore").innerText = riverwatch.disciplineScore + "%";

    document.getElementById("portfolioHealth").innerText = riverwatch.portfolioHealth;
    document.getElementById("targetHealth").innerText = riverwatch.targetHealth + "%";

    document.getElementById("lastSync").innerText = riverwatch.lastSync;

    const gap = riverwatch.portfolioHealth - riverwatch.targetHealth;
    document.getElementById("healthGap").innerText = (gap > 0 ? "+" : "") + gap + "%";
    document.getElementById("healthBar").style.width = riverwatch.portfolioHealth + "%";

    const holdingsList = document.getElementById("holdingsList");
    holdingsList.innerHTML = "";

    riverwatch.holdings.forEach(item => {
        const row = document.createElement("div");
        row.className = "holding-row";

        const statusClass = item.status.toLowerCase();

        row.innerHTML = `
            <span>${item.ticker}</span>
            <span>${item.target.toFixed(1)}%</span>
            <span>${item.current.toFixed(1)}%</span>
            <span class="badge ${statusClass}">${item.status}</span>
        `;

        holdingsList.appendChild(row);
    });
}