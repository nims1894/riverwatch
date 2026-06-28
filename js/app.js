/****************************************************************************************
 * RiverWatch Script v1.0-beta-cab007
 * - Loads Google Sheet v2.0 MarketData / Portfolio / ManualConfig before dashboard rendering
 * - Falls back safely to data.js dummy values if AUTO load fails
 * - Adds River Health Engine v1.1, Boat Health Engine v1.1, Voyage Health Engine v1.1
 ****************************************************************************************/

let riverwatchDashboardInitialized = false;

async function showDashboard(forceReload = false) {
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    if (forceReload || !riverwatchDashboardInitialized) {
        await initializeMarketData();
        riverwatchDashboardInitialized = true;
    }

    runCalculationEngines();
    renderDashboard();
    showAppPage("dashboardPage");
}

async function refreshDashboard() {
    const button = document.getElementById("refreshDashboardBtn");
    if (button) {
        button.disabled = true;
        button.classList.add("refreshing");
    }

    await initializeMarketData();
    riverwatchDashboardInitialized = true;
    runCalculationEngines();
    renderDashboard();
    showAppPage(document.querySelector(".nav-tab.active")?.dataset?.page || "dashboardPage");

    if (button) {
        button.disabled = false;
        button.classList.remove("refreshing");
    }
}

function showIntro() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("intro").classList.remove("hidden");
}


function showAppPage(pageId) {
    document.querySelectorAll(".app-page").forEach(page => {
        page.classList.toggle("hidden", page.id !== pageId);
    });

    document.querySelectorAll(".nav-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.page === pageId);
    });

    if (pageId === "boatyardPage") renderBoatyard();
    if (pageId === "logbookPage") renderOpenSeaLogbook();
}

async function initializeMarketData() {
    try {
        const hub = riverwatch?.policy?.marketDataHub;

        if (!hub || hub.enabled !== true) {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatch Google Sheet Hub disabled. Using FALLBACK values.");
            return;
        }

        if (typeof RiverWatchMarketEngine === "undefined" ||
            typeof RiverWatchMarketEngine.loadAllData !== "function") {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatchMarketEngine v0.4 is not available. Using FALLBACK values.");
            return;
        }

        await RiverWatchMarketEngine.loadAllData();
    } catch (error) {
        riverwatch.auto.dataSource = "FALLBACK";
        console.warn("RiverWatch Google Sheet v2.0 failed. Using FALLBACK values.", error);
    }
}


function runCalculationEngines() {
    calculateRiverHealth();
    calculatePortfolioPosition();
    calculateBoatHealth();
    calculateVoyageHealth();
    calculateVoyagePhase();
    riverwatch.calc.daysSinceAction = calculateDaysSinceAction();
    updateDecisionEngine();
    riverwatch.calc.captainNote = buildCaptainNote();
    riverwatch.calc.logbook = buildLatestSnapshot();
}

function calculateRiverHealth() {
    const policy = riverwatch.policy;
    const scoring = policy.riverHealthScoring || {};
    const weights = policy.riverMetricWeights || {};
    const config = riverwatch.manualConfig || {};

    const brentPrice = Number(config.BrentPrice ?? config.brentPrice ?? riverwatch.auto.BrentPrice ?? 0);

    const metricScores = {
        fedRate: scoreFromState(scoring.fedRateState, config.fedRateState, 80),
        vix: scoreFromThreshold(scoring.vix, riverwatch.auto.vix, 80),
        oil: scoreFromThreshold(scoring.oilPressure, brentPrice, 80),
        usdkrw: scoreFromThreshold(scoring.usdkrw, riverwatch.auto.usdkrw, 80),
        aiCapex: scoreFromState(scoring.aiCapexTrend, config.aiCapexTrend, 80),
        nvdaDcRevenue: scoreFromMinThreshold(scoring.nvdaDcRevenueGrowth, Number(config.nvdaDcRevenueGrowth ?? 0), 80),
        m2: scoreFromState(scoring.m2Trend, config.m2Trend, 75)
    };

    riverwatch.calc.riverMetricScores = metricScores;
    riverwatch.calc.brentPrice = brentPrice;
    riverwatch.calc.riverHealth = Math.round(weightedAverage(metricScores, weights));

    const favorability = calculateRiverFavorability(brentPrice);
    riverwatch.calc.growthFavorability = favorability.growth;
    riverwatch.calc.defensiveFavorability = favorability.defensive;

    riverwatch.calc.actionReason = buildActionReason();
}



function calculatePortfolioPosition() {
    const portfolio = Array.isArray(riverwatch.portfolio) ? riverwatch.portfolio : [];
    const config = riverwatch.manualConfig || {};
    const usdkrw = Number(riverwatch.auto.usdkrw ?? 0);
    const target = riverwatch.manual.boatConfiguration || {};

    const assetGroups = {};
    let currentPosition = Number(config.cashKRW ?? 0);
    let costBasis = Number(config.cashKRW ?? 0);

    portfolio.forEach(item => {
        const ticker = String(item.ticker || "").toUpperCase();
        const shares = Number(item.shares ?? 0);
        const avgCostKRW = Number(item.avgCostKRW ?? 0);
        const currentPriceUSD = getMarketPriceUSD(ticker, 0);

        const currentValueKRW = shares * currentPriceUSD * usdkrw;
        const costBasisKRW = shares * avgCostKRW;

        currentPosition += currentValueKRW;
        costBasis += costBasisKRW;

        const targetWeight = Number(target[ticker] ?? item.targetWeight ?? 0);
        const groupTicker = targetWeight > 0 ? ticker : "INDIVIDUAL";

        if (!assetGroups[groupTicker]) {
            assetGroups[groupTicker] = {
                ticker: groupTicker,
                valueKRW: 0,
                costBasisKRW: 0,
                target: Number(target[groupTicker] ?? targetWeight ?? 0)
            };
        }

        assetGroups[groupTicker].valueKRW += currentValueKRW;
        assetGroups[groupTicker].costBasisKRW += costBasisKRW;
    });

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
        const ticker = String(item.ticker || "").toUpperCase();
        const limit = Number(target[ticker] ?? item.target ?? 0);
        const currentValue = Number(item.current ?? 0);
        if (limit <= 0) return 100;

        if (ticker === "INDIVIDUAL") {
            return currentValue <= limit ? 100 : Math.round(Math.max(0, Math.min(100, (limit / currentValue) * 100)));
        }

        return currentValue >= limit ? 100 : Math.round(Math.max(0, Math.min(100, (currentValue / limit) * 100)));
    });

    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
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
    return Number((riverwatch.manualConfig || {}).monthlyContributionKRW ?? 0) > 0 ? 100 : 60;
}

function getBoatArchetype(growthExposure) {
    const thresholds = riverwatch.policy.boatArchetypeThresholds || {};
    if (growthExposure >= (thresholds.aggressiveGrowth ?? 60)) return "Aggressive Growth Boat";
    if (growthExposure >= (thresholds.balancedGrowth ?? 45)) return "Balanced Growth Boat";
    if (growthExposure >= (thresholds.coreIndex ?? 35)) return "Core Index Boat";
    return "Defensive Boat";
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

function calculateRiverFavorability(brentPrice) {
    const weights = riverwatch.policy.riverMetricWeights || {};
    const matrix = riverwatch.policy.riverMatrix || {};
    const config = riverwatch.manualConfig || {};

    const entries = {
        usdkrw: getMatrixByMax(matrix.usdkrw, riverwatch.auto.usdkrw),
        vix: getMatrixByMax(matrix.vix, riverwatch.auto.vix),
        oil: getMatrixByMax(matrix.oilPressure, brentPrice),
        fedRate: getStateMatrix(riverwatch.policy.riverHealthScoring.fedRateState, config.fedRateState),
        aiCapex: getStateMatrix(riverwatch.policy.riverHealthScoring.aiCapexTrend, config.aiCapexTrend),
        nvdaDcRevenue: getMatrixByMin(riverwatch.policy.riverHealthScoring.nvdaDcRevenueGrowth, Number(config.nvdaDcRevenueGrowth ?? 0)),
        m2: getStateMatrix(riverwatch.policy.riverHealthScoring.m2Trend, config.m2Trend)
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
    const phase = riverwatch.calc.voyagePhase || "BUILD_PHASE";
    const river = Number(riverwatch.calc.riverHealth ?? 0);
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number(riverwatch.calc.voyageHealth ?? 0);

    const riverLine = river >= 85
        ? "The river remains favorable."
        : river >= 70
            ? "The river remains navigable, but watch the current."
            : "The river is becoming rough.";

    let boatLine;
    if (phase === "BUILD_PHASE") {
        boatLine = "The boat is still under construction.";
    } else if (boat >= 85) {
        boatLine = "The boat remains well balanced.";
    } else if (boat >= 70) {
        boatLine = "The boat remains seaworthy.";
    } else {
        boatLine = "The boat requires further adaptation.";
    }

    let voyageLine;
    if (phase === "OPEN_SEA_REACHED") {
        voyageLine = "Open Sea has been reached.";
    } else if (phase === "TARGET_DATE_REACHED") {
        voyageLine = "The planned voyage has ended, but Open Sea was not fully reached.";
    } else if (phase === "OPEN_SEA_APPROACH") {
        voyageLine = "Open Sea is now visible on the horizon.";
    } else if (phase === "MID_VOYAGE") {
        voyageLine = "Progress toward Open Sea continues.";
    } else if (phase === "EARLY_VOYAGE") {
        voyageLine = "Progress toward Open Sea has begun.";
    } else {
        voyageLine = "Open Sea remains beyond the horizon.";
    }

    let actionLine;
    if (phase === "TARGET_DATE_REACHED") {
        actionLine = riverwatch.calc.extraTimeRequired && riverwatch.calc.extraTimeRequired !== "-"
            ? `Estimated extra time required: ${riverwatch.calc.extraTimeRequired}. Recalculate the course.`
            : "Additional time is required. Recalculate the course.";
    } else if (phase === "OPEN_SEA_REACHED") {
        actionLine = "Maintain discipline and preserve course.";
    } else if (riverwatch.calc.recommendedAction === "CONTINUE BUILDING") {
        actionLine = "Continue building with discipline.";
    } else if (riverwatch.calc.recommendedAction === "REBALANCE") {
        actionLine = "Adapt the boat before pressing forward.";
    } else if (riverwatch.calc.recommendedAction === "INCREASE EFFORT") {
        actionLine = "Additional effort may be required.";
    } else {
        actionLine = "Stay the Course.";
    }

    return [riverLine, boatLine, voyageLine, actionLine].join(" ");
}

function calculateVoyageHealth() {
    const config = riverwatch.manualConfig || {};
    const target = Number(config.openSeaTargetKRW ?? 0);
    const currentAssets = Number(riverwatch.calc.currentPosition ?? 0);
    const monthlyContribution = Number(config.monthlyContributionKRW ?? 0);
    const baseCAGRInput = Number(config.expectedCAGR ?? 0);
    const baseCAGR = baseCAGRInput > 1 ? baseCAGRInput / 100 : baseCAGRInput;
    const remainingYears = calculateRemainingYears(config.targetDate);

    const riverAdjustment = getCagrAdjustment(riverwatch.policy.voyageCagrAdjustment?.river, riverwatch.calc.riverHealth);
    const boatScoreAdjustment = getCagrAdjustment(riverwatch.policy.voyageCagrAdjustment?.boat, riverwatch.calc.boatHealth);
    const captainBoatAdjustment = Number(config.boatAdjustment ?? 0) / 100;
    const boatAdjustment = boatScoreAdjustment + captainBoatAdjustment;
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
    riverwatch.calc.eta = config.targetDate;
    riverwatch.calc.voyageHealth = health;
}

function calculateVoyagePhase() {
    const phase = getVoyagePhase();
    riverwatch.calc.voyagePhase = phase;
    riverwatch.calc.extraTimeRequired = calculateExtraTimeRequired();
    riverwatch.calc.requiredMonthlyContribution = calculateRequiredMonthlyContribution();
    riverwatch.calc.requiredCAGR = calculateRequiredCAGR();
}

function getVoyagePhase() {
    const config = riverwatch.manualConfig || {};
    const mode = String(config.voyagePhaseMode || "AUTO").trim().toUpperCase();

    const allowed = new Set([
        "BUILD_PHASE",
        "EARLY_VOYAGE",
        "MID_VOYAGE",
        "OPEN_SEA_APPROACH",
        "OPEN_SEA_REACHED",
        "TARGET_DATE_REACHED"
    ]);

    if (mode && mode !== "AUTO" && allowed.has(mode)) {
        return mode;
    }

    const today = startOfDay(new Date());
    const buildEnd = parseDate(config.portfolioBuildEndDate);
    const targetDate = parseDate(config.targetDate);
    const current = Number(riverwatch.calc.currentPosition ?? 0);
    const target = Number(config.openSeaTargetKRW ?? riverwatch.calc.openSeaTarget ?? 0);

    if (target > 0 && current >= target) {
        setVoyageProgressValues(1, calculateTimeProgress(today, buildEnd, targetDate));
        return "OPEN_SEA_REACHED";
    }

    if (targetDate && today >= targetDate && target > 0 && current < target) {
        setVoyageProgressValues(calculateAssetProgress(current, target), 1);
        return "TARGET_DATE_REACHED";
    }

    if (buildEnd && today < buildEnd) {
        setVoyageProgressValues(calculateAssetProgress(current, target), 0);
        return "BUILD_PHASE";
    }

    const assetProgress = calculateAssetProgress(current, target);
    const timeProgress = calculateTimeProgress(today, buildEnd, targetDate);
    const voyageProgress = clamp01(assetProgress * 0.7 + timeProgress * 0.3);

    riverwatch.calc.assetProgress = Math.round(assetProgress * 1000) / 10;
    riverwatch.calc.timeProgress = Math.round(timeProgress * 1000) / 10;
    riverwatch.calc.voyageProgress = Math.round(voyageProgress * 1000) / 10;

    if (voyageProgress < 0.33) return "EARLY_VOYAGE";
    if (voyageProgress < 0.66) return "MID_VOYAGE";
    return "OPEN_SEA_APPROACH";
}

function setVoyageProgressValues(assetProgress, timeProgress) {
    const voyageProgress = clamp01(Number(assetProgress || 0) * 0.7 + Number(timeProgress || 0) * 0.3);
    riverwatch.calc.assetProgress = Math.round(clamp01(assetProgress) * 1000) / 10;
    riverwatch.calc.timeProgress = Math.round(clamp01(timeProgress) * 1000) / 10;
    riverwatch.calc.voyageProgress = Math.round(voyageProgress * 1000) / 10;
}

function calculateAssetProgress(current, target) {
    if (!target || target <= 0) return 0;
    return clamp01(Number(current || 0) / target);
}

function calculateTimeProgress(today, buildEnd, targetDate) {
    if (!buildEnd || !targetDate || targetDate <= buildEnd) return 0;
    const elapsed = today - buildEnd;
    const total = targetDate - buildEnd;
    return clamp01(elapsed / total);
}

function calculateExtraTimeRequired() {
    const config = riverwatch.manualConfig || {};
    const target = Number(config.openSeaTargetKRW ?? riverwatch.calc.openSeaTarget ?? 0);
    const monthlyContribution = Number(config.monthlyContributionKRW ?? 0);
    const effectiveCAGR = Number(riverwatch.calc.effectiveCAGR ?? 0);
    let value = Number(riverwatch.calc.currentPosition ?? 0);

    if (!target || value >= target) return "0y 0m";
    if (monthlyContribution <= 0 && effectiveCAGR <= 0) return "Not estimable";

    const monthlyRate = effectiveCAGR > 0 ? Math.pow(1 + effectiveCAGR, 1 / 12) - 1 : 0;
    let months = 0;
    while (value < target && months < 600) {
        value = value * (1 + monthlyRate) + monthlyContribution;
        months += 1;
    }

    if (months >= 600) return "50y+";
    return formatMonths(months);
}

function calculateRequiredMonthlyContribution() {
    const config = riverwatch.manualConfig || {};
    const target = Number(config.openSeaTargetKRW ?? riverwatch.calc.openSeaTarget ?? 0);
    const current = Number(riverwatch.calc.currentPosition ?? 0);
    const effectiveCAGR = Number(riverwatch.calc.effectiveCAGR ?? 0);
    const years = Number(riverwatch.calc.remainingYears ?? 0);
    const months = Math.round(years * 12);

    if (!target || current >= target) return 0;
    if (months <= 0) return null;

    const monthlyRate = effectiveCAGR > 0 ? Math.pow(1 + effectiveCAGR, 1 / 12) - 1 : 0;
    const growthFactor = Math.pow(1 + monthlyRate, months);
    const futureCurrent = current * growthFactor;
    const gap = target - futureCurrent;
    if (gap <= 0) return 0;

    const annuityFactor = monthlyRate > 0
        ? ((growthFactor - 1) / monthlyRate)
        : months;

    if (annuityFactor <= 0) return null;
    return gap / annuityFactor;
}

function calculateRequiredCAGR() {
    const config = riverwatch.manualConfig || {};
    const target = Number(config.openSeaTargetKRW ?? riverwatch.calc.openSeaTarget ?? 0);
    const current = Number(riverwatch.calc.currentPosition ?? 0);
    const monthlyContribution = Number(config.monthlyContributionKRW ?? 0);
    const years = Number(riverwatch.calc.remainingYears ?? 0);
    const months = Math.round(years * 12);

    if (!target || current >= target) return 0;
    if (months <= 0) return null;

    let low = 0;
    let high = 0.50;

    for (let i = 0; i < 80; i += 1) {
        const mid = (low + high) / 2;
        const projected = projectFutureValue(current, monthlyContribution, mid, years);
        if (projected >= target) high = mid;
        else low = mid;
    }

    if (high >= 0.499) return null;
    return high;
}

function parseDate(text) {
    if (!text || typeof text !== "string") return null;
    const parts = text.split(".").map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) return null;
    const year = parts[0];
    const month = parts[1] || 12;
    const day = parts[2] || 1;
    return new Date(year, month - 1, day);
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clamp01(value) {
    const n = Number(value || 0);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function formatMonths(months) {
    const total = Math.max(0, Math.round(months));
    const y = Math.floor(total / 12);
    const m = total % 12;
    return `${y}y ${m}m`;
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
    return getStatusFromTable(score, "voyage");
}

function updateDecisionEngine() {
    const river = Number(riverwatch.calc.riverHealth ?? 0);
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number(riverwatch.calc.voyageHealth ?? 0);
    const phase = String(riverwatch.calc.voyagePhase || "").toUpperCase();

    let status = "STAY THE COURSE";
    let action = "NO ACTION";

    if (phase === "OPEN_SEA_REACHED") {
        status = "OPEN SEA REACHED";
        action = "PRESERVE COURSE";
    } else if (phase === "TARGET_DATE_REACHED") {
        status = "COURSE RESET";
        action = "RECALCULATE COURSE";
    } else if (phase === "BUILD_PHASE") {
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
    } else if (phase === "OPEN_SEA_APPROACH") {
        status = "OPEN SEA IN SIGHT";
        action = "HOLD COURSE";
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
    const phase = riverwatch.calc.voyagePhase || "-";

    if (status === "BUILD PHASE") {
        return `Phase: ${phase}. Portfolio construction phase in progress. Target allocation expected by ${formatBuildPhaseEnd()}. Recommended action: ${action}.`;
    }
    if (status === "OPEN SEA REACHED") {
        return `Phase: ${phase}. Open Sea target has been reached. Recommended action: ${action}.`;
    }
    if (status === "COURSE RESET") {
        return `Phase: ${phase}. Planned target date has passed before reaching Open Sea. Extra time required: ${riverwatch.calc.extraTimeRequired}. Recommended action: ${action}.`;
    }
    if (status === "OPEN SEA IN SIGHT") {
        return `Phase: ${phase}. Open Sea is approaching. Maintain discipline and hold the course.`;
    }
    if (status === "RECOVER COURSE") {
        return `Phase: ${phase}. Voyage Health is ${voyage}. The current plan is materially behind the Open Sea target. Recommended action: ${action}.`;
    }
    if (status === "ADAPT THE BOAT") {
        return `Phase: ${phase}. Boat Health is ${boat}. The boat requires adaptation before pressing forward. Recommended action: ${action}.`;
    }
    if (status === "KEEP WATCH") {
        return `Phase: ${phase}. River ${river}, Boat ${boat}, Voyage ${voyage}. Conditions require observation before adaptation. Recommended action: ${action}.`;
    }
    return `Phase: ${phase}. River ${river}, Boat ${boat}, Voyage ${voyage}. The system remains within course. Continue the voyage.`;
}

function isInBuildPhase() {
    const endText = (riverwatch.manualConfig || {}).portfolioBuildEndDate;
    if (!endText || typeof endText !== "string") return false;
    const parts = endText.split(".").map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return false;
    const end = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return todayStart <= end;
}

function formatBuildPhaseEnd() {
    const endText = (riverwatch.manualConfig || {}).portfolioBuildEndDate || "2026.07.31";
    const parts = endText.split(".");
    if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
    return endText;
}

function getRecoveryDisplay() {
    const phase = String(riverwatch.calc.voyagePhase || "").toUpperCase();

    if (phase === "BUILD_PHASE") {
        return {
            mode: "BUILD LOCK",
            eta: `After ${formatBuildPhaseEnd()}`
        };
    }
    if (phase === "OPEN_SEA_REACHED") {
        return { mode: "COMPLETE", eta: "0y 0m" };
    }
    if (phase === "TARGET_DATE_REACHED") {
        return { mode: "COURSE RESET", eta: riverwatch.calc.extraTimeRequired || "-" };
    }
    return { mode: "TIME EXTENSION", eta: riverwatch.calc.extraTimeRequired || "-" };
}


function getSectionOpen(key, defaultOpen = false) {
    const saved = localStorage.getItem(key);
    return saved === null ? defaultOpen : saved === "open";
}

function setSectionOpen(key, isOpen) {
    localStorage.setItem(key, isOpen ? "open" : "closed");
}

function setupBridgeSections() {
    setHealthMatrixOpen(getSectionOpen("cab011_health_matrix", false), false);
    setTrimDeckOpen(getSectionOpen("cab011_trim_deck", false), false);
    syncHealthMatrixSummary();
}

function toggleHealthMatrix() {
    const detail = document.getElementById("healthMatrixDetail");
    const nextOpen = detail ? detail.hidden : true;
    setHealthMatrixOpen(nextOpen, true);
}

function setHealthMatrixOpen(isOpen, persist = true) {
    const card = document.getElementById("healthMatrixCard");
    const detail = document.getElementById("healthMatrixDetail");
    const toggle = document.getElementById("healthMatrixToggle");
    if (card) card.classList.toggle("is-open", isOpen);
    if (detail) detail.hidden = !isOpen;
    if (toggle) {
        toggle.setAttribute("aria-expanded", String(isOpen));
        const title = toggle.querySelector(".section-toggle-title");
        const hint = toggle.querySelector(".section-toggle-hint");
        if (title) title.textContent = `${isOpen ? "▴" : "▾"} Health Matrix`;
        if (hint) hint.textContent = isOpen ? "Collapse" : "Tap to inspect";
    }
    if (persist) setSectionOpen("cab011_health_matrix", isOpen);
}

function syncHealthMatrixSummary() {
    const voyage = document.getElementById("voyageHealth")?.textContent || "--";
    const river = document.getElementById("riverHealth")?.textContent || "--";
    const boat = document.getElementById("boatHealth")?.textContent || "--";
    const voyageStatus = document.getElementById("voyageStatus")?.textContent || "--";
    const riverStatus = document.getElementById("riverStatus")?.textContent || "--";
    const boatStatus = document.getElementById("boatStatus")?.textContent || "--";

    setText("summaryVoyageHealth", voyage);
    setText("summaryRiverHealth", river);
    setText("summaryBoatHealth", boat);
    setText("summaryVoyageStatus", stripScoreSuffix(voyageStatus));
    setText("summaryRiverStatus", stripScoreSuffix(riverStatus));
    setText("summaryBoatStatus", stripScoreSuffix(boatStatus));
}

function stripScoreSuffix(value) {
    return String(value || "--").replace(/\s*\([^)]*\)\s*$/, "");
}

function toggleTrimDeck() {
    const detail = document.getElementById("trimDeckDetail");
    const nextOpen = detail ? detail.hidden : true;
    setTrimDeckOpen(nextOpen, true);
}

function setTrimDeckOpen(isOpen, persist = true) {
    const deck = document.getElementById("trimDeckList");
    const detail = document.getElementById("trimDeckDetail");
    const toggle = document.getElementById("trimDeckToggle");
    if (deck) deck.classList.toggle("is-open", isOpen);
    if (detail) detail.hidden = !isOpen;
    if (toggle) {
        toggle.setAttribute("aria-expanded", String(isOpen));
        const title = toggle.querySelector(".section-toggle-title");
        const hint = toggle.querySelector(".section-toggle-hint");
        if (title) title.textContent = `${isOpen ? "▴" : "▾"} Trim Deck`;
        if (hint) hint.textContent = isOpen ? "Collapse" : "Tap to inspect";
    }
    if (persist) setSectionOpen("cab011_trim_deck", isOpen);
}

function renderDashboard() {
    renderTopbar();
    renderMission();
    renderVoyageHealth();
    renderRiverHealth();
    renderBoatHealth();
    renderCaptainBridge();
    renderBoatyard();
    renderOpenSeaLogbook();
    setupBridgeSections();
    updateHealthMatrixSummary();
    initHealthMatrixState();
}

function renderTopbar() {
    setText("lastSync", riverwatch.auto.lastSync);

    const source = riverwatch.auto.dataSource || "FALLBACK";
    const sourceEl = document.getElementById("dataSource");

    if (sourceEl) {
        sourceEl.innerText = source;
        sourceEl.className = source.toLowerCase();
    }

    const detailEl = document.getElementById("syncDetail");
    if (detailEl) {
        detailEl.innerText = formatSyncDetail();
    }
}

function formatSyncDetail() {
    const status = riverwatch.auto.syncStatus || {};
    const labels = [
        ["MarketData", "MKT"],
        ["Portfolio", "PORT"],
        ["ManualConfig", "CFG"]
    ];

    return labels.map(([key, label]) => {
        if (status[key] === true) return `${label} OK`;
        if (status[key] === false) return `${label} FAIL`;
        return `${label} --`;
    }).join(" · ");
}

function renderMission() {
    setText("mission", riverwatch.const.mission);
    setText("status", riverwatch.calc.status);
    setText("recommendedAction", riverwatch.calc.recommendedAction);
    setText("daysSinceAction", riverwatch.calc.daysSinceAction);
    setText("lastRebalance", (riverwatch.manualConfig || {}).lastActionDate || riverwatch.calc.lastRebalance || "--");
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
    const voyageGap = Math.max(0, Number(riverwatch.calc.openSeaTarget ?? 0) - Number(riverwatch.calc.adjustedArrival ?? 0));
    const recovery = getRecoveryDisplay();

    setText("voyageHealth", riverwatch.calc.voyageHealth);
    setText("voyageStatus", getVoyageStatus(riverwatch.calc.voyageHealth));
    setText("currentPosition", formatKRWM(riverwatch.calc.currentPosition));
    setText("remainingTime", riverwatch.calc.remainingTime);
    setText("effectiveCAGR", formatPercentValue(riverwatch.calc.effectiveCAGR * 100));
    setText("adjustedArrival", formatKRWM(riverwatch.calc.adjustedArrival));
    setText("openSeaTarget", formatKRWM(riverwatch.calc.openSeaTarget));
    setText("voyageGap", formatKRWM(voyageGap));
    setText("recoveryMode", recovery.mode);
    setText("etaExtension", recovery.eta);
}

function renderRiverHealth() {
    setText("riverHealth", riverwatch.calc.riverHealth);
    setText("riverStatus", getRiverStatus(riverwatch.calc.riverHealth));

    const list = document.getElementById("riverMetricList");
    if (!list) return;

    list.innerHTML = "";

    const scores = riverwatch.calc.riverMetricScores || {};
    const config = riverwatch.manualConfig || {};
    const metrics = [
        ["USDKRW", `${formatInteger(riverwatch.auto.usdkrw)} (${scoreText(scores.usdkrw)})`],
        ["VIX", `${formatInteger(riverwatch.auto.vix)} (${scoreText(scores.vix)})`],
        ["Brent", `${formatNumber(riverwatch.calc.brentPrice)} (${scoreText(scores.oil)})`],
        ["AI CAPEX", `${String(config.aiCapexTrend || "-").toUpperCase()} (${scoreText(scores.aiCapex)})`],
        ["NVDA DC Rev", `${config.nvdaDcRevenueGrowth}% (${scoreText(scores.nvdaDcRevenue)})`],
        ["M2", `${String(config.m2Trend || "-").toUpperCase()} (${scoreText(scores.m2)})`],
        ["Growth Environment", `${getEnvironmentLabel(riverwatch.calc.growthFavorability)} (${riverwatch.calc.growthFavorability})`],
        ["River Bias", getRiverBiasLabel(riverwatch.calc.growthFavorability, riverwatch.calc.defensiveFavorability)]
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
    setText("voyagePhaseInBoat", riverwatch.calc.voyagePhase || "-");
    setText("costBasis", formatKRWM(riverwatch.calc.costBasis));
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

function renderCaptainBridge() {
    setHTML("bridgeCaptainNote", formatBridgeNote(riverwatch.calc.captainNote || "-"));
    setText("bridgeOrder", riverwatch.calc.recommendedAction || "-");
    setHTML("bridgeOrderRationale", formatBridgeNote(buildOrderRationale()));
}

function formatBridgeNote(text) {
    return String(text || "-")
        .split(/\.\s+/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.endsWith(".") ? line : line + ".")
        .map(line => `<span class="bridge-bullet">${line}</span>`)
        .join("");
}

function formatPhaseLabel(value) {
    return String(value || "-").replace(/_/g, " ");
}

function buildOrderRationale() {
    const phase = String(riverwatch.calc.voyagePhase || "").toUpperCase();
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number(riverwatch.calc.voyageHealth ?? 0);

    if (phase === "BUILD_PHASE") {
        return "Boat Health remains below threshold. Prioritize alignment over optimization.";
    }
    if (phase === "EARLY_VOYAGE") {
        return "Current course remains viable. No immediate adjustment required.";
    }
    if (phase === "MID_VOYAGE") {
        return "Progress toward Open Sea continues. Maintain current heading.";
    }
    if (phase === "OPEN_SEA_APPROACH") {
        return "Open Sea is now within reach. Preserve current course.";
    }
    if (phase === "OPEN_SEA_REACHED") {
        return "Open Sea objective achieved. Maintain current allocation.";
    }
    if (phase === "TARGET_DATE_REACHED") {
        return "Planned voyage ended before reaching Open Sea. Additional time is required.";
    }
    if (boat < 70) return "Boat Health remains below threshold. Prioritize alignment over optimization.";
    if (voyage < 70) return "Open Sea target remains beyond current projection. Continue disciplined accumulation.";
    return "Current course remains viable. No immediate adjustment required.";
}

function renderAction() {
    // Deprecated in CAB-005. Kept for compatibility with older HTML builds.
    setText("actionValue", riverwatch.calc.recommendedAction);
    setText("actionReason", riverwatch.calc.actionReason);
    setText("captainNote", riverwatch.calc.captainNote);
}

function renderLogbook() {
    // Deprecated in CAB-005. Latest Snapshot now lives inside Captain's Bridge.
    const list = document.getElementById("logbookList");
    if (!list) return;

    list.innerHTML = "";
    (riverwatch.calc.logbook || []).forEach(entry => {
        const div = document.createElement("div");
        div.className = "log-entry";
        div.innerHTML = `
            <div class="log-entry-top">
                <span class="log-entry-date">${entry.date}</span>
                <span class="log-entry-status">${entry.status}</span>
            </div>
            <div class="log-entry-body">
                Phase : ${entry.phase}<br>
                River ${entry.river} · Boat ${entry.boat} · Voyage ${entry.voyage}<br>
                Action : ${entry.action}<br>
                ${entry.note}
            </div>
        `;
        list.appendChild(div);
    });
}

function buildLatestSnapshot() {
    return [{
        date: nowDateString(),
        phase: riverwatch.calc.voyagePhase || "-",
        river: riverwatch.calc.riverHealth,
        boat: riverwatch.calc.boatHealth,
        voyage: riverwatch.calc.voyageHealth,
        action: riverwatch.calc.recommendedAction,
        status: riverwatch.calc.status,
        note: buildOrderRationale()
    }];
}

function nowDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
}

function calculateDaysSinceAction() {
    const dateText = (riverwatch.manualConfig || {}).lastActionDate || riverwatch.calc.lastRebalance;
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
    if (value >= 65) return "FAVORABLE";
    if (value >= 50) return "SLIGHTLY FAVORABLE";
    if (value >= 35) return "NEUTRAL";
    if (value >= 35) return "SLIGHTLY UNFAVORABLE";
    if (value >= 20) return "UNFAVORABLE";
    return "HIGHLY UNFAVORABLE";
}


function getRiverBiasLabel(growth, defensive) {
    const g = Number(growth ?? 50);
    const d = Number(defensive ?? 50);
    const diff = g - d;

    if (diff >= 25) return "STRONG GROWTH BIAS";
    if (diff >= 15) return "GROWTH BIAS";
    if (diff >= 5) return "SLIGHT GROWTH BIAS";
    if (diff <= -25) return "STRONG DEFENSIVE BIAS";
    if (diff <= -15) return "DEFENSIVE BIAS";
    if (diff <= -5) return "SLIGHT DEFENSIVE BIAS";
    return "BALANCED";
}

function getAlignmentLabel(score) {
    const value = Number(score ?? 0);
    if (value >= 90) return "DOCTRINE FIT";
    if (value >= 75) return "MOSTLY BUILT";
    if (value >= 60) return "BUILDING";
    if (value >= 45) return "EARLY BUILD";
    return "NOT ALIGNED";
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



function getTrimBadgeLabel(label) {
    const text = String(label || "").trim().toUpperCase();
    if (text === "SATISFIED") return "SAT ✓";
    if (text === "BUILDING") return "BUILD ▲";
    if (text === "DILUTING") return "DILUTE ▼";
    if (text === "WITHIN CAP") return "CAP OK ✓";
    return text || "-";
}

function formatTrimTicker(ticker) {
    const text = String(ticker || "").toUpperCase();
    if (text === "INDIVIDUAL") return "INDIVIDUAL";
    return formatTicker(text);
}

function renderBoatyard() {
    setText("boatyardArchetype", riverwatch.calc.boatArchetype || "-");
    setText("boatyardDiscipline", `${getDisciplineLabel(riverwatch.calc.captainDiscipline)} (${riverwatch.calc.captainDiscipline})`);
    setText("boatyardPhase", riverwatch.calc.voyagePhase || "-");
    setText("boatyardCostBasis", formatKRWM(riverwatch.calc.costBasis));
    setText("boatyardReturn", formatSigned(riverwatch.calc.boatReturn) + "%");

    const deck = document.getElementById("trimDeckList");
    if (deck) {
        const holdings = riverwatch.calc.allocationHoldings || [];
        deck.innerHTML = `
            <div class="trim-deck-detail trim-deck-detail-only" id="trimDeckDetail"></div>
        `;

        const summary = document.getElementById("trimSummaryList");
        const detail = document.getElementById("trimDeckDetail");

        holdings.forEach(item => {
            const rule = getDoctrineRule(item);
            const current = Number(item.current ?? 0);
            const limit = Number(rule.limit ?? 0);
            const delta = current - limit;
            const badgeLabel = getTrimBadgeLabel(rule.label);
            const tickerLabel = formatTrimTicker(item.ticker);

            const markerPct = 70;
            const blockPct = 6;
            const blockCountRaw = delta === 0 ? 0 : (delta > 0 ? Math.ceil(delta / 5) : Math.floor(delta / 5));
            const blockCount = Math.max(-5, Math.min(5, blockCountRaw));
            const currentPct = Math.max(8, Math.min(96, markerPct + blockCount * blockPct));
            const showDeviation = false;
            const gapStart = Math.min(currentPct, markerPct);
            const gapWidth = Math.abs(markerPct - currentPct);
            const isExcess = delta > 0;

            if (summary) {
                const row = document.createElement("div");
                row.className = "trim-summary-row trim-summary-row-diet";
                row.innerHTML = `
                    <div class="trim-summary-topline">
                        <span class="trim-summary-ticker" title="${tickerLabel}">${tickerLabel}</span>
                        <span class="badge ${rule.className}">${badgeLabel}</span>
                    </div>
                    <div class="trim-summary-values" aria-label="Current Target Gap">
                        <span class="trim-summary-current">${current.toFixed(1)}%</span>
                        <span class="trim-summary-target">${limit.toFixed(1)}%</span>
                        <span class="trim-summary-delta">${formatSigned(delta)}%</span>
                    </div>
                `;
                summary.appendChild(row);
            }

            if (detail) {
                const row = document.createElement("div");
                row.className = "trim-card trim-detail-card-diet";
                row.innerHTML = `
                    <div class="trim-head trim-head-static trim-head-diet">
                        <b class="trim-ticker" title="${tickerLabel}">${tickerLabel}</b>
                        <span class="badge ${rule.className}">${badgeLabel}</span>
                    </div>
                    <div class="trim-card-body">
                        <div class="trim-bar-wrap">
                            <div class="trim-bar">
                                <div class="trim-fill" style="width:${currentPct}%"></div>
                                ${showDeviation ? `<div class="${isExcess ? "trim-excess-blocks" : "trim-gap-blocks"}" style="left:${gapStart}%; width:${gapWidth}%"></div>` : ""}
                                <div class="trim-target" style="left:${markerPct}%"></div>
                            </div>
                        </div>
                        <div class="trim-stats trim-stats-diet" aria-label="Current Target Gap">
                            <div><span>Current</span><b>${current.toFixed(1)}%</b></div>
                            <div><span>Target</span><b>${limit.toFixed(1)}%</b></div>
                            <div><span>Gap</span><b>${formatSigned(delta)}%</b></div>
                        </div>
                    </div>
                `;
                detail.appendChild(row);
            }
        });

        // CAB-014: Trim Deck accordion and summary removed. Details are always visible.
    }
}
// Trim Summary removed in CAB-009.4.
function normalizeLogbookRows(rows) {
    return (rows || []).map(row => {
        const principal = Number(row.principalKRW || 0);
        const market = Number(row.marketValueKRW || 0);
        const target = Number(row.targetValueKRW || 0);
        return {
            ...row,
            eventType: String(row.eventType || row.marker || "LOG").toUpperCase(),
            title: row.title || row.note || "Log Entry",
            memo: row.memo || row.note || "",
            milestone: String(row.milestone ?? "TRUE").toUpperCase() === "TRUE",
            principalKRW: principal,
            marketValueKRW: market,
            targetValueKRW: target,
            returnPct: principal > 0 ? ((market / principal) - 1) * 100 : Number(row.returnPct || 0)
        };
    }).filter(row => row.date);
}

function renderOpenSeaLogbook() {
    const rows = (riverwatch.logbook || riverwatch.openSeaLogbook || []).slice();

    renderLogbookKpis(rows);
    renderLogbookChart(rows);
    renderLogbookTimeline(rows);
}

function renderLogbookKpis(rows) {
    const el = document.getElementById("logbookKpis");
    if (!el) return;

    const latest = rows[rows.length - 1] || {};
    const target = Number((riverwatch.manualConfig || {}).openSeaTargetKRW || riverwatch.calc.openSeaTarget || 0);
    const value = Number(latest.marketValueKRW || riverwatch.calc.currentPosition || 0);
    const progress = target > 0 ? (value / target) * 100 : 0;

    el.innerHTML = `
        <div><span>Latest Value</span><b>${formatKRWM(value)}</b></div>
        <div><span>Open Sea Target</span><b>${formatKRWM(target)}</b></div>
        <div><span>Progress</span><b>${progress.toFixed(1)}%</b></div>
    `;
}

function renderLogbookChart(rows) {
    const el = document.getElementById("logbookChart");
    if (!el) return;

    if (!rows.length) {
        el.innerHTML = `<div class="empty-state">No logbook entries yet.</div>`;
        return;
    }

    const enrichedRows = normalizeLogbookRows(rows).map(row => ({
        ...row,
        targetValueKRW: Number(row.targetValueKRW || 0) || calculateLogbookTargetValue(row.date, rows)
    })).sort((a, b) => (parseDateSafe(a.date) || 0) - (parseDateSafe(b.date) || 0));

    const firstDate = parseDateSafe(enrichedRows[0]?.date);
    const lastDate = parseDateSafe(enrichedRows[enrichedRows.length - 1]?.date);
    // Portfolio Journey should display the actual recorded voyage range,
    // not the long-term Open Sea target date. Long-term target remains in summary cards.
    const endDate = lastDate;
    const startDate = firstDate || lastDate || new Date();
    const xEnd = endDate && endDate > startDate ? endDate : lastDate;
    const maxValue = Math.max(...enrichedRows.map(row => Math.max(
        Number(row.principalKRW || 0),
        Number(row.marketValueKRW || 0),
        Number(row.targetValueKRW || 0)
    )), 1);

    const chartWidth = Math.max(300, el.clientWidth || 720);
    const chartHeight = 250;
    const isMobileJourney = chartWidth <= 520;
    const pad = isMobileJourney
        ? { left: 28, right: 16, top: 26, bottom: 42 }
        : { left: 72, right: 34, top: 28, bottom: 44 };
    const plotW = chartWidth - pad.left - pad.right;
    const plotH = chartHeight - pad.top - pad.bottom;

    const xForDate = dateText => {
        const d = parseDateSafe(dateText);
        if (!d || !xEnd || xEnd <= startDate) return pad.left;
        const ratio = Math.max(0, Math.min(1, (d - startDate) / (xEnd - startDate)));
        return pad.left + ratio * plotW;
    };
    const yForValue = value => pad.top + (1 - (Number(value || 0) / maxValue)) * plotH;

    const linePath = (key) => enrichedRows.map((row, index) => {
        const x = xForDate(row.date);
        const y = yForValue(row[key]);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    const points = (key, className) => enrichedRows.map(row => `
        <circle class="journey-point ${className}" cx="${xForDate(row.date).toFixed(1)}" cy="${yForValue(row[key]).toFixed(1)}" r="3.5">
            <title>${row.date} · ${formatKRWM(Number(row[key] || 0))}</title>
        </circle>
    `).join("");

    const yearTicks = buildYearTicks(startDate, xEnd, xForDate);

    el.innerHTML = `
        <div class="journey-legend">
            <span><i class="legend-line principal"></i>Principal</span>
            <span><i class="legend-line market"></i>Market Value</span>
            <span><i class="legend-line course"></i>Planned Course</span>
        </div>
        <div class="journey-scroll-x">
            <svg class="journey-svg" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Portfolio journey line chart">
                <line class="journey-axis" x1="${pad.left}" y1="${pad.top + plotH}" x2="${chartWidth - pad.right}" y2="${pad.top + plotH}"></line>
                <line class="journey-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}"></line>
                ${yearTicks.map(t => `<g class="journey-tick"><line x1="${t.x}" y1="${pad.top}" x2="${t.x}" y2="${pad.top + plotH}"></line><text x="${t.x}" y="${chartHeight - 18}" text-anchor="middle">${t.label}</text></g>`).join("")}
                <path class="journey-line principal" d="${linePath("principalKRW")}"></path>
                <path class="journey-line market" d="${linePath("marketValueKRW")}"></path>
                <path class="journey-line course" d="${linePath("targetValueKRW")}"></path>
                ${points("principalKRW", "principal")}
                ${points("marketValueKRW", "market")}
                ${points("targetValueKRW", "course")}
            </svg>
        </div>
    `;
}

function buildYearTicks(startDate, endDate, xForDate) {
    if (!startDate || !endDate || endDate <= startDate) return [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const ticks = [];
    for (let year = startYear; year <= endYear; year += 1) {
        if (year === startYear || year === endYear || year % 2 === 0) {
            ticks.push({ label: String(year), x: xForDate(`${year}-01-01`).toFixed(1) });
        }
    }
    return ticks;
}

function calculateLogbookTargetValue(dateText, rows) {
    const target = Number((riverwatch.manualConfig || {}).openSeaTargetKRW || riverwatch.calc.openSeaTarget || 0);
    if (!target) return 0;

    const firstRow = (rows || []).find(row => row && row.date);
    const startValue = Number(firstRow?.principalKRW || firstRow?.marketValueKRW || 0);
    const startDate = parseDateSafe(firstRow?.date);
    const currentDate = parseDateSafe(dateText);
    const endDate = parseDateSafe((riverwatch.manualConfig || {}).targetDate);

    if (!startDate || !currentDate || !endDate || endDate <= startDate) return target;

    const progress = Math.max(0, Math.min(1, (currentDate - startDate) / (endDate - startDate)));
    return startValue + (target - startValue) * progress;
}

function parseDateSafe(value) {
    if (!value) return null;
    const normalized = String(value).trim().replace(/\./g, "-");
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
}

function renderLogbookTimeline(rows) {
    const el = document.getElementById("openSeaTimeline");
    if (!el) return;

    const timelineRows = normalizeLogbookRows(rows)
        .filter(row => row.milestone)
        .map(row => ({
            ...row,
            targetValueKRW: Number(row.targetValueKRW || 0) || calculateLogbookTargetValue(row.date, rows)
        }))
        .sort((a, b) => (parseDateSafe(b.date) || 0) - (parseDateSafe(a.date) || 0));

    if (!timelineRows.length) {
        el.innerHTML = `<div class="empty-state">No timeline entries yet.</div>`;
        return;
    }

    el.innerHTML = timelineRows.map(row => {
        const ahead = Number(row.marketValueKRW || 0) - Number(row.targetValueKRW || 0);
        return `
            <div class="timeline-entry">
                <div class="timeline-dot"></div>
                <div>
                    <div class="timeline-meta">${row.eventType || "LOG"}</div>
                    <div class="timeline-date">${row.date || "-"}</div>
                    <div class="timeline-title">${row.title || "Log Entry"}</div>
                    <div class="timeline-values">
                        <span>Principal <b>${formatKRWM(Number(row.principalKRW || 0))}</b></span>
                        <span>Market Value <b>${formatKRWM(Number(row.marketValueKRW || 0))}</b></span>
                        <span>Planned Course <b>${formatKRWM(Number(row.targetValueKRW || 0))}</b></span>
                    </div>
                    <div class="timeline-return">${ahead >= 0 ? "Ahead of Plan" : "Behind Plan"} ${formatSigned(Math.round(ahead / 1000000))}M</div>
                    <div class="timeline-note">${row.memo || "-"}</div>
                </div>
            </div>
        `;
    }).join("");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}


/* ==========================================================================
   CAB-018 Health Status Threshold Tables / RC2g
   - Centralized health status labels and score thresholds.
   - Edit these tables to tune score bands or wording.
   ========================================================================== */

const HEALTH_STATUS_TABLES = {
    voyage: [
        { min: 90, label: "ON COURSE" },
        { min: 75, label: "STABLE COURSE" },
        { min: 60, label: "DRIFTING" },
        { min: 40, label: "COURSE CORRECTION" },
        { min: 0,  label: "LOST COURSE" }
    ],
    river: [
        { min: 90, label: "STRONG CURRENT" },
        { min: 75, label: "FAVORABLE CURRENT" },
        { min: 60, label: "MIXED CURRENT" },
        { min: 40, label: "HEAD CURRENT" },
        { min: 0,  label: "STORM WARNING" }
    ],
    boat: [
        { min: 90, label: "OPTIMALLY TRIMMED" },
        { min: 75, label: "PROPERLY TRIMMED" },
        { min: 60, label: "NEEDS ADJUSTMENT" },
        { min: 40, label: "POORLY TRIMMED" },
        { min: 0,  label: "REBALANCING REQUIRED" }
    ]
};

function getStatusFromTable(score, tableKey) {
    const value = Number(score ?? 0);
    const table = HEALTH_STATUS_TABLES[tableKey] || [];
    const matched = table.find(item => value >= item.min);
    return matched ? matched.label : "-";
}

function getHealthStatus(score) {
    return getStatusFromTable(score, "voyage");
}

function getRiverStatus(score) {
    return getStatusFromTable(score, "river");
}

function getBoatStatus(score) {
    return getStatusFromTable(score, "boat");
}

function getDoctrineRule(item) {
    const ticker = String(item?.ticker || "").toUpperCase();
    const current = Number(item?.current ?? 0);
    const limit = Number(riverwatch.manual.boatConfiguration[ticker] ?? item?.target ?? 0);

    if (ticker === "INDIVIDUAL") {
        const satisfied = current <= limit;
        return {
            limit,
            limitLabel: "Cap",
            deltaLabel: "Excess",
            label: satisfied ? "WITHIN CAP" : "DILUTING",
            className: satisfied ? "on-target" : "diluting"
        };
    }

    const satisfied = current >= limit;
    return {
        limit,
        limitLabel: "Minimum",
        deltaLabel: satisfied ? "Excess" : "Gap",
        label: satisfied ? "SATISFIED" : "BUILDING",
        className: satisfied ? "on-target" : "building"
    };
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

function formatKRWM(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return formatInteger(value / 1000000) + "M";
}

function formatKRWB(value) {
    // Backward-compatible alias. RiverWatch CAB-005.2.4 uses M units for visibility.
    return formatKRWM(value);
}

function formatNumber(value, maximumFractionDigits = 2) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("ko-KR", {
        minimumFractionDigits: 0,
        maximumFractionDigits
    });
}

function formatInteger(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return Math.round(value).toLocaleString("ko-KR");
}

function formatPercentValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return formatNumber(value, 1) + "%";
}

function formatSigned(value, digits = 1) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return (value > 0 ? "+" : "") + formatNumber(value, digits);
}

function scoreText(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return Math.round(value);
}

function formatKRWMonthly(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    const n = Number(value);
    if (n <= 0) return "0 KRW";
    if (n >= 1000000) return formatNumber(n / 1000000, 1) + "M KRW";
    return formatInteger(n) + " KRW";
}

function formatCAGRValue(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    const n = Number(value);
    if (n <= 0) return "0.0%";
    return (n * 100).toFixed(1) + "%";
}

function formatTicker(ticker) {
    return ticker === "INDIVIDUAL" ? "INDIVIDUAL STOCKS" : ticker;
}

function scrollToTop() {
    window.scrollTo(0, 0);
}

window.addEventListener("DOMContentLoaded", () => {
    // Intro first. Market data loads when user enters dashboard.
});

/* Sprint #008 Patch-1 : Health Matrix Toggle + Summary Binding */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function toggleHealthMatrix() {
    const detail = document.getElementById("healthMatrixDetail");
    const toggle = document.getElementById("healthMatrixToggle");
    const title = toggle?.querySelector(".section-toggle-title");

    if (!detail) return;

    const willOpen = detail.hidden === true;
    detail.hidden = !willOpen;

    if (toggle) toggle.setAttribute("aria-expanded", String(willOpen));
    if (title) title.textContent = willOpen ? "▴ Health Matrix" : "▾ Health Matrix";

    localStorage.setItem("riverwatch.healthMatrixOpen", String(willOpen));
}

function initHealthMatrixState() {
    const detail = document.getElementById("healthMatrixDetail");
    const toggle = document.getElementById("healthMatrixToggle");
    const title = toggle?.querySelector(".section-toggle-title");

    if (!detail) return;

    const saved = localStorage.getItem("riverwatch.healthMatrixOpen");
    const open = saved === "true";

    detail.hidden = !open;

    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (title) title.textContent = open ? "▴ Health Matrix" : "▾ Health Matrix";
}

function updateHealthMatrixSummary() {
    const c = riverwatch?.calc || {};

    setText("summaryVoyageHealth", Math.round(Number(c.voyageHealth ?? 0)));
    setText("summaryRiverHealth", Math.round(Number(c.riverHealth ?? 0)));
    setText("summaryBoatHealth", Math.round(Number(c.boatHealth ?? 0)));

    setText("summaryVoyageStatus", stripScoreSuffix(document.getElementById("voyageStatus")?.textContent || "--"));
    setText("summaryRiverStatus", stripScoreSuffix(document.getElementById("riverStatus")?.textContent || "--"));
    setText("summaryBoatStatus", stripScoreSuffix(document.getElementById("boatStatus")?.textContent || "--"));
}