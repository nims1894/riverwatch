# RiverWatch Quarterly Manual Check

## 목적

AI CapEx Trend와 NVIDIA Data Center Revenue Growth를 RiverWatch 입력
기준에 맞게 재평가한다.

## 평가 대상

1.  `aiCapexTrend`
2.  `nvdaDcRevenueGrowth`

## 평가 원칙

-   단기 주가 반응이 아니라 실제 투자 및 실적 추세를 평가한다.
-   기사 제목보다 공식 실적 발표(IR), Earnings Call, CAPEX Guidance,
    재무자료를 우선한다.
-   Reddit, X 등 시장 반응은 참고만 하고 최종 판단은 공식 자료를
    기준으로 한다.
-   이전 분기와의 변화도 함께 고려한다.
-   추세가 명확하지 않으면 보수적으로 판단한다.

------------------------------------------------------------------------

# 1. AI CapEx Trend

## 허용 입력값

-   STR_INC
-   INC
-   STABLE
-   DEC
-   STR_DEC

## 평가 기준

-   Big Tech(Microsoft, Alphabet, Amazon, Meta 등)의 AI 투자 확대 여부
-   AI 인프라 투자 가이던스
-   AI CapEx 증가 추세의 지속 여부
-   공급망 및 데이터센터 투자 방향

## 출력

-   추천값
-   근거
-   리스크 또는 반론
-   RiverWatch 입력값

------------------------------------------------------------------------

# 2. NVIDIA Data Center Revenue Growth

## 평가 기준

-   NVIDIA 공식 분기 실적 기준
-   Data Center Revenue의 YoY 성장률
-   성장률의 가속 또는 둔화 여부
-   다음 분기 가이던스 반영

## 출력

-   추천값 (0\~100)
-   근거
-   리스크 또는 반론
-   RiverWatch 입력값

## 점수 기준

-   0 = 매우 부정적
-   50 = 중립
-   100 = 매우 긍정적

------------------------------------------------------------------------

# 최종 출력 형식

Google Sheet에 아래 형식으로 입력한다.

``` text
aiCapexTrend = STR_INC / INC / STABLE / DEC / STR_DEC

nvdaDcRevenueGrowth = 0~100 (정수)
```
