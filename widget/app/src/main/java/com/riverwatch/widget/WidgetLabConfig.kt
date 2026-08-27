package com.riverwatch.widget

import java.util.Locale

object WidgetLabConfig {
    const val SNAPSHOT_URL = "https://script.google.com/macros/s/AKfycbwUg8izBue1WMfsjVJbsxorK1LstpAfsqd_KgH6K06u-8w0bpMLXOzIG1o7Cb3BtN2ung/exec"

    fun dDayDisplay(days: Int?): String = when {
        days == null -> "D-—"
        days > 0 -> "D-${String.format(Locale.US, "%,d", days)}"
        days == 0 -> "D-DAY"
        else -> "D+${String.format(Locale.US, "%,d", -days)}"
    }

    /**
     * Apps Script dailyTrendPct 값을 그대로 사용하되 위젯에서는 항상 소수점 2자리.
     * 양수에는 + 부호를 붙이고 0은 0.00으로 표시한다.
     */
    fun dailyTrendDisplay(value: Double?): String = when {
        value == null || !value.isFinite() -> "—"
        value > 0.0 -> String.format(Locale.US, "+%.2f", value)
        else -> String.format(Locale.US, "%.2f", value)
    }

    fun etaDateDisplay(etaDate: String?): String {
        val raw = etaDate?.trim().orEmpty()
        return if (raw.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
            raw.replace('-', '.')
        } else if (raw.isBlank()) {
            "—"
        } else {
            raw
        }
    }

    fun etaFooterGapDisplay(days: Int?): String = when {
        days == null -> "(—)"
        days > 0 -> "(+${String.format(Locale.US, "%,d", days)}d)"
        days < 0 -> "(${String.format(Locale.US, "%,d", days)}d)"
        else -> "(0d)"
    }
}
