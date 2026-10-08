import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {OFFERS,CATALOG_VERSION,validateOrder} from '../lib/catalog.mjs';
import {sendToSheets,createTestReceiver} from '../lib/orders.mjs';
const order=(changes={})=>({requestId:randomUUID(),catalogVersion:CATALOG_VERSION,offerId:'duo',total:79900,name:'PRUEBA NO DESPACHAR',phone:'3000000000',department:'Antioquia',city:'Medellín',address:'Calle de prueba 123 NO DESPACHAR',...changes});
test('catálogo y datos: rechaza precio alterado, descuento no autorizado, campos y ofertas inválidos',()=>{
 for(const changed of [{total:77900},{promo:'EXIT'},{offerId:'__proto__'},{catalogVersion:'old'},{phone:'123'},{department:'inventado'},{address:'x'},{website:'bot'}])assert.throws(()=>validateOrder(order(changed)));
 assert.equal(validateOrder(order({phone:'+57 300 000 0000'})).phone,'3000000000');
});
test('simulador idempotente; no duplica al reintentar y rechaza modificar una referencia',()=>{
 const receive=createTestReceiver(), raw=order(), a=receive(raw), b=receive(raw);
 assert.deepEqual(a,b);assert.equal(a.testMode,true);assert.match(a.orderId,/^PRUEBA-/);
 assert.throws(()=>receive({...raw,name:'Otro nombre de prueba'}));
});
test('Sheets: solo acepta acuse explícito y correlacionado con pedido y total',async()=>{
 const raw=order(), options={url:'https://script.google.com/macros/s/test/exec',secret:'test-only'};
 const good={ok:true,requestId:raw.requestId,offerId:'duo',total:79900,orderId:'WF-'+raw.requestId.toUpperCase()};
 const fetcher=body=>async()=>({ok:true,json:async()=>body});
 assert.equal((await sendToSheets(raw,{...options,fetcher:fetcher(good)})).testMode,false);
 for(const bad of [{},{...good,total:77900},{...good,requestId:randomUUID()},{...good,offerId:'single'},{...good,orderId:''},{ok:false}])await assert.rejects(sendToSheets(raw,{...options,fetcher:fetcher(bad)}));
 await assert.rejects(sendToSheets(raw,{...options,fetcher:async()=>{throw Error('timeout');}}));
 await assert.rejects(sendToSheets(raw,{url:'',secret:''}));
});
function gasHarness(){
 const rows=[];let writes=0,locks=0,release=0;
 const sheet={getLastRow:()=>rows.length,appendRow:row=>{rows.push(row);writes++;},getRange:(r,c,n=1,m=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),getValue:()=>rows[r-1][c-1],createTextFinder:needle=>({matchEntireCell(){return this;},findNext(){const index=rows.findIndex((row,i)=>i>=r-1&&row[c-1]===needle);return index<0?null:{getRow:()=>index+1};}})})};
 const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='WELLFRESH_SECRET'?'test-secret':'fake-sheet'})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,text)=>createHash('sha256').update(text).digest(),base64Encode:b=>b.toString('base64')},LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},releaseLock:()=>release++})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}}});
 vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs',import.meta.url),'utf8'),ctx);
 return {ctx,rows,counts:()=>({writes,locks,release})};
}
test('Apps Script: catálogo alineado, append único, validación y sanitización de fórmulas',()=>{
 const {ctx,rows,counts}=gasHarness();
 for(const [id,offer] of Object.entries(OFFERS)){assert.equal(ctx.WF_CATALOG[id].total,offer.total);assert.equal(ctx.WF_CATALOG[id].units,offer.units);}
 const raw=order({name:'=IMPORTDATA("fake")'});
 ctx.wfSave(raw,'fake-sheet');ctx.wfSave(raw,'fake-sheet');
 assert.equal(rows.length,2);assert.equal(rows[1][9].startsWith("'="),true);
 assert.equal(rows[1][8],79900);assert.equal(counts().locks,counts().release);
 assert.throws(()=>ctx.wfSave({...raw,total:1},'fake-sheet'));
 assert.throws(()=>ctx.wfSave({...raw,city:'Otra ciudad'},'fake-sheet'));
 assert.equal(rows.length,2);
});
test('Apps Script: secreto inválido nunca escribe y error no filtra detalles',()=>{
 const {ctx,rows}=gasHarness();
 const bad=ctx.doPost({postData:{contents:JSON.stringify({secret:'wrong',order:order()})}});
 assert.equal(JSON.parse(bad.text).ok,false);assert.equal(rows.length,0);
 const good=ctx.doPost({postData:{contents:JSON.stringify({secret:'test-secret',order:order()})}});
 assert.equal(JSON.parse(good.text).ok,true);assert.equal(rows.length,2);
});
