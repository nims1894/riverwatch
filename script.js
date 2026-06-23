/****************************************************************************************
 * RiverWatch Script v0.3.1
 * - Loads Google Sheet CSV Hub data before dashboard rendering
 * - Falls back safely to data.js dummy values if AUTO load fails
 * - Adds River Health Engine v1.1, Boat Health Engine v1.1, Voyage Health Engine v1.1
 ****************************************************************************************/

async function showDashboard() {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    await initializeMarketData();
    runCalculationEngines();
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


function runCalculationEngines() {
    calculateRiverHealth();
    calculatePortfolioPosition();
    calculateBoatHealth();
    calculateVoyageHealth();
    riverwatch.calc.daysSinceAction = calculateDaysSinceAction();
    updateDecisionEngine();
}

function calculateRiverHealth() {
    const policy = riverwatch.policy;
    const scoring = policy.riverHealthScoring || {};
    const weights = policy.riverMetricWeights || {};

    const bnoBase = getBnoReferenceValue();
    const bnoChange30d = bnoBase ? ((riverwatch.auto.bno - bnoBase) / bnoBase) * 100 : 0;

    const metricScores = {
        fedRate: scoreFromState(scoring.fedRateState, riverwatch.manual.fedRateState, 80),
        vix: scoreFromThreshold(scoring.vix, riverwatch.auto.vix, 80),
        bno: scoreFromThreshold(scoring.bnoChange30d, bnoChange30d, 80),
        usdkrw: scoreFromThreshold(scoring.usdkrw, riverwatch.auto.usdkrw, 80),
        aiCapex: scoreFromState(scoring.aiCapexTrend, riverwatch.manual.aiCapexTrend, 80),
        nvdaDcRevenue: scoreFromMinThreshold(scoring.nvdaDcRevenueGrowth, riverwatch.manual.nvdaDcRevenueGrowth, 80),
        m2: scoreFromState(scoring.m2Trend, riverwatch.manual.m2Trend, 75)
    };

    riverwatch.calc.riverMetricScores = metricScores;
    riverwatch.calc.bnoChange30d = bnoChange30d;
    riverwatch.calc.riverHealth = Math.round(weightedAverage(metricScores, weights));

    const favorability = calculateRiverFavorability(bnoChange30d);
    riverwatch.calc.growthFavorability = favorability.growth;
    riverwatch.calc.defensiveFavorability = favorability.defensive;

    riverwatch.calc.actionReason = buildActionReason();
    riverwatch.calc.captainNote = buildCaptainNote();
}



function calculatePortfolioPosition() {
    const portfolio = riverwatch.manual.portfolio || {};
    const usdkrw = Number(riverwatch.auto.usdkrw ?? 0);
    const target = riverwatch.manual.boatConfiguration || {};

    const assetGroups = {};
    let currentPosition = Number(portfolio.cashKRW ?? 0);
    let costBasis = Number(portfolio.cashKRW ?? 0);

    (portfolio.etfs || []).forEach(item => {
        const ticker = String(item.ticker || "").toUpperCase();
        const shares = Number(item.shares ?? 0);
        const avgPriceUSD = Number(item.avgPriceUSD ?? 0);
        const currentPriceUSD = getMarketPriceUSD(ticker, 0);

        const currentValueKRW = shares * currentPriceUSD * usdkrw;
        const costBasisKRW = shares * avgPriceUSD * usdkrw;

        currentPosition += currentValueKRW;
        costBasis += costBasisKRW;

        assetGroups[ticker] = {
            ticker,
            valueKRW: currentValueKRW,
            costBasisKRW,
            target: Number(target[ticker] ?? 0)
        };
    });

    let individualValueKRW = 0;
    let individualCostBasisKRW = 0;

    (portfolio.individualStocks || []).forEach(item => {
        const ticker = String(item.ticker || "").toUpperCase();
        const shares = Number(item.shares ?? 0);
        const avgPriceUSD = Number(item.avgPriceUSD ?? 0);
        const manualCurrentPriceUSD = Number(item.currentPriceUSD ?? 0);
        const currentPriceUSD = getMarketPriceUSD(ticker, manualCurrentPriceUSD);

        individualValueKRW += shares * currentPriceUSD * usdkrw;
        individualCostBasisKRW += shares * avgPriceUSD * usdkrw;
    });

    currentPosition += individualValueKRW;
    costBasis += individualCostBasisKRW;

    assetGroups.INDIVIDUAL = {
        ticker: "INDIVIDUAL",
        valueKRW: individualValueKRW,
        costBasisKRW: individualCostBasisKRW,
        target: Number(target.INDIVIDUAL ?? 0)
    };

    const allocationHoldings = Object.keys(target).map(ticker => {
        const group = assetGroups[ticker] || { ticker, valueKRW: 0, costBasisKRW: 0, target: Number(target[ticker] ?? 0) };
        const current = currentPosition > 0 ? (group.valueKRW / currentPosition) * 100 : 0;
        return {
            ticker,
            current,
            target: Number(target[ticker] ?? 0),
            valueKRW: group.valueKRW,
            costBasisKRW: group.costBasisKRW
        };
    });

    riverwatch.calc.currentPosition = currentPosition;
    riverwatch.calc.costBasis = costBasis;
    riverwatch.calc.boatPnL = currentPosition - costBasis;
    riverwatch.calc.boatReturn = costBasis > 0 ? ((currentPosition / costBasis) - 1) * 100 : 0;
    riverwatch.calc.allocationHoldings = allocationHoldings;
}

function getMarketPriceUSD(ticker, fallback = 0) {
    const key = String(ticker || "").toUpperCase();
    const marketPrices = riverwatch.auto.marketPrices || {};

    if (typeof marketPrices[key] === "number" && !Number.isNaN(marketPrices[key])) return marketPrices[key];
    if (typeof riverwatch.auto[key] === "number" && !Number.isNaN(riverwatch.auto[key])) return riverwatch.auto[key];
    return Number(fallback ?? 0);
}

function calculateBoatHealth() {
    const holdings = riverwatch.calc.allocationHoldings || [];
    const target = riverwatch.manual.boatConfiguration || {};

    const alignment = calculateAllocationAlignment(holdings, target);
    const exposure = calculateBoatExposure(holdings);
    const suitability = calculateRiverSuitability(exposure.growth);
    const integrity = calculateStructuralIntegrity(holdings);
    const discipline = calculateCaptainDiscipline();

    riverwatch.calc.allocationAlignment = alignment;
    riverwatch.calc.riverSuitability = suitability;
    riverwatch.calc.structuralIntegrity = integrity;
    riverwatch.calc.captainDiscipline = discipline;
    riverwatch.calc.growthExposure = exposure.growth;
    riverwatch.calc.defensiveExposure = exposure.defensive;
    riverwatch.calc.boatArchetype = getBoatArchetype(exposure.growth);

    riverwatch.calc.boatHealth = Math.round(weightedAverage({
        allocationAlignment: alignment,
        riverSuitability: suitability,
        structuralIntegrity: integrity,
        captainDiscipline: discipline
    }, riverwatch.policy.boatHealthWeights || {}));
}

function calculateAllocationAlignment(holdings, target) {
    if (!holdings.length) return 0;

    const scores = holdings.map(item => {
        const targetValue = Number(target[item.ticker] ?? 0);
        const currentValue = Number(item.current ?? 0);
        const diff = Math.abs(currentValue - targetValue);
        return scoreAllocationDeviation(diff);
    });

    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function scoreAllocationDeviation(diff) {
    if (diff <= 1) return 100;
    if (diff <= 3) return 90;
    if (diff <= 5) return 80;
    if (diff <= 10) return 60;
    return 40;
}

function calculateBoatExposure(holdings) {
    const growthTickers = new Set(["QQQM", "BITQ", "INDIVIDUAL"]);
    const defensiveTickers = new Set(["SPYM", "SCHD", "IAUM"]);

    let growth = 0;
    let defensive = 0;

    holdings.forEach(item => {
        const value = Number(item.current ?? 0);
        if (growthTickers.has(item.ticker)) growth += value;
        if (defensiveTickers.has(item.ticker)) defensive += value;
    });

    return {
        growth: Math.round(growth * 10) / 10,
        defensive: Math.round(defensive * 10) / 10
    };
}

function calculateRiverSuitability(growthExposure) {
    const growthEnv = Number(riverwatch.calc.growthFavorability ?? 50);
    const defensiveEnv = Number(riverwatch.calc.defensiveFavorability ?? 50);

    // River bias를 성장자산 적정 중심값으로 변환.
    // 50%를 기준으로 Growth Environment와 Defensive Environment의 차이가 클수록 적정 성장 노출이 이동한다.
    const idealGrowth = Math.max(35, Math.min(65, 50 + (growthEnv - defensiveEnv) / 4));
    const diff = Math.abs(growthExposure - idealGrowth);

    if (diff <= 5) return 100;
    if (diff <= 10) return 90;
    if (diff <= 15) return 80;
    if (diff <= 20) return 65;
    return 50;
}

function calculateStructuralIntegrity(holdings) {
    const currentMap = Object.fromEntries(holdings.map(item => [item.ticker, Number(item.current ?? 0)]));
    const maxHolding = Math.max(...holdings.map(item => Number(item.current ?? 0)), 0);
    const iaum = currentMap.IAUM ?? 0;
    const bitq = currentMap.BITQ ?? 0;

    const diversification = scoreDiversification(maxHolding);
    const reserve = scoreReserve(iaum);
    const speculation = scoreSpeculation(bitq);

    riverwatch.calc.diversificationScore = diversification;
    riverwatch.calc.reserveScore = reserve;
    riverwatch.calc.speculationScore = speculation;

    return Math.round(weightedAverage({
        diversification,
        reserve,
        speculation
    }, riverwatch.policy.structuralIntegrityWeights || {}));
}

function scoreDiversification(maxHolding) {
    if (maxHolding <= 40) return 100;
    if (maxHolding <= 50) return 90;
    if (maxHolding <= 60) return 75;
    return 60;
}

function scoreReserve(iaum) {
    if (iaum >= 5 && iaum <= 10) return 100;
    if (iaum >= 3 && iaum < 5) return 80;
    if (iaum > 10 && iaum <= 15) return 85;
    return 60;
}

function scoreSpeculation(bitq) {
    if (bitq < 5) return 100;
    if (bitq <= 10) return 80;
    return 60;
}

function calculateCaptainDiscipline() {
    return riverwatch.manual.monthlyContribution > 0 ? 100 : 60;
}

function getBoatArchetype(growthExposure) {
    const thresholds = riverwatch.policy.boatArchetypeThresholds || {};
    if (growthExposure >= (thresholds.aggressiveGrowth ?? 60)) return "Aggressive Growth Boat";
    if (growthExposure >= (thresholds.balancedGrowth ?? 45)) return "Balanced Growth Boat";
    if (growthExposure >= (thresholds.coreIndex ?? 35)) return "Core Index Boat";
    return "Defensive Boat";
}

function getBnoReferenceValue() {
    if (typeof riverwatch.auto.bno30d === "number" && !Number.isNaN(riverwatch.auto.bno30d) && riverwatch.auto.bno30d > 0) {
        return riverwatch.auto.bno30d;
    }
    if (typeof riverwatch.manual.bnoReference30d === "number" && riverwatch.manual.bnoReference30d > 0) {
        return riverwatch.manual.bnoReference30d;
    }
    return null;
}

function scoreFromThreshold(rules, value, fallback) {
    if (!Array.isArray(rules) || typeof value !== "number" || Number.isNaN(value)) return fallback;
    const rule = rules.find(item => value <= item.max);
    return rule ? rule.score : fallback;
}

function scoreFromMinThreshold(rules, value, fallback) {
    if (!Array.isArray(rules) || typeof value !== "number" || Number.isNaN(value)) return fallback;
    const rule = rules.find(item => value >= item.min);
    return rule ? rule.score : fallback;
}

function scoreFromState(rules, state, fallback) {
    if (!rules || !state || !rules[state]) return fallback;
    return rules[state].score;
}

function weightedAverage(scores, weights) {
    let weightedSum = 0;
    let weightSum = 0;

    Object.keys(scores).forEach(key => {
        const score = scores[key];
        const weight = Number(weights[key] ?? 0);
        if (typeof score === "number" && !Number.isNaN(score) && weight > 0) {
            weightedSum += score * weight;
            weightSum += weight;
        }
    });

    if (weightSum <= 0) return 0;
    return weightedSum / weightSum;
}

function calculateRiverFavorability(bnoChange30d) {
    const weights = riverwatch.policy.riverMetricWeights || {};
    const matrix = riverwatch.policy.riverMatrix || {};

    const entries = {
        usdkrw: getMatrixByMax(matrix.usdkrw, riverwatch.auto.usdkrw),
        vix: getMatrixByMax(matrix.vix, riverwatch.auto.vix),
        bno: getMatrixByMax(matrix.bnoChange30d, bnoChange30d),
        fedRate: getStateMatrix(riverwatch.policy.riverHealthScoring.fedRateState, riverwatch.manual.fedRateState),
        aiCapex: getStateMatrix(riverwatch.policy.riverHealthScoring.aiCapexTrend, riverwatch.manual.aiCapexTrend),
        nvdaDcRevenue: getMatrixByMin(riverwatch.policy.riverHealthScoring.nvdaDcRevenueGrowth, riverwatch.manual.nvdaDcRevenueGrowth),
        m2: getStateMatrix(riverwatch.policy.riverHealthScoring.m2Trend, riverwatch.manual.m2Trend)
    };

    const growthRaw = weightedMatrixAverage(entries, weights, "growth");
    const defensiveRaw = weightedMatrixAverage(entries, weights, "defensive");

    return {
        growth: normalizeFavorability(growthRaw),
        defensive: normalizeFavorability(defensiveRaw)
    };
}

function getMatrixByMax(rules, value) {
    if (!Array.isArray(rules) || typeof value !== "number" || Number.isNaN(value)) return null;
    return rules.find(item => value <= item.max) || null;
}

function getMatrixByMin(rules, value) {
    if (!Array.isArray(rules) || typeof value !== "number" || Number.isNaN(value)) return null;
    return rules.find(item => value >= item.min) || null;
}

function getStateMatrix(rules, state) {
    if (!rules || !state || !rules[state]) return null;
    return rules[state];
}

function weightedMatrixAverage(entries, weights, field) {
    let sum = 0;
    let weightSum = 0;

    Object.keys(entries).forEach(key => {
        const entry = entries[key];
        const weight = Number(weights[key] ?? 0);
        if (entry && typeof entry[field] === "number" && weight > 0) {
            sum += entry[field] * weight;
            weightSum += weight;
        }
    });

    if (weightSum <= 0) return 0;
    return sum / weightSum;
}

function normalizeFavorability(value) {
    // Matrix range -3 ~ +3 을 0 ~ 100 으로 변환
    const normalized = ((value + 3) / 6) * 100;
    return Math.round(Math.max(0, Math.min(100, normalized)));
}

function buildActionReason() {
    const river = riverwatch.calc.riverHealth;
    const growth = riverwatch.calc.growthFavorability;
    const defensive = riverwatch.calc.defensiveFavorability;

    if (river >= 90) {
        return `The river remains strong. Growth environment is ${growth}, defensive environment is ${defensive}. Continue the voyage.`;
    }
    if (river >= 80) {
        return `The river remains stable. Growth environment is ${growth}, defensive environment is ${defensive}. Keep watch before adapting.`;
    }
    if (river >= 70) {
        return `The current is weakening. Growth environment is ${growth}, defensive environment is ${defensive}. Review the boat configuration.`;
    }
    return `The river is rough. Growth environment is ${growth}, defensive environment is ${defensive}. Prepare to adapt the boat.`;
}

function buildCaptainNote() {
    const bnoChange = riverwatch.calc.bnoChange30d;
    const fx = riverwatch.auto.usdkrw;
    const vix = riverwatch.auto.vix;
    return `River Health recalculated from live MarketHub data. USDKRW ${formatNumber(fx)}, VIX ${formatNumber(vix)}, BNO 30d ${formatSigned(bnoChange)}%.`;
}


function calculateVoyageHealth() {
    const target = Number(riverwatch.manual.openSeaTarget ?? 0);
    const currentAssets = Number(riverwatch.calc.currentPosition ?? 0);
    const monthlyContribution = Number(riverwatch.manual.monthlyContribution ?? 0);
    const baseCAGR = Number(riverwatch.manual.expectedCAGR ?? 0);
    const remainingYears = calculateRemainingYears(riverwatch.manual.targetDate);

    const riverAdjustment = getCagrAdjustment(riverwatch.policy.voyageCagrAdjustment?.river, riverwatch.calc.riverHealth);
    const boatAdjustment = getCagrAdjustment(riverwatch.policy.voyageCagrAdjustment?.boat, riverwatch.calc.boatHealth);
    const effectiveCAGR = Math.max(0, baseCAGR + riverAdjustment + boatAdjustment);

    const baseArrival = projectFutureValue(currentAssets, monthlyContribution, baseCAGR, remainingYears);
    const adjustedArrival = projectFutureValue(currentAssets, monthlyContribution, effectiveCAGR, remainingYears);
    const drift = target > 0 ? ((adjustedArrival / target) - 1) * 100 : 0;
    const health = scoreVoyageDrift(drift);

    riverwatch.calc.currentPosition = currentAssets;
    riverwatch.calc.openSeaTarget = target;
    riverwatch.calc.baseArrival = baseArrival;
    riverwatch.calc.adjustedArrival = adjustedArrival;
    riverwatch.calc.voyageDrift = drift;
    riverwatch.calc.baseCAGR = baseCAGR;
    riverwatch.calc.riverAdjustment = riverAdjustment;
    riverwatch.calc.boatAdjustment = boatAdjustment;
    riverwatch.calc.effectiveCAGR = effectiveCAGR;
    riverwatch.calc.remainingYears = remainingYears;
    riverwatch.calc.remainingTime = formatRemainingTime(remainingYears);
    riverwatch.calc.eta = riverwatch.manual.targetDate;
    riverwatch.calc.voyageHealth = health;
}

function calculateRemainingYears(targetDate) {
    if (!targetDate || typeof targetDate !== "string") return 0;
    const [yearText, monthText] = targetDate.split(".");
    const year = Number(yearText);
    const month = Number(monthText || 12);
    if (!year || !month) return 0;

    const now = new Date();
    const target = new Date(year, month - 1, 1);
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = (target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth());
    return Math.max(0, months / 12);
}

function projectFutureValue(currentAssets, monthlyContribution, annualRate, years) {
    const months = Math.round(years * 12);
    if (months <= 0) return currentAssets;

    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    let value = currentAssets;

    for (let i = 0; i < months; i += 1) {
        value = value * (1 + monthlyRate) + monthlyContribution;
    }

    return value;
}

function getCagrAdjustment(rules, score) {
    if (!Array.isArray(rules) || typeof score !== "number" || Number.isNaN(score)) return 0;
    const rule = rules.find(item => score >= item.min);
    return rule ? Number(rule.adjustment || 0) : 0;
}

function scoreVoyageDrift(drift) {
    if (drift > 20) return 100;
    if (drift >= 10) return 95;
    if (drift >= 0) return 90;
    if (drift >= -10) return 80;
    if (drift >= -20) return 70;
    return 60;
}

function getVoyageStatus(score) {
    if (score >= 95) return "AHEAD OF COURSE";
    if (score >= 85) return "ON COURSE";
    if (score >= 75) return "MINOR CORRECTION";
    if (score >= 60) return "OFF COURSE";
    if (score >= 40) return "MAJOR CORRECTION";
    return "LOST AT SEA";
}

function updateDecisionEngine() {
    const river = Number(riverwatch.calc.riverHealth ?? 0);
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number(riverwatch.calc.voyageHealth ?? 0);
    const alignment = Number(riverwatch.calc.allocationAlignment ?? 0);
    const inBuildPhase = isInBuildPhase() && alignment < 85;

    let status = "STAY THE COURSE";
    let action = "NO ACTION";

    if (inBuildPhase) {
        status = "BUILD PHASE";
        action = "CONTINUE BUILDING";
    } else if (voyage < 60) {
        status = "RECOVER COURSE";
        action = "INCREASE EFFORT";
    } else if (boat < 70) {
        status = "ADAPT THE BOAT";
        action = "REBALANCE";
    } else if (river < 70) {
        status = "KEEP WATCH";
        action = "REVIEW";
    } else if (river >= 80 && boat >= 85 && voyage >= 85) {
        status = "STAY THE COURSE";
        action = "NO ACTION";
    } else {
        status = "KEEP WATCH";
        action = "REVIEW";
    }

    riverwatch.calc.status = status;
    riverwatch.calc.recommendedAction = action;
    riverwatch.calc.actionReason = buildDecisionReason(river, boat, voyage, status, action);
}

function buildDecisionReason(river, boat, voyage, status, action) {
    if (status === "BUILD PHASE") {
        return `Portfolio construction phase in progress. Target allocation expected by ${formatBuildPhaseEnd()}. No corrective action required. Stay the Course. — RiverWatch`;
    }
    if (status === "RECOVER COURSE") {
        return `Voyage Health is ${voyage}. The current plan is materially behind the Open Sea target. Recommended action: ${action}.`;
    }
    if (status === "ADAPT THE BOAT") {
        return `Boat Health is ${boat}. The boat is not sufficiently aligned or suitable for the current river. Recommended action: ${action}.`;
    }
    if (status === "KEEP WATCH") {
        return `River ${river}, Boat ${boat}, Voyage ${voyage}. Conditions require observation before adaptation. Recommended action: ${action}.`;
    }
    return `River ${river}, Boat ${boat}, Voyage ${voyage}. The system remains within course. Continue the voyage.`;
}


function isInBuildPhase() {
    const endText = riverwatch.manual.buildPhaseEnd;
    if (!endText || typeof endText !== "string") return false;
    const parts = endText.split(".").map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return false;
    const end = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return todayStart <= end;
}

function formatBuildPhaseEnd() {
    const endText = riverwatch.manual.buildPhaseEnd || "2026.07.31";
    const parts = endText.split(".");
    if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
    return endText;
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
    setText("lastRebalance", riverwatch.manual.lastRebalance || riverwatch.calc.lastRebalance);
    setText("doctrineCompliance", riverwatch.calc.doctrineCompliance + "%");

    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.className = "status-text " + getMissionStatusClass(riverwatch.calc.status);
    }
}

function getMissionStatusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value.includes("RECOVER")) return "recover";
    if (value.includes("ADAPT")) return "adapt";
    if (value.includes("BUILD")) return "watch";
    if (value.includes("WATCH")) return "watch";
    return "";
}

function renderVoyageHealth() {
    const totalAdjustment = (Number(riverwatch.calc.riverAdjustment ?? 0) + Number(riverwatch.calc.boatAdjustment ?? 0)) * 100;
    const voyageGap = Math.max(0, Number(riverwatch.calc.openSeaTarget ?? 0) - Number(riverwatch.calc.adjustedArrival ?? 0));

    setText("voyageHealth", riverwatch.calc.voyageHealth);
    setText("voyageStatus", `${getVoyageStatus(riverwatch.calc.voyageHealth)} (${riverwatch.calc.voyageHealth})`);
    setText("currentPosition", formatKRWB(riverwatch.calc.currentPosition));
    setText("remainingTime", riverwatch.calc.remainingTime);
    setText("baseArrival", formatKRWB(riverwatch.calc.baseArrival));
    setText("totalAdjustment", formatSigned(totalAdjustment) + "%");
    setText("adjustedArrival", formatKRWB(riverwatch.calc.adjustedArrival));
    setText("openSeaTarget", formatKRWB(riverwatch.calc.openSeaTarget));
    setText("voyageDrift", formatSigned(riverwatch.calc.voyageDrift) + "%");
    setText("voyageGap", formatKRWB(voyageGap));
}

function renderRiverHealth() {
    setText("riverHealth", riverwatch.calc.riverHealth);
    setText("riverStatus", getRiverStatus(riverwatch.calc.riverHealth));

    const list = document.getElementById("riverMetricList");
    if (!list) return;

    list.innerHTML = "";

    const scores = riverwatch.calc.riverMetricScores || {};
    const metrics = [
        ["USDKRW", `${formatInteger(riverwatch.auto.usdkrw)} (${scoreText(scores.usdkrw)})`],
        ["VIX", `${formatInteger(riverwatch.auto.vix)} (${scoreText(scores.vix)})`],
        ["BNO", `${formatNumber(riverwatch.auto.bno)} · 30d ${formatSigned(riverwatch.calc.bnoChange30d || 0)}% (${scoreText(scores.bno)})`],
        ["AI CAPEX", `${String(riverwatch.manual.aiCapexTrend || "-").toUpperCase()} (${scoreText(scores.aiCapex)})`],
        ["NVDA DC Rev", `${riverwatch.manual.nvdaDcRevenueGrowth}% (${scoreText(scores.nvdaDcRevenue)})`],
        ["M2", `${String(riverwatch.manual.m2Trend || "-").toUpperCase()} (${scoreText(scores.m2)})`],
        ["Growth Environment", `${getEnvironmentLabel(riverwatch.calc.growthFavorability)} (${riverwatch.calc.growthFavorability})`],
        ["Defensive Environment", `${getEnvironmentLabel(riverwatch.calc.defensiveFavorability)} (${riverwatch.calc.defensiveFavorability})`]
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
    setText("allocationAlignment", `${getAlignmentLabel(riverwatch.calc.allocationAlignment)} (${riverwatch.calc.allocationAlignment})`);
    setText("riverSuitability", `${getSuitabilityLabel(riverwatch.calc.riverSuitability)} (${riverwatch.calc.riverSuitability})`);
    setText("structuralIntegrity", `${getIntegrityLabel(riverwatch.calc.structuralIntegrity)} (${riverwatch.calc.structuralIntegrity})`);
    setText("captainDiscipline", `${getDisciplineLabel(riverwatch.calc.captainDiscipline)} (${riverwatch.calc.captainDiscipline})`);
    setText("boatArchetype", riverwatch.calc.boatArchetype);
    setText("growthExposure", formatPercentValue(riverwatch.calc.growthExposure));
    setText("defensiveExposure", formatPercentValue(riverwatch.calc.defensiveExposure));
    setText("costBasis", formatKRWB(riverwatch.calc.costBasis));
    setText("boatReturn", formatSigned(riverwatch.calc.boatReturn) + "%");
}

function renderAllocation() {
    const list = document.getElementById("allocationList");
    if (!list) return;

    list.innerHTML = "";

    (riverwatch.calc.allocationHoldings || []).forEach(item => {
        const target = riverwatch.manual.boatConfiguration[item.ticker] ?? 0;
        const current = Number(item.current ?? 0);
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

function calculateDaysSinceAction() {
    const dateText = riverwatch.manual.lastRebalance || riverwatch.calc.lastRebalance;
    if (!dateText || typeof dateText !== "string") return 0;

    const parts = dateText.split(".").map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return 0;

    const rebalance = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = todayStart - rebalance;

    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getEnvironmentLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 80) return "HIGHLY FAVORABLE";
    if (value >= 60) return "FAVORABLE";
    if (value >= 55) return "SLIGHTLY FAVORABLE";
    if (value >= 45) return "NEUTRAL";
    if (value >= 35) return "SLIGHTLY UNFAVORABLE";
    if (value >= 20) return "UNFAVORABLE";
    return "HIGHLY UNFAVORABLE";
}

function getAlignmentLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 90) return "ON TARGET";
    if (value >= 80) return "NEAR TARGET";
    if (value >= 65) return "DRIFTING";
    if (value >= 50) return "OFF TARGET";
    return "MISALIGNED";
}

function getSuitabilityLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 90) return "EXCELLENT MATCH";
    if (value >= 80) return "GOOD MATCH";
    if (value >= 65) return "ACCEPTABLE MATCH";
    if (value >= 50) return "POOR MATCH";
    return "MISMATCH";
}

function getIntegrityLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 90) return "ROBUST";
    if (value >= 80) return "SOUND DESIGN";
    if (value >= 70) return "ACCEPTABLE";
    if (value >= 60) return "FRAGILE";
    return "UNSTABLE";
}

function getDisciplineLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 95) return "DISCIPLINED";
    if (value >= 80) return "CONSISTENT";
    if (value >= 60) return "INCONSISTENT";
    return "ERRATIC";
}

function getVoyageDriftLabel(drift) {
    const value = Number(drift ?? 0);
    if (value > 20) return "COMFORTABLE MARGIN";
    if (value >= 10) return "ON TRACK";
    if (value >= 0) return "NARROW MARGIN";
    if (value >= -10) return "SLIGHTLY BEHIND";
    if (value >= -20) return "BEHIND SCHEDULE";
    return "SIGNIFICANT GAP";
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
    if (score >= 90) return "TAILWIND";
    if (score >= 80) return "FAVORABLE CURRENT";
    if (score >= 70) return "STABLE CURRENT";
    if (score >= 60) return "CHOPPY WATER";
    return "ROUGH SEA";
}

function getBoatStatus(score) {
    if (score >= 90) return "WELL CONFIGURED";
    if (score >= 80) return "PROPERLY TRIMMED";
    if (score >= 70) return "NEEDS ADJUSTMENT";
    if (score >= 60) return "POORLY BALANCED";
    return "TAKING WATER";
}

function getAllocationStatus(delta) {
    const abs = Math.abs(delta);
    if (abs <= 3) return { label: "ON TARGET", className: "on-target" };
    if (delta > 3) return { label: "OVER", className: "over" };
    return { label: "UNDER", className: "under" };
}

function formatRemainingTime(years) {
    if (typeof years !== "number" || Number.isNaN(years)) return "-";
    const totalMonths = Math.max(0, Math.round(years * 12));
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y}y ${m}m`;
}

function formatKRWB(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return (value / 1000000000).toFixed(2) + "B";
}

function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatInteger(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return Math.round(value).toLocaleString("ko-KR");
}

function formatPercentValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toFixed(1) + "%";
}

function formatSigned(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return (value > 0 ? "+" : "") + value.toFixed(1);
}

function scoreText(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return Math.round(value);
}

function formatTicker(ticker) {
    return ticker === "INDIVIDUAL" ? "INDIVIDUAL STOCKS" : ticker;
}

window.addEventListener("DOMContentLoaded", () => {
    // Intro first. Market data loads when user enters dashboard.
});
