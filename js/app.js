/****************************************************************************************
 * RiverWatch Script v1.0-beta-cab007
 * - Loads Google Sheet v2.0 MarketData / Portfolio / ManualConfig before dashboard rendering
 * - Falls back safely to data.js dummy values if AUTO load fails
 * - Adds River Health Engine v1.1, Boat Health Engine v1.1, Voyage Health Engine v1.1
 ****************************************************************************************/

let riverwatchDashboardInitialized = false;
let riverwatchBootReady = false;

function setBootState(state, text) {
    const monitor = document.getElementById("bootMonitor");
    const retry = document.getElementById("bootRetryBtn");
    const failure = document.getElementById("bootFailureText");
    const enter = document.getElementById("enterBridgeBtn");
    const steps = {
        init: document.getElementById("bootStepInit"),
        core: document.getElementById("bootStepCore"),
        logbook: document.getElementById("bootStepLogbook"),
        ready: document.getElementById("bootStepReady")
    };
    const order = ["init", "core", "logbook", "ready"];
    let activeKey = "init";
    if (text === "SYNCING CORE DATA" || text === "CORE SYNC FAILED") activeKey = "core";
    else if (text === "SYNCING LOGBOOK" || text === "LOGBOOK SYNC FAILED") activeKey = "logbook";
    else if (text === "BRIDGE READY") activeKey = "ready";

    const activeIndex = order.indexOf(activeKey);
    order.forEach((key, i) => {
        const el = steps[key];
        if (!el) return;
        el.classList.remove("pending", "active", "done", "failed");
        if (state === "failed" && key === activeKey) el.classList.add("failed");
        else if (i < activeIndex || (state === "ready" && i <= activeIndex)) el.classList.add("done");
        else if (i === activeIndex) el.classList.add("active");
        else el.classList.add("pending");
        const mark = el.querySelector(".boot-mark");
        if (mark) mark.textContent = el.classList.contains("done") ? "✓" : (el.classList.contains("failed") ? "✕" : "●");
    });

    if (monitor) monitor.dataset.state = state;
    if (failure) failure.classList.toggle("hidden", state !== "failed");
    if (retry) {
        const failed = state === "failed";
        retry.disabled = !failed;
        retry.setAttribute("aria-disabled", String(!failed));
    }
    if (enter) enter.disabled = state !== "ready";
    const intro = document.getElementById("intro");
    if (intro) intro.classList.toggle("bridge-ready", state === "ready");
}

async function bootRiverWatch() {
    riverwatchBootReady = false;
    setBootState("syncing", "SYNCING CORE DATA");
    const coreOk = await initializeCoreData(false);
    if (!coreOk) {
        setBootState("failed", "CORE SYNC FAILED");
        return;
    }

    setBootState("syncing", "SYNCING LOGBOOK");
    const logbookOk = await initializeLogbookData();
    if (!logbookOk) {
        setBootState("failed", "LOGBOOK SYNC FAILED");
        return;
    }

    runCalculationEngines();
    riverwatchDashboardInitialized = true;
    riverwatchBootReady = true;
    setBootState("ready", "BRIDGE READY");
}

function retryBoot() {
    window.location.reload();
}

async function showDashboard() {
    if (!riverwatchBootReady) return;
    document.getElementById("intro").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    runCalculationEngines();
    renderDashboard();
    showAppPage("dashboardPage");
}

async function refreshDashboard() {
    const button = document.getElementById("refreshDashboardBtn");
    if (button) { button.disabled = true; button.classList.add("refreshing"); }
    const ok = await initializeCoreData(true);
    if (ok) {
        runCalculationEngines();
        renderDashboard();
    }
    showAppPage(document.querySelector(".nav-tab.active")?.dataset?.page || "dashboardPage");
    if (button) { button.disabled = false; button.classList.remove("refreshing"); }
}

function showIntro() {
    document.getElementById("dashboard").classList.add("hidden");
    const intro = document.getElementById("intro");
    intro.classList.remove("hidden", "intro-animate");
    void intro.offsetWidth;
    intro.classList.add("intro-animate");
}

async function navigateAppPage(pageId) {
    if (pageId === "dashboardPage" || pageId === "boatyardPage") {
        const ok = await initializeCoreData(true);
        if (ok) { runCalculationEngines(); renderDashboard(); }
    } else if (pageId === "logbookPage") {
        await initializeLogbookData();
    }
    showAppPage(pageId);
}

function showAppPage(pageId) {
    document.querySelectorAll(".app-page").forEach(page => page.classList.toggle("hidden", page.id !== pageId));
    document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.page === pageId));
    if (pageId === "boatyardPage") renderBoatyard();
    if (pageId === "logbookPage") renderOpenSeaLogbook();
}

async function initializeCoreData(preserveLkg = true) {
    const hub = riverwatch?.policy?.marketDataHub;
    if (!hub || hub.enabled !== true || typeof RiverWatchMarketEngine === "undefined" ||
        typeof RiverWatchMarketEngine.loadCoreData !== "function") return false;

    const snapshot = preserveLkg ? JSON.parse(JSON.stringify(riverwatch)) : null;
    try {
        const ok = await RiverWatchMarketEngine.loadCoreData();
        if (!ok && snapshot) {
            Object.keys(riverwatch).forEach(key => delete riverwatch[key]);
            Object.assign(riverwatch, snapshot);
        }
        return ok === true;
    } catch (error) {
        if (snapshot) {
            Object.keys(riverwatch).forEach(key => delete riverwatch[key]);
            Object.assign(riverwatch, snapshot);
        }
        console.warn("RiverWatch Core Data sync failed. LKG retained.", error);
        return false;
    }
}

async function initializeLogbookData() {
    try {
        if (typeof RiverWatchMarketEngine === "undefined" || typeof RiverWatchMarketEngine.loadOpenSeaLogbook !== "function") return false;
        return await RiverWatchMarketEngine.loadOpenSeaLogbook() === true;
    } catch (error) {
        console.warn("RiverWatch Logbook sync failed.", error);
        return false;
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
    const policy = riverwatch.policy || {};
    const weights = policy.riverMetricWeights || {};
    const scoring = policy.riverHealthScoring || {};
    const config = riverwatch.manualConfig || {};
    const calibration = riverwatch.riverCalibration || {};

    const brentPrice = toFiniteNumber(config.BrentPrice ?? config.brentPrice ?? riverwatch.auto.BrentPrice);
    const fedRate = toFiniteNumber(config.fedRate);
    const nvdaGrowth = toFiniteNumber(config.nvdaDcRevenueGrowth);

    const fedLevelScore = scoreCalibrationUpper(calibration.FED_RATE_LEVEL, fedRate);
    const fedDirectionScore = scoreCalibrationState(calibration.FED_DIRECTION, fedCalibrationState(config.fedRateState));
    const fedScore = Number.isFinite(fedLevelScore) && Number.isFinite(fedDirectionScore)
        ? (fedLevelScore * 0.60) + (fedDirectionScore * 0.40)
        : null;

    const aiFresh = isManualSensorFresh(config.aiCapexUpdated, policy.manualSensorStaleDays ?? 120);
    const nvdaFresh = isManualSensorFresh(config.nvdaDcRevenueUpdated, policy.manualSensorStaleDays ?? 120);

    const metricScores = {
        fedRate: fedScore,
        vix: scoreCalibrationUpper(calibration.VIX_LEVEL, toFiniteNumber(riverwatch.auto.vix)),
        oil: scoreCalibrationUpper(calibration.BRENT_LEVEL, brentPrice),
        usdkrw: scoreCalibrationUpper(calibration.USD_KRW, toFiniteNumber(riverwatch.auto.usdkrw)),
        aiCapex: aiFresh ? scoreFromState(scoring.aiCapexTrend, config.aiCapexTrend) : null,
        nvdaDcRevenue: nvdaFresh ? scoreCalibrationLower(calibration.NVDA_DC_REVENUE_GROWTH, nvdaGrowth) : null,
        m2: scoreFromState(scoring.m2Trend, config.m2Trend)
    };

    const validWeight = validScoreWeight(metricScores, weights);
    const minimumValidWeight = Number(policy.riverHealthMinimumValidWeight ?? 70);
    const riverHealthRaw = validWeight >= minimumValidWeight ? weightedAverage(metricScores, weights) : null;

    riverwatch.calc.riverMetricScores = metricScores;
    riverwatch.calc.riverMetricFreshness = { aiCapex: aiFresh, nvdaDcRevenue: nvdaFresh };
    riverwatch.calc.riverHealthValidWeight = validWeight;
    riverwatch.calc.fedRateLevelScore = fedLevelScore;
    riverwatch.calc.fedRateDirectionScore = fedDirectionScore;
    riverwatch.calc.brentPrice = brentPrice;
    riverwatch.calc.riverHealth = Number.isFinite(riverHealthRaw) ? Math.round(riverHealthRaw) : null;

    // Legacy interpretation-only outputs remain separate from River Health scoring.
    const favorability = calculateRiverFavorability(brentPrice);
    riverwatch.calc.growthFavorability = favorability.growth;
    riverwatch.calc.defensiveFavorability = favorability.defensive;

    riverwatch.calc.actionReason = buildActionReason();
}


function getEnabledPortfolioConfig() {
    const configRows = Array.isArray(riverwatch.portfolioConfiguration)
        ? riverwatch.portfolioConfiguration
        : [];

    return configRows
        .filter(item => item && item.isEnabled !== false)
        .map(item => ({
            configOrder: Number(item.configOrder ?? 999),
            configId: String(item.configId || "").trim().toUpperCase(),
            displayLabel: String(item.displayLabel || item.configId || "").trim(),
            targetWeight: Number(item.targetWeight ?? 0),
            controlType: String(item.controlType || "MIN").trim().toUpperCase(),
            assetRole: String(item.assetRole || "GROWTH").trim().toUpperCase(),
            assetClass: String(item.assetClass || item.configId || "").trim().toUpperCase()
        }))
        .filter(item => item.configId)
        .sort((a, b) => a.configOrder - b.configOrder);
}

function calculatePortfolioPosition() {
    const portfolio = Array.isArray(riverwatch.portfolio) ? riverwatch.portfolio : [];
    const portfolioConfig = getEnabledPortfolioConfig();
    const configById = portfolioConfig.reduce((acc, item) => {
        acc[item.configId] = item;
        return acc;
    }, {});

    const config = riverwatch.manualConfig || {};
    const usdkrw = Number(riverwatch.auto.usdkrw ?? 0);

    const assetGroups = {};
    let currentPosition = Number(config.cashKRW ?? 0);
    let costBasis = Number(config.cashKRW ?? 0);

    portfolio.forEach(item => {
        const holdingTicker = String(item.holdingTicker || item.ticker || "").trim().toUpperCase();
        const holdingGroup = String(item.holdingGroup || item.groupId || item.ticker || "").trim().toUpperCase();
        const quantity = Number(item.quantity ?? item.shares ?? 0);
        const avgPriceKRW = Number(item.avgPriceKRW ?? item.avgCostKRW ?? 0);
        const currentPriceUSD = getMarketPriceUSD(holdingTicker, 0);

        if (!holdingTicker || !holdingGroup) return;

        const currentValueKRW = quantity * currentPriceUSD * usdkrw;
        const costBasisKRW = quantity * avgPriceKRW;

        currentPosition += currentValueKRW;
        costBasis += costBasisKRW;

        const cfg = configById[holdingGroup] || {
            configId: holdingGroup,
            displayLabel: holdingGroup,
            targetWeight: 0,
            controlType: "MIN",
            assetRole: "GROWTH",
            assetClass: holdingGroup
        };

        if (!assetGroups[holdingGroup]) {
            assetGroups[holdingGroup] = {
                ticker: holdingGroup,              // backward-compatible group key
                configId: holdingGroup,
                label: cfg.displayLabel || holdingGroup,
                displayLabel: cfg.displayLabel || holdingGroup,
                valueKRW: 0,
                costBasisKRW: 0,
                quantity: 0,
                target: Number(cfg.targetWeight ?? 0),
                controlType: String(cfg.controlType || "MIN").toUpperCase(),
                assetRole: String(cfg.assetRole || "GROWTH").toUpperCase(),
                assetClass: String(cfg.assetClass || cfg.configId || holdingGroup).toUpperCase()
            };
        }

        assetGroups[holdingGroup].valueKRW += currentValueKRW;
        assetGroups[holdingGroup].costBasisKRW += costBasisKRW;
        assetGroups[holdingGroup].quantity += quantity;
    });

    const allocationHoldings = portfolioConfig.map(cfg => {
        const group = assetGroups[cfg.configId] || {
            ticker: cfg.configId,
            configId: cfg.configId,
            label: cfg.displayLabel,
            displayLabel: cfg.displayLabel,
            valueKRW: 0,
            costBasisKRW: 0,
            quantity: 0,
            target: Number(cfg.targetWeight ?? 0),
            controlType: String(cfg.controlType || "MIN").toUpperCase(),
            assetRole: String(cfg.assetRole || "GROWTH").toUpperCase(),
            assetClass: String(cfg.assetClass || cfg.configId || "").toUpperCase()
        };

        const current = currentPosition > 0 ? (group.valueKRW / currentPosition) * 100 : 0;
        return {
            ...group,
            current,
            target: Number(cfg.targetWeight ?? group.target ?? 0),
            controlType: String(cfg.controlType || group.controlType || "MIN").toUpperCase(),
            assetRole: String(cfg.assetRole || group.assetRole || "GROWTH").toUpperCase(),
            assetClass: String(cfg.assetClass || group.assetClass || cfg.configId || "").toUpperCase(),
            displayLabel: cfg.displayLabel || group.displayLabel || cfg.configId
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

    const trimBalance = calculateAllocationAlignment(holdings);
    const exposure = calculateBoatExposure(holdings);
    const riverFit = calculateRiverSuitability();
    const expectedCAGR = toFiniteNumber((riverwatch.manualConfig || {}).expectedCAGR);
    const requiredCAGR = toFiniteNumber((riverwatch.manualConfig || {}).requiredCAGR);
    const enginePowerRatio = Number.isFinite(expectedCAGR) && expectedCAGR >= 0
        && Number.isFinite(requiredCAGR) && requiredCAGR > 0
        ? (expectedCAGR / requiredCAGR) * 100
        : null;
    const enginePowerScore = scoreEnginePower(enginePowerRatio);
    riverwatch.calc.requiredCAGR = Number.isFinite(requiredCAGR) && requiredCAGR > 0 ? requiredCAGR : null;
    riverwatch.calc.enginePower = enginePowerRatio;
    const fuelSupply = calculateFuelSupply();

    // New Boat Health SSOT names. Legacy aliases are retained only so older UI/helpers do not break.
    riverwatch.calc.trimBalance = trimBalance;
    riverwatch.calc.riverFit = riverFit;
    riverwatch.calc.enginePowerScore = enginePowerScore;
    riverwatch.calc.fuelSupply = fuelSupply;
    riverwatch.calc.allocationAlignment = trimBalance;
    riverwatch.calc.riverSuitability = riverFit;
    riverwatch.calc.growthExposure = exposure.growth;
    riverwatch.calc.defensiveExposure = exposure.defensive;
    riverwatch.calc.boatArchetype = getBoatArchetype(exposure.growth);

    riverwatch.calc.boatHealth = Math.round(weightedAverage({
        trimBalance,
        riverFit,
        enginePower: enginePowerScore,
        fuelSupply
    }, riverwatch.policy.boatHealthWeights || {}));
}

function calculateAllocationAlignment(holdings) {
    if (!holdings.length) return 0;

    const scores = holdings.map(item => {
        const limit = Number(item.target ?? 0);
        const currentValue = Number(item.current ?? 0);
        const controlType = String(item.controlType || "MIN").toUpperCase();
        if (limit <= 0) return 100;

        if (controlType === "MAX") {
            return currentValue <= limit ? 100 : Math.round(Math.max(0, Math.min(100, (limit / currentValue) * 100)));
        }

        if (controlType === "TARGET" || controlType === "BAND") {
            const correctedGap = Math.abs(Math.trunc(currentValue - limit));
            return Math.round(Math.max(0, Math.min(100, 100 - correctedGap * 10)));
        }

        // Default MIN: core groups should be maintained at or above target weight.
        return currentValue >= limit ? 100 : Math.round(Math.max(0, Math.min(100, (currentValue / limit) * 100)));
    });

    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function calculateBoatExposure(holdings) {
    let growth = 0;
    let defensive = 0;

    holdings.forEach(item => {
        const value = Number(item.current ?? 0);
        const role = String(item.assetRole || "").toUpperCase();
        if (role === "GROWTH") growth += value;
        if (role === "DEFENSIVE") defensive += value;
    });

    return {
        growth: Math.round(growth * 10) / 10,
        defensive: Math.round(defensive * 10) / 10
    };
}

function calculateRiverSuitability() {
    const river = toFiniteNumber(riverwatch.calc.riverHealth);
    if (!Number.isFinite(river)) return null;

    // Koru design-range fit, not tactical market-timing fit.
    // TAILWIND / CALM / HEADWIND are within the normal design range.
    if (river >= 70) return 100;
    if (river >= 55) return 90;   // ROUGH: reduced design margin.
    return 60;                    // STORM: outside normal design range.
}

function calculateStructuralIntegrity(holdings) {
    const maxHolding = Math.max(...holdings.map(item => Number(item.current ?? 0)), 0);

    // CAB-021b: structural scoring now follows PortfolioConfig.assetClass,
    // not ticker-specific assumptions such as IAUM/BITQ.
    const reserveExposure = sumCurrentByAssetClass(holdings, ["GOLD", "RESERVE"]);
    const speculationExposure = sumCurrentByAssetClass(holdings, ["CRYPTO", "SPECULATIVE"]);

    const diversification = scoreDiversification(maxHolding);
    const reserve = scoreReserve(reserveExposure);
    const speculation = scoreSpeculation(speculationExposure);

    riverwatch.calc.diversificationScore = diversification;
    riverwatch.calc.reserveScore = reserve;
    riverwatch.calc.speculationScore = speculation;
    riverwatch.calc.reserveExposure = Math.round(reserveExposure * 10) / 10;
    riverwatch.calc.speculationExposure = Math.round(speculationExposure * 10) / 10;

    return Math.round(weightedAverage({
        diversification,
        reserve,
        speculation
    }, riverwatch.policy.structuralIntegrityWeights || {}));
}

function sumCurrentByAssetClass(holdings, classNames) {
    const allowed = new Set(classNames.map(name => String(name).toUpperCase()));

    return holdings.reduce((sum, item) => {
        const assetClass = String(item.assetClass || item.configId || item.ticker || "").toUpperCase();
        return allowed.has(assetClass) ? sum + Number(item.current ?? 0) : sum;
    }, 0);
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

function getLogbookDateKey(dateText) {
    const text = String(dateText || "").trim().replace(/\./g, "-").replace(/\//g, "-");
    const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return null;
    return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

function getLatestRefuelDate() {
    const rows = normalizeLogbookRows(riverwatch.logbook || riverwatch.openSeaLogbook || [])
        .map((row, index) => ({
            ...row,
            _index: index,
            _dateKey: getLogbookDateKey(row.date),
            _refuelType: String(row.refuelType || '').trim().toUpperCase()
        }))
        .filter(row => row._dateKey && (row._refuelType === 'REFUEL' || row._refuelType === 'EXTRA_REFUEL'))
        .sort((a, b) => a._dateKey.localeCompare(b._dateKey) || a._index - b._index);
    return rows.length ? rows[rows.length - 1]._dateKey : null;
}

function calculateFuelSupplySnapshot(referenceDate = new Date()) {
    const rows = normalizeLogbookRows(riverwatch.logbook || riverwatch.openSeaLogbook || [])
        .map((row, index) => ({ ...row, _index: index, _dateKey: getLogbookDateKey(row.date) }))
        .filter(row => row._dateKey && Number.isFinite(Number(row.principalKRW)))
        .sort((a, b) => a._dateKey.localeCompare(b._dateKey) || a._index - b._index);

    const cfg = (riverwatch.policy || {}).fuelSupply || {};
    const baselineDate = String(cfg.baselineDate || '2026-08-14');
    const firstEvaluationMonth = String(cfg.firstEvaluationMonth || '2026-09');

    // Fuel Supply is a closed-month metric: evaluate the previous calendar month only.
    const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    const planned = Math.max(0, Number((riverwatch.manualConfig || {}).monthlyContributionKRW ?? 0));

    if (monthKey < firstEvaluationMonth) {
        return {
            month: monthKey,
            baselineDate,
            status: 'PENDING',
            plannedRefuelKRW: planned,
            regularRefuelKRW: 0,
            extraRefuelKRW: 0,
            complianceRatio: null,
            score: null
        };
    }

    let regularRefuelKRW = 0;
    let extraRefuelKRW = 0;
    let previousPrincipal = null;

    rows.forEach(row => {
        const principal = Number(row.principalKRW);
        const delta = previousPrincipal === null ? 0 : principal - previousPrincipal;
        const refuelType = String(row.refuelType || '').trim().toUpperCase();

        if (row._dateKey >= baselineDate && row._dateKey.startsWith(monthKey) && delta > 0) {
            if (refuelType === 'REFUEL') regularRefuelKRW += delta;
            if (refuelType === 'EXTRA_REFUEL') extraRefuelKRW += delta;
        }
        previousPrincipal = principal;
    });

    const complianceRatio = planned > 0 ? regularRefuelKRW / planned : null;
    const score = scoreFuelSupply(complianceRatio);

    return {
        month: monthKey,
        baselineDate,
        status: Number.isFinite(score) ? 'FINAL' : 'PENDING',
        plannedRefuelKRW: planned,
        regularRefuelKRW,
        extraRefuelKRW,
        complianceRatio,
        score
    };
}

function calculateFuelSupply() {
    const fuel = calculateFuelSupplySnapshot();
    riverwatch.calc.fuelSupply = fuel.score;
    riverwatch.calc.fuelSupplyDetail = fuel;
    return fuel.score;
}

function calculateCaptainDiscipline() {
    // Legacy metric retained until STEP 2 Boat Health rewiring.
    return Number((riverwatch.manualConfig || {}).monthlyContributionKRW ?? 0) > 0 ? 100 : 60;
}

function getBoatArchetype(growthExposure) {
    const thresholds = riverwatch.policy.boatArchetypeThresholds || {};
    if (growthExposure >= (thresholds.aggressiveGrowth ?? 60)) return "Aggressive Growth Boat";
    if (growthExposure >= (thresholds.balancedGrowth ?? 45)) return "Balanced Growth Boat";
    if (growthExposure >= (thresholds.coreIndex ?? 35)) return "Core Index Boat";
    return "Defensive Boat";
}

function scoreEnginePower(ratio) {
    if (!Number.isFinite(Number(ratio))) return null;
    const value = Number(ratio);
    if (value >= 100) return 100;
    if (value >= 95) return 95;
    if (value >= 90) return 85;
    if (value >= 80) return 70;
    return 50;
}

function scoreFuelSupply(complianceRatio) {
    if (!Number.isFinite(Number(complianceRatio))) return null;
    const value = Number(complianceRatio);
    if (value >= 0.98) return 100;
    if (value >= 0.95) return 95;
    if (value >= 0.90) return 85;
    if (value >= 0.80) return 70;
    return 50;
}

function scoreCalibrationUpper(block, value) {
    if (!block || block.mode !== 'upper' || !Array.isArray(block.rows) || !Number.isFinite(value)) return null;
    const rows = block.rows
        .filter(row => Number.isFinite(row.threshold) && Number.isFinite(row.score))
        .sort((a, b) => a.threshold - b.threshold);
    const matched = rows.find(row => value <= row.threshold);
    return matched ? matched.score : (rows.length ? rows[rows.length - 1].score : null);
}

function scoreCalibrationLower(block, value) {
    if (!block || block.mode !== 'lower' || !Array.isArray(block.rows) || !Number.isFinite(value)) return null;
    const rows = block.rows
        .filter(row => Number.isFinite(row.threshold) && Number.isFinite(row.score))
        .sort((a, b) => b.threshold - a.threshold);
    const matched = rows.find(row => value >= row.threshold);
    return matched ? matched.score : (rows.length ? rows[rows.length - 1].score : null);
}

function scoreCalibrationState(block, state) {
    if (!block || block.mode !== 'state' || !Array.isArray(block.rows) || !state) return null;
    const key = String(state).trim().toUpperCase();
    const matched = block.rows.find(row => String(row.state || '').trim().toUpperCase() === key);
    return matched && Number.isFinite(matched.score) ? matched.score : null;
}

function fedCalibrationState(state) {
    const key = String(state || '').trim();
    const map = {
        cutting: 'CUT',
        cutExpected: 'CUT_EXPECTED',
        pause: 'PAUSE',
        hikingEnded: 'HIKE_ENDED',
        hiking: 'HIKE'
    };
    return map[key] || key.toUpperCase();
}

function parseConfigDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const normalized = raw.replace(/[.\/]/g, '-').replace(/\s+/g, '');
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function isManualSensorFresh(updatedValue, maxAgeDays = 120, referenceDate = new Date()) {
    const updated = parseConfigDate(updatedValue);
    if (!updated) return false;
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const stamp = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
    const ageDays = Math.floor((today - stamp) / 86400000);
    return ageDays >= 0 && ageDays <= Number(maxAgeDays);
}

function validScoreWeight(scores, weights) {
    return Object.keys(scores || {}).reduce((sum, key) => {
        const score = scores[key];
        const weight = Number((weights || {})[key] ?? 0);
        return sum + (Number.isFinite(score) && weight > 0 ? weight : 0);
    }, 0);
}

function formatTrendState(state) {
    const labels = {
        strongIncreasing: 'STRONG INCREASING',
        increasing: 'INCREASING',
        stable: 'STABLE',
        decreasing: 'DECREASING',
        strongDecreasing: 'STRONG DECREASING'
    };
    return labels[String(state || '').trim()] || String(state || '-').toUpperCase();
}

function toFiniteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function scoreFromThreshold(rules, value, fallback = null) {
    if (!Array.isArray(rules) || !Number.isFinite(value)) return fallback;
    const rule = rules.find(item => value <= item.max);
    return rule && Number.isFinite(rule.score) ? rule.score : fallback;
}

function scoreFromThresholdInterpolated(rules, value) {
    if (!Array.isArray(rules) || !Number.isFinite(value)) return null;
    const points = rules.filter(item => Number.isFinite(item.max) && Number.isFinite(item.score));
    if (!points.length) return null;
    if (value <= points[0].max) return points[0].score;
    for (let i = 1; i < points.length; i += 1) {
        const lo = points[i - 1];
        const hi = points[i];
        if (value <= hi.max) {
            const ratio = (value - lo.max) / (hi.max - lo.max);
            return lo.score + (hi.score - lo.score) * ratio;
        }
    }
    return points[points.length - 1].score;
}

function scoreFromMinThreshold(rules, value, fallback = null) {
    if (!Array.isArray(rules) || !Number.isFinite(value)) return fallback;
    const rule = rules.find(item => value >= item.min);
    return rule && Number.isFinite(rule.score) ? rule.score : fallback;
}

function scoreFromMinThresholdInterpolated(rules, value) {
    if (!Array.isArray(rules) || !Number.isFinite(value)) return null;
    const points = rules.filter(item => Number.isFinite(item.min) && Number.isFinite(item.score));
    if (!points.length) return null;
    if (value >= points[0].min) return points[0].score;
    for (let i = 1; i < points.length; i += 1) {
        const hi = points[i - 1];
        const lo = points[i];
        if (value >= lo.min) {
            const ratio = (value - lo.min) / (hi.min - lo.min);
            return lo.score + (hi.score - lo.score) * ratio;
        }
    }
    const fallbackRule = rules.find(item => item.min === -Infinity && Number.isFinite(item.score));
    return fallbackRule ? fallbackRule.score : points[points.length - 1].score;
}

function scoreFromState(rules, state, fallback = null) {
    if (!rules || !state || !rules[state] || !Number.isFinite(rules[state].score)) return fallback;
    return rules[state].score;
}

function weightedAverage(scores, weights) {
    let weightedSum = 0;
    let weightSum = 0;

    Object.keys(scores).forEach(key => {
        const score = scores[key];
        const weight = Number(weights[key] ?? 0);
        if (Number.isFinite(score) && weight > 0) {
            weightedSum += score * weight;
            weightSum += weight;
        }
    });

    if (weightSum <= 0) return null;
    return weightedSum / weightSum;
}

function calculateRiverFavorability(brentPrice) {
    const weights = riverwatch.policy.riverMetricWeights || {};
    const scoring = riverwatch.policy.riverHealthScoring || {};
    const config = riverwatch.manualConfig || {};

    const entries = {
        usdkrw: getMatrixByMax(scoring.usdkrw, toFiniteNumber(riverwatch.auto.usdkrw)),
        vix: getMatrixByMax(scoring.vix, toFiniteNumber(riverwatch.auto.vix)),
        oil: getMatrixByMax(scoring.oilPressure, brentPrice),
        fedRate: getStateMatrix(scoring.fedRateState, config.fedRateState),
        aiCapex: getStateMatrix(scoring.aiCapexTrend, config.aiCapexTrend),
        nvdaDcRevenue: getMatrixByMin(scoring.nvdaDcRevenueGrowth, toFiniteNumber(config.nvdaDcRevenueGrowth)),
        m2: getStateMatrix(scoring.m2Trend, config.m2Trend)
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

    if (weightSum <= 0) return null;
    return sum / weightSum;
}

function normalizeFavorability(value) {
    if (!Number.isFinite(value)) return null;
    // Matrix range -3 ~ +3 을 0 ~ 100 으로 변환
    const normalized = ((value + 3) / 6) * 100;
    return Math.round(Math.max(0, Math.min(100, normalized)));
}

function buildActionReason() {
    const river = riverwatch.calc.riverHealth;
    const growth = riverwatch.calc.growthFavorability;
    const defensive = riverwatch.calc.defensiveFavorability;
    const status = getRiverStatus(river);
    if (!Number.isFinite(river)) return "River Health is DATA N/A. Verify market inputs before taking action.";

    const guidance = {
        "STRONG CURRENT": "Continue the voyage.",
        "FAVORABLE CURRENT": "Maintain course and keep watch.",
        "MIXED CURRENT": "Review the boat configuration before adapting.",
        "HEAD CURRENT": "Prepare to adapt the boat.",
        "STORM WARNING": "Protect the boat and avoid unnecessary exposure."
    };
    return `River status is ${status}. Growth environment is ${growth ?? "N/A"}, defensive environment is ${defensive ?? "N/A"}. ${guidance[status] || "Keep watch."}`;
}

function buildCaptainNote() {
    const phase = riverwatch.calc.voyagePhase || "BUILD_PHASE";
    const river = Number(riverwatch.calc.riverHealth ?? 0);
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number.isFinite(riverwatch.calc.voyageHealth) ? riverwatch.calc.voyageHealth : null;

    const riverStatus = getRiverStatus(riverwatch.calc.riverHealth);
    const riverLineMap = {
        "STRONG CURRENT": "The river remains strong.",
        "FAVORABLE CURRENT": "The river remains favorable.",
        "MIXED CURRENT": "The river is mixed; watch the current.",
        "HEAD CURRENT": "The river is pushing against the course.",
        "STORM WARNING": "The river is in a stress regime.",
        "DATA N/A": "River data requires validation."
    };
    const riverLine = riverLineMap[riverStatus] || "The river requires observation.";

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

function daysBetween(start, end) {
    const a = startOfDay(start);
    const b = startOfDay(end);
    if (!a || !b) return null;
    return Math.max(0, Math.round((b - a) / 86400000));
}

function addCalendarDays(date, days) {
    const out = startOfDay(date);
    if (!out) return null;
    out.setDate(out.getDate() + Math.max(0, Math.round(days)));
    return out;
}

function formatCalendarDuration(startDate, endDate) {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    if (!start || !end || end < start) return '-';

    let cursor = new Date(start);
    let years = 0;
    let months = 0;

    while (true) {
        const next = new Date(cursor);
        next.setFullYear(next.getFullYear() + 1);
        if (next <= end) {
            cursor = next;
            years += 1;
        } else break;
    }

    while (true) {
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        if (next <= end) {
            cursor = next;
            months += 1;
        } else break;
    }

    const days = Math.max(0, Math.round((end - cursor) / 86400000));
    return `${years}y ${String(months).padStart(2, "0")}m ${String(days).padStart(2, "0")}d`;
}

function formatSignedCalendarDifference(baseDate, comparisonDate) {
    const base = startOfDay(baseDate);
    const compare = startOfDay(comparisonDate);
    if (!base || !compare) return '-';
    if (base.getTime() === compare.getTime()) return '±0d';

    const positive = compare > base;
    const earlier = positive ? base : compare;
    const later = positive ? compare : base;
    const parts = [];

    let cursor = new Date(earlier);
    let years = 0;
    let months = 0;
    while (true) {
        const next = new Date(cursor);
        next.setFullYear(next.getFullYear() + 1);
        if (next <= later) { cursor = next; years += 1; } else break;
    }
    while (true) {
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        if (next <= later) { cursor = next; months += 1; } else break;
    }
    const days = Math.max(0, Math.round((later - cursor) / 86400000));

    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}m`);
    if (days || parts.length === 0) parts.push(`${days}d`);
    return `${positive ? '+' : '-'}${parts.join(' ')}`;
}

function estimateDaysToTarget(currentAssets, monthlyContribution, annualRate, target) {
    if (![currentAssets, monthlyContribution, annualRate, target].every(Number.isFinite) || target <= 0) return null;
    if (currentAssets >= target) return 0;
    if (monthlyContribution <= 0 && annualRate <= 0) return null;

    const maxDays = Math.round(50 * 365.2425);
    if (projectFutureValue(currentAssets, monthlyContribution, annualRate, 50) < target) return null;

    let low = 0;
    let high = maxDays;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const value = projectFutureValue(currentAssets, monthlyContribution, annualRate, mid / 365.2425);
        if (value >= target) high = mid;
        else low = mid + 1;
    }
    return low;
}

function scoreTargetGapRatio(ratio) {
    if (!Number.isFinite(ratio)) return null;
    if (ratio >= 0) return 100;
    return Math.round(Math.max(0, Math.min(100, 100 + ratio * 100)));
}

function scoreEtaDeviation(deviationDays, remainingDays) {
    if (!Number.isFinite(deviationDays) || !Number.isFinite(remainingDays)) return null;
    if (deviationDays <= 0) return 100;
    if (remainingDays <= 0) return 0;
    const ratio = deviationDays / remainingDays;
    return Math.round(Math.max(0, Math.min(100, 100 - ratio * 100)));
}

function calculateVoyageHealth() {
    const config = riverwatch.manualConfig || {};
    const target = toFiniteNumber(config.openSeaTargetKRW);
    const currentAssets = toFiniteNumber(riverwatch.calc.currentPosition);
    const monthlyContribution = toFiniteNumber(config.monthlyContributionKRW);
    const baseCAGRInput = toFiniteNumber(config.expectedCAGR);
    const targetDate = parseDate(config.targetDate);
    const today = startOfDay(new Date());

    const validCAGR = Number.isFinite(baseCAGRInput) && baseCAGRInput >= 0 && baseCAGRInput <= 30;
    const validInputs = Number.isFinite(target) && target > 0
        && Number.isFinite(currentAssets) && currentAssets >= 0
        && Number.isFinite(monthlyContribution) && monthlyContribution >= 0
        && validCAGR && targetDate;

    if (!validInputs) {
        riverwatch.calc.openSeaTarget = target;
        riverwatch.calc.baseArrival = null;
        riverwatch.calc.adjustedArrival = null;
        riverwatch.calc.voyageDrift = null;
        riverwatch.calc.baseCAGR = validCAGR ? baseCAGRInput / 100 : null;
        riverwatch.calc.riverAdjustment = 0;
        riverwatch.calc.boatAdjustment = 0;
        riverwatch.calc.effectiveCAGR = validCAGR ? baseCAGRInput / 100 : null;
        riverwatch.calc.remainingYears = targetDate ? calculateRemainingYears(config.targetDate) : null;
        riverwatch.calc.remainingTime = targetDate ? formatCalendarDuration(today, targetDate) : '-';
        riverwatch.calc.etaDuration = '-';
        riverwatch.calc.etaDeviationLabel = '-';
        riverwatch.calc.voyageHealth = null;
        riverwatch.calc.voyageDataValid = false;
        return;
    }

    const baseCAGR = baseCAGRInput / 100;
    const remainingYears = calculateRemainingYears(config.targetDate);
    const remainingDays = daysBetween(today, targetDate);
    const adjustedArrival = projectFutureValue(currentAssets, monthlyContribution, baseCAGR, remainingYears);
    const targetGapKRW = adjustedArrival - target;
    const targetGapRatio = targetGapKRW / target;

    const etaDays = estimateDaysToTarget(currentAssets, monthlyContribution, baseCAGR, target);
    const etaDate = Number.isFinite(etaDays) ? addCalendarDays(today, etaDays) : null;
    const etaDeviationDays = Number.isFinite(etaDays) && Number.isFinite(remainingDays)
        ? etaDays - remainingDays
        : null;

    const targetGapScore = scoreTargetGapRatio(targetGapRatio);
    const etaScore = scoreEtaDeviation(etaDeviationDays, remainingDays);
    const health = Math.round(weightedAverage(
        { targetGap: targetGapScore, eta: etaScore },
        { targetGap: 60, eta: 40 }
    ));

    riverwatch.calc.currentPosition = currentAssets;
    riverwatch.calc.openSeaTarget = target;
    riverwatch.calc.baseArrival = adjustedArrival;
    riverwatch.calc.adjustedArrival = adjustedArrival;
    riverwatch.calc.voyageDrift = targetGapRatio * 100;
    riverwatch.calc.targetGapKRW = targetGapKRW;
    riverwatch.calc.targetGapRatio = targetGapRatio;
    riverwatch.calc.targetGapScore = targetGapScore;
    riverwatch.calc.baseCAGR = baseCAGR;
    riverwatch.calc.riverAdjustment = 0;
    riverwatch.calc.boatAdjustment = 0;
    riverwatch.calc.effectiveCAGR = baseCAGR;
    riverwatch.calc.remainingYears = remainingYears;
    riverwatch.calc.remainingDays = remainingDays;
    riverwatch.calc.remainingTime = formatCalendarDuration(today, targetDate);
    riverwatch.calc.etaDays = etaDays;
    riverwatch.calc.etaDate = etaDate;
    riverwatch.calc.etaDeviationDays = etaDeviationDays;
    riverwatch.calc.etaDeviationLabel = etaDate ? formatSignedCalendarDifference(targetDate, etaDate) : '-';
    riverwatch.calc.etaDuration = etaDate ? formatCalendarDuration(today, etaDate) : 'Not estimable';
    riverwatch.calc.etaScore = etaScore;
    riverwatch.calc.eta = etaDate;
    riverwatch.calc.voyageHealth = health;
    riverwatch.calc.voyageDataValid = true;
}
function calculateVoyagePhase() {
    const phase = getVoyagePhase();
    riverwatch.calc.voyagePhase = phase;
    riverwatch.calc.extraTimeRequired = calculateExtraTimeRequired();
    riverwatch.calc.requiredMonthlyContribution = calculateRequiredMonthlyContribution();
    const requiredCAGR = toFiniteNumber((riverwatch.manualConfig || {}).requiredCAGR);
    const expectedCAGR = toFiniteNumber((riverwatch.manualConfig || {}).expectedCAGR);
    riverwatch.calc.requiredCAGR = Number.isFinite(requiredCAGR) && requiredCAGR > 0 ? requiredCAGR : null;
    riverwatch.calc.enginePower = Number.isFinite(expectedCAGR) && expectedCAGR >= 0
        && Number.isFinite(requiredCAGR) && requiredCAGR > 0
        ? (expectedCAGR / requiredCAGR) * 100
        : null;
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

// Legacy internal solver retained for reference; ENGINE POWER uses VOYAGE_PLAN!B11.
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

function formatBrentPrice(price) {
    return `${formatNumber(price)} USD`;
}

function formatMonthDay(value) {
    if (value === null || value === undefined || value === "") return "";

    // Google Sheet CSV may return dates as 2026.7.27, 2026-07-27,
    // 2026/07/27, or locale-spaced variants such as 2026. 7. 27.
    const parts = String(value).trim().match(/^(?:\d{4})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})\.?$/);
    if (!parts) return "";

    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return "";

    return `${month}/${day}`;
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
    const target = parseDate(targetDate);
    if (!target) return null;
    const current = startOfDay(new Date());
    const targetEnd = startOfDay(target);
    const remainingMs = Math.max(0, targetEnd - current);
    return remainingMs / (365.2425 * 24 * 60 * 60 * 1000);
}

function projectFutureValue(currentAssets, monthlyContribution, annualRate, years) {
    if (![currentAssets, monthlyContribution, annualRate, years].every(Number.isFinite)) return null;
    const exactMonths = Math.max(0, years * 12);
    const wholeMonths = Math.floor(exactMonths);
    const partialMonth = exactMonths - wholeMonths;
    if (exactMonths <= 0) return currentAssets;

    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    let value = currentAssets;

    for (let i = 0; i < wholeMonths; i += 1) {
        value = value * (1 + monthlyRate) + monthlyContribution;
    }

    if (partialMonth > 0) value *= Math.pow(1 + monthlyRate, partialMonth);
    return value;
}

function getCagrAdjustment(rules, score) {
    if (!Array.isArray(rules) || typeof score !== "number" || Number.isNaN(score)) return 0;
    const rule = rules.find(item => score >= item.min);
    return rule ? Number(rule.adjustment || 0) : 0;
}

function scoreVoyageDrift(drift) {
    if (!Number.isFinite(drift)) return null;
    // Continuous scale: target match = 90. Downside is 1 score per -1% drift;
    // upside is intentionally damped to 0.5 score per +1% drift.
    const raw = drift >= 0 ? 90 + drift * 0.5 : 90 + drift;
    return Math.round(Math.max(0, Math.min(100, raw)));
}

function getVoyageStatus(score) {
    return getStatusFromTable(score, "voyage");
}

function updateDecisionEngine() {
    const river = Number(riverwatch.calc.riverHealth ?? 0);
    const boat = Number(riverwatch.calc.boatHealth ?? 0);
    const voyage = Number.isFinite(riverwatch.calc.voyageHealth) ? riverwatch.calc.voyageHealth : null;
    const phase = String(riverwatch.calc.voyagePhase || "").toUpperCase();

    let status = "ON COURSE";
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
    } else if (voyage !== null && voyage < 60) {
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
    } else if (river >= 80 && boat >= 85 && voyage !== null && voyage >= 85) {
        status = "ON COURSE";
        action = "NO ACTION";
    } else {
        status = "KEEP WATCH";
        action = "REVIEW";
    }

    riverwatch.calc.status = status;
    riverwatch.calc.recommendedAction = action;
    riverwatch.calc.actionReason = buildDecisionReason(river, boat, voyage, status, action);

    // STEP 1C: record only Captain Order transitions.
    // Fire-and-forget by design: audit persistence must never block dashboard rendering.
    recordCaptainOrderTransition(action);
}

function getCaptainOrderStorageKey() {
    return "riverwatch.captainOrder.lastKnown.v1";
}

function getStoredCaptainOrder() {
    try {
        const raw = localStorage.getItem(getCaptainOrderStorageKey());
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.order ? parsed : null;
    } catch (_) {
        return null;
    }
}

function storeCaptainOrder(order, observedAt = new Date().toISOString()) {
    try {
        localStorage.setItem(getCaptainOrderStorageKey(), JSON.stringify({ order, observedAt }));
    } catch (_) {
        // Local persistence failure must not affect navigation.
    }
}

function recordCaptainOrderTransition(order) {
    const currentOrder = String(order || "").trim().toUpperCase();
    if (!currentOrder) return;

    const previous = getStoredCaptainOrder();
    if (!previous) {
        // First observation is the local Last Known Order baseline, not a transition.
        storeCaptainOrder(currentOrder);
        riverwatch.calc.captainOrderHistoryState = "BASELINED";
        return;
    }

    if (String(previous.order || "").trim().toUpperCase() === currentOrder) {
        riverwatch.calc.captainOrderHistoryState = "UNCHANGED";
        return;
    }

    const observedAt = new Date().toISOString();
    storeCaptainOrder(currentOrder, observedAt);
    riverwatch.calc.captainOrderHistoryState = "CHANGED";

    const cfg = (riverwatch.policy || {}).doctrineAudit || {};
    if (cfg.enabled !== true || !cfg.webAppUrl) return;

    const payload = {
        type: "CAPTAIN_ORDER_CHANGE",
        observedAt,
        previousOrder: previous.order,
        currentOrder,
        status: riverwatch.calc.status || "",
        riverHealth: Number.isFinite(Number(riverwatch.calc.riverHealth)) ? Number(riverwatch.calc.riverHealth) : null,
        boatHealth: Number.isFinite(Number(riverwatch.calc.boatHealth)) ? Number(riverwatch.calc.boatHealth) : null,
        voyageHealth: Number.isFinite(Number(riverwatch.calc.voyageHealth)) ? Number(riverwatch.calc.voyageHealth) : null
    };

    fetch(cfg.webAppUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        keepalive: true
    }).catch(error => {
        console.warn("Captain Order history write failed; dashboard operation continues.", error);
    });
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
    applyHealthSemanticClass("summaryVoyageStatus", Number(voyage));
    applyHealthSemanticClass("summaryRiverStatus", Number(river));
    applyHealthSemanticClass("summaryBoatStatus", Number(boat));
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

function getDoctrineCompliance() {
    const value = String(riverwatch.calc.doctrineCompliance || '').trim().toUpperCase();
    if (value === 'ALIGNED') return { label: 'ALIGNED', className: 'aligned' };
    if (value === 'VIOLATION') return { label: 'VIOLATION', className: 'breached' };
    // STEP 1C deliberately does not infer compliance from Boat Health.
    // Until the monthly audit source is connected, show an explicit pending state.
    return { label: 'PENDING', className: 'unknown' };
}

function renderMission() {
    setText("mission", riverwatch.const.mission);
    setText("status", riverwatch.calc.status);

    const doctrine = getDoctrineCompliance();
    riverwatch.calc.doctrineCompliance = doctrine.label;
    setText("doctrineCompliance", doctrine.label);
    const doctrineDate = (riverwatch.manualConfig || {}).doctrineComplianceUpdated
        ?? (riverwatch.manualConfig || {}).doctrineComplianceDate
        ?? riverwatch.calc.doctrineComplianceUpdated
        ?? riverwatch.calc.doctrineComplianceDate;
    const doctrineDateLabel = formatDisplayDate(doctrineDate);
    setText("doctrineComplianceDateMeta", doctrineDateLabel ? `(${doctrineDateLabel})` : "(-)");
    const doctrineEl = document.getElementById("doctrineCompliance");
    if (doctrineEl) doctrineEl.className = "mission-kpi-value doctrine-status " + doctrine.className;

    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.className = "mission-kpi-value " + getMissionStatusClass(riverwatch.calc.status);
}

function getMissionStatusClass(status) {
    const value = String(status || "").toUpperCase();
    if (!value || value === "--" || value.includes("UNKNOWN") || value.includes("N/A")) return "unknown";
    if (value.includes("RECOVER") || value.includes("LOST") || value.includes("CRITICAL")) return "recover";
    if (value.includes("ADAPT") || value.includes("CORRECTION") || value.includes("REBAL") || value.includes("COURSE RESET")) return "adapt";
    if (value.includes("BUILD") || value.includes("WATCH")) return "watch";
    return "";
}

function renderVoyageHealth() {
    const current = Number(riverwatch.calc.currentPosition);
    const target = Number(riverwatch.calc.openSeaTarget);
    const progressPct = Number.isFinite(current) && Number.isFinite(target) && target > 0
        ? (current / target) * 100
        : null;

    setText("voyageHealth", scoreText(riverwatch.calc.voyageHealth));
    setText("voyageStatus", getVoyageStatus(riverwatch.calc.voyageHealth));
    applyHealthSemanticClass("voyageStatus", riverwatch.calc.voyageHealth);

    const currentValueLabel = document.getElementById('currentValueLabel');
    if (currentValueLabel) {
        currentValueLabel.textContent = Number.isFinite(progressPct)
            ? `Current Value (${progressPct.toFixed(1)}%)`
            : 'Current Value';
    }

    setText("currentPosition", formatKRWValueM(current));
    setText("remainingTime", riverwatch.calc.remainingTime || '-');
    setText("adjustedArrival", formatKRWValueM(riverwatch.calc.adjustedArrival));
    setText("openSeaTarget", formatKRWValueM(target));
    setHTML("voyageGap", formatTargetGapKRWHTML(riverwatch.calc.targetGapKRW));

    const etaLabel = document.getElementById('etaLabel');
    if (etaLabel) etaLabel.textContent = `ETA (${riverwatch.calc.etaDeviationLabel || '-'})`;
    setText("etaExtension", riverwatch.calc.etaDuration || '-');
}

function renderRiverHealth() {
    setText("riverHealth", scoreText(riverwatch.calc.riverHealth));
    const riverState = getRiverStatus(riverwatch.calc.riverHealth);
    const environment = getRiverEnvironmentLabel(riverwatch.calc.riverHealth);
    setText("riverStatus", environment ? `${riverState} · ${environment}` : riverState);
    applyHealthSemanticClass("riverStatus", riverwatch.calc.riverHealth);

    const list = document.getElementById("riverMetricList");
    if (!list) return;
    list.innerHTML = "";

    const scores = riverwatch.calc.riverMetricScores || {};
    const config = riverwatch.manualConfig || {};
    const fxAsOf = formatDisplayDate(riverwatch.auto.fxAsOf);
    const brentAsOf = formatDisplayDate(config.BrentPriceAsOf ?? config.brentPriceAsOf);
    const freshness = riverwatch.calc.riverMetricFreshness || {};
    const aiDate = formatDisplayDate(config.aiCapexUpdated);
    const nvdaDate = formatDisplayDate(config.nvdaDcRevenueUpdated);

    const metrics = [
        { label: `USD/KRW${fxAsOf ? ` <small>(${fxAsOf})</small>` : ""}`, value: formatFixedNumber(riverwatch.auto.usdkrw, 2), score: scores.usdkrw },
        { label: `BRENT${brentAsOf ? ` <small>(${brentAsOf})</small>` : ""}`, value: formatBrentPrice(riverwatch.calc.brentPrice), score: scores.oil },
        { label: "FED", value: String(config.fedRateState || "-").toUpperCase(), score: scores.fedRate },
        { label: "M2", value: formatTrendState(config.m2Trend), score: scores.m2 },
        { label: "VIX", value: formatInteger(riverwatch.auto.vix), score: scores.vix },
        {
            label: freshness.aiCapex === false ? "AI CAPEX <small class=\"stale-meta\">(STALE)</small>" : `AI CAPEX${aiDate ? ` <small>(${aiDate})</small>` : ""}`,
            value: formatTrendState(config.aiCapexTrend),
            score: freshness.aiCapex === false ? null : scores.aiCapex,
            stale: freshness.aiCapex === false
        },
        {
            label: freshness.nvdaDcRevenue === false ? "NVDA DC Rev <small class=\"stale-meta\">(STALE)</small>" : `NVDA DC Rev${nvdaDate ? ` <small>(${nvdaDate})</small>` : ""}`,
            value: formatPercentValue(toFiniteNumber(config.nvdaDcRevenueGrowth)),
            score: freshness.nvdaDcRevenue === false ? null : scores.nvdaDcRevenue,
            stale: freshness.nvdaDcRevenue === false
        }
    ];

    metrics.forEach(metric => {
        const row = document.createElement("div");
        if (metric.stale) row.classList.add("metric-stale");
        row.innerHTML = `<span>${metric.label}</span><b>${metric.value} ${metricScoreHTML(metric.score)}</b>`;
        list.appendChild(row);
    });
}

function getEnginePowerLabel(score) {
    if (!Number.isFinite(Number(score))) return 'PENDING';
    const value = Number(score);
    if (value >= 100) return 'SUFFICIENT';
    if (value >= 95) return 'NEAR REQUIRED';
    if (value >= 85) return 'BELOW REQUIRED';
    if (value >= 70) return 'LOW POWER';
    return 'CRITICAL';
}

function getFuelSupplyLabel(score) {
    if (!Number.isFinite(Number(score))) return 'PENDING';
    const value = Number(score);
    if (value >= 100) return 'ON PLAN';
    if (value >= 95) return 'NEAR PLAN';
    if (value >= 85) return 'BELOW PLAN';
    if (value >= 70) return 'SHORTFALL';
    return 'CRITICAL';
}

function renderBoatHealth() {
    setText("boatHealth", riverwatch.calc.boatHealth);
    setText("boatStatus", getBoatStatus(riverwatch.calc.boatHealth));
    applyHealthSemanticClass("boatStatus", riverwatch.calc.boatHealth);

    const engineRaw = riverwatch.calc.enginePowerScore;
    const engineScore = (engineRaw === null || engineRaw === undefined || engineRaw === '') ? null : Number(engineRaw);
    setMetricStatusHTML("enginePower", Number.isFinite(engineScore) ? getEnginePowerLabel(engineScore) : 'PENDING', engineScore, Number.isFinite(engineScore) ? '' : 'metric-pending');

    const latestRefuelDate = formatDisplayDate(getLatestRefuelDate());
    const fuelLabel = document.getElementById("fuelSupplyLabel");
    if (fuelLabel) fuelLabel.textContent = `Fuel Supply (${latestRefuelDate || '-'})`;

    const fuelRaw = riverwatch.calc.fuelSupply;
    const fuelScore = (fuelRaw === null || fuelRaw === undefined || fuelRaw === '') ? null : Number(fuelRaw);
    setMetricStatusHTML("fuelSupply", Number.isFinite(fuelScore) ? getFuelSupplyLabel(fuelScore) : 'PENDING', fuelScore, Number.isFinite(fuelScore) ? '' : 'metric-pending');

    const trimRaw = riverwatch.calc.trimBalance;
    const trim = (trimRaw === null || trimRaw === undefined || trimRaw === '') ? null : Number(trimRaw);
    setMetricStatusHTML("allocationAlignment", Number.isFinite(trim) ? getAlignmentLabel(trim) : 'PENDING', trim, Number.isFinite(trim) ? '' : 'metric-pending');

    const fitRaw = riverwatch.calc.riverFit;
    const fit = (fitRaw === null || fitRaw === undefined || fitRaw === '') ? null : Number(fitRaw);
    setMetricStatusHTML("riverSuitability", Number.isFinite(fit) ? getSuitabilityLabel(fit) : 'PENDING', fit, Number.isFinite(fit) ? '' : 'metric-pending');
}

function renderAllocation() {
    const list = document.getElementById("allocationList");
    if (!list) return;

    list.innerHTML = "";

    (riverwatch.calc.allocationHoldings || []).forEach(item => {
        const target = Number(item.target ?? 0);
        const current = Number(item.current ?? 0);
        const delta = current - target;
        const status = getAllocationStatusForItem(item);
        const label = item.displayLabel || item.label || item.ticker;

        const row = document.createElement("div");
        row.className = "holding-row";
        row.innerHTML = `
            <span>${formatTicker(label)}</span>
            <span>${current.toFixed(1)}%</span>
            <span>${target.toFixed(1)}%</span>
            <span>${formatSignedFixed(delta, 1, true)}%</span>
            <span class="badge ${status.className}">${status.label}</span>
        `;
        list.appendChild(row);
    });
}

function renderCaptainBridge() {
    setHTML("bridgeCaptainNote", formatBridgeNote(riverwatch.calc.captainNote || "-"));
    setText("bridgeOrder", riverwatch.calc.recommendedAction || "-");
    const orderEl = document.getElementById("bridgeOrder");
    if (orderEl) orderEl.className = "bridge-order-value " + getOrderSemanticClass(riverwatch.calc.recommendedAction);
    setHTML("bridgeOrderRationale", formatBridgeNote(buildOrderRationale()));
}

function getOrderSemanticClass(action) {
    const value = String(action || "").toUpperCase();
    if (!value || value === "-" || value.includes("N/A")) return "semantic-unknown";
    if (value.includes("INCREASE EFFORT") || value.includes("RECOVER")) return "semantic-critical";
    if (value.includes("REBALANCE") || value.includes("RECALCULATE")) return "semantic-action";
    if (value.includes("REVIEW") || value.includes("WATCH")) return "semantic-watch";
    return "semantic-good";
}

function getHealthSemanticClass(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) return "semantic-unknown";
    if (value >= 75) return "semantic-good";
    if (value >= 60) return "semantic-watch";
    if (value >= 40) return "semantic-action";
    return "semantic-critical";
}

function applyHealthSemanticClass(id, score) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("semantic-good", "semantic-watch", "semantic-action", "semantic-critical", "semantic-unknown");
    el.classList.add(getHealthSemanticClass(score));
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
    if (!Number.isFinite(score)) return "DATA N/A";
    const value = score;
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
    if (value >= 95) return "ON TARGET";
    if (value >= 85) return "NEAR TARGET";
    if (value >= 70) return "OFF TARGET";
    return "OUT OF BALANCE";
}

function getSuitabilityLabel(score) {
    if (!Number.isFinite(Number(score))) return "PENDING";
    const value = Number(score);
    if (value >= 100) return "WITHIN RANGE";
    if (value >= 90) return "REDUCED MARGIN";
    return "OUTSIDE RANGE";
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
    if (text === "SAT" || text === "SATISFIED" || text === "WITHIN CAP") return "SAT ✓";
    if (text === "BUILD" || text === "BUILDING") return "BUILD ▲";
    if (text === "REBALANCE" || text === "DILUTING" || text === "OVER CAP") return "REBALANCE !";
    return text || "-";
}

function formatTrimTicker(ticker) {
    const text = String(ticker || "").toUpperCase();
    if (text === "INDIVIDUAL") return "INDIVIDUAL";
    return formatTicker(text);
}

function formatHoldingQuantity(value) {
    const quantity = Number(value ?? 0);
    if (!Number.isFinite(quantity)) return "0.0";

    return quantity.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

function formatKRWFull(value, signed = false) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";

    const rounded = Math.round(amount);
    const sign = signed && rounded > 0 ? "+" : "";
    return `${sign}${rounded.toLocaleString("ko-KR")}`;
}

function formatKRWThousands(value, signed = false) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";

    const roundedThousands = Math.round(amount / 1000);
    const sign = signed && roundedThousands > 0 ? "+" : "";
    return `${sign}${roundedThousands.toLocaleString("ko-KR")}`;
}

function formatSignedPercent1(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function getPnLToneClass(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount === 0) return "is-neutral";
    return amount > 0 ? "is-profit" : "is-loss";
}

function renderBoatyard() {
    const expectedCagr = toFiniteNumber((riverwatch.manualConfig || {}).expectedCAGR);
    const requiredCagr = toFiniteNumber((riverwatch.manualConfig || {}).requiredCAGR);
    const powerRatio = Number.isFinite(expectedCagr) && Number.isFinite(requiredCagr) && requiredCagr > 0
        ? (expectedCagr / requiredCagr) * 100
        : null;
    const cagrGap = Number.isFinite(expectedCagr) && Number.isFinite(requiredCagr)
        ? expectedCagr - requiredCagr
        : null;

    setText("boatyardExpectedCagr", Number.isFinite(expectedCagr) ? `${expectedCagr.toFixed(2)}%` : "-");
    setText("boatyardRequiredCagr", Number.isFinite(requiredCagr) ? `${requiredCagr.toFixed(2)}%` : "-");
    if (Number.isFinite(cagrGap)) {
        const gapEl = document.getElementById("boatyardCagrGap");
        if (gapEl) {
            const direction = cagrGap >= 0 ? "▲" : "▼";
            const tone = cagrGap >= 0 ? "gap-up" : "gap-down";
            gapEl.innerHTML = `<span class="target-gap-direction ${tone}">${direction}</span> ${Math.abs(cagrGap).toFixed(2)}%p`;
        }
    } else setText("boatyardCagrGap", "-");
    setText("boatyardPowerRatio", Number.isFinite(powerRatio) ? `${powerRatio.toFixed(2)}%` : "-");

    const deck = document.getElementById("trimDeckList");
    if (deck) {
        const holdings = riverwatch.calc.allocationHoldings || [];
        const totalCost = holdings.reduce((sum, item) => sum + Number(item.costBasisKRW ?? 0), 0);
        const totalCurrent = holdings.reduce((sum, item) => sum + Number(item.valueKRW ?? 0), 0);
        const totalPnL = totalCurrent - totalCost;
        const totalReturn = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
        const totalToneClass = getPnLToneClass(totalPnL);

        deck.innerHTML = `
            <div class="portfolio-summary" aria-label="Portfolio all assets summary">
                <div class="portfolio-summary-title">PORTFOLIO (ALL ASSETS) · KRW</div>
                <div class="portfolio-summary-grid">
                    <div class="portfolio-summary-item portfolio-summary-cost"><span>COST</span><b class="is-reference">${formatKRWFull(totalCost)}</b></div>
                    <div class="portfolio-summary-item portfolio-summary-current"><span>CURRENT</span><b class="is-neutral">${formatKRWFull(totalCurrent)}</b></div>
                    <div class="portfolio-summary-item portfolio-summary-pnl"><span>PROFIT/LOSS</span><b class="${totalToneClass}">${formatKRWFull(totalPnL, true)}</b></div>
                    <div class="portfolio-summary-item portfolio-summary-return"><span>RETURN</span><b class="${totalToneClass}">${formatSignedPercent2(totalReturn)}</b></div>
                </div>
            </div>
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
            const tickerLabel = formatTrimTicker(item.displayLabel || item.label || item.ticker);
            const holdingQuantity = formatHoldingQuantity(item.quantity);
            const cost = Number(item.costBasisKRW ?? 0);
            const currentValue = Number(item.valueKRW ?? 0);
            const pnl = currentValue - cost;
            const assetReturn = cost > 0 ? (pnl / cost) * 100 : 0;
            const pnlToneClass = getPnLToneClass(pnl);

            const markerPct = 70;
            const blockPct = 6;
            // Keep the displayed GAP as the actual delta, but use a corrected gap
            // (decimal portion truncated toward zero) for trim-bar block calculation.
            // This creates a neutral deadband for -1% < GAP < +1%.
            const effectiveGap = Math.trunc(delta);
            const blockCountRaw = effectiveGap === 0 ? 0 : (effectiveGap > 0 ? Math.ceil(effectiveGap / 5) : Math.floor(effectiveGap / 5));
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
                        <span class="trim-summary-delta">${formatSignedFixed(delta, 1, true)}%</span>
                    </div>
                `;
                summary.appendChild(row);
            }

            if (detail) {
                const row = document.createElement("div");
                row.className = "trim-card trim-detail-card-diet";
                row.innerHTML = `
                    <div class="trim-head trim-head-static trim-head-diet">
                        <div class="trim-identity">
                            <b class="trim-ticker" title="${tickerLabel}">${tickerLabel}</b>
                            <span class="trim-holdings" aria-label="Holdings ${holdingQuantity}">
                                <span class="trim-holdings-label">Holdings</span>
                                <b class="trim-holdings-value">${holdingQuantity}</b>
                            </span>
                        </div>
                        <span class="badge ${rule.className}">${badgeLabel}</span>
                    </div>
                    <div class="trim-card-body trim-card-body-performance">
                        <div class="trim-allocation-pane">
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
                                <div><span>Gap</span><b class="${delta > 0 ? 'is-profit' : delta < 0 ? 'is-loss' : 'is-neutral'}">${formatSignedFixed(delta, 1, true)}%</b></div>
                            </div>
                        </div>
                        <div class="trim-performance" aria-label="Investment performance">
                            <div class="trim-performance-row">
                                <span>Cost</span>
                                <b class="is-reference">${formatKRWFull(cost)}</b>
                            </div>
                            <div class="trim-performance-row">
                                <span>Current</span>
                                <b class="is-neutral">${formatKRWFull(currentValue)}</b>
                            </div>
                            <div class="trim-performance-row">
                                <span>P/L</span>
                                <b class="${pnlToneClass}">${formatKRWFull(pnl, true)}</b>
                            </div>
                            <div class="trim-performance-row">
                                <span>Return</span>
                                <b class="${pnlToneClass}">${assetReturn > 0 ? "+" : ""}${assetReturn.toFixed(1)}%</b>
                            </div>
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
        const computedPlanGap = target > 0 ? ((market / target) - 1) * 100 : 0;
        const logbook = typeof row.logbook === "boolean"
            ? row.logbook
            : String(row.logbook ?? row.milestone ?? "FALSE").toUpperCase() === "TRUE";
        return {
            ...row,
            eventType: String(row.eventType || row.marker || "").trim().toUpperCase(),
            voyageState: String(row.voyageState || "").trim().toUpperCase(),
            trend: String(row.trend || "").trim().toUpperCase(),
            title: row.title || row.note || "Log Entry",
            message: row.message || row.memo || row.note || "",
            memo: row.message || row.memo || row.note || "",
            logbook,
            milestone: logbook,
            principalKRW: principal,
            marketValueKRW: market,
            targetValueKRW: target,
            planGap: Number.isFinite(Number(row.planGap)) ? Number(row.planGap) : computedPlanGap,
            dailyTrend: Number(row.dailyTrend || 0),
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

function formatKRWK(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return `${Math.round(amount / 1000).toLocaleString("en-US")}K`;
}

function renderLogbookKpis(rows) {
    const el = document.getElementById("logbookKpis");
    if (!el) return;

    const datedRows = normalizeLogbookRows(rows)
        .filter(row => row && row.date)
        .sort((a, b) => (parseDateSafe(a.date) || 0) - (parseDateSafe(b.date) || 0));
    const first = datedRows[0] || {};
    const latest = datedRows[datedRows.length - 1] || {};
    const voyageStart = formatDisplayDate(first.date) || "-";
    const latestDate = formatDisplayDate(latest.date) || "-";
    const targetArrival = formatDisplayDate((riverwatch.manualConfig || {}).targetDate) || "-";
    const phase = String(riverwatch.calc.voyagePhase || "-").replace(/_/g, " ");
    const currentStatus = `${formatKRWK(latest.marketValueKRW)} / ${formatKRWK(latest.targetValueKRW)} / ${formatSignedPercent2(latest.planGap)}`;

    el.innerHTML = `
        <div><span>Voyage Phase</span><b>${phase}</b></div>
        <div class="current-status-kpi"><span>Current Status <small>(${latestDate})</small></span><b>${currentStatus}</b></div>
        <div><span>Voyage Start</span><b>${voyageStart}</b></div>
        <div><span>Target Arrival</span><b>${targetArrival}</b></div>
    `;
}

function formatDisplayDate(value) {
    const date = parseDateSafe(value);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
}

function formatSignedPercent2(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount.toFixed(2)}%`;
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

    const yearDividers = buildYearDividers(startDate, xEnd, xForDate);
    const startLabel = formatJourneyEdgeDate(startDate, true);
    const endLabel = formatJourneyEdgeDate(xEnd, startDate?.getFullYear() !== xEnd?.getFullYear());

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
                ${yearDividers.map(t => `<line class="journey-year-divider" x1="${t.x}" y1="${pad.top}" x2="${t.x}" y2="${pad.top + plotH}"></line>`).join("")}
                <path class="journey-line principal" d="${linePath("principalKRW")}"></path>
                <path class="journey-line market" d="${linePath("marketValueKRW")}"></path>
                <path class="journey-line course" d="${linePath("targetValueKRW")}"></path>
                <text class="journey-edge-label start" x="${pad.left}" y="${chartHeight - 18}" text-anchor="start">${startLabel}</text>
                <text class="journey-edge-label end" x="${chartWidth - pad.right}" y="${chartHeight - 18}" text-anchor="end">${endLabel}</text>
            </svg>
        </div>
    `;
}

function buildYearDividers(startDate, endDate, xForDate) {
    if (!startDate || !endDate || endDate <= startDate) return [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const dividers = [];

    for (let year = startYear + 1; year <= endYear; year += 1) {
        const boundary = new Date(year, 0, 1);
        if (boundary > startDate && boundary < endDate) {
            dividers.push({ year, x: xForDate(boundary).toFixed(1) });
        }
    }
    return dividers;
}

function formatJourneyEdgeDate(date, includeYear = false) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return includeYear ? `'${yy}.${mm}/${dd}` : `${mm}/${dd}`;
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

    // Timeline is the Captain's Log view: only explicitly checked Logbook rows.
    // Portfolio Journey above continues to use every dated VOYAGE_LOG row.
    const timelineRows = normalizeLogbookRows(rows)
        .filter(row => row.logbook === true)
        .map(row => ({
            ...row,
            targetValueKRW: Number(row.targetValueKRW || 0) || calculateLogbookTargetValue(row.date, rows)
        }))
        .sort((a, b) => (parseDateSafe(b.date) || 0) - (parseDateSafe(a.date) || 0));

    if (!timelineRows.length) {
        el.innerHTML = `<div class="empty-state">No logbook entries yet.</div>`;
        return;
    }

    el.innerHTML = timelineRows.map(row => {
        const market = Number(row.marketValueKRW || 0);
        const planned = Number(row.targetValueKRW || 0);
        const planGap = planned > 0 ? ((market / planned) - 1) * 100 : Number(row.planGap || 0);
        const stateClass = row.voyageState ? ` state-${row.voyageState.toLowerCase()}` : "";
        const trendClass = row.trend ? ` trend-${row.trend.toLowerCase().replace(/_/g, "-")}` : "";

        return `
            <div class="timeline-entry">
                <div class="timeline-dot"></div>
                <div class="timeline-entry-body">
                    <div class="timeline-classification">
                        <div class="timeline-meta">${row.eventType || "LOG"}</div>
                        <div class="timeline-status-group">
                            ${row.voyageState ? `<div class="timeline-voyage-state${stateClass}">${row.voyageState}</div>` : ""}
                            ${row.trend ? `<div class="timeline-trend${trendClass}">${row.trend.replace(/_/g, " ")}</div>` : ""}
                        </div>
                    </div>
                    <div class="timeline-date">${row.date || "-"}</div>
                    <div class="timeline-title">${row.title || "Log Entry"}</div>
                    <div class="timeline-metric-line">
                        <span>Market <b>${formatKRWM(market)}</b></span>
                        <span>Plan <b>${formatKRWM(planned)}</b></span>
                        <span>Gap <b>${formatSignedPercent2(planGap)}</b></span>
                    </div>
                    <div class="timeline-note">${row.message || row.memo || "-"}</div>
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
        { min: 90, label: "TAILWIND" },
        { min: 80, label: "CALM" },
        { min: 70, label: "HEADWIND" },
        { min: 55, label: "ROUGH" },
        { min: 0,  label: "STORM" }
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
    if (!Number.isFinite(score)) return "DATA N/A";
    const value = score;
    const table = HEALTH_STATUS_TABLES[tableKey] || [];
    const matched = table.find(item => value >= item.min);
    return matched ? matched.label : "-";
}

function getHealthStatus(score) {
    return getStatusFromTable(score, "voyage");
}

function getRiverStatus(score) {
    if (!Number.isFinite(score)) return "PENDING";
    return getStatusFromTable(score, "river");
}

function getRiverEnvironmentLabel(score) {
    if (!Number.isFinite(score)) return "";
    if (score >= 90) return "HIGHLY FAVORABLE";
    if (score >= 80) return "FAVORABLE";
    if (score >= 70) return "CHALLENGING";
    if (score >= 55) return "UNFAVORABLE";
    return "HIGHLY UNFAVORABLE";
}

function getBoatStatus(score) {
    return getStatusFromTable(score, "boat");
}

function getControlRule(controlType) {
    const type = String(controlType || "MIN").trim().toUpperCase();
    const fallback = type === "MAX"
        ? { controlType: "MAX", evaluationMode: "UPPER_ONLY", satThreshold: 1, buildThreshold: 5, satStatus: "SAT", buildStatus: "BUILD", rebalanceStatus: "REBALANCE" }
        : { controlType: "MIN", evaluationMode: "ABS", satThreshold: 1, buildThreshold: 5, satStatus: "SAT", buildStatus: "BUILD", rebalanceStatus: "REBALANCE" };

    return {
        ...fallback,
        ...((riverwatch.controlRules || {})[type] || {})
    };
}

function evaluateAllocationRule(item) {
    const current = Number(item?.current ?? 0);
    const target = Number(item?.target ?? 0);
    const controlType = String(item?.controlType || "MIN").trim().toUpperCase();
    const rule = getControlRule(controlType);
    const rawDelta = current - target;
    const evaluationMode = String(rule.evaluationMode || "ABS").trim().toUpperCase();

    let deviation;
    if (evaluationMode === "UPPER_ONLY") {
        deviation = Math.max(rawDelta, 0);
    } else if (evaluationMode === "LOWER_ONLY") {
        deviation = Math.max(-rawDelta, 0);
    } else {
        deviation = Math.abs(rawDelta);
    }

    const satThreshold = Math.max(0, Number(rule.satThreshold ?? 1));
    const buildThreshold = Math.max(satThreshold, Number(rule.buildThreshold ?? 5));

    if (deviation < satThreshold) {
        return { status: String(rule.satStatus || "SAT"), className: "on-target", deviation, rawDelta, rule };
    }
    if (deviation <= buildThreshold) {
        return { status: String(rule.buildStatus || "BUILD"), className: "building", deviation, rawDelta, rule };
    }
    return { status: String(rule.rebalanceStatus || "REBALANCE"), className: "over", deviation, rawDelta, rule };
}

function getDoctrineRule(item) {
    const current = Number(item?.current ?? 0);
    const limit = Number(item?.target ?? 0);
    const controlType = String(item?.controlType || "MIN").toUpperCase();
    const result = evaluateAllocationRule(item);

    return {
        limit,
        limitLabel: controlType === "MAX" ? "Cap" : "Target",
        deltaLabel: result.rawDelta >= 0 ? "Excess" : "Gap",
        label: result.status,
        className: result.className,
        deviation: result.deviation
    };
}

function getAllocationStatusForItem(item) {
    const result = evaluateAllocationRule(item);
    return { label: result.status, className: result.className };
}

function getAllocationStatus(delta) {
    const result = evaluateAllocationRule({ current: Number(delta || 0), target: 0, controlType: "MIN" });
    return { label: result.status, className: result.className };
}

function formatRemainingTime(years) {
    if (typeof years !== "number" || Number.isNaN(years)) return "-";
    const totalMonths = Math.max(0, Math.ceil(years * 12));
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y}y ${m}m`;
}

function formatKRWM(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return formatInteger(value / 1000000) + "M";
}

function formatKRWValueM(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return `KRW ${formatInteger(value / 1000000)}M`;
}

function formatTargetGapKRWM(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const roundedM = Math.round(Math.abs(value) / 1000000);
    if (roundedM === 0) return "KRW 0M";
    const direction = value > 0 ? "▲" : "▼";
    return `${direction} KRW ${roundedM.toLocaleString("ko-KR")}M`;
}

function formatTargetGapKRWHTML(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const roundedM = Math.round(Math.abs(value) / 1000000);
    if (roundedM === 0) return "KRW 0M";
    const isPositive = value > 0;
    const direction = isPositive ? "▲" : "▼";
    const tone = isPositive ? "gap-up" : "gap-down";
    return `<span class="target-gap-direction ${tone}">${direction}</span> KRW ${roundedM.toLocaleString("ko-KR")}M`;
}

function metricScoreHTML(score) {
    const text = score === null || score === undefined || score === '' || !Number.isFinite(Number(score))
        ? '-'
        : Math.round(Number(score));
    return `<small class="metric-score">(${text})</small>`;
}

function setMetricStatusHTML(id, label, score, stateClass = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `metric-value${stateClass ? ` ${stateClass}` : ''}`;
    el.innerHTML = `${label} ${metricScoreHTML(score)}`;
}

function formatKRWB(value) {
    // Backward-compatible alias. RiverWatch CAB-005.2.4 uses M units for visibility.
    return formatKRWM(value);
}

function formatSignedKRWM(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const amountM = value / 1000000;
    const roundedM = Math.round(amountM);
    const sign = roundedM > 0 ? "+" : "";
    return `${sign}${roundedM.toLocaleString("ko-KR")}M`;
}

function formatNumber(value, maximumFractionDigits = 2) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("ko-KR", {
        minimumFractionDigits: 0,
        maximumFractionDigits
    });
}

function formatFixedNumber(value, fractionDigits = 2) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("ko-KR", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    });
}

function formatSignedFixed(value, digits = 1, showPlusForZero = false) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const sign = value > 0 || (showPlusForZero && Object.is(value, 0)) ? "+" : "";
    return sign + formatFixedNumber(value, digits);
}

function formatInteger(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return Math.round(value).toLocaleString("ko-KR");
}

function formatPercentValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return formatNumber(value, 1) + "%";
}

function formatEffectiveCAGR(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return (value * 100).toFixed(2) + "%";
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
    setBootState("syncing", "INITIALIZING");
    bootRiverWatch();
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

    setText("summaryVoyageHealth", scoreText(c.voyageHealth));
    setText("summaryRiverHealth", scoreText(c.riverHealth));
    setText("summaryBoatHealth", scoreText(c.boatHealth));

    setText("summaryVoyageStatus", stripScoreSuffix(document.getElementById("voyageStatus")?.textContent || "--"));
    setText("summaryRiverStatus", stripScoreSuffix(document.getElementById("riverStatus")?.textContent || "--"));
    setText("summaryBoatStatus", stripScoreSuffix(document.getElementById("boatStatus")?.textContent || "--"));
}