# Expected CAGR SSOT 변경

## 변경 내용

- Voyage Health의 `effectiveCAGR`는 Google Sheet `ManualConfig.expectedCAGR` 값을 그대로 사용합니다.
- River Health, Boat Health, `boatAdjustment`에 의한 CAGR 보정을 제거했습니다.
- Voyage Health 카드의 Effective CAGR 표시는 소수점 둘째 자리까지 고정합니다.
  - 예: `10.76%`, `10.30%`, `9.00%`
- Adjusted Arrival, Voyage Drift, Voyage Health 및 관련 회복 계산도 동일한 Effective CAGR을 사용합니다.

## 주요 변경 파일

- `js/app.js`
