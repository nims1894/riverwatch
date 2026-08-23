package com.riverwatch.widget

object WidgetLabConfig {
    const val SNAPSHOT_URL = "https://script.google.com/macros/s/AKfycbwUg8izBue1WMfsjVJbsxorK1LstpAfsqd_KgH6K06u-8w0bpMLXOzIG1o7Cb3BtN2ung/exec"

    fun dDayDisplay(days: Int?): String = when {
        days == null -> "D-—"
        days > 0 -> "D-${String.format("%,d", days)}"
        days == 0 -> "D-DAY"
        else -> "D+${String.format("%,d", -days)}"
    }

    fun etaGapDisplay(days: Int?): String = when {
        days == null -> "ETA — days"
        days > 0 -> "ETA +${String.format("%,d", days)} days"
        days < 0 -> "ETA ${String.format("%,d", days)} days"
        else -> "ETA ON PLAN"
    }

    fun trendDisplay(trend: String?): String {
        val raw = trend?.trim().orEmpty()
        return when (raw.uppercase().replace("-", "_").replace(" ", "_")) {
            "STRONG_DOWN" -> "STRONG ↓↓"
            "DOWN" -> "DOWN ↘"
            "STABLE" -> "STABLE →"
            "UP" -> "UP ↗"
            "STRONG_UP" -> "STRONG ↑↑"
            else -> if (raw.isBlank()) "—" else raw
        }
    }
}
