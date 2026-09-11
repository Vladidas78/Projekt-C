/* Echter Browser. Prueft, was Stubs nicht zeigen: stille JS-Fehler,
   echte Klicks, das Zusammenspiel von Outlook-Link und Drag&Drop. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE='file://'+path.join(__dirname,'..','kanban.html');
let pass=0,fail=0;
const ok=(n,c,i)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(i?'\n         '+i:'')));};
const eq=(n,a,b)=>ok(n,a===b,'erwartet '+JSON.stringify(b)+', bekommen '+JSON.stringify(a));

(async()=>{
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});

await page.goto(FILE);
await page.waitForTimeout(400);

console.log('\n-- Start --');
const hasLogin=await page.locator('#lgVer').count();
ok('Anmeldung erscheint (lokale Datei, kein Artifact)',hasLogin>0);
eq('Versionsnummer mitgezogen',(await page.locator('#lgVer').textContent().catch(()=>'')).trim(),'Version 1.3');
if(hasLogin){
  await page.fill('#lgUser','Vladi');
  await page.fill('#lgPass','12345');
  await page.click('#lgGo');
  await page.waitForTimeout(500);
}
ok('Anmeldung durchgelaufen',(await page.locator('#lgCard').count())===0);
// Erststart-Dialog: Beispieldaten laden, damit Karten da sind
await page.waitForSelector('#frSample',{timeout:5000});
await page.click('#frSample');
await page.waitForTimeout(500);
ok('App ist gestartet',(await page.locator('#sidebar, .sidebar').count())>0);


console.log('\n-- Outlook auf der Karte --');
// In ein Board wechseln (Sidebar-Eintrag des Boards "Arbeit")
await page.locator('#sidebar .nav-item, #sidebar [data-board]').first().waitFor({timeout:5000}).catch(()=>{});
const boardLink=page.locator('[data-board]').first();
if(await boardLink.count()){await boardLink.click();}
await page.waitForTimeout(500);
console.log('         (Karten im Board: '+(await page.locator('.card').count())+')');
const calLinks=page.locator('a.cal-mini');
const nLinks=await calLinks.count();
ok('Outlook-Knopf erscheint an Aufgaben mit Termin',nLinks>0,'gefunden: '+nLinks);
if(nLinks>0){
  const href=await calLinks.first().getAttribute('href');
  ok('Link zeigt auf den Outlook-Deeplink',href.startsWith('https://outlook.office.com/calendar/0/deeplink/compose?'),href.slice(0,80));
  ok('Betreff ist gesetzt',/[?&]subject=[^&]+/.test(href));
  ok('Start ist gesetzt',/[?&]startdt=\d{4}-\d{2}-\d{2}T/.test(href));
  ok('kein Z-Suffix im Zeitstempel',!/startdt=[^&]*Z/.test(href));
  eq('oeffnet in neuem Tab',await calLinks.first().getAttribute('target'),'_blank');
}

console.log('\n-- Klick auf Outlook oeffnet NICHT das Detailfenster --');
if(nLinks>0){
  // Klick abfangen, damit kein echter Tab aufgeht
  await page.evaluate(()=>{document.querySelectorAll('a.cal-mini').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));});
  await calLinks.first().click();
  await page.waitForTimeout(300);
  const open=await page.locator('#detailPanel.show').count();
  eq('Detailfenster bleibt zu',open,0);
}

console.log('\n-- Karte oeffnet weiterhin das Detailfenster --');
await page.locator('.card .card-title').first().click();
await page.waitForTimeout(350);
ok('Detailfenster geht auf',(await page.locator('#detailPanel').count())>0);
ok('Termin-Abschnitt ist da',(await page.locator('#dCal').count())>0);
const durVal=await page.locator('#dCalDur').count();
ok('Dauer-Feld vorhanden',durVal>0);

console.log('\n-- Ganztags vs. feste Uhrzeit --');
ok('ohne Uhrzeit ist die Dauer gesperrt',await page.locator('#dCalDur').isDisabled());
eq('ohne Uhrzeit -> allday=true',/allday=true/.test(await page.locator('#dCalOpen').getAttribute('href')),true);
// Uhrzeit setzen -> Abschnitt muss sich neu zeichnen
await page.fill('#detailPanel [data-f="dueTime"]','09:00');
await page.waitForTimeout(400);
ok('mit Uhrzeit ist die Dauer bedienbar',!(await page.locator('#dCalDur').isDisabled()));
let href=await page.locator('#dCalOpen').getAttribute('href');
ok('allday verschwindet',!/allday=true/.test(href),href.slice(0,110));
ok('Start traegt die Uhrzeit',/startdt=[^&]*T09%3A00%3A00/.test(href),href);

console.log('\n-- Termin reagiert auf Aenderungen --');
const before=href;
await page.fill('#dCalDur','120');
await page.waitForTimeout(400);
href=await page.locator('#dCalOpen').getAttribute('href');
ok('andere Dauer -> anderes Ende',before!==href);
ok('Ende ist Start + 120 Min.',/enddt=[^&]*T11%3A00%3A00/.test(href),href);
await page.fill('#dCalLoc','Raum 2.14');
await page.waitForTimeout(400);
href=await page.locator('#dCalOpen').getAttribute('href');
ok('Ort landet im Link',/location=Raum%202.14/.test(href),href);

console.log('\n-- Titel wirkt sofort auf den Link --');
await page.fill('#dTitle','Neuer Titel');
await page.waitForTimeout(300);
ok('Betreff zieht nach',/subject=Neuer%20Titel/.test(await page.locator('#dCalOpen').getAttribute('href')));
await page.keyboard.press('Escape').catch(()=>{});
await page.waitForTimeout(250);

console.log('\n-- Ziehen funktioniert weiter --');
const card=page.locator('.column .card').first();
if(await card.count()){
  const box=await card.boundingBox();
  const cols=page.locator('.column');
  const target=await cols.nth(1).boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+14);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+120,{steps:12});
  await page.waitForTimeout(120);
  const dragging=await page.locator('.card.dragging').count();
  ok('Ziehen startet',dragging>0);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

console.log('\n-- Sandbox-Frame (wie im veroeffentlichten Artifact) --');
const sp=await ctx.newPage();
const sErrors=[];
sp.on('pageerror',e=>sErrors.push(String(e)));
const fs=require('fs');
const html=fs.readFileSync(path.join(__dirname,'..','kanban.html'),'utf8');
await sp.setContent('<iframe id="f" sandbox="allow-scripts" style="width:1200px;height:800px;border:0"></iframe>');
await sp.evaluate(h=>{document.getElementById('f').srcdoc=h;},html);
await sp.waitForTimeout(1200);
const frame=sp.frames().find(f=>f!==sp.mainFrame());
ok('laeuft im Sandbox-Frame ohne Absturz',!!frame);
if(frame){
  const started=await frame.evaluate(()=>!!document.querySelector('#sidebar,.sidebar,#lgVer')).catch(()=>false);
  ok('App startet auch dort',started);
  const noStore=await frame.evaluate(()=>{try{localStorage.setItem('x','1');return false;}catch(e){return true;}}).catch(()=>null);
  console.log('         (Speicher im Frame gesperrt: '+noStore+')');
}
ok('keine JS-Fehler im Sandbox-Frame',sErrors.length===0,sErrors.join('\n'));

console.log('\n-- Stille Fehler --');
ok('keine unbehandelten JS-Fehler',errors.length===0,errors.slice(0,6).join('\n'));

await browser.close();
console.log('\n'+pass+' ok, '+fail+' fehlgeschlagen\n');
process.exit(fail?1:0);
})().catch(e=>{console.error('ABBRUCH',e);process.exit(1);});
