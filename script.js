// Landing estática: sin Node, npm, módulos ni solicitudes a un servidor local.
// La conexión a Google Sheets se configurará en el siguiente paso.
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
let openingButton = null;
for (const department of DEPARTMENTS) form.elements.department.add(new Option(department, department));
function currentOffer() { return OFFERS[form.elements.offerId.value] || OFFERS.duo; }
function buttonLabel() { submit.textContent = `Confirmar mi pedido · ${money(currentOffer().total)}`; }
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
 form.elements.offerId.value=openingButton.dataset.buy;updateSummary();
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
$('#support-link').href = supportURL;
$('#support-link').hidden = false;
const support = document.createElement('a');
support.href = supportURL; support.target = '_blank'; support.rel = 'noopener';
support.textContent = 'WhatsApp de Aura: 316 095 8557';
$('#privacy-contact').replaceChildren('Para consultas sobre tus datos o tu pedido: ', support, '.');
form.addEventListener('submit', event => {
  event.preventDefault();
  // No simular éxito ni enviar datos mientras no exista un receptor conectado.
  $('#form-status').textContent = 'Los pedidos aún no están habilitados. Puedes contactar a Aura por WhatsApp.';
});
updateSummary();
})();
