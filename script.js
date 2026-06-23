/****************************************************************************************
 * RiverWatch Script v0.2.3a
 * - Loads Google Sheet CSV Hub data before dashboard rendering
 * - Falls back safely to data.js dummy values if AUTO load fails
 * - Keeps render functions separated for Sprint #006 architecture
 ****************************************************************************************/

async function showDashboard() {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    await initializeMarketData();
    renderDashboard();
}

function showIntro() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("intro").classList.remove("hidden");
}

async function initializeMarketData() {
    try {
        const hub = riverwatch?.policy?.marketDataHub;

        if (!hub || hub.enabled !== true) {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatch MarketHub disabled. Using FALLBACK values.");
            return;
        }

        if (typeof RiverWatchMarketEngine === "undefined" ||
            typeof RiverWatchMarketEngine.loadMarketData !== "function") {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatchMarketEngine is not available. Using FALLBACK values.");
            return;
        }

        await RiverWatchMarketEngine.loadMarketData();
    } catch (error) {
        riverwatch.auto.dataSource = "FALLBACK";
        console.warn("RiverWatch MarketHub failed. Using FALLBACK values.", error);
    }
}

function renderDashboard() {
    renderTopbar();
    renderMission();
    renderVoyageHealth();
    renderRiverHealth();
    renderBoatHealth();
    renderAllocation();
    renderAction();
    renderLogbook();
}

function renderTopbar() {
    setText("lastSync", riverwatch.auto.lastSync);

    const source = riverwatch.auto.dataSource || "FALLBACK";
    const sourceEl = document.getElementById("dataSource");

    if (sourceEl) {
        sourceEl.innerText = source;
        sourceEl.className = source.toLowerCase();
    }
}

function renderMission() {
    setText("mission", riverwatch.const.mission);
    setText("status", riverwatch.calc.status);
    setText("recommendedAction", riverwatch.calc.recommendedAction);
    setText("daysSinceAction", riverwatch.calc.daysSinceAction);
    setText("lastRebalance", riverwatch.calc.lastRebalance);
    setText("doctrineCompliance", riverwatch.calc.doctrineCompliance + "%");
}

function renderVoyageHealth() {
    setText("voyageHealth", riverwatch.calc.voyageHealth);
    setText("voyageStatus", getHealthStatus(riverwatch.calc.voyageHealth));
    setText("currentPosition", formatKRW(riverwatch.calc.currentPosition));
    setText("expectedPosition", formatKRW(riverwatch.calc.expectedPosition));
    setText("openSeaTarget", formatKRW(riverwatch.manual.openSeaTarget));
    setText("eta", riverwatch.calc.eta);
    setText("remainingTime", riverwatch.calc.remainingTime);
    setText("projectedAsset", formatKRW(riverwatch.calc.projectedAsset));
}

function renderRiverHealth() {
    setText("riverHealth", riverwatch.calc.riverHealth);
    setText("riverStatus", getRiverStatus(riverwatch.calc.riverHealth));

    const list = document.getElementById("riverMetricList");
    if (!list) return;

    list.innerHTML = "";

    const metrics = [
        ["USDKRW", formatNumber(riverwatch.auto.usdkrw)],
        ["VIX", formatNumber(riverwatch.auto.vix)],
        ["BNO", formatNumber(riverwatch.auto.bno)],
        ["AI CAPEX", String(riverwatch.manual.aiCapexTrend || "-").toUpperCase()],
        ["NVDA DC Rev", riverwatch.manual.nvdaDcRevenueGrowth + "%"],
        ["M2", String(riverwatch.manual.m2Trend || "-").toUpperCase()]
    ];

    metrics.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.innerHTML = `<span>${label}</span><b>${value}</b>`;
        list.appendChild(row);
    });
}

function renderBoatHealth() {
    setText("boatHealth", riverwatch.calc.boatHealth);
    setText("boatStatus", getBoatStatus(riverwatch.calc.boatHealth));
    setText("alignmentScore", riverwatch.calc.alignmentScore);
    setText("suitabilityScore", riverwatch.calc.suitabilityScore);
    setText("growthSuitability", riverwatch.calc.growthSuitability);
    setText("defensiveSuitability", riverwatch.calc.defensiveSuitability);
    setText("maneuverability", riverwatch.calc.maneuverability);
}

function renderAllocation() {
    const list = document.getElementById("allocationList");
    if (!list) return;

    list.innerHTML = "";

    riverwatch.manual.holdings.forEach(item => {
        const target = riverwatch.manual.boatConfiguration[item.ticker] ?? 0;
        const current = item.current;
        const delta = current - target;
        const status = getAllocationStatus(delta);

        const row = document.createElement("div");
        row.className = "holding-row";
        row.innerHTML = `
            <span>${formatTicker(item.ticker)}</span>
            <span>${current.toFixed(1)}%</span>
            <span>${target.toFixed(1)}%</span>
            <span>${formatSigned(delta)}%</span>
            <span class="badge ${status.className}">${status.label}</span>
        `;
        list.appendChild(row);
    });
}

function renderAction() {
    setText("actionValue", riverwatch.calc.recommendedAction);
    setText("actionReason", riverwatch.calc.actionReason);
    setText("captainNote", riverwatch.calc.captainNote);
}

function renderLogbook() {
    const list = document.getElementById("logbookList");
    if (!list) return;

    list.innerHTML = "";

    riverwatch.calc.logbook.forEach(entry => {
        const div = document.createElement("div");
        div.className = "log-entry";
        div.innerHTML = `
            <div class="log-entry-top">
                <span class="log-entry-date">${entry.date}</span>
                <span class="log-entry-status">${entry.status}</span>
            </div>
            <div class="log-entry-body">
                River ${entry.river} · Boat ${entry.boat} · Voyage ${entry.voyage}<br>
                Action : ${entry.action}<br>
                ${entry.note}
            </div>
        `;
        list.appendChild(div);
    });
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function getHealthStatus(score) {
    if (score >= 90) return "ON VOYAGE";
    if (score >= 80) return "KEEP WATCH";
    if (score >= 70) return "ADAPT";
    return "RECOVER COURSE";
}

function getRiverStatus(score) {
    if (score >= 90) return "STRONG CURRENT";
    if (score >= 80) return "STABLE CURRENT";
    if (score >= 70) return "WEAKENING CURRENT";
    return "ROUGH CURRENT";
}

function getBoatStatus(score) {
    if (score >= 90) return "WELL POSITIONED";
    if (score >= 80) return "SUITABLE";
    if (score >= 70) return "REVIEW CONFIGURATION";
    return "ADAPT THE BOAT";
}

function getAllocationStatus(delta) {
    const abs = Math.abs(delta);
    if (abs <= 3) return { label: "ON TARGET", className: "on-target" };
    if (delta > 3) return { label: "OVER", className: "over" };
    return { label: "UNDER", className: "under" };
}

function formatKRW(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";

    if (value >= 100000000) {
        return (value / 100000000).toFixed(2).replace(/\.00$/, "") + "억원";
    }

    return value.toLocaleString("ko-KR") + "원";
}

function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatSigned(value) {
    return (value > 0 ? "+" : "") + value.toFixed(1);
}

function formatTicker(ticker) {
    return ticker === "INDIVIDUAL" ? "INDIVIDUAL STOCKS" : ticker;
}

window.addEventListener("DOMContentLoaded", () => {
    // Intro first. Market data loads when user enters dashboard.
});
