const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [375,430,768,1440]){
  await page.setViewportSize({width,height:width===1440?1000:900});
  await page.goto('http://localhost:4173');await page.waitForFunction(()=>document.querySelector('#support-link').hidden===false);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
  assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
  await page.screenshot({path:`artifacts/landing-${width}.png`,fullPage:true});
  if(width===375)await page.screenshot({path:'artifacts/mobile-first-screen.png'});
  await page.locator('.hero [data-buy]').click();
  await page.locator('input[name=name]').fill('PRUEBA NO DESPACHAR');
  await page.locator('input[name=phone]').fill('3000000000');
  await page.locator('select[name=department]').selectOption('Antioquia');
  await page.locator('input[name=city]').fill('Medellín');
  await page.locator('input[name=address]').fill('Calle de prueba 123 NO DESPACHAR');
  await page.locator('input[value=single]').check();
  assert.match(await page.locator('#summary-total').innerText(),/67.900/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#checkout').evaluate(d=>d.open),false);
  await page.locator('.hero [data-buy]').click();
  assert.equal(await page.locator('input[name=name]').inputValue(),'PRUEBA NO DESPACHAR');
  await page.locator('input[value=duo]').check();
  await page.screenshot({path:`artifacts/checkout-${width}.png`,fullPage:false});
  const response=page.waitForResponse(r=>r.url().endsWith('/api/orders'));
  await page.locator('.submit-button').click();
  const body=await(await response).json();assert.equal(body.testMode,true);assert.equal(body.ok,true);
  await page.waitForSelector('#success:not([hidden])');
  assert.match(await page.locator('#success').innerText(),/No es un pedido real/);
  await page.locator('#new-test').click();
  assert.equal(await page.locator('[name=name]').inputValue(),'');
  await page.locator('#checkout [data-close]').first().click();
 }
 // Acuse no correlacionado nunca genera éxito; reintentar preserva referencia.
 await page.goto('http://localhost:4173');await page.waitForFunction(()=>document.querySelector('#support-link').hidden===false);
 await page.locator('.hero [data-buy]').click();
 for(const [key,value] of Object.entries({name:'PRUEBA NO DESPACHAR',phone:'3000000000',city:'Medellín',address:'Calle prueba 123 NO DESPACHAR'}))await page.locator(`[name=${key}]`).fill(value);
 await page.locator('[name=department]').selectOption('Antioquia');
 const requests=[];let intercepted=0;
 await page.route('**/api/orders',async route=>{
  const raw=route.request().postDataJSON();requests.push(raw);intercepted++;
  if(intercepted===1)await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,requestId:'wrong',offerId:raw.offerId,total:raw.total,orderId:'PRUEBA-WRONG',testMode:true})});
  else await route.continue();
 });
 await page.locator('.submit-button').click();await page.waitForFunction(()=>document.querySelector('.submit-button').textContent.includes('Reintentar'));
 assert.equal(await page.locator('#success').isVisible(),false);
 assert.equal(await page.locator('[name=name]').isDisabled(),true);
 await page.locator('.submit-button').click();await page.waitForSelector('#success:not([hidden])');
 assert.equal(requests[0].requestId,requests[1].requestId);
 assert.equal((await page.request.get('http://localhost:4173/.env')).status(),404);
 assert.equal((await page.request.get('http://localhost:4173/conocimiento/PRODUCTO.md')).status(),404);
 assert.equal((await page.request.post('http://localhost:4173/api/orders',{headers:{Origin:'https://wrong.example'},data:requests[0]})).status(),403);
 assert.deepEqual(errors,[]);
 console.log('PASS: 375/430/768/1440 px, assets, modal, precios, cierre, datos, privacidad, simulación, acuse inválido y reintento correlacionado.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
