/**
 * RiverWatch STEP 1C · Doctrine Compliance / Captain Order History
 * Bound to RiverWatch_Voyage_Log.
 *
 * Design:
 * - Browser records only Captain Order transitions.
 * - This Web App appends those transitions to CAPTAIN_ORDER_HISTORY.
 * - Monthly audit uses Last Known Order semantics.
 * - NO ACTION: buying is allowed; selling is a violation above tolerance.
 * - v1 does not create UNKNOWN/PARTIAL states for unobserved browser periods.
 */

const RW_ORDER_HISTORY_SHEET = 'CAPTAIN_ORDER_HISTORY';
const RW_MONTHLY_AUDIT_SHEET = 'MONTHLY_AUDIT';
const RW_SETTINGS_SHEET = 'AUDIT_SETTINGS';
const RW_VOYAGE_LOG_SHEET = 'VOYAGE_LOG';
const RW_BASELINE_DATE = '2026-08-14';
const RW_DEFAULT_SELL_TOLERANCE_KRW = 500000;

function setupRiverWatchDoctrineAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, RW_ORDER_HISTORY_SHEET, [
    'Timestamp', 'PreviousOrder', 'CaptainOrder', 'Status',
    'RiverHealth', 'BoatHealth', 'VoyageHealth'
  ]);
  ensureSheetWithHeaders_(ss, RW_MONTHLY_AUDIT_SHEET, [
    'Month', 'FuelSupply', 'DoctrineCompliance', 'SellToleranceKRW',
    'RegularRefuelKRW', 'ExtraRefuelKRW', 'ViolationCount', 'EvaluatedAt'
  ]);
  const settings = ensureSheetWithHeaders_(ss, RW_SETTINGS_SHEET, ['Key', 'Value']);
  upsertSetting_(settings, 'BaselineDate', RW_BASELINE_DATE);
  upsertSetting_(settings, 'SellToleranceKRW', RW_DEFAULT_SELL_TOLERANCE_KRW);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.type !== 'CAPTAIN_ORDER_CHANGE') return json_({ ok: false, error: 'Unsupported type' });

    setupRiverWatchDoctrineAudit();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(RW_ORDER_HISTORY_SHEET);
    const timestamp = payload.observedAt ? new Date(payload.observedAt) : new Date();

    sheet.appendRow([
      timestamp,
      String(payload.previousOrder || ''),
      String(payload.currentOrder || ''),
      String(payload.status || ''),
      nullableNumber_(payload.riverHealth),
      nullableNumber_(payload.boatHealth),
      nullableNumber_(payload.voyageHealth)
    ]);
    sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function runRiverWatchMonthlyAudit() {
  setupRiverWatchDoctrineAudit();
  const now = new Date();
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = Utilities.formatDate(targetMonthDate, Session.getScriptTimeZone(), 'yyyy-MM');
  return auditRiverWatchMonth_(monthKey);
}

function auditRiverWatchMonth_(monthKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(RW_VOYAGE_LOG_SHEET);
  if (!logSheet) throw new Error('VOYAGE_LOG 시트를 찾을 수 없습니다.');

  const tolerance = Number(getSetting_(ss, 'SellToleranceKRW', RW_DEFAULT_SELL_TOLERANCE_KRW));
  const rows = sheetObjects_(logSheet);
  let regular = 0;
  let extra = 0;
  let previousPrincipal = null;

  rows.forEach(row => {
    const dateKey = dateKey_(row.Date);
    const principal = Number(row.PrincipalKRW);
    if (!dateKey || !isFinite(principal)) return;
    const delta = previousPrincipal === null ? 0 : principal - previousPrincipal;
    if (dateKey.indexOf(monthKey + '-') === 0 && delta > 0) {
      const type = String(row.RefuelType || '').trim().toUpperCase();
      if (type === 'REFUEL') regular += delta;
      if (type === 'EXTRA_REFUEL') extra += delta;
    }
    previousPrincipal = principal;
  });

  // STEP 1C core deliberately does not infer SELL from Principal.
  // Sell evidence must come from a future explicit transaction source.
  // Until that source is wired, Doctrine remains NOT_EVALUATED rather than inventing a result.
  const doctrine = 'NOT_EVALUATED';
  const violationCount = '';
  const fuelSupply = regular > 0 ? 'RECORDED' : 'NO_REFUEL_RECORDED';

  const auditSheet = ss.getSheetByName(RW_MONTHLY_AUDIT_SHEET);
  upsertMonth_(auditSheet, [
    monthKey, fuelSupply, doctrine, tolerance,
    regular, extra, violationCount, new Date()
  ]);

  return { monthKey, fuelSupply, doctrine, tolerance, regular, extra };
}

function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function sheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(row => headers.reduce((o, h, i) => (o[h] = row[i], o), {}));
}

function upsertSetting_(sheet, key, value) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) { sheet.getRange(i + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

function getSetting_(ss, key, fallback) {
  const sheet = ss.getSheetByName(RW_SETTINGS_SHEET);
  if (!sheet) return fallback;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][0]) === key) return values[i][1];
  return fallback;
}

function upsertMonth_(sheet, row) {
  const month = String(row[0]);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === month) { sheet.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  }
  sheet.appendRow(row);
}

function dateKey_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(value || '').trim().replace(/\./g, '-').replace(/\//g, '-');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : '';
}

function nullableNumber_(value) {
  const n = Number(value);
  return isFinite(n) ? n : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
