/****************************************************************************
 * RiverWatch Data Configuration v0.2.7
 *
 * [CONST]  : 거의 변경하지 않는 독트린/문구
 * [POLICY] : 사용자가 수정 가능한 판단 기준과 가중치
 * [MANUAL] : 사용자가 직접 입력하는 목표/보유/수동 지표
 * [AUTO]   : Google Sheet CSV Hub 또는 향후 API 자동 입력값
 * [CALC]   : 계산 결과 기본값. 엔진 실패 시 fallback으로 사용
 *
 * ===========================================================================
 * CAPTAIN INPUT ZONE
 * - 대장님이 직접 입력/관리하는 값은 [MANUAL] 영역입니다.
 * - Captain Approved Baseline 확정 후 ChatGPT는 승인 없이 [MANUAL] 값을 변경하지 않습니다.
 * - 수량(shares), 평단(avgPriceUSD), 현금(cashKRW)만 입력하면 Current Position,
 *   Cost Basis, Boat Return, Allocation, Voyage Health는 자동 계산됩니다.
 * ===========================================================================
 ****************************************************************************/

const riverwatch = {

    /* ========================================================================
     * [CONST] Doctrine
     * ======================================================================*/
    const: {
        version: "0.2.9",
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

        riverHealthScoring: {
            usdkrw: [
                { max: 1350, score: 95, label: "Risk-on friendly" },
                { max: 1450, score: 88, label: "Normal" },
                { max: 1525, score: 78, label: "Caution" },
                { max: 1600, score: 62, label: "FX pressure" },
                { max: Infinity, score: 40, label: "FX stress" }
            ],
            vix: [
                { max: 15, score: 95, label: "Calm" },
                { max: 20, score: 85, label: "Stable" },
                { max: 25, score: 75, label: "Neutral" },
                { max: 35, score: 62, label: "Fear rising" },
                { max: Infinity, score: 40, label: "Stress" }
            ],
            bnoChange30d: [
                { max: -10, score: 92, label: "Inflation cooling strongly" },
                { max: -5, score: 86, label: "Inflation cooling" },
                { max: 5, score: 80, label: "Neutral" },
                { max: 10, score: 65, label: "Inflation pressure rising" },
                { max: Infinity, score: 45, label: "Inflation pressure high" }
            ],
            fedRateState: {
                cutting: { score: 95, growth: 3, defensive: -2, label: "Cutting cycle" },
                cutExpected: { score: 88, growth: 2, defensive: -1, label: "Cut expected" },
                pause: { score: 80, growth: 0, defensive: 0, label: "Pause" },
                hikingEnded: { score: 70, growth: -1, defensive: 1, label: "Hiking ended" },
                hiking: { score: 45, growth: -3, defensive: 2, label: "Hiking cycle" }
            },
            aiCapexTrend: {
                increasing: { score: 95, growth: 3, defensive: -1, label: "Increasing" },
                stable: { score: 82, growth: 1, defensive: 0, label: "Stable" },
                decreasing: { score: 50, growth: -3, defensive: 2, label: "Decreasing" }
            },
            nvdaDcRevenueGrowth: [
                { min: 40, score: 95, growth: 3, defensive: -1, label: "Very strong" },
                { min: 20, score: 86, growth: 1, defensive: 0, label: "Strong" },
                { min: 0, score: 70, growth: 0, defensive: 0, label: "Positive" },
                { min: -Infinity, score: 45, growth: -2, defensive: 1, label: "Weak" }
            ],
            m2Trend: {
                increasing: { score: 95, growth: 2, defensive: -1, label: "Increasing" },
                stable: { score: 80, growth: 0, defensive: 0, label: "Stable" },
                decreasing: { score: 60, growth: -2, defensive: 1, label: "Decreasing" }
            }
        },

        boatHealthWeights: {
            allocationAlignment: 35,
            riverSuitability: 35,
            structuralIntegrity: 20,
            captainDiscipline: 10
        },

        structuralIntegrityWeights: {
            diversification: 40,
            reserve: 35,
            speculation: 25
        },

        boatArchetypeThresholds: {
            aggressiveGrowth: 60,
            balancedGrowth: 45,
            coreIndex: 35
        },

        voyageCagrAdjustment: {
            river: [
                { min: 90, adjustment: 0.010 },
                { min: 80, adjustment: 0.000 },
                { min: 70, adjustment: -0.005 },
                { min: 60, adjustment: -0.010 },
                { min: -Infinity, adjustment: -0.020 }
            ],
            boat: [
                { min: 95, adjustment: 0.005 },
                { min: 90, adjustment: 0.0025 },
                { min: 80, adjustment: 0.000 },
                { min: 70, adjustment: -0.005 },
                { min: -Infinity, adjustment: -0.010 }
            ]
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
     * [MANUAL] CAPTAIN INPUT ZONE - 대장님 직접 수정 영역
     * ======================================================================*/
    manual: {
        // [MANUAL] Voyage target / contribution
        openSeaTarget: 1600000000,      // 1.60B = 16억원
        targetDate: "2040.12",
        expectedCAGR: 0.11,
        monthlyContribution: 1500000,   // KRW / month
        lastRebalance: "2026.06.23",        // [MANUAL] Captain input

        // [MANUAL] River inputs that do not need daily automation
        aiCapexTrend: "increasing",
        nvdaDcRevenueGrowth: 40,
        fedRateState: "pause",
        m2Trend: "stable",
        bnoReference30d: 40.00, // Google Sheet에 BNO_30D가 있으면 AUTO가 우선됨.

        // [MANUAL] Boat target configuration
        boatConfiguration: {
            QQQM: 40,
            SPYM: 25,
            SCHD: 15,
            IAUM: 8,
            BITQ: 2,
            INDIVIDUAL: 10
        },

        // [MANUAL] Portfolio input.
        // 수량과 평단만 입력하면 Current Position / Cost Basis / Return / Allocation은 자동 계산됩니다.
        portfolio: {
            cashKRW: 0,

            etfs: [
                { ticker: "QQQM", shares: 65, avgPriceUSD: 252.2707 },
                { ticker: "SPYM", shares: 20, avgPriceUSD: 86.7 },
                { ticker: "SCHD", shares: 4, avgPriceUSD: 32.335 },
                { ticker: "IAUM", shares: 40, avgPriceUSD: 45.14 },
                { ticker: "BITQ", shares: 1, avgPriceUSD: 28.61 }
            ],

            // 개별주는 수량/평단만 입력합니다.
            // 현재가는 Google Sheet CSV Hub에서 AUTO로 가져옵니다.
            individualStocks: [
                { ticker: "NVDA", shares: 20, avgPriceUSD: 188.1556 },
                { ticker: "MSFT", shares: 10, avgPriceUSD: 400.922 },
                { ticker: "GOOGL", shares: 10, avgPriceUSD: 308.245 },
                { ticker: "PLTR", shares: 30, avgPriceUSD: 149.5867 }
            ]
        }
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
        bno30d: null,
        marketPrices: {},
        QQQM: 303.90,
        SPYM: 86.70,
        SCHD: 31.89,
        IAUM: 41.76,
        BITQ: 27.55,
        NVDA: 208.65,
        MSFT: 367.34,
        GOOGL: 349.68,
        PLTR: 119.50
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
        growthFavorability: 84,
        defensiveFavorability: 36,
        riverMetricScores: {},
        boatHealth: 91,

        currentPosition: 0,
        costBasis: 0,
        boatPnL: 0,
        boatReturn: 0,
        openSeaTarget: 1600000000,
        baseArrival: 1830000000,
        adjustedArrival: 1870000000,
        voyageDrift: 16.8,
        baseCAGR: 0.11,
        riverAdjustment: 0,
        boatAdjustment: 0.0025,
        effectiveCAGR: 0.1125,
        eta: "2040.12",
        remainingTime: "14y 6m",

        allocationHoldings: [],
        allocationAlignment: 92,
        riverSuitability: 90,
        structuralIntegrity: 94,
        captainDiscipline: 100,
        boatArchetype: "Balanced Growth Boat",
        growthExposure: 52,
        defensiveExposure: 48,

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
