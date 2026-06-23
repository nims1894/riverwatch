/****************************************************************************
 * RiverWatch Market Engine v0.2.3
 * Google Sheet CSV Hub Reader
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

    function parseCsv(text) {
        const rows = text.trim().split(/\r?\n/).map(row => row.split(","));
        const result = {};

        rows.slice(1).forEach(cols => {
            if (cols.length < 2) return;
            const key = String(cols[0]).trim().toUpperCase();
            const rawValue = String(cols[1]).trim().replace(/,/g, "");
            const value = Number(rawValue);
            if (key && !Number.isNaN(value)) {
                result[key] = value;
            }
        });

        return result;
    }

    function applyMarketData(csvData) {
        if (!csvData || Object.keys(csvData).length === 0) {
            throw new Error("CSV parsed but no usable market data found.");
        }

        if (csvData.USDKRW !== undefined) riverwatch.auto.usdkrw = csvData.USDKRW;
        if (csvData.VIX !== undefined) riverwatch.auto.vix = csvData.VIX;
        if (csvData.BNO !== undefined) riverwatch.auto.bno = csvData.BNO;
        if (csvData.QQQM !== undefined) riverwatch.auto.QQQM = csvData.QQQM;
        if (csvData.SPYM !== undefined) riverwatch.auto.SPYM = csvData.SPYM;
        if (csvData.SCHD !== undefined) riverwatch.auto.SCHD = csvData.SCHD;
        if (csvData.IAUM !== undefined) riverwatch.auto.IAUM = csvData.IAUM;
        if (csvData.BITQ !== undefined) riverwatch.auto.BITQ = csvData.BITQ;

        riverwatch.auto.dataSource = "AUTO";
        riverwatch.auto.lastSync = nowString();
        console.log("RiverWatch MarketHub AUTO", csvData);
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

        if (!hub || !hub.enabled || !hub.csvUrl) {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatch MarketHub disabled or csvUrl missing. Using fallback.");
            return false;
        }

        try {
            const csvText = await fetchWithTimeout(hub.csvUrl, hub.timeoutMs || 5000);
            const parsed = parseCsv(csvText);
            applyMarketData(parsed);
            return true;
        } catch (error) {
            riverwatch.auto.dataSource = "FALLBACK";
            console.warn("RiverWatch MarketHub FALLBACK", error);
            return false;
        }
    }

    return {
        loadMarketData,
        parseCsv
    };

})();
