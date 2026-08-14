/**
 * RiverWatch monthly audit skeleton (STEP 1B)
 * Install in the Apps Script project bound to RiverWatch_Voyage_Log.
 * Persistence sheet wiring is intentionally deferred until STEP 1C so
 * Fuel Supply and Doctrine Compliance share one monthly audit job.
 */
function riverWatchMonthKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
}

function riverWatchPreviousMonthKey_(date) {
  var d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return riverWatchMonthKey_(d);
}
