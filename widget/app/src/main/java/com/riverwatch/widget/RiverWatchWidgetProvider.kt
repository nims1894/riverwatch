package com.riverwatch.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class RiverWatchWidgetProvider : AppWidgetProvider() {

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleNextHourlyCheck(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            appWidgetManager.updateAppWidget(widgetId, buildViews(context, widgetId))
        }

        // 위젯이 살아나는 시점에 현재 시간대(예: 21:00~21:59)에서
        // 아직 자동 갱신을 시도하지 않았다면 딱 한 번만 시도한다.
        autoRefreshIfNeededAsync(context)
        scheduleNextHourlyCheck(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        appWidgetManager.updateAppWidget(appWidgetId, buildViews(context, appWidgetId))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_HOURLY_SYNC -> {
                autoRefreshIfNeededAsync(context)
                scheduleNextHourlyCheck(context)
            }

            ACTION_MANUAL_SYNC -> manualRefreshAsync(context)

            Intent.ACTION_BOOT_COMPLETED -> {
                scheduleNextHourlyCheck(context)
            }
        }
    }

    /**
     * Automatic refresh policy
     * - 한 시간 구간당 자동 시도는 최대 1회.
     * - 성공/실패와 관계없이 같은 시간 구간에서는 자동 재시도하지 않음.
     * - 실패 시 다음 정각 이후 새 시간 구간에서 다시 시도.
     * - Manual refresh는 이 제한을 무시함.
     */
    private fun autoRefreshIfNeededAsync(context: Context) {
        val appContext = context.applicationContext
        val p = prefs(appContext)
        val bucket = currentHourBucket()

        if (p.getString(KEY_LAST_AUTO_ATTEMPT_BUCKET, null) == bucket) {
            return
        }

        // 중복 이벤트가 겹쳐도 같은 시간대에 두 번 호출되지 않도록 Fetch 전에 기록한다.
        p.edit().putString(KEY_LAST_AUTO_ATTEMPT_BUCKET, bucket).apply()

        val pendingResult = goAsync()
        EXECUTOR.execute {
            try {
                val snapshot = fetchSnapshot()
                saveSnapshot(appContext, snapshot)
                renderAll(appContext)
            } catch (_: Exception) {
                // 기존 LAST_GOOD UI 유지. 같은 시간대 자동 재시도는 하지 않고 다음 시간대에 재시도.
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun manualRefreshAsync(context: Context) {
        val appContext = context.applicationContext
        val pendingResult = goAsync()

        EXECUTOR.execute {
            try {
                val snapshot = fetchSnapshot()
                saveSnapshot(appContext, snapshot)

                // 수동 갱신에 성공했으면 현재 시간대에는 이미 최신값이 있으므로
                // 이후 자동 갱신은 생략한다.
                prefs(appContext).edit()
                    .putString(KEY_LAST_AUTO_ATTEMPT_BUCKET, currentHourBucket())
                    .apply()

                renderAll(appContext)
            } catch (_: Exception) {
                // 기존 정상값 유지
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun fetchSnapshot(): Snapshot {
        val connection = (URL(WidgetLabConfig.SNAPSHOT_URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 8_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "RiverWatchWidget/1.0")
        }

        try {
            val code = connection.responseCode
            if (code !in 200..299) error("HTTP $code")

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)
            if (!json.optBoolean("ok", false)) error(json.optString("error", "Snapshot API error"))

            val dailyTrendPct = readDailyTrendPct(json)

            return Snapshot(
                snapshotDate = json.optString("snapshotDate", ""),
                voyageLogDate = json.optString("voyageLogDate", ""),
                dDay = json.getInt("dDay"),
                etaDays = if (json.has("etaDays")) json.getInt("etaDays") else null,
                etaGapDays = json.getInt("etaGapDays"),
                state = json.getString("state"),
                trend = json.getString("trend"),
                dailyTrendPct = dailyTrendPct,
                etaDate = json.optString("etaDate", "")
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun saveSnapshot(context: Context, snapshot: Snapshot) {
        val editor = prefs(context).edit()
            .putBoolean(KEY_HAS_DATA, true)
            .putString(KEY_SNAPSHOT_DATE, snapshot.snapshotDate)
            .putString(KEY_VOYAGE_LOG_DATE, snapshot.voyageLogDate)
            .putInt(KEY_DDAY, snapshot.dDay)
            .putInt(KEY_ETA_GAP, snapshot.etaGapDays)
            .putString(KEY_STATE, snapshot.state)
            .putString(KEY_TREND, snapshot.trend)
            .putString(KEY_ETA_DATE, snapshot.etaDate)
            .putLong(KEY_LAST_GOOD_AT, System.currentTimeMillis())

        if (snapshot.dailyTrendPct != null) {
            editor.putString(KEY_DAILY_TREND_PCT, snapshot.dailyTrendPct.toString())
        }

        editor.apply()
    }

    private fun buildViews(context: Context, appWidgetId: Int): RemoteViews {
        val p = prefs(context)
        val hasData = p.getBoolean(KEY_HAS_DATA, false)

        val dDay = if (hasData) p.getInt(KEY_DDAY, 0) else null
        val etaGap = if (hasData) p.getInt(KEY_ETA_GAP, 0) else null
        val etaDate = if (hasData) p.getString(KEY_ETA_DATE, null) else null
        val state = if (hasData) p.getString(KEY_STATE, null) else null
        val trend = if (hasData) p.getString(KEY_TREND, null) else null
        val dailyTrendPct = if (hasData) {
            p.getString(KEY_DAILY_TREND_PCT, null)?.toDoubleOrNull()
        } else {
            null
        }
        val lastGoodAt = if (hasData) p.getLong(KEY_LAST_GOOD_AT, 0L) else 0L

        val views = RemoteViews(context.packageName, R.layout.riverwatch_widget)

        // Render the entire PPT composition into one square bitmap. The ImageView
        // stretches this canonical canvas to the launcher's real 2x2 bounds, so
        // the composition is based on percentages rather than guessed dp sizes.
        views.setImageViewBitmap(
            R.id.widget_canvas,
            renderWidgetBitmap(
                context = context,
                dDay = dDay,
                etaGap = etaGap,
                etaDate = etaDate,
                state = state,
                trend = trend,
                dailyTrendPct = dailyTrendPct,
                lastGoodAt = lastGoodAt,
                outputSize = widgetBitmapSize(context, appWidgetId)
            )
        )

        // Tapping the widget body (including the Koru symbol) opens RiverWatch.
        // REFRESH remains a separate overlay and keeps manual-refresh priority.
        val openRiverWatchIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse(RIVERWATCH_URL)
        )
        val openRiverWatchPendingIntent = PendingIntent.getActivity(
            context,
            REQUEST_OPEN_RIVERWATCH,
            openRiverWatchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_canvas, openRiverWatchPendingIntent)

        val manualRefreshIntent = Intent(context, RiverWatchWidgetProvider::class.java).apply {
            action = ACTION_MANUAL_SYNC
        }
        val manualRefreshPendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_MANUAL,
            manualRefreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Only the lower-right REFRESH hit area triggers a manual refresh.
        views.setOnClickPendingIntent(R.id.refresh_text, manualRefreshPendingIntent)

        return views
    }

    /**
     * Golden reference coordinate system
     * ----------------------------------
     * The user's final PPT export has a 531 x 531 px widget body. All positions
     * and asset sizes below are measured directly from that body. No launcher dp
     * assumption is used. The final bitmap is scaled as one piece by RemoteViews.
     *
     * Z-order is explicit in draw order:
     *   1) Koru symbol (lowest)
     *   2) STATE asset
     *   3) WIND / indicator assets
     *   4) text
     */
    private fun renderWidgetBitmap(
        context: Context,
        dDay: Int?,
        etaGap: Int?,
        etaDate: String?,
        state: String?,
        trend: String?,
        dailyTrendPct: Double?,
        lastGoodAt: Long,
        outputSize: Pair<Int, Int>
    ): Bitmap {
        val outputWidth = outputSize.first
        val outputHeight = outputSize.second
        val referenceSize = 531f
        val scale = minOf(outputWidth / referenceSize, outputHeight / referenceSize)
        val offsetX = (outputWidth - referenceSize * scale) / 2f
        val offsetY = (outputHeight - referenceSize * scale) / 2f
        val bitmap = Bitmap.createBitmap(outputWidth, outputHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        fun sx(v: Float) = offsetX + v * scale
        fun sy(v: Float) = offsetY + v * scale

        val white = Color.rgb(245, 251, 255)
        val muted = Color.rgb(183, 192, 205)
        val windColor = windColorFor(trend)
        val bold = Typeface.create("sans-serif", Typeface.BOLD)
        val regular = Typeface.create("sans-serif", Typeface.NORMAL)

        fun paint(sizePx: Float, color: Int, typeface: Typeface = regular) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.textSize = sizePx * scale
            this.color = color
            this.typeface = typeface
            isSubpixelText = true
        }

        fun drawTextTop(text: String, x: Float, top: Float, p: Paint) {
            val fm = p.fontMetrics
            canvas.drawText(text, sx(x), sy(top) - fm.top, p)
        }

        fun drawAsset(resId: Int, left: Float, top: Float, width: Float, height: Float) {
            val opts = BitmapFactory.Options().apply { inScaled = false }
            val src = BitmapFactory.decodeResource(context.resources, resId, opts) ?: return
            canvas.drawBitmap(
                src,
                null,
                RectF(sx(left), sy(top), sx(left + width), sy(top + height)),
                Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            )
            src.recycle()
        }

        // 1) Koru symbol: background identity mark, always lowest Z-order.
        drawAsset(R.drawable.koru_watermark, 282f, 180f, 240f, 240f)

        // 2) STATE PNG. Preserve each source aspect ratio at the same PPT scale.
        val stateRes = stateDrawableFor(state)
        val stateOpts = BitmapFactory.Options().apply { inScaled = false }
        val stateBitmap = BitmapFactory.decodeResource(context.resources, stateRes, stateOpts)
        if (stateBitmap != null) {
            val stateHeight = 134f
            val stateWidth = stateHeight * stateBitmap.width / stateBitmap.height.toFloat()
            canvas.drawBitmap(
                stateBitmap,
                null,
                RectF(sx(-5.0f), sy(198.5f), sx(-5.0f + stateWidth), sy(198.5f + stateHeight)),
                Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            )
            stateBitmap.recycle()
        }

        // 3) WIND circle and five-block indicator.
        drawAsset(windDrawableFor(trend), 35.4f, 372.5f, 82f, 82f)
        drawAsset(indicatorDrawableFor(trend), 137.5f, 423.7f, 194f, 24f)

        // 4) Text. Keep the established v17.1d composition and only tune the
        // requested typography/anchors. Left-side items stay left-anchored;
        // UPDATED and REFRESH are right-anchored so larger fonts never clip.
        val rightAnchor = 495.6f
        val topShift = 10.4f   // raise top row to the safe top edge without clipping RV Koru
        val footerShift = 20.0f

        drawTextTop("RV Koru", 35.4f, 12.4f - topShift, paint(32f, white, bold))

        // UPDATED uses the same nominal size as the WIND label (27).
        val updatedBold = paint(27f, muted, bold)
        val updatedRegular = paint(27f, muted, regular)
        val updatedTime = lastUpdateTimeOnly(lastGoodAt)
        val updatedGap = 4f
        val updatedTotalWidth = (
            updatedBold.measureText("UPDATED") +
            updatedRegular.measureText(updatedTime)
        ) / scale + updatedGap
        val updatedX = rightAnchor - updatedTotalWidth
        val updatedTop = 27.7f - topShift
        drawTextTop("UPDATED", updatedX, updatedTop, updatedBold)
        val updatedLabelWidth = updatedBold.measureText("UPDATED") / scale
        drawTextTop(updatedTime, updatedX + updatedLabelWidth + updatedGap, updatedTop, updatedRegular)

        drawTextTop(WidgetLabConfig.dDayDisplay(dDay), 35.4f, 64.9f, paint(84f, white, bold))
        drawTextTop("STATE", 35.4f, 177.6f, paint(27f, muted, bold))
        drawTextTop("WIND", 35.4f, 319.3f, paint(27f, muted, bold))

        val speedText = WidgetLabConfig.dailyTrendDisplay(dailyTrendPct)
        val speedPaint = paint(43f, windColor, bold)
        drawTextTop(speedText, 137.5f, 361.1f, speedPaint)
        val speedWidth = speedPaint.measureText(speedText) / scale
        drawTextTop("m/sec", 137.5f + speedWidth + 5f, 377.1f, paint(27f, muted, regular))

        // Footer text now matches the WIND label size (27) and moves down as a group.
        val etaLabelPaint = paint(27f, muted, bold)
        val etaDatePaint = paint(27f, white, bold)
        val etaGapPaint = paint(27f, muted, regular)
        val footerTop = 475.4f + footerShift
        drawTextTop("ETA", 35.4f, footerTop, etaLabelPaint)
        val etaLabelWidth = etaLabelPaint.measureText("ETA") / scale
        val dateText = WidgetLabConfig.etaDateDisplay(etaDate)
        drawTextTop(dateText, 35.4f + etaLabelWidth + 6f, footerTop, etaDatePaint)
        val dateWidth = etaDatePaint.measureText(dateText) / scale
        drawTextTop(
            WidgetLabConfig.etaFooterGapDisplay(etaGap),
            35.4f + etaLabelWidth + 6f + dateWidth + 5f,
            footerTop,
            etaGapPaint
        )

        val refreshPaint = paint(27f, muted, bold)
        val refreshWidth = refreshPaint.measureText("REFRESH") / scale
        drawTextTop("REFRESH", rightAnchor - refreshWidth, 477.2f + footerShift, refreshPaint)

        return bitmap
    }

    private fun readDailyTrendPct(json: JSONObject): Double? {
        fun parseValue(key: String): Double? {
            if (!json.has(key) || json.isNull(key)) return null
            val raw = json.opt(key)
            return when (raw) {
                is Number -> {
                    val number = raw.toDouble()
                    if (!number.isFinite()) null
                    else if (key == "dailyTrend") number * 100.0
                    else number
                }
                is String -> {
                    val text = raw.trim()
                    val percentText = text.endsWith("%")
                    val number = text.removeSuffix("%").trim().toDoubleOrNull()
                    if (number != null && number.isFinite()) {
                        if (key == "dailyTrend" && !percentText) number * 100.0 else number
                    } else null
                }
                else -> null
            }
        }

        return parseValue("dailyTrendPct")
            ?: parseValue("DailyTrendPct")
            ?: parseValue("dailyTrendPercent")
            ?: parseValue("dailyTrend")
            ?: parseValue("DailyTrend")
    }

    private fun lastUpdateTimeOnly(timestamp: Long): String {
        if (timestamp <= 0L) return "—"
        return SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
    }

    private fun widgetBitmapSize(context: Context, appWidgetId: Int): Pair<Int, Int> {
        val manager = AppWidgetManager.getInstance(context)
        val options = manager.getAppWidgetOptions(appWidgetId)
        val widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

        if (widthDp <= 0 || heightDp <= 0) return 300 to 300

        // Match the bitmap aspect ratio to the real launcher-provided widget bounds,
        // while keeping the bitmap safely below Binder limits.
        val longSide = 300f
        return if (widthDp >= heightDp) {
            val width = longSide.toInt()
            val height = (longSide * heightDp / widthDp.toFloat()).toInt().coerceIn(180, 300)
            width to height
        } else {
            val height = longSide.toInt()
            val width = (longSide * widthDp / heightDp.toFloat()).toInt().coerceIn(180, 300)
            width to height
        }
    }

    private fun renderAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, RiverWatchWidgetProvider::class.java)
        val ids = manager.getAppWidgetIds(component)
        if (ids.isEmpty()) return

        ids.forEach { widgetId ->
            manager.updateAppWidget(widgetId, buildViews(context, widgetId))
        }
    }

    private fun stateDrawableFor(state: String?): Int = when (normalizeToken(state)) {
        "TAILWIND" -> R.drawable.state_tailwind
        "CALM" -> R.drawable.state_calm
        "HEADWIND" -> R.drawable.state_headwind
        "ROUGH" -> R.drawable.state_rough
        "STORM" -> R.drawable.state_storm
        else -> R.drawable.state_calm
    }

    private fun windDrawableFor(trend: String?): Int = when (normalizeToken(trend)) {
        "STRONG_UP" -> R.drawable.wind_str_up
        "UP" -> R.drawable.wind_up
        "STABLE" -> R.drawable.wind_stable
        "DOWN" -> R.drawable.wind_down
        "STRONG_DOWN" -> R.drawable.wind_str_down
        else -> R.drawable.wind_stable
    }

    private fun indicatorDrawableFor(trend: String?): Int = when (normalizeToken(trend)) {
        "STRONG_UP" -> R.drawable.indicator_str_up
        "UP" -> R.drawable.indicator_up
        "STABLE" -> R.drawable.indicator_stable
        "DOWN" -> R.drawable.indicator_down
        "STRONG_DOWN" -> R.drawable.indicator_str_down
        else -> R.drawable.indicator_stable
    }

    private fun windColorFor(trend: String?): Int = when (normalizeToken(trend)) {
        "STRONG_UP" -> Color.rgb(34, 197, 94)    // #22C55E
        "UP" -> Color.rgb(163, 230, 53)          // #A3E635
        "STABLE" -> Color.rgb(212, 229, 44)      // #D4E52C
        "DOWN" -> Color.rgb(250, 204, 21)        // #FACC15
        "STRONG_DOWN" -> Color.rgb(245, 158, 11) // #F59E0B
        else -> Color.rgb(212, 229, 44)
    }

    private fun normalizeToken(value: String?): String =
        value?.trim()?.uppercase(Locale.US)?.replace("-", "_")?.replace(" ", "_").orEmpty()

    private fun lastUpdateDisplay(timestamp: Long): String {
        if (timestamp <= 0L) return "UPDATED —"
        val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
        return "UPDATED $time"
    }

    private fun currentHourBucket(nowMillis: Long = System.currentTimeMillis()): String {
        return SimpleDateFormat("yyyy-MM-dd-HH", Locale.US).format(Date(nowMillis))
    }

    private fun scheduleNextHourlyCheck(context: Context) {
        val now = Calendar.getInstance()
        val nextHour = Calendar.getInstance().apply {
            timeInMillis = now.timeInMillis
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            add(Calendar.HOUR_OF_DAY, 1)
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = alarmPendingIntent(context, ACTION_HOURLY_SYNC, REQUEST_HOURLY)

        // Exact alarm 권한을 요구하지 않으면서 정각 직후 가능한 빠르게 한 번 깨우는 방식.
        // launcher가 먼저 widget onUpdate를 호출한 경우 hour-bucket guard가 중복 Fetch를 막는다.
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            nextHour.timeInMillis,
            pendingIntent
        )
    }

    private fun alarmPendingIntent(context: Context, action: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, RiverWatchWidgetProvider::class.java).apply {
            this.action = action
        }

        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private data class Snapshot(
        val snapshotDate: String,
        val voyageLogDate: String,
        val dDay: Int,
        val etaDays: Int?,
        val etaGapDays: Int,
        val state: String,
        val trend: String,
        val dailyTrendPct: Double?,
        val etaDate: String
    )

    companion object {
        private const val PREFS_NAME = "riverwatch_widget_snapshot"

        private const val KEY_HAS_DATA = "has_data"
        private const val KEY_SNAPSHOT_DATE = "snapshot_date"
        private const val KEY_VOYAGE_LOG_DATE = "voyage_log_date"
        private const val KEY_DDAY = "dday"
        private const val KEY_ETA_GAP = "eta_gap"
        private const val KEY_STATE = "state"
        private const val KEY_TREND = "trend"
        private const val KEY_DAILY_TREND_PCT = "daily_trend_pct"
        private const val KEY_ETA_DATE = "eta_date"
        private const val KEY_LAST_GOOD_AT = "last_good_at"
        private const val KEY_LAST_AUTO_ATTEMPT_BUCKET = "last_auto_attempt_bucket"

        private const val ACTION_HOURLY_SYNC = "com.riverwatch.widget.HOURLY_SYNC"
        private const val ACTION_MANUAL_SYNC = "com.riverwatch.widget.MANUAL_SYNC"

        private const val REQUEST_HOURLY = 2200
        private const val REQUEST_MANUAL = 2190
        private const val REQUEST_OPEN_RIVERWATCH = 2180
        private const val RIVERWATCH_URL = "https://nims1894.github.io/riverwatch/"

        private val EXECUTOR = Executors.newSingleThreadExecutor()
    }
}
