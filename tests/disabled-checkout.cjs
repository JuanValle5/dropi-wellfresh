const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [375,1440]){
 await page.setViewportSize({width,height:900});await page.goto('http://localhost:4173');
 await page.waitForFunction(()=>document.querySelector('#support-link').hidden===false);
 assert.equal(await page.locator('.test-banner').count(),0);
 assert.equal(await page.locator('[name=consent]').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.hero [data-buy]').click();
 for(const [name,value] of Object.entries({name:'PRUEBA NO DESPACHAR',phone:'3000000000',city:'Medellín',address:'Calle prueba 123 NO DESPACHAR'}))await page.locator(`[name=${name}]`).fill(value);
 await page.locator('[name=department]').selectOption('Antioquia');
 await page.locator('.submit-button').click();
 assert.match(await page.locator('#form-status').innerText(),/no están disponibles/);
 assert.equal(await page.locator('#success').isVisible(),false);
}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: móvil/escritorio sin aviso ni casilla; no se confirma pedido sin receptor.');
})().catch(e=>{console.error(e);process.exit(1)});
