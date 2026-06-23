/****************************************************************************
 * RiverWatch Data Configuration v0.2.3
 *
 * [CONST]  : 거의 변경하지 않는 독트린/문구
 * [POLICY] : 사용자가 수정 가능한 판단 기준과 가중치
 * [MANUAL] : 사용자가 직접 입력하는 목표/보유/수동 지표
 * [AUTO]   : Google Sheet CSV Hub 또는 향후 API 자동 입력값
 * [CALC]   : 계산 결과 기본값. 엔진 실패 시 fallback으로 사용
 ****************************************************************************/

const riverwatch = {

    /* ========================================================================
     * [CONST] Doctrine
     * ======================================================================*/
    const: {
        version: "0.2.3",
        mission: "Stay the Course",
        subtitle: "A personal doctrine execution system for reaching the Open Sea.",
        operator: "NIMS",
        principles: [
            "Observe the River.",
            "Adapt the Boat.",
            "Continue the Voyage."
        ],
        developmentDoctrine: [
            "Automate what changes often.",
            "Manualize what changes rarely.",
            "Never increase complexity for insignificant gains."
        ]
    },

    /* ========================================================================
     * [POLICY] 사용자 수정 가능 판단 기준
     * ======================================================================*/
    policy: {
        marketDataHub: {
            enabled: true,
            provider: "Google Sheet CSV Hub",
            csvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=0",
            timeoutMs: 5000
        },

        riverMetricWeights: {
            fedRate: 25,
            vix: 20,
            bno: 15,
            usdkrw: 10,
            aiCapex: 15,
            nvdaDcRevenue: 10,
            m2: 5
        },

        boatHealthWeights: {
            alignment: 0.30,
            suitability: 0.70
        },

        suitabilityWeights: {
            growth: 0.50,
            defensive: 0.40,
            maneuverability: 0.10
        },

        actionThresholds: {
            stayCourse: 90,
            keepWatch: 80,
            adaptBoat: 70,
            recoverCourse: 80
        },

        riverMatrix: {
            usdkrw: [
                { max: 1350, growth: 2, defensive: -1, label: "Risk-on friendly" },
                { max: 1450, growth: 1, defensive: 0, label: "Normal" },
                { max: 1525, growth: 0, defensive: 1, label: "Caution" },
                { max: 1600, growth: -1, defensive: 2, label: "Defensive favored" },
                { max: Infinity, growth: -3, defensive: 3, label: "FX stress" }
            ],
            vix: [
                { max: 15, growth: 2, defensive: -1, label: "Calm" },
                { max: 20, growth: 1, defensive: 0, label: "Stable" },
                { max: 25, growth: 0, defensive: 0, label: "Neutral" },
                { max: 35, growth: -2, defensive: 2, label: "Fear rising" },
                { max: Infinity, growth: -3, defensive: 3, label: "Stress" }
            ],
            bnoChange30d: [
                { max: -10, growth: 2, defensive: -2, label: "Inflation cooling strongly" },
                { max: -5, growth: 1, defensive: -1, label: "Inflation cooling" },
                { max: 5, growth: 0, defensive: 0, label: "Neutral" },
                { max: 10, growth: -1, defensive: 1, label: "Inflation pressure rising" },
                { max: Infinity, growth: -2, defensive: 2, label: "Inflation pressure high" }
            ]
        }
    },

    /* ========================================================================
     * [MANUAL] 사용자가 직접 수정하는 목표와 보유 현황
     * ======================================================================*/
    manual: {
        openSeaTarget: 1600000000,
        targetDate: "2040.12",
        expectedCAGR: 0.11,
        monthlyContribution: 1500000,

        aiCapexTrend: "increasing",
        nvdaDcRevenueGrowth: 40,
        fedRateState: "pause",
        m2Trend: "stable",

        boatConfiguration: {
            QQQM: 40,
            SPYM: 25,
            SCHD: 15,
            IAUM: 8,
            BITQ: 2,
            INDIVIDUAL: 10
        },

        holdings: [
            { ticker: "QQQM", current: 38.7, shares: 0, avgPrice: 0 },
            { ticker: "SPYM", current: 25.8, shares: 0, avgPrice: 0 },
            { ticker: "SCHD", current: 14.2, shares: 0, avgPrice: 0 },
            { ticker: "IAUM", current: 8.1, shares: 0, avgPrice: 0 },
            { ticker: "BITQ", current: 2.1, shares: 0, avgPrice: 0 },
            { ticker: "INDIVIDUAL", current: 11.1, shares: 0, avgPrice: 0 }
        ]
    },

    /* ========================================================================
     * [AUTO] CSV Hub 실패 시 fallback 값
     * ======================================================================*/
    auto: {
        lastSync: "2026.06.23 13:30",
        dataSource: "FALLBACK",
        usdkrw: 1538.25,
        vix: 17.28,
        bno: 43.12,
        QQQM: 303.90,
        SPYM: 0,
        SCHD: 31.89,
        IAUM: 41.76,
        BITQ: 27.55
    },

    /* ========================================================================
     * [CALC] 계산값 fallback
     * ======================================================================*/
    calc: {
        status: "STAY THE COURSE",
        recommendedAction: "NO ACTION",
        daysSinceAction: 36,
        lastRebalance: "2026.05.17",
        doctrineCompliance: 100,

        voyageHealth: 96,
        riverHealth: 88,
        boatHealth: 91,

        currentPosition: 103000000,
        expectedPosition: 107000000,
        projectedAsset: 1740000000,
        eta: "2040.03",
        remainingTime: "14y 6m",

        alignmentScore: 92,
        suitabilityScore: 90,
        growthSuitability: 93,
        defensiveSuitability: 86,
        maneuverability: 82,

        captainNote: "Architecture stabilized. Proceed to implementation.",
        actionReason: "The river remains favorable. The boat is well configured. Continue the voyage.",

        logbook: [
            {
                date: "2026.06.23",
                river: 88,
                boat: 91,
                voyage: 96,
                action: "NO ACTION",
                status: "STAY THE COURSE",
                note: "Architecture stabilized. Further refinement yields diminishing returns. Proceed to implementation."
            }
        ]
    }
};
