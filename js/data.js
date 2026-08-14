/****************************************************************************
 * RiverWatch Data Configuration v0.4.0-cab004
 *
 * [CONST]  : 거의 변경하지 않는 독트린/문구
 * [POLICY] : 사용자가 수정 가능한 판단 기준과 가중치
 * [MANUAL] : Fallback target configuration
 * [AUTO]   : Google Sheet CSV Hub 또는 향후 API 자동 입력값
 * [CALC]   : 계산 결과 기본값. 엔진 실패 시 fallback으로 사용
 *
 * ===========================================================================
 * CAPTAIN INPUT ZONE
 * - Google Sheet v2.0이 SSOT이며 [MANUAL]은 fallback 영역입니다.
 * - Captain Approved Baseline 확정 후 ChatGPT는 승인 없이 [MANUAL] 값을 변경하지 않습니다.
 * - Portfolio / ManualConfig는 Google Sheet에서 우선 로딩됩니다.
 * ===========================================================================
 ****************************************************************************/

const riverwatch = {

    /* ========================================================================
     * [CONST] Doctrine
     * ======================================================================*/
    const: {
        version: "0.4.0-cab022",
        mission: "Stay the Course",
        subtitle: "Personal Navigation System for Reaching the Open Sea.",
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
            marketCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=0",
            portfolioCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=1022059028",
            manualConfigCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=956102677",
            riverCalibrationCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=39917011",
            portfolioConfigCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=283502072",
            controlRulesCsvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=1223105705",
            openSeaLogbookCsvUrl: "https://docs.google.com/spreadsheets/d/1xmJxkPDPyVWjlMJwbvIEA7gtxrhJyXXE8tYVeqhmlRM/export?format=csv&gid=0", // RiverWatch_Voyage_Log / VOYAGE_LOG
            voyagePlanCsvUrl: "https://docs.google.com/spreadsheets/d/1xmJxkPDPyVWjlMJwbvIEA7gtxrhJyXXE8tYVeqhmlRM/export?format=csv&gid=345167648", // RiverWatch_Voyage_Log / VOYAGE_PLAN
            csvUrl: "https://docs.google.com/spreadsheets/d/1OQHGJJ4A6oiXYlyNRSfyyC_6lA_s3Het58K_M20j8G8/export?format=csv&gid=0", // legacy
            timeoutMs: 12000
        },

        // STEP 1C · Captain Order history writer.
        // Paste the deployed RiverWatch Apps Script Web App URL here after deployment.
        // Empty URL keeps RiverWatch read-only and stores the last observed order locally.
        doctrineAudit: {
            enabled: false,
            webAppUrl: "",
            baselineDate: "2026-08-14",
            sellToleranceKRW: 500000
        },

        fuelSupply: {
            baselineDate: "2026-08-14",
            firstEvaluationMonth: "2026-09"
        },

        riverMetricWeights: {
            fedRate: 25,
            vix: 20,
            m2: 15,
            oil: 10,
            usdkrw: 10,
            aiCapex: 10,
            nvdaDcRevenue: 10
        },

        riverHealthMinimumValidWeight: 70,
        manualSensorStaleDays: 120,

        riverHealthScoring: {
            // Numeric metric rules are the SSoT for both River Health and Environment.
            // score is linearly interpolated between finite anchors to avoid step changes.
            usdkrw: [
                { max: 1350, score: 95, growth: 2, defensive: -1, label: "Risk-on friendly" },
                { max: 1450, score: 88, growth: 1, defensive: 0, label: "Normal" },
                { max: 1525, score: 78, growth: 0, defensive: 1, label: "Caution" },
                { max: 1600, score: 62, growth: -1, defensive: 2, label: "Defensive favored" },
                { max: 1700, score: 40, growth: -3, defensive: 3, label: "FX stress" },
                { max: Infinity, score: 40, growth: -3, defensive: 3, label: "FX stress" }
            ],
            vix: [
                { max: 15, score: 95, growth: 2, defensive: -1, label: "Calm" },
                { max: 20, score: 85, growth: 1, defensive: 0, label: "Stable" },
                { max: 25, score: 75, growth: 0, defensive: 0, label: "Neutral" },
                { max: 35, score: 62, growth: -2, defensive: 2, label: "Fear rising" },
                { max: 50, score: 40, growth: -3, defensive: 3, label: "Stress" },
                { max: Infinity, score: 40, growth: -3, defensive: 3, label: "Stress" }
            ],
            oilPressure: [
                { max: 50, score: 90, growth: 1, defensive: 0, label: "Low energy pressure" },
                { max: 65, score: 95, growth: 2, defensive: -1, label: "Favorable energy" },
                { max: 85, score: 95, growth: 2, defensive: -1, label: "Normal growth zone" },
                { max: 100, score: 75, growth: -1, defensive: 1, label: "Inflation pressure" },
                { max: 120, score: 50, growth: -2, defensive: 2, label: "Energy shock" },
                { max: 140, score: 20, growth: -3, defensive: 3, label: "Severe oil stress" },
                { max: Infinity, score: 20, growth: -3, defensive: 3, label: "Severe oil stress" }
            ],
            fedRateState: {
                cutting: { score: 95, growth: 3, defensive: -2, label: "Cutting cycle" },
                cutExpected: { score: 88, growth: 2, defensive: -1, label: "Cut expected" },
                pause: { score: 80, growth: 0, defensive: 0, label: "Pause" },
                hikingEnded: { score: 70, growth: -1, defensive: 1, label: "Hiking ended" },
                hiking: { score: 45, growth: -3, defensive: 2, label: "Hiking cycle" }
            },
            aiCapexTrend: {
                strongIncreasing: { score: 100, growth: 3, defensive: -1, label: "Strong increasing" },
                increasing: { score: 90, growth: 2, defensive: -1, label: "Increasing" },
                stable: { score: 80, growth: 0, defensive: 0, label: "Stable" },
                decreasing: { score: 60, growth: -2, defensive: 1, label: "Decreasing" },
                strongDecreasing: { score: 40, growth: -3, defensive: 2, label: "Strong decreasing" }
            },
            nvdaDcRevenueGrowth: [
                { min: 40, score: 95, growth: 3, defensive: -1, label: "Very strong" },
                { min: 20, score: 86, growth: 1, defensive: 0, label: "Strong" },
                { min: 0, score: 70, growth: 0, defensive: 0, label: "Positive" },
                { min: -Infinity, score: 45, growth: -2, defensive: 1, label: "Weak" }
            ],
            m2Trend: {
                strongIncreasing: { score: 100, growth: 3, defensive: -1, label: "Strong increasing" },
                increasing: { score: 90, growth: 2, defensive: -1, label: "Increasing" },
                stable: { score: 80, growth: 0, defensive: 0, label: "Stable" },
                decreasing: { score: 60, growth: -2, defensive: 1, label: "Decreasing" },
                strongDecreasing: { score: 40, growth: -3, defensive: 2, label: "Strong decreasing" }
            }
        },

        boatHealthWeights: {
            trimBalance: 30,
            riverFit: 20,
            enginePower: 30,
            fuelSupply: 20
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

        // Deprecated compatibility table. Runtime Environment calculation uses
        // riverHealthScoring above as its single source of truth.
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
            oilPressure: [
                { max: 50, growth: -2, defensive: 2, label: "Recession risk" },
                { max: 65, growth: -1, defensive: 1, label: "Demand softening" },
                { max: 85, growth: 2, defensive: -1, label: "Normal growth zone" },
                { max: 100, growth: -1, defensive: 1, label: "Inflation pressure" },
                { max: 120, growth: -2, defensive: 2, label: "Energy shock" },
                { max: Infinity, growth: -3, defensive: 3, label: "Severe oil stress" }
            ]
        }
    },

    /* ========================================================================
     * [MANUAL] Fallback target configuration
     * Google Sheet v2.0이 우선이며, 이 영역은 비상 fallback으로만 사용합니다.
     * ======================================================================*/
    manual: {
        // Backward-compatible target map generated from portfolioConfiguration.
        boatConfiguration: {
            GROWTH_ETF: 40,
            CORE_ETF: 25,
            DIVIDEND: 15,
            GOLD: 8,
            CRYPTO: 2,
            INDIVIDUAL: 10
        }
    },

    /* ========================================================================
     * [PORTFOLIO CONFIG] Fallback portfolio configuration
     * Google Sheet PortfolioConfig 탭이 SSOT입니다.
     * configId = stable portfolio group / displayLabel = screen label.
     * controlType: MIN means maintain at or above target, MAX means cap at or below target.
     * ======================================================================*/
    portfolioConfiguration: [
        { configOrder: 10, configId: "GROWTH_ETF", displayLabel: "QQQM", targetWeight: 40, controlType: "MIN", assetRole: "GROWTH", assetClass: "ETF", isEnabled: true },
        { configOrder: 20, configId: "CORE_ETF", displayLabel: "SPYM", targetWeight: 25, controlType: "MIN", assetRole: "DEFENSIVE", assetClass: "ETF", isEnabled: true },
        { configOrder: 30, configId: "DIVIDEND", displayLabel: "SCHD", targetWeight: 15, controlType: "MIN", assetRole: "DEFENSIVE", assetClass: "ETF", isEnabled: true },
        { configOrder: 40, configId: "GOLD", displayLabel: "IAUM", targetWeight: 8, controlType: "MIN", assetRole: "DEFENSIVE", assetClass: "GOLD", isEnabled: true },
        { configOrder: 50, configId: "CRYPTO", displayLabel: "BITQ", targetWeight: 2, controlType: "MIN", assetRole: "GROWTH", assetClass: "CRYPTO", isEnabled: true },
        { configOrder: 60, configId: "INDIVIDUAL", displayLabel: "INDIVIDUAL", targetWeight: 10, controlType: "MAX", assetRole: "GROWTH", assetClass: "STOCK", isEnabled: true }
    ],

    /* ========================================================================
     * [CONTROL RULES] Fallback allocation status rules
     * Google Sheet ControlRules tab is SSOT.
     * Threshold unit is percentage points (1 = 1%p).
     * ======================================================================*/
    controlRules: {
        MIN: { controlType: "MIN", evaluationMode: "ABS", satThreshold: 1, buildThreshold: 5, satStatus: "SAT", buildStatus: "BUILD", rebalanceStatus: "REBALANCE" },
        MAX: { controlType: "MAX", evaluationMode: "UPPER_ONLY", satThreshold: 1, buildThreshold: 5, satStatus: "SAT", buildStatus: "BUILD", rebalanceStatus: "REBALANCE" }
    },

    /* ========================================================================
     * [MANUAL CONFIG] Fallback captain inputs
     * Google Sheet ManualConfig 탭이 SSOT입니다.
     * ======================================================================*/
    manualConfig: {
        BrentPrice: 77.1,
        BrentPriceAsOf: "2026.07.27",
        aiCapexTrend: "increasing",
        nvdaDcRevenueGrowth: 40,
        fedRateState: "pause",
        m2Trend: "stable",
        cashKRW: 0,
        lastActionDate: "2026.06.23",
        portfolioBuildEndDate: "2026.07.31",
        openSeaTargetKRW: 1600000000,
        targetDate: "2040.12.31",
        expectedCAGR: 11.0,
        requiredCAGR: null, // VOYAGE_PLAN!B11 SSOT; no silent fallback
        monthlyContributionKRW: 1200000,
        boatAdjustment: 0.0,
        voyagePhaseMode: "AUTO"
    },

    /* ========================================================================
     * [PORTFOLIO] Fallback holdings
     * Google Sheet Portfolio 탭이 SSOT입니다.
     * avgCostKRW = 매수 당시 환율까지 반영한 원화 평단가입니다.
     * ======================================================================*/
    portfolio: [
        { holdingTicker: "QQQM", holdingGroup: "GROWTH_ETF", quantity: 109, avgPriceKRW: 404687 },
        { holdingTicker: "SPYM", holdingGroup: "CORE_ETF", quantity: 119, avgPriceKRW: 133078 },
        { holdingTicker: "SCHD", holdingGroup: "DIVIDEND", quantity: 174, avgPriceKRW: 48857 },
        { holdingTicker: "IAUM", holdingGroup: "GOLD", quantity: 113, avgPriceKRW: 63863 },
        { holdingTicker: "BITQ", holdingGroup: "CRYPTO", quantity: 29, avgPriceKRW: 39915 },
        { holdingTicker: "NVDA", holdingGroup: "INDIVIDUAL", quantity: 20, avgPriceKRW: 273395 },
        { holdingTicker: "MSFT", holdingGroup: "INDIVIDUAL", quantity: 10, avgPriceKRW: 590350 },
        { holdingTicker: "GOOGL", holdingGroup: "INDIVIDUAL", quantity: 10, avgPriceKRW: 453983 },
        { holdingTicker: "PLTR", holdingGroup: "INDIVIDUAL", quantity: 30, avgPriceKRW: 220642 }
    ],

    /* ========================================================================
     * [OPENSEA LOGBOOK] Fallback voyage timeline
     * Google Sheet OpenSeaLogbook 탭이 SSOT입니다.
     * ======================================================================*/
    openSeaLogbook: [
        { date: "2026.06.23", principalKRW: 58000000, marketValueKRW: 60800000, returnPct: 4.8, note: "Initial Deployment", marker: "DEPLOY", phase: "BUILD_PHASE" },
        { date: "2026.07.30", principalKRW: 250000000, marketValueKRW: 262000000, returnPct: 4.8, note: "Build Complete", marker: "BUILD", phase: "BUILD_PHASE" },
        { date: "2027.01.01", principalKRW: 268000000, marketValueKRW: 295000000, returnPct: 10.1, note: "First Milestone", marker: "MILESTONE", phase: "EARLY_VOYAGE" }
    ],

    /* ========================================================================
     * [AUTO] CSV Hub 실패 시 fallback 값
     * ======================================================================*/
    auto: {
        lastSync: "2026.06.23 13:30",
        dataSource: "FALLBACK",
        syncStatus: {
            MarketData: false,
            Portfolio: false,
            ManualConfig: false
        },
        syncErrors: {},
        usdkrw: 1538.25,
        vix: 17.28,
        BrentPrice: 77.1,
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
        status: "ON COURSE",
        recommendedAction: "NO ACTION",
        daysSinceAction: 36,
        lastRebalance: "2026.05.17",
        doctrineCompliance: null,

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
        voyagePhase: "BUILD_PHASE",
        assetProgress: 0,
        timeProgress: 0,
        voyageProgress: 0,
        extraTimeRequired: "-",

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
