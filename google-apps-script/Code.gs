/** WellFresh — receptor para Google Sheets. No se despliega automáticamente. */
var WF_VERSION = 'wellfresh-2026-10-08-v1';
var WF_CATALOG = {
  single: { units: 1, product: 49900, shipping: 18000, total: 67900 },
  duo: { units: 2, product: 79900, shipping: 0, total: 79900 }
};
var WF_DEPARTMENTS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
var WF_HEADERS = ['request_id','fingerprint','referencia','fecha','oferta','unidades','producto_cop','envio_cop','total_cop','nombre','celular','departamento','municipio','direccion','estado'];
function wfError(message, definitive) { var error = new Error(message); error.definitive = definitive; return error; }
function wfValidate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw wfError('INVALID_ORDER', true);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.requestId || '')) throw wfError('INVALID_REFERENCE', true);
  var offer = Object.prototype.hasOwnProperty.call(WF_CATALOG, raw.offerId) ? WF_CATALOG[raw.offerId] : null;
  if (!offer || raw.catalogVersion !== WF_VERSION || raw.total !== offer.total || raw.promo) throw wfError('INVALID_OFFER', true);
  if (raw.website) throw wfError('INVALID_REQUEST', true);
  function clean(key, min, max) {
    if (typeof raw[key] !== 'string') throw wfError('INVALID_FIELD', true);
    var value = raw[key].trim().replace(/\s+/g, ' ');
    if (value.length < min || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw wfError('INVALID_FIELD', true);
    return value;
  }
  var name = clean('name', 3, 100), phone = clean('phone', 10, 20).replace(/[\s()+-]/g, '').replace(/^57(?=3\d{9}$)/, '');
  var department = clean('department', 3, 50), city = clean('city', 2, 80), address = clean('address', 8, 200);
  if (!/^3\d{9}$/.test(phone) || WF_DEPARTMENTS.indexOf(department) < 0) throw wfError('INVALID_FIELD', true);
  return { requestId: raw.requestId, catalogVersion: WF_VERSION, offerId: raw.offerId, units: offer.units, product: offer.product, shipping: offer.shipping, total: offer.total, name: name, phone: phone, department: department, city: city, address: address, promo: null };
}
function wfCell(value) {
  var text = String(value);
  return /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
}
function wfReceipt(order) {
  return { ok: true, requestId: order.requestId, orderId: 'WF-' + order.requestId.toUpperCase(), offerId: order.offerId, total: order.total };
}
function wfSave(raw, spreadsheetId) {
  var order = wfValidate(raw);
  var fingerprint = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(order), Utilities.Charset.UTF_8));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw wfError('BUSY_RETRY', false);
  try {
    var workbook = SpreadsheetApp.openById(spreadsheetId);
    var sheet = workbook.getSheetByName('Pedidos WellFresh') || workbook.insertSheet('Pedidos WellFresh');
    if (sheet.getLastRow() === 0) sheet.appendRow(WF_HEADERS);
    var headers = sheet.getRange(1, 1, 1, WF_HEADERS.length).getValues()[0];
    if (JSON.stringify(headers) !== JSON.stringify(WF_HEADERS)) throw wfError('SHEET_SCHEMA_MISMATCH', true);
    var last = sheet.getLastRow();
    if (last > 1) {
      var found = sheet.getRange(2, 1, last - 1, 1).createTextFinder(order.requestId).matchEntireCell(true).findNext();
      if (found) {
        var previous = sheet.getRange(found.getRow(), 2).getValue();
        if (previous !== fingerprint) throw wfError('IDEMPOTENCY_CONFLICT', true);
        return wfReceipt(order);
      }
    }
    sheet.appendRow([
      order.requestId, fingerprint, 'WF-' + order.requestId.toUpperCase(), new Date().toISOString(), order.offerId,
      order.units, order.product, order.shipping, order.total, wfCell(order.name), "'" + order.phone,
      wfCell(order.department), wfCell(order.city), wfCell(order.address), 'PENDIENTE DE CONFIRMAR'
    ]);
    SpreadsheetApp.flush();
    return wfReceipt(order);
  } finally { lock.releaseLock(); }
}
function doPost(e) {
  var result;
  try {
    if (!e || !e.postData || e.postData.contents.length > 10000) throw wfError('INVALID_BODY', true);
    var payload;
    try { payload = JSON.parse(e.postData.contents); } catch (ignore) { throw wfError('INVALID_JSON', true); }
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('WELLFRESH_SECRET');
    var spreadsheetId = properties.getProperty('WELLFRESH_SPREADSHEET_ID');
    if (!secret || !spreadsheetId || !payload || payload.secret !== secret) throw wfError('NOT_AUTHORIZED', true);
    result = wfSave(payload.order, spreadsheetId);
  } catch (error) {
    // No exponer nombres, teléfonos, direcciones, IDs de hoja ni secretos en errores.
    result = { ok: false, definitive: error.definitive === true, code: error.definitive === true ? 'REJECTED' : 'RETRY_SAME_REFERENCE' };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'WellFresh orders', version: WF_VERSION })).setMimeType(ContentService.MimeType.JSON);
}
