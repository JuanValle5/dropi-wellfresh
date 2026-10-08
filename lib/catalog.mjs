export const CATALOG_VERSION = 'wellfresh-2026-10-08-v1';
export const OFFERS = Object.freeze({
  single: Object.freeze({ id: 'single', label: 'Una para llevar', units: 1, volume: 30, product: 49900, shipping: 18000, total: 67900 }),
  duo: Object.freeze({ id: 'duo', label: 'Una contigo. Otra en casa.', units: 2, volume: 30, product: 79900, shipping: 0, total: 79900 }),
});
export const money = value => new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(value);
export const DEPARTMENTS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
export function validateOrder(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Pedido inválido.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.requestId || '')) throw new Error('Referencia de pedido inválida.');
  const offer = Object.hasOwn(OFFERS, raw.offerId) ? OFFERS[raw.offerId] : null;
  if (!offer || raw.catalogVersion !== CATALOG_VERSION || raw.total !== offer.total || raw.promo) throw new Error('La oferta cambió. Revisa el total antes de continuar.');
  if (raw.website) throw new Error('Solicitud inválida.');
  const clean = (key, min, max) => {
    if (typeof raw[key] !== 'string') throw new Error('Completa tus datos de envío.');
    const value = raw[key].trim().replace(/\s+/g,' ');
    if (value.length < min || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Revisa tus datos de envío.');
    return value;
  };
  const name = clean('name',3,100), department = clean('department',3,50), city = clean('city',2,80), address = clean('address',8,200);
  const phone = clean('phone',10,20).replace(/[\s()+-]/g,'').replace(/^57(?=3\d{9}$)/,'');
  if (!/^3\d{9}$/.test(phone)) throw new Error('Escribe un celular colombiano de 10 dígitos.');
  if (!DEPARTMENTS.includes(department)) throw new Error('Selecciona un departamento válido.');
  return {requestId:raw.requestId, catalogVersion:CATALOG_VERSION, offerId:offer.id, units:offer.units, total:offer.total, product:offer.product, shipping:offer.shipping, name, phone, department, city, address, promo:null};
}
