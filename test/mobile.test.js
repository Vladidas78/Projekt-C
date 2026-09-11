/* Handy-Breite: "ueberall Zugriff" heisst auch Telefon. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE='file://'+path.join(__dirname,'..','kanban.html');
let pass=0,fail=0;
const ok=(n,c,i)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(i?'\n         '+i:'')));};
(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e)));
await page.goto(FILE);await page.waitForTimeout(400);
if(await page.locator('#lgGo').count()){
  await page.fill('#lgUser','Vladi');await page.fill('#lgPass','12345');
  await page.click('#lgGo');await page.waitForTimeout(500);
}
await page.waitForSelector('#frSample',{timeout:5000});
await page.click('#frSample');await page.waitForTimeout(600);

const hScroll=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
ok('kein waagerechtes Scrollen der Seite',!hScroll,'scrollWidth '+await page.evaluate(()=>document.documentElement.scrollWidth));

// Seitenleiste ist mobil eingeklappt - erst ueber das Menue oeffnen
ok('Menue-Knopf vorhanden',(await page.locator('#hamb').count())>0);
await page.click('#hamb');await page.waitForTimeout(400);
const bl=page.locator('[data-board]').first();
await bl.click();await page.waitForTimeout(600);
const nCards=await page.locator('.card').count();
ok('Karten sind sichtbar',nCards>0,'Karten: '+nCards);

const link=page.locator('a.cal-mini').first();
ok('Outlook-Knopf auch auf dem Handy da',await link.count()>0);
if(await link.count()){
  const box=await link.boundingBox();
  ok('Knopf ist treffbar (>=24px hoch)',box&&box.height>=24,'Hoehe: '+(box&&box.height.toFixed(1)));
  ok('Knopf liegt im Sichtfeld',box&&box.x>=0&&box.x+box.width<=390,'x='+(box&&box.x.toFixed(0))+' b='+(box&&box.width.toFixed(0)));
}
await page.locator('.card .card-title').first().tap();
await page.waitForTimeout(450);
ok('Detailfenster oeffnet per Tippen',(await page.locator('#detailPanel').count())>0);
const dp=await page.locator('#detailPanel').boundingBox();
ok('Detailfenster passt in die Breite',dp&&dp.width<=390,'Breite: '+(dp&&dp.width.toFixed(0)));
ok('Termin-Abschnitt auch mobil da',(await page.locator('#dCal').count())>0);
ok('keine JS-Fehler',errs.length===0,errs.join('\n'));
await b.close();
console.log('\n'+pass+' ok, '+fail+' fehlgeschlagen\n');
process.exit(fail?1:0);
})().catch(e=>{console.error('ABBRUCH',e);process.exit(1);});
