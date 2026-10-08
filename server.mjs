import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateOrder} from './lib/catalog.mjs';
import {sendToSheets,createTestReceiver,OrderError} from './lib/orders.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)), port=Number(process.env.PORT||4173);
const origin=process.env.PUBLIC_ORIGIN||`http://localhost:${port}`;
const testMode=process.env.LOCAL_TEST_MODE==='true';
const ready=process.env.ORDERS_ENABLED==='true'&&!!process.env.GOOGLE_SCRIPT_URL&&!!process.env.GOOGLE_SCRIPT_SECRET;
const whatsapp=/^57[0-9]{10}$/.test(process.env.SUPPORT_WHATSAPP||'')?process.env.SUPPORT_WHATSAPP:null;
const testReceive=createTestReceiver(), limits=new Map();
const publicFiles=new Map([['/','public/index.html'],['/styles.css','public/styles.css'],['/js/app.js','public/js/app.js'],['/favicon.svg','public/favicon.svg'],['/assets/hero.webp','public/assets/hero.webp'],['/assets/in-hand.webp','public/assets/in-hand.webp'],['/catalog.mjs','lib/catalog.mjs']]);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
async function readBody(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)throw new OrderError('Solicitud demasiado grande.',413,true);}try{return JSON.parse(raw);}catch{throw new OrderError('Solicitud inválida.',400,true);}}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
 const url=new URL(req.url,origin);
 if(req.method==='GET'&&url.pathname==='/api/config')return json(res,200,{testMode,ordersEnabled:ready&&!testMode,whatsapp});
 if(req.method==='POST'&&url.pathname==='/api/orders'){
  try{
   if(req.headers.origin!==origin)throw new OrderError('Origen de solicitud no permitido.',403,true);
   if(!String(req.headers['content-type']).startsWith('application/json'))throw new OrderError('Formato no válido.',415,true);
   if(!testMode&&!ready)throw new OrderError('Los pedidos no están disponibles por ahora.',503,true);
   const ip=req.socket.remoteAddress, now=Date.now();
   for(const [key,v] of limits)if(now-v.start>600000)limits.delete(key);
   const limit=limits.get(ip)||{start:now,count:0};limit.count++;limits.set(ip,limit);
   if(limit.count>30)throw new OrderError('Demasiados intentos. Espera unos minutos y reintenta.',429,false);
   const raw=await readBody(req);let order;
   try{order=validateOrder(raw);}catch(error){throw new OrderError(error.message,422,true);}
   const result=testMode?testReceive(order):await sendToSheets(order,{url:process.env.GOOGLE_SCRIPT_URL,secret:process.env.GOOGLE_SCRIPT_SECRET});
   return json(res,200,result);
  }catch(error){return json(res,error.status||500,{ok:false,message:error instanceof OrderError?error.message:'No pudimos confirmar tu solicitud. Reintenta con la misma referencia.',definitive:error.definitive===true});}
 }
 if((req.method==='GET'||req.method==='HEAD')&&publicFiles.has(url.pathname)){
  try{const file=publicFiles.get(url.pathname), data=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}catch{json(res,404,{ok:false});}return;
 }
 json(res,404,{ok:false});
});
server.listen(port,'127.0.0.1',()=>console.log(`WellFresh: ${origin} · ${testMode?'PRUEBA LOCAL, sin pedidos reales':'receptor '+(ready?'configurado':'desactivado')}`));
