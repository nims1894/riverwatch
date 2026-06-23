/****************************************************************************
 * RiverWatch Data Configuration
 * Version: v0.2.1
 *
 * [CONST]  : 고정 철학 / 독트린. 거의 수정하지 않음.
 * [POLICY] : 판단 기준 / 가중치 / 매트릭스. 대장님이 필요 시 조정 가능.
 * [MANUAL] : 목표값 / 보유정보 / 저빈도 지표. 사용자가 직접 입력.
 * [AUTO]   : 향후 API 또는 GoogleFinance로 자동 갱신 예정. 현재는 더미값.
 * [CALC]   : script.js에서 계산. 직접 수정하지 않음.
 *
 * Development Doctrine
 * - Automate what changes often.
 * - Manualize what changes rarely.
 * - Never increase complexity for insignificant gains.
 ****************************************************************************/

const riverwatch = {

    /* ========================================================================
     * [CONST] Doctrine
     * ======================================================================*/
    const: {
        appName: "RiverWatch",
        version: "0.2.1",
        operator: "NIMS",
        mission: "Stay the Course",
        subtitle: "A personal doctrine execution system for reaching the Open Sea.",
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
     * [POLICY] Health / Decision Rules
     * 가중치 합계가 100이 아니어도 script.js에서 자동 정규화됨.
     * ======================================================================*/
    policy: {
        boatHealthWeights: {
            alignment: 30,
            suitability: 70
        },

        suitabilityWeights: {
            growth: 50,
            defensive: 40,
            maneuverability: 10
        },

        riverMetricWeights: {
            fedRate: 25,
            vix: 20,
            brentOil: 15,
            usdkrw: 10,
            aiCapex: 15,
            nvdaDcRevenue: 10,
            m2: 5
        },

        actionThresholds: {
            stayTheCourse: 90,
            keepWatch: 80,
            adaptBoat: 70,
            recoverCourse: 80
        },

        allocationThresholds: {
            normalDeviation: 3,
            reviewDeviation: 7
        },

        // River Matrix v0.2
        // score: -3 very unfavorable ~ +3 very favorable
        riverMatrix: {
            fedRate: {
                HIKING: { growth: -3, defensive: 2 },
                PAUSE: { growth: 0, defensive: 0 },
                CUT_EXPECTED: { growth: 2, defensive: -1 },
                CUTTING: { growth: 3, defensive: -2 }
            },

            vix: [
                { max: 15, growth: 2, defensive: -1 },
                { max: 20, growth: 1, defensive: 0 },
                { max: 25, growth: 0, defensive: 0 },
                { max: 35, growth: -2, defensive: 2 },
                { max: Infinity, growth: -3, defensive: 3 }
            ],

            brentOil: [
                { max: 70, growth: 2, defensive: -1 },
                { max: 90, growth: 0, defensive: 0 },
                { max: 110, growth: -2, defensive: 2 },
                { max: Infinity, growth: -3, defensive: 3 }
            ],

            usdkrw: [
                { max: 1350, growth: 2, defensive: -1 },
                { max: 1450, growth: 1, defensive: 0 },
                { max: 1525, growth: 0, defensive: 1 },
                { max: 1600, growth: -1, defensive: 2 },
                { max: Infinity, growth: -3, defensive: 3 }
            ],

            aiCapex: {
                INCREASING: { growth: 3, defensive: -1 },
                STABLE: { growth: 1, defensive: 0 },
                DECLINING: { growth: -3, defensive: 2 }
            },

            nvdaDcRevenue: [
                { min: 0.40, growth: 3, defensive: -1 },
                { min: 0.20, growth: 1, defensive: 0 },
                { min: -Infinity, growth: -2, defensive: 1 }
            ],

            m2: {
                INCREASING: { growth: 2, defensive: -1 },
                STABLE: { growth: 0, defensive: 0 },
                DECLINING: { growth: -2, defensive: 1 }
            }
        }
    },

    /* ========================================================================
     * [MANUAL] Open Sea / Voyage Target
     * ======================================================================*/
    manual: {
        openSea: {
            targetAsset: 1600000000,       // 은퇴 목표 금융자산: 16억원
            targetDate: "2040.12",        // Open Sea 도착 목표일
            expectedCAGR: 0.11,            // 기대 연복리 성장률
            monthlyContribution: 1500000   // 월 추가 투자금
        },

        // 목표 포트폴리오. 전술값이므로 대장님이 직접 조정.
        boatConfiguration: [
            { ticker: "QQQM", name: "US Innovation", target: 40, bucket: "growth" },
            { ticker: "SPYM", name: "US Broad Market", target: 25, bucket: "core" },
            { ticker: "SCHD", name: "Dividend Defense", target: 15, bucket: "defensive" },
            { ticker: "IAUM", name: "Gold Reserve", target: 8, bucket: "defensive" },
            { ticker: "BITQ", name: "Digital Asset Proxy", target: 2, bucket: "growth" },
            { ticker: "INDIVIDUAL", name: "Individual Stocks", target: 10, bucket: "growth" }
        ],

        // 현재는 더미값. 6/24~25 실제 보유수량/평단 반영 예정.
        holdings: [
            { ticker: "QQQM", current: 38.7 },
            { ticker: "SPYM", current: 25.8 },
            { ticker: "SCHD", current: 14.2 },
            { ticker: "IAUM", current: 8.1 },
            { ticker: "BITQ", current: 2.1 },
            { ticker: "INDIVIDUAL", current: 11.1 }
        ],

        // 실시간성이 낮으므로 초기에는 수동 입력.
        lowFrequencyMetrics: {
            aiCapex: "INCREASING",
            nvdaDcRevenueGrowth: 0.40
        },

        cashReserve: 0,

        logbook: [
            {
                date: "2026.06.23",
                river: 88,
                boat: 93,
                voyage: 96,
                action: "NO ACTION",
                note: "Sprint #005 architecture baseline approved."
            }
        ]
    },

    /* ========================================================================
     * [AUTO] Market / Macro Data
     * 향후 자동화 후보. 현재는 더미값.
     * ======================================================================*/
    auto: {
        lastSync: "2026.06.23 13:30",
        usdkrw: 1530,
        vix: 18,
        brentOil: 76,
        fedRate: "PAUSE",
        m2: "INCREASING"
    },

    /* ========================================================================
     * [CALC] Initial Snapshot / Fallback
     * script.js 계산 실패 시 또는 PoC 단계에서 참고하는 초기값.
     * ======================================================================*/
    calc: {
        voyage: {
            score: 96,
            label: "On Voyage",
            currentPosition: 103000000,
            expectedPosition: 107000000,
            projectedAsset: 1740000000,
            eta: "2040.03",
            remaining: "14y 6m"
        }
    }
};
