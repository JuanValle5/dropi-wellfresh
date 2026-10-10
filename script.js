// Landing estática: sin Node, npm, módulos ni solicitudes a un servidor local.
// El endpoint público de Google se configura en sheets-config.js.
(() => {
const CATALOG_VERSION = 'wellfresh-2026-10-09-v2';
const OFFERS = Object.freeze({
  single: Object.freeze({ id: 'single', label: 'Una para llevar', units: 1, volume: 30, product: 59900, shipping: 0, total: 59900 }),
  duo: Object.freeze({ id: 'duo', label: 'Una contigo. Otra en casa.', units: 2, volume: 30, product: 89900, shipping: 0, total: 89900 }),
});
const money = value => new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(value);
const DEPARTMENTS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];

const $ = selector => document.querySelector(selector);
const checkout = $('#checkout'), form = $('#order-form'), privacy = $('#privacy');
const submit = form.querySelector('[type=submit]');
let openingButton = null, pendingOrder = null, sending = false, confirmed = false;
for (const department of DEPARTMENTS) form.elements.department.add(new Option(department, department));
function currentOffer() { return OFFERS[form.elements.offerId.value] || OFFERS.duo; }
function buttonLabel() { submit.textContent = sending ? 'Registrando…' : pendingOrder ? 'Reintentar la misma solicitud' : `Confirmar mi pedido · ${money(currentOffer().total)}`; }
function updateSummary(){
 const offer=currentOffer();
 $('#summary-label').textContent=`${offer.units} ${offer.units===1?'frasco':'frascos'} · 30 ml ${offer.units===1?'':'cada uno'}`;
 $('#summary-product').textContent=money(offer.product);
 $('#summary-shipping').textContent='Gratis';
 $('#summary-total').textContent=money(offer.total);
 buttonLabel();
}
function openCheckout(event){
 openingButton=event.currentTarget;
 if(!pendingOrder && !confirmed) form.elements.offerId.value=openingButton.dataset.buy;
 updateSummary();
 checkout.showModal();
 checkout.scrollTop=0;
}
function closeCheckout(){checkout.close();openingButton?.focus();}
for(const button of document.querySelectorAll('[data-buy]')) button.addEventListener('click',openCheckout);
for(const button of checkout.querySelectorAll('[data-close]')) button.addEventListener('click',closeCheckout);
checkout.addEventListener('cancel',()=>setTimeout(()=>openingButton?.focus(),0));
function backdropClose(dialog, close){dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});}
backdropClose(checkout,closeCheckout);
let privacyTrigger=null;
function openPrivacy(e){privacyTrigger=e.currentTarget;privacy.showModal();}
$('#privacy-open').addEventListener('click',openPrivacy);
const closePrivacy=()=>{privacy.close();privacyTrigger?.focus();};
$('#privacy-close').addEventListener('click',closePrivacy);backdropClose(privacy,closePrivacy);
form.addEventListener('change',e=>{if(e.target.name==='offerId')updateSummary();});

const supportURL = 'https://wa.me/573160958557';
function sendOrder(order) {
  return new Promise((resolve, reject) => {
    const endpoint = window.WELLFRESH_SHEETS_URL;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint || '')) {
      reject(new Error('Los pedidos aún no están habilitados. Puedes contactar a Aura por WhatsApp.')); return;
    }
    if (location.protocol !== 'https:' && !['http://localhost:4173','http://127.0.0.1:4173'].includes(location.origin)) {
      reject(new Error('Abre la página desde su dirección web para confirmar tu pedido.')); return;
    }
    const nonce = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.name = 'wf-' + nonce; frame.hidden = true; frame.title = 'Registro seguro del pedido';
    const transport = document.createElement('form');
    transport.method = 'POST'; transport.action = endpoint; transport.target = frame.name; transport.hidden = true;
    const field = document.createElement('input');field.type = 'hidden';field.name = 'payload';
    field.value = JSON.stringify({origin:location.origin,nonce,order});transport.append(field);
    const cleanup = () => {clearTimeout(timer);window.removeEventListener('message',receive);transport.remove();frame.remove();};
    const receive = event => {
      const trustedOrigin = event.origin === 'https://script.googleusercontent.com' || /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(event.origin);
      const data = event.data;
      if (!trustedOrigin || !data || data.type !== 'wellfresh-order-result' || data.nonce !== nonce) return;
      const result = data.result;
      if (!result || (result.ok !== true && result.ok !== false)) return;
      if(result.ok && (result.requestId !== order.requestId || result.total !== order.total || result.offerId !== order.offerId || result.orderId !== 'WF-' + order.requestId.toUpperCase())) return;
      cleanup();resolve(result);
    };
    const timer = setTimeout(() => {cleanup();reject(new Error('Aún no pudimos confirmar el registro. Reintenta con la misma referencia; no volveremos a crear el pedido si ya quedó guardado.'));},45000);
    window.addEventListener('message',receive);
    document.body.append(frame,transport);
    transport.submit();
  });
}
function lockOrder(locked) {
  for (const field of form.querySelectorAll('input,select')) field.disabled = locked;
  submit.disabled = sending || confirmed;
  buttonLabel();
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if(sending || confirmed) return;
  if(!window.WELLFRESH_SHEETS_URL){$('#form-status').textContent='Los pedidos aún no están habilitados. Puedes contactar a Aura por WhatsApp.';return;}
  if(location.protocol === 'file:'){$('#form-status').textContent='Abre la página desde su dirección web para confirmar tu pedido.';return;}
  if(!pendingOrder){
    const data = Object.fromEntries(new FormData(form));
    const phone = data.phone.replace(/[\s()+-]/g,'').replace(/^57(?=3\d{9}$)/,'');
    if(!/^3\d{9}$/.test(phone)){$('#form-status').textContent='Escribe un celular colombiano de 10 dígitos.';return;}
    pendingOrder = {...data,phone,requestId:crypto.randomUUID(),catalogVersion:CATALOG_VERSION,total:currentOffer().total,promo:null};
  }
  sending = true;lockOrder(true);$('#form-status').textContent='Registrando tu solicitud…';
  try{
    const result = await sendOrder(pendingOrder);
    if(!result.ok){if(result.definitive)pendingOrder=null;throw new Error(result.message || 'No pudimos confirmar el registro. Reintenta.');}
    confirmed=true;
    $('#receipt-id').textContent=result.orderId;
    $('#receipt-total').textContent=money(result.total);
    $('#order-whatsapp').href = supportURL + '?text=' + encodeURIComponent(`Hola, Aura. Quiero consultar mi pedido WellFresh ${result.orderId}, por ${money(result.total)}. Ya lo registré en la página.`);
    $('#checkout-content').hidden=true;$('#success').hidden=false;
    checkout.scrollTop=0;$('#success').focus();
  }catch(error){$('#form-status').textContent=error.message;}
  finally{sending=false;lockOrder(!!pendingOrder);}
});
updateSummary();
})();
