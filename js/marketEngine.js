/****************************************************************************
 * RiverWatch Market Engine v0.4.0-cab006.0
 * Google Sheet v2.0 CSV Hub Reader
 * - MarketData: live market prices
 * - PortfolioConfig: target allocation / role data
 * - ControlRules: MIN/MAX evaluation thresholds and status labels
 * - Portfolio: captain position data
 * - ManualConfig: captain judgment / voyage inputs
 ****************************************************************************/

const RiverWatchMarketEngine = (() => {

    function nowString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        return `${y}.${m}.${d} ${hh}:${mm}`;
    }

    function splitCsvLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const ch = line[i];
            const next = line[i + 1];

            if (ch === '"' && inQuotes && next === '"') {
                current += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    }

    function parseRows(text) {
        return String(text || "")
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map(splitCsvLine);
    }

    function parseNumber(value, fallback = 0) {
        if (value === null || value === undefined || value === "") return fallback;
        const cleaned = String(value).trim().replace(/,/g, "");
        const number = Number(cleaned);
        return Number.isNaN(number) ? fallback : number;
    }

    function parsePercentPoints(value, fallback = null) {
        if (value === null || value === undefined || value === "") return fallback;
        const raw = String(value).trim();
        const hasPercentSign = raw.includes("%");
        const cleaned = raw.replace(/,/g, "").replace(/%/g, "");
        const number = Number(cleaned);
        if (!Number.isFinite(number)) return fallback;
        // CSV may expose a percentage-formatted cell as either "10.2%" or 0.102.
        if (hasPercentSign) return number;
        return Math.abs(number) <= 1 ? number * 100 : number;
    }

    function parseKeyValueCsv(text) {
        const rows = parseRows(text);
        const result = {};

        rows.slice(1).forEach(cols => {
            if (cols.length < 2) return;
            const key = String(cols[0]).trim();
            const raw = String(cols[1]).trim();
            if (!key) return;

            const numeric = parseNumber(raw, NaN);
            result[key] = Number.isNaN(numeric) ? raw : numeric;
        });

        return result;
    }

    function parseRiverCalibrationCsv(text) {
        const rows = parseRows(text);
        const blocks = {};
        let current = null;

        rows.forEach(cols => {
            const a = String(cols[0] ?? "").trim();
            const b = String(cols[1] ?? "").trim();
            const c = String(cols[2] ?? "").trim();
            const mode = b.toUpperCase();

            if (a && ["UPPERBOUND", "LOWERBOUND", "STATE"].includes(mode) && c.toUpperCase() === "SCORE") {
                current = {
                    name: a.toUpperCase(),
                    mode: mode === "UPPERBOUND" ? "upper" : mode === "LOWERBOUND" ? "lower" : "state",
                    rows: []
                };
                blocks[current.name] = current;
                return;
            }

            if (!current || !a) return;
            const score = parseNumber(c, null);
            if (!Number.isFinite(score)) return;

            if (current.mode === "state") {
                const state = b.toUpperCase();
                if (state) current.rows.push({ state, score });
            } else {
                const threshold = parseNumber(b, null);
                if (Number.isFinite(threshold)) current.rows.push({ threshold, score });
            }
        });

        return blocks;
    }

    function headerIndex(headers, ...names) {
        const upper = headers.map(h => String(h).trim().toUpperCase());
        for (const name of names) {
            const index = upper.indexOf(String(name).trim().toUpperCase());
            if (index >= 0) return index;
        }
        return -1;
    }

    function parseBoolean(value, fallback = true) {
        const v = String(value ?? "").trim().toUpperCase();
        if (["TRUE", "Y", "YES", "1"].includes(v)) return true;
        if (["FALSE", "N", "NO", "0"].includes(v)) return false;
        return fallback;
    }

    function parsePortfolioConfigCsv(text) {
        const rows = parseRows(text);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim());
        const orderIdx = headerIndex(headers, "configOrder", "Display Order", "Order");
        const idIdx = headerIndex(headers, "configId", "GroupId", "Id");
        const labelIdx = headerIndex(headers, "displayLabel", "Label");
        const targetIdx = headerIndex(headers, "targetWeight", "Target Weight");
        const controlIdx = headerIndex(headers, "controlType", "Control Type");
        const roleIdx = headerIndex(headers, "assetRole", "Asset Role", "Role");
        const classIdx = headerIndex(headers, "assetClass", "Asset Class", "Class");
        const enabledIdx = headerIndex(headers, "isEnabled", "Enabled");

        return rows.slice(1).map(cols => {
            const configId = String(cols[idIdx] || "").trim().toUpperCase();
            if (!configId) return null;

            return {
                configOrder: parseNumber(cols[orderIdx], 999),
                configId,
                displayLabel: String(cols[labelIdx] || configId).trim(),
                targetWeight: parseNumber(cols[targetIdx], 0),
                controlType: String(cols[controlIdx] || "MIN").trim().toUpperCase(),
                assetRole: String(cols[roleIdx] || "GROWTH").trim().toUpperCase(),
                assetClass: String(cols[classIdx] || configId).trim().toUpperCase(),
                isEnabled: parseBoolean(cols[enabledIdx], true)
            };
        }).filter(Boolean).sort((a, b) => a.configOrder - b.configOrder);
    }

    function parseControlRulesCsv(text) {
        const rows = parseRows(text);
        if (rows.length < 2) return {};

        const headers = rows[0].map(h => String(h).trim());
        const controlIdx = headerIndex(headers, "controlType", "Control Type");
        const modeIdx = headerIndex(headers, "evaluationMode", "Evaluation Mode");
        const satThresholdIdx = headerIndex(headers, "satThreshold", "SAT Threshold");
        const buildThresholdIdx = headerIndex(headers, "buildThreshold", "BUILD Threshold");
        const satStatusIdx = headerIndex(headers, "satStatus", "SAT Status");
        const buildStatusIdx = headerIndex(headers, "buildStatus", "BUILD Status");
        const rebalanceStatusIdx = headerIndex(headers, "rebalanceStatus", "REBALANCE Status");

        return rows.slice(1).reduce((acc, cols) => {
            const controlType = String(cols[controlIdx] || "").trim().toUpperCase();
            if (!controlType) return acc;

            const satThreshold = parseNumber(cols[satThresholdIdx], 1);
            const buildThreshold = parseNumber(cols[buildThresholdIdx], 5);

            acc[controlType] = {
                controlType,
                evaluationMode: String(cols[modeIdx] || (controlType === "MAX" ? "UPPER_ONLY" : "ABS")).trim().toUpperCase(),
                satThreshold: Math.max(0, satThreshold),
                buildThreshold: Math.max(satThreshold, buildThreshold),
                satStatus: String(cols[satStatusIdx] || "SAT").trim().toUpperCase(),
                buildStatus: String(cols[buildStatusIdx] || "BUILD").trim().toUpperCase(),
                rebalanceStatus: String(cols[rebalanceStatusIdx] || "REBALANCE").trim().toUpperCase()
            };
            return acc;
        }, {});
    }

    function parsePortfolioCsv(text) {
        const rows = parseRows(text);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim());
        const tickerIdx = headerIndex(headers, "holdingTicker", "Ticker");
        const groupIdx = headerIndex(headers, "holdingGroup", "Group", "GroupId");
        const quantityIdx = headerIndex(headers, "quantity", "Shares");
        const avgPriceIdx = headerIndex(headers, "avgPriceKRW", "AvgCostKRW", "Avg Price (KRW)");
        const targetIdx = headerIndex(headers, "TargetWeight");

        return rows.slice(1).map(cols => {
            const holdingTicker = String(cols[tickerIdx] || "").trim().toUpperCase();
            if (!holdingTicker) return null;

            const holdingGroup = groupIdx >= 0
                ? String(cols[groupIdx] || holdingTicker).trim().toUpperCase()
                : holdingTicker;

            return {
                holdingTicker,
                holdingGroup,
                quantity: parseNumber(cols[quantityIdx], 0),
                avgPriceKRW: parseNumber(cols[avgPriceIdx], 0),
                // Backward-compatible aliases.
                ticker: holdingTicker,
                shares: parseNumber(cols[quantityIdx], 0),
                avgCostKRW: parseNumber(cols[avgPriceIdx], 0),
                targetWeight: targetIdx >= 0 ? parseNumber(cols[targetIdx], 0) : 0
            };
        }).filter(Boolean);
    }


    function parseLogbookCsv(text) {
        const rows = parseRows(text);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim().toUpperCase());
        const idx = name => headers.indexOf(name.toUpperCase());

        const dateIdx = idx("Date");
        const eventIdx = idx("EventType");
        const refuelTypeIdx = idx("RefuelType");
        const principalIdx = idx("PrincipalKRW");
        const marketIdx = idx("MarketValueKRW");
        const targetIdx = idx("TargetValueKRW");
        const planGapIdx = idx("PlanGap");
        const dailyTrendIdx = idx("DailyTrend");
        const voyageStateIdx = idx("VoyageState");
        const trendIdx = idx("Trend");
        const titleIdx = idx("Title");
        const messageIdx = idx("Message");
        const logbookIdx = idx("Logbook");

        // Backward compatibility with the previous OpenSeaLogbook schema.
        const returnIdx = idx("ReturnPct");
        const memoIdx = idx("Memo");
        const milestoneIdx = idx("Milestone");
        const noteIdx = idx("Note");
        const markerIdx = idx("Marker");
        const phaseIdx = idx("Phase");

        const parsePercent = (value, fallback = 0) => {
            if (value === null || value === undefined || value === "") return fallback;
            const cleaned = String(value).trim().replace(/,/g, "").replace(/%/g, "");
            const number = Number(cleaned);
            return Number.isNaN(number) ? fallback : number;
        };

        return rows.slice(1).map(cols => {
            const date = String(cols[dateIdx] || "").trim();
            if (!date) return null;

            const principal = parseNumber(cols[principalIdx], 0);
            const market = parseNumber(cols[marketIdx], 0);
            const target = targetIdx >= 0 ? parseNumber(cols[targetIdx], 0) : 0;
            const computedPlanGap = target > 0 ? ((market / target) - 1) * 100 : 0;
            const returnPct = principal > 0 ? ((market / principal) - 1) * 100 : parsePercent(cols[returnIdx], 0);

            const eventType = eventIdx >= 0
                ? String(cols[eventIdx] || "").trim().toUpperCase()
                : (markerIdx >= 0 ? String(cols[markerIdx] || "").trim().toUpperCase() : "");
            const refuelType = refuelTypeIdx >= 0
                ? String(cols[refuelTypeIdx] || "").trim().toUpperCase()
                : "";
            const voyageState = voyageStateIdx >= 0
                ? String(cols[voyageStateIdx] || "").trim().toUpperCase()
                : "";
            const trend = trendIdx >= 0
                ? String(cols[trendIdx] || "").trim().toUpperCase()
                : "";
            const message = messageIdx >= 0
                ? String(cols[messageIdx] || "").trim()
                : (memoIdx >= 0
                    ? String(cols[memoIdx] || "").trim()
                    : (noteIdx >= 0 ? String(cols[noteIdx] || "").trim() : ""));
            const title = titleIdx >= 0
                ? String(cols[titleIdx] || "").trim()
                : (message || eventType || "Log Entry");

            const logbook = logbookIdx >= 0
                ? parseBoolean(cols[logbookIdx], false)
                : (milestoneIdx >= 0 ? parseBoolean(cols[milestoneIdx], false) : true);

            return {
                date,
                eventType,
                refuelType,
                principalKRW: principal,
                marketValueKRW: market,
                targetValueKRW: target,
                planGap: planGapIdx >= 0 ? parsePercent(cols[planGapIdx], computedPlanGap) : computedPlanGap,
                dailyTrend: dailyTrendIdx >= 0 ? parsePercent(cols[dailyTrendIdx], 0) : 0,
                voyageState,
                trend,
                title,
                message,
                logbook,
                returnPct,
                // Backward-compatible aliases for existing render helpers.
                memo: message,
                milestone: logbook,
                note: message,
                marker: eventType,
                phase: phaseIdx >= 0 ? String(cols[phaseIdx] || "").trim().toUpperCase() : ""
            };
        }).filter(Boolean);
    }

    function applyLogbook(logbookRows) {
        if (!Array.isArray(logbookRows) || logbookRows.length === 0) {
            console.warn("VOYAGE_LOG CSV parsed but no usable rows found. Keeping fallback logbook.");
            return false;
        }

        riverwatch.openSeaLogbook = logbookRows;
        riverwatch.logbook = logbookRows;
        console.log("RiverWatch VOYAGE_LOG AUTO", logbookRows);
        return true;
    }

    function parseMarketPeakCsv(text) {
        const rows = parseRows(text);
        const row = rows?.[1] || [];
        const date = String(row?.[0] || "").trim();       // A2
        const marketValueKRW = parseNumber(row?.[2], NaN); // C2
        const planGap = parsePercentPoints(row?.[4], null); // E2

        if (!date && !Number.isFinite(marketValueKRW) && !Number.isFinite(planGap)) return null;
        return {
            date,
            marketValueKRW: Number.isFinite(marketValueKRW) ? marketValueKRW : null,
            planGap: Number.isFinite(planGap) ? planGap : null
        };
    }

    function applyMarketPeak(record) {
        if (!record) {
            console.warn("MARKET_PEAK CSV parsed but A2/C2/E2 are unavailable.");
            return false;
        }
        riverwatch.marketPeak = record;
        console.log("RiverWatch MARKET_PEAK AUTO", record);
        return true;
    }

    function normalizeManualConfig(rawConfig) {
        const config = {};

        Object.keys(rawConfig || {}).forEach(key => {
            const normalizedKey = String(key).trim();
            config[normalizedKey] = rawConfig[key];
        });

        return config;
    }

    function normalizeTrend(value) {
        const v = String(value || "").trim().toUpperCase();
        if (["STR_INC", "STRONGLY_INCREASING", "STRONG_INCREASING"].includes(v)) return "strongIncreasing";
        if (["INC", "INCREASING"].includes(v)) return "increasing";
        if (["STABLE", "S"].includes(v)) return "stable";
        if (["DEC", "DECREASING"].includes(v)) return "decreasing";
        if (["STR_DEC", "STRONGLY_DECREASING", "STRONG_DECREASING"].includes(v)) return "strongDecreasing";
        return String(value || "").trim();
    }

    function normalizeFedState(value) {
        const v = String(value || "").trim().toUpperCase();
        if (["CUT", "CUTTING"].includes(v)) return "cutting";
        if (["CUT_EXPECTED", "CUTEXPECTED"].includes(v)) return "cutExpected";
        if (["PAUSE", "P"].includes(v)) return "pause";
        if (["HIKE", "HIKING"].includes(v)) return "hiking";
        if (["HIKING_ENDED", "HIKINGENDED"].includes(v)) return "hikingEnded";
        return String(value || "").trim().toLowerCase();
    }

    function applyMarketData(csvData) {
        if (!csvData || Object.keys(csvData).length === 0) {
            throw new Error("CSV parsed but no usable market data found.");
        }

        riverwatch.auto.marketPrices = riverwatch.auto.marketPrices || {};

        Object.keys(csvData).forEach(rawKey => {
            const key = String(rawKey).trim().toUpperCase();
            const value = csvData[rawKey];
            if (key === "FX_ASOF") {
                riverwatch.auto.fxAsOf = String(value ?? "").trim();
                return;
            }
            const parsed = parseNumber(value, null);
            if (key === "USDKRW") riverwatch.auto.usdkrw = parsed;
            else if (key === "VIX") riverwatch.auto.vix = parsed;
            else {
                riverwatch.auto.marketPrices[key] = parsed;
                riverwatch.auto[key] = parsed;
            }
        });

        console.log("RiverWatch MarketData AUTO", csvData);
    }

    function applyPortfolioConfig(configRows) {
        if (!Array.isArray(configRows) || configRows.length === 0) {
            throw new Error("PortfolioConfig CSV parsed but no usable config found.");
        }

        const enabledRows = configRows.filter(item => item.isEnabled !== false);
        riverwatch.portfolioConfiguration = enabledRows;

        // Backward-compatible target map for older render/calculation helpers.
        riverwatch.manual.boatConfiguration = enabledRows.reduce((acc, item) => {
            acc[item.configId] = Number(item.targetWeight || 0);
            return acc;
        }, {});

        console.log("RiverWatch PortfolioConfig AUTO", enabledRows);
    }

    function applyControlRules(controlRules) {
        if (!controlRules || Object.keys(controlRules).length === 0) {
            throw new Error("ControlRules CSV parsed but no usable rules found.");
        }

        riverwatch.controlRules = {
            ...(riverwatch.controlRules || {}),
            ...controlRules
        };
        console.log("RiverWatch ControlRules AUTO", riverwatch.controlRules);
    }

    function applyPortfolio(portfolioRows) {
        if (!Array.isArray(portfolioRows) || portfolioRows.length === 0) {
            throw new Error("Portfolio CSV parsed but no usable holdings found.");
        }

        riverwatch.portfolio = portfolioRows;
        console.log("RiverWatch Portfolio AUTO", portfolioRows);
    }

    function applyManualConfig(rawConfig) {
        if (!rawConfig || Object.keys(rawConfig).length === 0) {
            throw new Error("ManualConfig CSV parsed but no usable config found.");
        }

        const config = normalizeManualConfig(rawConfig);
        riverwatch.manualConfig = {
            ...riverwatch.manualConfig,
            ...config
        };

        // Compatibility aliases for calculation engines.
        if (config.aiCapexTrend !== undefined) riverwatch.manualConfig.aiCapexTrend = normalizeTrend(config.aiCapexTrend);
        if (config.m2Trend !== undefined) riverwatch.manualConfig.m2Trend = normalizeTrend(config.m2Trend);
        if (config.fedRateState !== undefined) riverwatch.manualConfig.fedRateState = normalizeFedState(config.fedRateState);

        [
            "BrentPrice",
            "fedRate",
            "nvdaDcRevenueGrowth",
            "cashKRW",
            "openSeaTargetKRW",
            "expectedCAGR",
            "monthlyContributionKRW",
            "boatAdjustment"
        ].forEach(key => {
            if (riverwatch.manualConfig[key] !== undefined) {
                riverwatch.manualConfig[key] = parseNumber(riverwatch.manualConfig[key], null);
            }
        });

        console.log("RiverWatch ManualConfig AUTO", riverwatch.manualConfig);
    }

    async function fetchWithTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                cache: "no-store",
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`CSV fetch failed: ${response.status}`);
            }

            return await response.text();
        } finally {
            clearTimeout(timer);
        }
    }

    async function loadMarketData() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.marketCsvUrl || hub?.csvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("MarketData CSV URL missing. Using fallback market data.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        applyMarketData(parseKeyValueCsv(csvText));
        return true;
    }

    async function loadPortfolioConfig() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.portfolioConfigCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("PortfolioConfig CSV URL missing. Using fallback portfolio config.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        applyPortfolioConfig(parsePortfolioConfigCsv(csvText));
        return true;
    }

    async function loadControlRules() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.controlRulesCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("ControlRules CSV URL missing. Using fallback control rules.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        applyControlRules(parseControlRulesCsv(csvText));
        return true;
    }

    async function loadPortfolio() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.portfolioCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("Portfolio CSV URL missing. Using fallback portfolio.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        applyPortfolio(parsePortfolioCsv(csvText));
        return true;
    }

    async function loadManualConfig() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.manualConfigCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("ManualConfig CSV URL missing. Using fallback manual config.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        applyManualConfig(parseKeyValueCsv(csvText));
        return true;
    }

    async function loadRiverCalibration() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.riverCalibrationCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("RIVER_CALIBRATION CSV URL missing. Calibrated River sensors remain unavailable.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        const blocks = parseRiverCalibrationCsv(csvText);
        const requiredBlocks = ["FED_RATE_LEVEL", "FED_DIRECTION", "VIX_LEVEL", "BRENT_LEVEL", "USD_KRW", "NVDA_DC_REVENUE_GROWTH"];
        const missing = requiredBlocks.filter(name => !blocks[name] || !Array.isArray(blocks[name].rows) || blocks[name].rows.length === 0);
        if (missing.length) throw new Error(`RIVER_CALIBRATION missing blocks: ${missing.join(", ")}`);

        riverwatch.riverCalibration = blocks;
        console.log("RiverWatch RIVER_CALIBRATION AUTO", blocks);
        return true;
    }

    async function loadVoyagePlan() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.voyagePlanCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("VOYAGE_PLAN CSV URL missing. Required CAGR remains unavailable.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        const rows = parseRows(csvText);
        const rawB11 = rows?.[10]?.[1];
        const requiredCAGR = parsePercentPoints(rawB11, null);
        if (!Number.isFinite(requiredCAGR) || requiredCAGR <= 0 || requiredCAGR > 100) {
            throw new Error(`VOYAGE_PLAN!B11 Required CAGR invalid: ${rawB11 ?? "(empty)"}`);
        }

        riverwatch.manualConfig.requiredCAGR = requiredCAGR;
        console.log("RiverWatch VOYAGE_PLAN AUTO", { requiredCAGR, source: "VOYAGE_PLAN!B11" });
        return true;
    }

    async function loadOpenSeaLogbook() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.openSeaLogbookCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("OpenSeaLogbook CSV URL missing. Using fallback logbook.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        return applyLogbook(parseLogbookCsv(csvText));
    }

    async function loadMarketPeak() {
        const hub = riverwatch.policy.marketDataHub;
        const url = hub?.marketPeakCsvUrl;

        if (!hub || hub.enabled !== true || !url) {
            console.warn("MARKET_PEAK CSV URL missing. Peak record remains unavailable.");
            return false;
        }

        const csvText = await fetchWithTimeout(url, hub.timeoutMs || 5000);
        return applyMarketPeak(parseMarketPeakCsv(csvText));
    }

    async function loadCoreData() {
        const labels = ["MarketData", "PortfolioConfig", "ControlRules", "Portfolio", "ManualConfig", "RiverCalibration", "VoyagePlan"];

        try {
            const results = await Promise.allSettled([
                loadMarketData(),
                loadPortfolioConfig(),
                loadControlRules(),
                loadPortfolio(),
                loadManualConfig(),
                loadRiverCalibration(),
                loadVoyagePlan()
            ]);

            const syncStatus = {};
            const syncErrors = {};
            results.forEach((result, index) => {
                const label = labels[index];
                const ok = result.status === "fulfilled" && result.value === true;
                syncStatus[label] = ok;
                if (!ok) {
                    const message = result.status === "rejected"
                        ? String(result.reason?.message || result.reason || "Load failed")
                        : "Loader returned false";
                    syncErrors[label] = message;
                    console.warn(`RiverWatch ${label} load failed`, message);
                }
            });

            const okCount = Object.values(syncStatus).filter(Boolean).length;
            riverwatch.auto.syncStatus = syncStatus;
            riverwatch.auto.syncErrors = syncErrors;
            riverwatch.auto.dataSource = okCount === labels.length ? "ONLINE" : (okCount > 0 ? "PARTIAL" : "FALLBACK");

            if (okCount === labels.length) riverwatch.auto.lastSync = nowString();
            console.table(syncStatus);
            return okCount === labels.length;
        } catch (error) {
            riverwatch.auto.dataSource = "FALLBACK";
            riverwatch.auto.syncErrors = { General: String(error?.message || error) };
            console.warn("RiverWatch Core Data load failed", error);
            return false;
        }
    }

    async function loadAllData() {
        const coreOk = await loadCoreData();
        if (!coreOk) return false;
        const results = await Promise.allSettled([loadOpenSeaLogbook(), loadMarketPeak()]);
        const logbookOk = results[0].status === "fulfilled" && results[0].value === true;
        const peakOk = results[1].status === "fulfilled" && results[1].value === true;
        if (!logbookOk) console.warn("RiverWatch OpenSeaLogbook load failed", results[0].reason || "Loader returned false");
        if (!peakOk) console.warn("RiverWatch MARKET_PEAK load failed", results[1].reason || "Loader returned false");
        return logbookOk;
    }

    return {
        loadAllData,
        loadCoreData,
        loadMarketData,
        loadPortfolioConfig,
        loadControlRules,
        loadPortfolio,
        loadManualConfig,
        loadRiverCalibration,
        loadVoyagePlan,
        loadOpenSeaLogbook,
        loadMarketPeak,
        parseKeyValueCsv,
        parseRiverCalibrationCsv,
        parsePortfolioConfigCsv,
        parseControlRulesCsv,
        parsePortfolioCsv,
        parseLogbookCsv,
        parseMarketPeakCsv
    };

})();
