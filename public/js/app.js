import {OFFERS, CATALOG_VERSION, money, DEPARTMENTS, validateOrder} from '/catalog.mjs';
const $ = s => document.querySelector(s);
const checkout=$('#checkout'), form=$('#order-form'), privacy=$('#privacy');
let config={testMode:false,ordersEnabled:false}, openingButton=null, sending=false, confirmed=false, pending=null;
const submit=form.querySelector('[type=submit]');
for(const department of DEPARTMENTS) form.elements.department.add(new Option(department,department));
function currentOffer(){return OFFERS[form.elements.offerId.value] || OFFERS.duo;}
function updateSummary(){
 const offer=currentOffer();
 $('#summary-label').textContent=`${offer.units} ${offer.units===1?'frasco':'frascos'} · 30 ml ${offer.units===1?'':'cada uno'}`;
 $('#summary-product').textContent=money(offer.product);
 $('#summary-shipping').textContent=offer.shipping?money(offer.shipping):'Incluido';
 $('#summary-total').textContent=money(offer.total);
 buttonLabel();
}
function buttonLabel(){
 submit.textContent=sending?'Registrando…':pending?'Reintentar la misma solicitud':`${config.testMode?'Probar pedido':'Confirmar mi pedido'} · ${money(currentOffer().total)}`;
}
function status(message){$('#form-status').textContent=message;}
function lockFields(locked){
 for(const el of form.querySelectorAll('input,select')) el.disabled=locked;
 submit.disabled=sending;
}
function openCheckout(event){
 openingButton=event.currentTarget;
 if(!confirmed&&!pending){form.elements.offerId.value=openingButton.dataset.buy;updateSummary();}
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
async function loadConfig(){
 try{
  const response=await fetch('/api/config');if(!response.ok)throw Error();config=await response.json();
  if(config.whatsapp){
   const href=`https://wa.me/${config.whatsapp}`;
   $('#support-link').href=href;$('#support-link').hidden=false;
   const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener';link.textContent='WhatsApp de Aura: 316 095 8557';
   $('#privacy-contact').replaceChildren('Para consultas sobre tus datos o tu pedido: ',link,'.');
  }
  if(config.testMode){
   status('Modo de prueba: completa el formulario con datos ficticios.');
  }else if(!config.ordersEnabled)status('Los pedidos no están disponibles por ahora. Puedes consultar las presentaciones o contactar a Aura.');
 }catch{status('No pudimos comprobar la disponibilidad de pedidos. Intenta recargar.');}
 updateSummary();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending||confirmed)return;
 if(!config.ordersEnabled&&!config.testMode){status('Los pedidos no están disponibles por ahora. Contacta a Aura por WhatsApp.');return;}
 if(!pending){
  try{
   const raw=Object.fromEntries(new FormData(form));
   pending=validateOrder({...raw,requestId:crypto.randomUUID(),catalogVersion:CATALOG_VERSION,total:currentOffer().total});
  }catch(error){status(error.message);return;}
 }
 sending=true;lockFields(true);buttonLabel();status('Registrando tu solicitud…');
 try{
  const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending),signal:AbortSignal.timeout(22000)});
  const result=await response.json();
  if(!response.ok||result.ok!==true){
   const definitive=result.definitive===true;
   if(definitive)pending=null;
   throw new Error(result.message||'No pudimos confirmar el registro. Reintenta la misma solicitud para evitar duplicados.');
  }
  if(result.requestId!==pending.requestId||result.total!==pending.total||result.offerId!==pending.offerId||typeof result.orderId!=='string'||!result.orderId||result.testMode!==config.testMode){throw new Error('No pudimos verificar la confirmación. Reintenta la misma solicitud.');}
  confirmed=true;
  $('#checkout-content').hidden=true;$('#success').hidden=false;
  $('#receipt-id').textContent=result.orderId;$('#receipt-total').textContent=money(result.total);
  if(result.testMode){
   $('#success .eyebrow').textContent='SIMULACIÓN COMPLETADA';
   $('#success-title').replaceChildren('Tu prueba quedó registrada.');
   $('#success>p:not(.eyebrow)').textContent='No es un pedido real. No se guardó en Google Sheets ni se enviará un producto.';
   $('#success-followup').textContent='La prueba se conserva temporalmente mientras esté abierto el servidor local.';
   if(!$('#new-test')){
    const restart=document.createElement('button');restart.id='new-test';restart.type='button';restart.className='button outline';restart.textContent='Hacer otra prueba';
    restart.addEventListener('click',()=>{pending=null;confirmed=false;sending=false;form.reset();lockFields(false);submit.disabled=false;$('#success').hidden=true;$('#checkout-content').hidden=false;updateSummary();status('Modo de prueba: completa el formulario con datos ficticios.');checkout.scrollTop=0;form.elements.name.focus();});
    $('#success').append(restart);
   }
  }
  checkout.scrollTop=0;$('#success').focus();
 }catch(error){status(error.name==='TimeoutError'?'Aún no pudimos confirmar el registro. Reintenta: conservaremos la misma referencia para evitar duplicados.':error.message||'No hubo conexión. Reintenta la misma solicitud.');}
 finally{sending=false;lockFields(!!pending);submit.disabled=confirmed;buttonLabel();}
});
updateSummary();loadConfig();
