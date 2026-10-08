import {validateOrder} from './catalog.mjs';
export class OrderError extends Error {constructor(message,status=502,definitive=false){super(message);this.status=status;this.definitive=definitive;}}
export async function sendToSheets(raw,{url,secret,fetcher=fetch}){
 const order=validateOrder(raw);
 if(!url||!secret)throw new OrderError('Los pedidos no están disponibles por ahora.',503,true);
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))throw new OrderError('Los pedidos no están disponibles por ahora.',503,true);
 let result;
 try{
  const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,order}),redirect:'follow',signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error();
  result=await response.json();
 }catch{throw new OrderError('No pudimos confirmar el registro. Reintenta la misma solicitud para evitar duplicados.');}
 if(result.ok!==true)throw new OrderError('No pudimos registrar la solicitud. Revisa tus datos o contacta a Aura.',502,result.definitive===true);
 if(result.requestId!==order.requestId||result.offerId!==order.offerId||result.total!==order.total||!/^WF-[A-F0-9-]{36}$/i.test(result.orderId))throw new OrderError('La confirmación no pudo verificarse. Reintenta la misma solicitud.');
 return {ok:true,requestId:order.requestId,orderId:result.orderId,offerId:order.offerId,total:order.total,testMode:false};
}
export function createTestReceiver(){
 const orders=new Map();
 return raw=>{
  const order=validateOrder(raw), previous=orders.get(order.requestId), fingerprint=JSON.stringify(order);
  if(previous){if(previous.fingerprint!==fingerprint)throw new OrderError('La referencia ya pertenece a otra solicitud.',409,true);return previous.receipt;}
  if(orders.size>=1000)throw new OrderError('Reinicia la prueba local para continuar.',503,true);
  const receipt={ok:true,requestId:order.requestId,orderId:`PRUEBA-${order.requestId.slice(0,8).toUpperCase()}`,offerId:order.offerId,total:order.total,testMode:true};
  orders.set(order.requestId,{fingerprint,receipt});return receipt;
 };
}
