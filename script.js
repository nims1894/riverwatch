function showDashboard() {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    renderDashboard();
}

function showIntro() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("intro").classList.remove("hidden");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function weightedAverage(items) {
    const validItems = items.filter(item => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
    const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) return 0;

    return validItems.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function normalizeFavorability(rawScore) {
    // Raw range roughly -3 ~ +3. Convert to 0 ~ 100.
    return Math.round(clamp(((rawScore + 3) / 6) * 100, 0, 100));
}

function formatKRW(value) {
    if (!Number.isFinite(value)) return "-";

    if (value >= 100000000) {
        const eok = value / 100000000;
        return `${eok.toFixed(eok >= 10 ? 1 : 2)}억원`;
    }

    if (value >= 10000) {
        return `${Math.round(value / 10000).toLocaleString()}만원`;
    }

    return `${value.toLocaleString()}원`;
}

function getStatusFromDeviation(deviation) {
    const thresholds = riverwatch.policy.allocationThresholds;
    const abs = Math.abs(deviation);

    if (abs <= thresholds.normalDeviation) return "NORMAL";
    if (abs <= thresholds.reviewDeviation) return deviation > 0 ? "OVER" : "UNDER";
    return deviation > 0 ? "OVER" : "UNDER";
}

function lookupRangeMatrix(ranges, value, mode = "max") {
    if (mode === "min") {
        return ranges.find(item => value >= item.min) || ranges[ranges.length - 1];
    }

    return ranges.find(item => value < item.max) || ranges[ranges.length - 1];
}

function evaluateRiverMetric(metricName) {
    const matrix = riverwatch.policy.riverMatrix[metricName];

    switch (metricName) {
        case "fedRate":
            return matrix[riverwatch.auto.fedRate] || matrix.PAUSE;

        case "vix":
            return lookupRangeMatrix(matrix, riverwatch.auto.vix);

        case "brentOil":
            return lookupRangeMatrix(matrix, riverwatch.auto.brentOil);

        case "usdkrw":
            return lookupRangeMatrix(matrix, riverwatch.auto.usdkrw);

        case "aiCapex":
            return matrix[riverwatch.manual.lowFrequencyMetrics.aiCapex] || matrix.STABLE;

        case "nvdaDcRevenue":
            return lookupRangeMatrix(matrix, riverwatch.manual.lowFrequencyMetrics.nvdaDcRevenueGrowth, "min");

        case "m2":
            return matrix[riverwatch.auto.m2] || matrix.STABLE;

        default:
            return { growth: 0, defensive: 0 };
    }
}

function calculateRiver() {
    const weights = riverwatch.policy.riverMetricWeights;

    const growthInputs = Object.keys(weights).map(metricName => {
        const metric = evaluateRiverMetric(metricName);
        return { value: metric.growth, weight: weights[metricName] };
    });

    const defensiveInputs = Object.keys(weights).map(metricName => {
        const metric = evaluateRiverMetric(metricName);
        return { value: metric.defensive, weight: weights[metricName] };
    });

    const growthRaw = weightedAverage(growthInputs);
    const defensiveRaw = weightedAverage(defensiveInputs);
    const growthFavorability = normalizeFavorability(growthRaw);
    const defensiveFavorability = normalizeFavorability(defensiveRaw);

    const riverScore = Math.round(weightedAverage([
        { value: growthFavorability, weight: 60 },
        { value: 100 - defensiveFavorability, weight: 20 },
        { value: growthFavorability >= 50 ? 90 : 70, weight: 20 }
    ]));

    return {
        score: riverScore,
        label: getHealthLabel(riverScore, "river"),
        growthFavorability,
        defensiveFavorability
    };
}

function calculateAllocationRows() {
    return riverwatch.manual.boatConfiguration.map(config => {
        const currentItem = riverwatch.manual.holdings.find(item => item.ticker === config.ticker);
        const current = currentItem ? currentItem.current : 0;
        const target = config.target;
        const deviation = current - target;
        const status = getStatusFromDeviation(deviation);

        return {
            ...config,
            current,
            deviation,
            status
        };
    });
}

function calculateAlignment(allocationRows) {
    const totalPenalty = allocationRows.reduce((sum, row) => sum + Math.abs(row.deviation), 0);
    return Math.round(clamp(100 - totalPenalty * 2, 0, 100));
}

function calculateExposure(allocationRows, bucket) {
    return allocationRows
        .filter(row => row.bucket === bucket)
        .reduce((sum, row) => sum + row.current, 0);
}

function calculateBoat(river, allocationRows) {
    const policy = riverwatch.policy;
    const alignment = calculateAlignment(allocationRows);
    const growthExposure = calculateExposure(allocationRows, "growth");
    const defensiveExposure = calculateExposure(allocationRows, "defensive") + riverwatch.manual.cashReserve;

    // Simple PoC mapping. Later this can be tuned in POLICY.
    const targetGrowthExposure = 35 + (river.growthFavorability / 100) * 25;
    const targetDefensiveExposure = 15 + (river.defensiveFavorability / 100) * 20;

    const growthSuitability = Math.round(clamp(100 - Math.abs(growthExposure - targetGrowthExposure) * 2, 0, 100));
    const defensiveSuitability = Math.round(clamp(100 - Math.abs(defensiveExposure - targetDefensiveExposure) * 2, 0, 100));
    const maneuverability = Math.round(clamp(70 + riverwatch.manual.cashReserve * 6, 0, 100));

    const suitability = Math.round(weightedAverage([
        { value: growthSuitability, weight: policy.suitabilityWeights.growth },
        { value: defensiveSuitability, weight: policy.suitabilityWeights.defensive },
        { value: maneuverability, weight: policy.suitabilityWeights.maneuverability }
    ]));

    const boatScore = Math.round(weightedAverage([
        { value: alignment, weight: policy.boatHealthWeights.alignment },
        { value: suitability, weight: policy.boatHealthWeights.suitability }
    ]));

    return {
        score: boatScore,
        label: getHealthLabel(boatScore, "boat"),
        alignment,
        suitability,
        growthSuitability,
        defensiveSuitability,
        maneuverability,
        growthExposure,
        defensiveExposure
    };
}

function calculateVoyage() {
    // v0.2.1에서는 PoC 단계이므로 현재 승인된 dummy snapshot을 유지.
    // 이후 실제 현재 자산/월 납입/복리 경로 기반으로 계산 예정.
    const target = riverwatch.manual.openSea;
    const fallback = riverwatch.calc.voyage;

    return {
        ...fallback,
        openSeaTarget: target.targetAsset,
        label: getHealthLabel(fallback.score, "voyage")
    };
}

function calculateDecision(river, boat, voyage) {
    const thresholds = riverwatch.policy.actionThresholds;

    if (voyage.score < thresholds.recoverCourse) {
        return {
            status: "RECOVER COURSE",
            action: "INCREASE EFFORT",
            note: "Voyage is behind plan. Increase contribution or review ETA.",
            reason: [
                "Voyage Health is below recovery threshold.",
                "Current position is below expected position.",
                "Open Sea remains achievable, but effort must increase."
            ]
        };
    }

    if (boat.score < thresholds.adaptBoat) {
        return {
            status: "ADAPT THE BOAT",
            action: "ADAPT BOAT",
            note: "Boat configuration may no longer be suitable for the current river.",
            reason: [
                "Boat Health is below adaptation threshold.",
                "Review growth and defensive exposure.",
                "Adapt the boat before the voyage drifts."
            ]
        };
    }

    if (river.score < thresholds.keepWatch || boat.score < thresholds.keepWatch) {
        return {
            status: "KEEP WATCH",
            action: "WATCH",
            note: "The current is changing. Observe before adapting.",
            reason: [
                "River or Boat Health entered watch range.",
                "No immediate reconfiguration required.",
                "Continue monitoring the current."
            ]
        };
    }

    return {
        status: "STAY THE COURSE",
        action: "NO ACTION",
        note: "Architecture stable. Proceed with discipline.",
        reason: [
            "Voyage Health remains above plan.",
            "River Health remains favorable.",
            "Boat configuration is suitable for the current river."
        ]
    };
}

function getHealthLabel(score, type) {
    if (score >= 90) {
        if (type === "voyage") return "On Voyage";
        if (type === "river") return "Strong Current";
        if (type === "boat") return "Well Positioned";
        return "Strong";
    }

    if (score >= 80) return "Keep Watch";
    if (score >= 70) return "Review";
    return "Alert";
}

function buildViewModel() {
    const river = calculateRiver();
    const allocationRows = calculateAllocationRows();
    const boat = calculateBoat(river, allocationRows);
    const voyage = calculateVoyage();
    const decision = calculateDecision(river, boat, voyage);

    return { river, boat, voyage, allocationRows, decision };
}

function renderDashboard() {
    const vm = buildViewModel();

    renderDoctrine();
    renderMission(vm);
    renderHealth(vm);
    renderAllocation(vm.allocationRows);
    renderDecision(vm.decision);
    renderLogbook();
}

function renderDoctrine() {
    document.getElementById("subtitleSmall").innerText = riverwatch.const.subtitle;

    const doctrineEl = document.getElementById("dashboardDoctrine");
    doctrineEl.innerHTML = "";

    riverwatch.const.principles.forEach(line => {
        const p = document.createElement("p");
        p.innerText = line;
        doctrineEl.appendChild(p);
    });
}

function renderMission(vm) {
    document.getElementById("mission").innerText = riverwatch.const.mission;
    document.getElementById("status").innerText = vm.decision.status;
    document.getElementById("recommendedAction").innerText = vm.decision.action;
    document.getElementById("lastSync").innerText = riverwatch.auto.lastSync;
}

function renderHealth(vm) {
    const { voyage, river, boat } = vm;

    document.getElementById("voyageMini").innerText = voyage.score;
    document.getElementById("riverMini").innerText = river.score;
    document.getElementById("boatMini").innerText = boat.score;

    document.getElementById("voyageHealth").innerText = voyage.score;
    document.getElementById("voyageLabel").innerText = voyage.label;
    document.getElementById("currentPosition").innerText = formatKRW(voyage.currentPosition);
    document.getElementById("expectedPosition").innerText = formatKRW(voyage.expectedPosition);
    document.getElementById("openSeaTarget").innerText = formatKRW(voyage.openSeaTarget);
    document.getElementById("projectedAsset").innerText = formatKRW(voyage.projectedAsset);
    document.getElementById("eta").innerText = voyage.eta;
    document.getElementById("remaining").innerText = voyage.remaining;

    document.getElementById("riverHealth").innerText = river.score;
    document.getElementById("riverLabel").innerText = river.label;
    document.getElementById("growthFavorability").innerText = river.growthFavorability;
    document.getElementById("defensiveFavorability").innerText = river.defensiveFavorability;

    document.getElementById("boatHealth").innerText = boat.score;
    document.getElementById("boatLabel").innerText = boat.label;
    document.getElementById("boatAlignment").innerText = boat.alignment;
    document.getElementById("boatSuitability").innerText = boat.suitability;
}

function renderAllocation(allocationRows) {
    const allocationList = document.getElementById("allocationList");
    allocationList.innerHTML = "";

    allocationRows.forEach(rowData => {
        const statusClass = rowData.status.toLowerCase();
        const row = document.createElement("div");
        row.className = "holding-row allocation-row";

        row.innerHTML = `
            <span>${rowData.ticker}</span>
            <span>${rowData.current.toFixed(1)}%</span>
            <span>${rowData.target.toFixed(1)}%</span>
            <span>${rowData.deviation > 0 ? "+" : ""}${rowData.deviation.toFixed(1)}%</span>
            <span class="badge ${statusClass}">${rowData.status}</span>
        `;

        allocationList.appendChild(row);
    });
}

function renderDecision(decision) {
    document.getElementById("actionValue").innerText = decision.action;
    document.getElementById("captainNote").innerText = decision.note;

    const reasonList = document.getElementById("reasonList");
    reasonList.innerHTML = "";

    decision.reason.forEach(reason => {
        const li = document.createElement("li");
        li.innerText = reason;
        reasonList.appendChild(li);
    });
}

function renderLogbook() {
    const logbookList = document.getElementById("logbookList");
    logbookList.innerHTML = "";

    riverwatch.manual.logbook.forEach(log => {
        const item = document.createElement("div");
        item.className = "log-entry";
        item.innerHTML = `
            <div class="log-date">${log.date}</div>
            <div class="log-summary">River ${log.river} · Boat ${log.boat} · Voyage ${log.voyage}</div>
            <div class="log-action">${log.action}</div>
            <p class="log-note">${log.note}</p>
        `;
        logbookList.appendChild(item);
    });
}
