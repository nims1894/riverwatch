package com.riverwatch.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
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
        scheduleNextPrimary(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            appWidgetManager.updateAppWidget(widgetId, buildViews(context))
        }

        // Install/update 시에는 한 번 즉시 Snapshot을 읽어 실기에서 바로 확인한다.
        // 정기 갱신은 별도로 10:00 / 실패 시 10:30 정책만 사용한다.
        fetchSnapshotAsync(context, FetchKind.MANUAL)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_PRIMARY_SYNC -> fetchSnapshotAsync(context, FetchKind.PRIMARY)
            ACTION_RETRY_SYNC -> fetchSnapshotAsync(context, FetchKind.RETRY)
            ACTION_MANUAL_SYNC -> fetchSnapshotAsync(context, FetchKind.MANUAL)
            Intent.ACTION_BOOT_COMPLETED -> scheduleNextPrimary(context)
        }
    }

    private fun fetchSnapshotAsync(context: Context, kind: FetchKind) {
        val appContext = context.applicationContext
        val pendingResult = goAsync()

        EXECUTOR.execute {
            val success = try {
                val snapshot = fetchSnapshot()
                saveSnapshot(appContext, snapshot)
                renderAll(appContext)
                true
            } catch (_: Exception) {
                false
            } finally {
                pendingResult.finish()
            }

            when (kind) {
                FetchKind.PRIMARY -> {
                    if (success) scheduleNextPrimary(appContext)
                    else scheduleRetryTodayOrNextPrimary(appContext)
                }
                FetchKind.RETRY -> scheduleNextPrimary(appContext)
                FetchKind.MANUAL -> Unit
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

            return Snapshot(
                snapshotDate = json.optString("snapshotDate", ""),
                voyageLogDate = json.optString("voyageLogDate", ""),
                dDay = json.getInt("dDay"),
                etaDays = if (json.has("etaDays")) json.getInt("etaDays") else null,
                etaGapDays = json.getInt("etaGapDays"),
                state = json.getString("state"),
                trend = json.getString("trend"),
                etaDate = json.optString("etaDate", "")
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun saveSnapshot(context: Context, snapshot: Snapshot) {
        prefs(context).edit()
            .putBoolean(KEY_HAS_DATA, true)
            .putString(KEY_SNAPSHOT_DATE, snapshot.snapshotDate)
            .putString(KEY_VOYAGE_LOG_DATE, snapshot.voyageLogDate)
            .putInt(KEY_DDAY, snapshot.dDay)
            .putInt(KEY_ETA_GAP, snapshot.etaGapDays)
            .putString(KEY_STATE, snapshot.state)
            .putString(KEY_TREND, snapshot.trend)
            .putString(KEY_ETA_DATE, snapshot.etaDate)
            .putLong(KEY_LAST_GOOD_AT, System.currentTimeMillis())
            .apply()
    }

    private fun buildViews(context: Context): RemoteViews {
        val p = prefs(context)
        val hasData = p.getBoolean(KEY_HAS_DATA, false)
        val dDay = if (hasData) p.getInt(KEY_DDAY, 0) else null
        val etaGap = if (hasData) p.getInt(KEY_ETA_GAP, 0) else null
        val state = if (hasData) p.getString(KEY_STATE, null) else null
        val trend = if (hasData) p.getString(KEY_TREND, null) else null
        val lastGoodAt = if (hasData) p.getLong(KEY_LAST_GOOD_AT, 0L) else 0L

        val views = RemoteViews(context.packageName, R.layout.riverwatch_widget)
        views.setTextViewText(R.id.dday_text, WidgetLabConfig.dDayDisplay(dDay))
        views.setTextViewText(R.id.eta_text, WidgetLabConfig.etaGapDisplay(etaGap))
        views.setTextViewText(R.id.state_text, state ?: "SYNC...")
        views.setTextViewText(R.id.trend_text, WidgetLabConfig.trendDisplay(trend))
        views.setTextViewText(R.id.last_update_text, lastUpdateDisplay(lastGoodAt))
        views.setImageViewResource(R.id.boat_image, boatDrawableFor(state))
        val manualRefreshIntent = Intent(context, RiverWatchWidgetProvider::class.java).apply {
            action = ACTION_MANUAL_SYNC
        }
        val manualRefreshPendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_MANUAL,
            manualRefreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, manualRefreshPendingIntent)
        return views
    }

    private fun renderAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, RiverWatchWidgetProvider::class.java)
        val ids = manager.getAppWidgetIds(component)
        if (ids.isEmpty()) return
        val views = buildViews(context)
        ids.forEach { manager.updateAppWidget(it, views) }
    }

    private fun boatDrawableFor(state: String?): Int = when (state?.uppercase()) {
        "TAILWIND" -> R.drawable.boat_tailwind
        "CALM" -> R.drawable.boat_calm
        "HEADWIND" -> R.drawable.boat_headwind
        "ROUGH" -> R.drawable.boat_rough
        "STORM" -> R.drawable.boat_storm
        else -> R.drawable.boat_calm
    }

    private fun lastUpdateDisplay(timestamp: Long): String {
        if (timestamp <= 0L) return "UPDATED —"
        val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
        return "UPDATED $time"
    }

    private fun scheduleNextPrimary(context: Context) {
        cancelAlarm(context, ACTION_RETRY_SYNC, REQUEST_RETRY)
        val triggerAt = nextOccurrence(hour = 10, minute = 0, forceNextDayIfPassed = true)
        scheduleWindow(context, ACTION_PRIMARY_SYNC, REQUEST_PRIMARY, triggerAt)
    }

    private fun scheduleRetryTodayOrNextPrimary(context: Context) {
        val now = Calendar.getInstance()
        val retry = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 10)
            set(Calendar.MINUTE, 30)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        if (now.before(retry)) {
            scheduleWindow(context, ACTION_RETRY_SYNC, REQUEST_RETRY, retry.timeInMillis)
        } else {
            scheduleNextPrimary(context)
        }
    }

    private fun nextOccurrence(hour: Int, minute: Int, forceNextDayIfPassed: Boolean): Long {
        val now = Calendar.getInstance()
        return Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (forceNextDayIfPassed && !after(now)) add(Calendar.DAY_OF_YEAR, 1)
        }.timeInMillis
    }

    private fun scheduleWindow(context: Context, action: String, requestCode: Int, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = alarmPendingIntent(context, action, requestCode)
        // Battery-friendly: Android may choose any moment in this 10-minute window.
        alarmManager.setWindow(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            10 * 60 * 1000L,
            pendingIntent
        )
    }

    private fun cancelAlarm(context: Context, action: String, requestCode: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(alarmPendingIntent(context, action, requestCode))
    }

    private fun alarmPendingIntent(context: Context, action: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, RiverWatchWidgetProvider::class.java).apply { this.action = action }
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
        val etaDate: String
    )

    private enum class FetchKind { PRIMARY, RETRY, MANUAL }

    companion object {
        private const val PREFS_NAME = "riverwatch_widget_snapshot"
        private const val KEY_HAS_DATA = "has_data"
        private const val KEY_SNAPSHOT_DATE = "snapshot_date"
        private const val KEY_VOYAGE_LOG_DATE = "voyage_log_date"
        private const val KEY_DDAY = "dday"
        private const val KEY_ETA_GAP = "eta_gap"
        private const val KEY_STATE = "state"
        private const val KEY_TREND = "trend"
        private const val KEY_ETA_DATE = "eta_date"
        private const val KEY_LAST_GOOD_AT = "last_good_at"

        private const val ACTION_PRIMARY_SYNC = "com.riverwatch.widget.PRIMARY_SYNC"
        private const val ACTION_RETRY_SYNC = "com.riverwatch.widget.RETRY_SYNC"
        private const val ACTION_MANUAL_SYNC = "com.riverwatch.widget.MANUAL_SYNC"
        private const val REQUEST_PRIMARY = 2100
        private const val REQUEST_RETRY = 2130
        private const val REQUEST_MANUAL = 2190

        private val EXECUTOR = Executors.newSingleThreadExecutor()
    }
}
