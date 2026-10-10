// Pegar todo este archivo en Código.gs. No requiere secretos en la landing.
var WF_SHEET_ID = '1vXIABtvvfgnJo0MskrRKHzwGrdtf_rkOT6bPE7HOfGM';
// Añadir aquí el dominio definitivo al publicar la landing (sin barra final).
var WF_ALLOWED_ORIGINS = ['https://dropi-wellfresh.pages.dev', 'http://localhost:4173', 'http://127.0.0.1:4173'];
/** WellFresh — receptor para Google Sheets. No se despliega automáticamente. */
var WF_VERSION = 'wellfresh-2026-10-09-v2';
var WF_CATALOG = {
  single: { name: 'WellFresh Individual', content: '1 frasco WellFresh de 30 ml con gotero', units: 1, product: 59900, shipping: 0, total: 59900 },
  duo: { name: 'WellFresh Dúo', content: '2 frascos WellFresh de 30 ml cada uno con gotero', units: 2, product: 89900, shipping: 0, total: 89900 }
};
var WF_DEPARTMENTS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
// Las primeras 14 columnas siguen el formato operativo de Aura.
// Las dos últimas son internas: conservarlas aunque se oculten.
var WF_TAB = 'Pedidos';
var WF_HEADERS = ['Referencia', 'Fecha Colombia', 'Nombre', 'WhatsApp', 'Departamento', 'Municipio', 'Dirección', 'Combo', 'Contenido', 'Total COP', 'Envío COP', 'Recaudo COP', 'Pago', 'Estado', 'request_id', 'fingerprint'];
var WF_LEGACY_HEADERS = ['request_id','fingerprint','referencia','fecha','oferta','unidades','producto_cop','envio_cop','total_cop','nombre','celular','departamento','municipio','direccion','estado'];
function wfSheet_(workbook) {
  var sheet = workbook.getSheetByName(WF_TAB) || workbook.insertSheet(WF_TAB);
  if (sheet.getLastRow() === 0) {
    if (sheet.getMaxColumns() < WF_HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), WF_HEADERS.length - sheet.getMaxColumns());
    sheet.appendRow(WF_HEADERS);
    sheet.getRange(1, 1, 1, WF_HEADERS.length).setFontWeight('bold').setBackground('#d1fae5');
    sheet.setFrozenRows(1);
    sheet.hideColumns(15, 2);
  }
  var headers = sheet.getRange(1, 1, 1, WF_HEADERS.length).getValues()[0];
  if (JSON.stringify(headers) !== JSON.stringify(WF_HEADERS)) throw wfError_('SHEET_SCHEMA_MISMATCH', true);
  return sheet;
}
// Ejecutar una vez antes de actualizar la implementación. No borra ni migra pedidos.
function prepararHoja() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Receptor ocupado. Reintenta.');
  try {
    wfSheet_(SpreadsheetApp.openById(WF_SHEET_ID));
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}
function wfExisting_(sheet, order, fingerprint, idColumn, fingerprintColumn) {
  if (!sheet || sheet.getLastRow() < 2) return false;
  var found = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).createTextFinder(order.requestId).matchEntireCell(true).findNext();
  if (!found) return false;
  if (sheet.getRange(found.getRow(), fingerprintColumn).getValue() !== fingerprint) throw wfError_('IDEMPOTENCY_CONFLICT', true);
  return true;
}
function wfError_(message, definitive) { var error = new Error(message); error.definitive = definitive; return error; }
function wfValidate_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw wfError_('INVALID_ORDER', true);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.requestId || '')) throw wfError_('INVALID_REFERENCE', true);
  var offer = Object.prototype.hasOwnProperty.call(WF_CATALOG, raw.offerId) ? WF_CATALOG[raw.offerId] : null;
  if (!offer || raw.catalogVersion !== WF_VERSION || raw.total !== offer.total || raw.promo) throw wfError_('INVALID_OFFER', true);
  if (raw.website) throw wfError_('INVALID_REQUEST', true);
  function clean(key, min, max) {
    if (typeof raw[key] !== 'string') throw wfError_('INVALID_FIELD', true);
    var value = raw[key].trim().replace(/\s+/g, ' ');
    if (value.length < min || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw wfError_('INVALID_FIELD', true);
    return value;
  }
  var name = clean('name', 3, 100), phone = clean('phone', 10, 20).replace(/[\s()+-]/g, '').replace(/^57(?=3\d{9}$)/, '');
  var department = clean('department', 3, 50), city = clean('city', 2, 80), address = clean('address', 8, 200);
  if (!/^3\d{9}$/.test(phone) || WF_DEPARTMENTS.indexOf(department) < 0) throw wfError_('INVALID_FIELD', true);
  return { requestId: raw.requestId, catalogVersion: WF_VERSION, offerId: raw.offerId, units: offer.units, product: offer.product, shipping: offer.shipping, total: offer.total, name: name, phone: phone, department: department, city: city, address: address, promo: null };
}
function wfCell_(value) {
  var text = String(value);
  return /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
}
function wfReceipt_(order) {
  return { ok: true, requestId: order.requestId, orderId: 'WF-' + order.requestId.toUpperCase(), offerId: order.offerId, total: order.total };
}
function wfSave_(raw, spreadsheetId) {
  var order = wfValidate_(raw);
  var fingerprint = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(order), Utilities.Charset.UTF_8));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw wfError_('BUSY_RETRY', false);
  try {
    var workbook = SpreadsheetApp.openById(spreadsheetId);
    var sheet = wfSheet_(workbook);
    if (wfExisting_(sheet, order, fingerprint, 15, 16)) return wfReceipt_(order);
    // Evita duplicar solicitudes guardadas antes del cambio de formato.
    var legacy = workbook.getSheetByName('Pedidos WellFresh');
    if (legacy && legacy.getLastRow() > 0) {
      if (JSON.stringify(legacy.getRange(1, 1, 1, WF_LEGACY_HEADERS.length).getValues()[0]) !== JSON.stringify(WF_LEGACY_HEADERS)) throw wfError_('LEGACY_SCHEMA_MISMATCH', true);
      if (wfExisting_(legacy, order, fingerprint, 1, 2)) return wfReceipt_(order);
    }
    var cache = CacheService.getScriptCache();
    var rateKey = 'wf-phone-' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, order.phone));
    var attempts = Number(cache.get(rateKey) || 0);
    if (attempts >= 5) throw wfError_('RATE_LIMIT', true);
    cache.put(rateKey, String(attempts + 1), 3600);
    var offer = WF_CATALOG[order.offerId];
    sheet.appendRow([
      'WF-' + order.requestId.toUpperCase(), Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH:mm:ss'),
      wfCell_(order.name), "'" + order.phone, wfCell_(order.department), wfCell_(order.city), wfCell_(order.address),
      offer.name, offer.content, order.total, order.shipping, 0, 'Contra entrega', 'Pendiente de contactar',
      order.requestId, fingerprint
    ]);
    SpreadsheetApp.flush();
    return wfReceipt_(order);
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  var packet, origin, nonce, result;
  try {
    if (!e || !e.parameter || !e.parameter.payload || e.parameter.payload.length > 12000) throw wfError_('INVALID_BODY', true);
    packet = JSON.parse(e.parameter.payload);
    origin = packet.origin;
    nonce = packet.nonce;
    if (WF_ALLOWED_ORIGINS.indexOf(origin) < 0 || !/^[a-f0-9-]{36}$/i.test(nonce || '')) throw wfError_('INVALID_ORIGIN', true);
    result = wfSave_(packet.order, WF_SHEET_ID);
  } catch (error) {
    result = { ok: false, definitive: error.definitive === true, message: error.definitive === true ? 'Revisa tus datos o contacta a Aura para continuar.' : 'No pudimos confirmar el registro. Reintenta la misma solicitud.' };
  }
  if (WF_ALLOWED_ORIGINS.indexOf(origin) < 0 || !nonce) return HtmlService.createHtmlOutput('Solicitud no válida.');
  var message = JSON.stringify({ type: 'wellfresh-order-result', nonce: nonce, result: result }).replace(/</g, '\\u003c');
  var target = JSON.stringify(origin).replace(/</g, '\\u003c');
  // El documento de respuesta puede estar dentro del iframe interno de Google.
  // El acuse se envía solo al origen exacto de la landing, nunca a '*'.
  return HtmlService.createHtmlOutput('<!doctype html><html><body><script>window.top.postMessage(' + message + ',' + target + ');</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doGet() {
  return HtmlService.createHtmlOutput('Receptor WellFresh disponible. Los pedidos se reciben desde la landing.');
}
