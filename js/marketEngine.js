/****************************************************************************
 * RiverWatch Market Engine v0.4.0-cab006.0
 * Google Sheet v2.0 CSV Hub Reader
 * - MarketData: live market prices
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

    function parsePortfolioCsv(text) {
        const rows = parseRows(text);
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim().toUpperCase());
        const idx = name => headers.indexOf(name.toUpperCase());

        const tickerIdx = idx("Ticker");
        const sharesIdx = idx("Shares");
        const avgCostIdx = idx("AvgCostKRW");
        const targetIdx = idx("TargetWeight");

        return rows.slice(1).map(cols => {
            const ticker = String(cols[tickerIdx] || "").trim().toUpperCase();
            if (!ticker) return null;

            return {
                ticker,
                shares: parseNumber(cols[sharesIdx], 0),
                avgCostKRW: parseNumber(cols[avgCostIdx], 0),
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
        const titleIdx = idx("Title");
        const principalIdx = idx("PrincipalKRW");
        const marketIdx = idx("MarketValueKRW");
        const targetIdx = idx("TargetValueKRW");
        const returnIdx = idx("ReturnPct");
        const memoIdx = idx("Memo");
        const milestoneIdx = idx("Milestone");

        // Backward compatibility with CAB-006 OpenSeaLogbook schema.
        const noteIdx = idx("Note");
        const markerIdx = idx("Marker");
        const phaseIdx = idx("Phase");

        return rows.slice(1).map(cols => {
            const date = String(cols[dateIdx] || "").trim();
            if (!date) return null;

            const principal = parseNumber(cols[principalIdx], 0);
            const market = parseNumber(cols[marketIdx], 0);
            const returnPct = principal > 0 ? ((market / principal) - 1) * 100 : parseNumber(cols[returnIdx], 0);
            const eventType = eventIdx >= 0
                ? String(cols[eventIdx] || "").trim().toUpperCase()
                : (markerIdx >= 0 ? String(cols[markerIdx] || "").trim().toUpperCase() : "LOG");
            const memo = memoIdx >= 0
                ? String(cols[memoIdx] || "").trim()
                : (noteIdx >= 0 ? String(cols[noteIdx] || "").trim() : "");
            const title = titleIdx >= 0
                ? String(cols[titleIdx] || "").trim()
                : (memo || eventType || "Log Entry");

            return {
                date,
                eventType,
                title,
                principalKRW: principal,
                marketValueKRW: market,
                targetValueKRW: targetIdx >= 0 ? parseNumber(cols[targetIdx], 0) : 0,
                returnPct,
                memo,
                milestone: milestoneIdx >= 0 ? String(cols[milestoneIdx] || "").trim().toUpperCase() === "TRUE" : true,
                // Backward-compatible aliases.
                note: memo,
                marker: eventType,
                phase: phaseIdx >= 0 ? String(cols[phaseIdx] || "").trim().toUpperCase() : ""
            };
        }).filter(Boolean);
    }

    function applyLogbook(logbookRows) {
        if (!Array.isArray(logbookRows) || logbookRows.length === 0) {
            console.warn("OpenSeaLogbook CSV parsed but no usable rows found. Keeping fallback logbook.");
            return false;
        }

        riverwatch.openSeaLogbook = logbookRows;
        riverwatch.logbook = logbookRows;
        console.log("RiverWatch OpenSeaLogbook AUTO", logbookRows);
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
        if (["STR_INC", "INC", "INCREASING", "STRONGLY_INCREASING"].includes(v)) return "increasing";
        if (["STABLE", "S"].includes(v)) return "stable";
        if (["STR_DEC", "DEC", "DECREASING", "STRONGLY_DECREASING"].includes(v)) return "decreasing";
        return String(value || "").trim().toLowerCase();
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
            if (key === "USDKRW") riverwatch.auto.usdkrw = Number(value);
            else if (key === "VIX") riverwatch.auto.vix = Number(value);
            else {
                riverwatch.auto.marketPrices[key] = Number(value);
                riverwatch.auto[key] = Number(value);
            }
        });

        console.log("RiverWatch MarketData AUTO", csvData);
    }

    function applyPortfolio(portfolioRows) {
        if (!Array.isArray(portfolioRows) || portfolioRows.length === 0) {
            throw new Error("Portfolio CSV parsed but no usable holdings found.");
        }

        riverwatch.portfolio = portfolioRows;

        const target = {};
        portfolioRows.forEach(item => {
            if (Number(item.targetWeight || 0) > 0) {
                target[item.ticker] = Number(item.targetWeight);
            }
        });
        target.INDIVIDUAL = Number((riverwatch.manual.boatConfiguration || {}).INDIVIDUAL ?? 10);
        riverwatch.manual.boatConfiguration = target;

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
            "nvdaDcRevenueGrowth",
            "cashKRW",
            "openSeaTargetKRW",
            "expectedCAGR",
            "monthlyContributionKRW",
            "boatAdjustment"
        ].forEach(key => {
            if (riverwatch.manualConfig[key] !== undefined) {
                riverwatch.manualConfig[key] = parseNumber(riverwatch.manualConfig[key], 0);
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

    async function loadAllData() {
        const labels = ["MarketData", "Portfolio", "ManualConfig"];

        try {
            const results = await Promise.allSettled([
                loadMarketData(),
                loadPortfolio(),
                loadManualConfig()
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

            riverwatch.auto.lastSync = nowString();
            riverwatch.auto.syncStatus = syncStatus;
            riverwatch.auto.syncErrors = syncErrors;
            riverwatch.auto.dataSource = okCount === 3 ? "ONLINE" : (okCount > 0 ? "PARTIAL" : "FALLBACK");

            console.table(syncStatus);

            try {
                await loadOpenSeaLogbook();
            } catch (logError) {
                console.warn("RiverWatch OpenSeaLogbook optional load failed", logError);
            }

            return okCount === 3;
        } catch (error) {
            riverwatch.auto.dataSource = "FALLBACK";
            riverwatch.auto.syncStatus = {
                MarketData: false,
                Portfolio: false,
                ManualConfig: false
            };
            riverwatch.auto.syncErrors = { General: String(error?.message || error) };
            console.warn("RiverWatch Google Sheet v2.0 FALLBACK", error);
            return false;
        }
    }

    return {
        loadAllData,
        loadMarketData,
        loadPortfolio,
        loadManualConfig,
        loadOpenSeaLogbook,
        parseKeyValueCsv,
        parsePortfolioCsv,
        parseLogbookCsv
    };

})();
