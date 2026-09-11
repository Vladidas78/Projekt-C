/* Der Weg, auf dem die bestehenden Aufgaben in die Website kommen. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE='file://'+path.join(__dirname,'..','kanban.html');
let pass=0,fail=0;
const ok=(n,c,i)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(i?'\n         '+i:'')));};
const eq=(n,a,b)=>ok(n,a===b,'erwartet '+JSON.stringify(b)+', bekommen '+JSON.stringify(a));

/* Ein Backup, wie es die bestehende App ausgibt */
const BACKUP={
  areas:[{id:'a_work',name:'Arbeit',icon:'briefcase',color:'#3E5DAB'},
         {id:'a_home',name:'Privat',icon:'home',color:'#3E8E6E'}],
  boards:[{id:'b_work',areaId:'a_work',name:'Arbeit',columns:[
            {id:'c_in',name:'Eingang'},{id:'c_prog',name:'In Bearbeitung'},{id:'c_done',name:'Erledigt',done:true}]}],
  tasks:[
    {id:'alt1',boardId:'b_work',areaId:'a_work',columnId:'c_in',title:'Echte Altaufgabe eins',
     description:'aus dem alten Bestand',priority:'high',createdAt:1750000000000,
     dueDate:'2026-09-20',dueTime:'10:00',estimate:45,tags:['Bestand'],subtasks:[],links:[],
     history:[{t:1750000000000,type:'created'}]},
    {id:'alt2',boardId:'b_work',areaId:'a_work',columnId:'c_prog',title:'Echte Altaufgabe zwei',
     priority:'normal',createdAt:1750000001000,dueDate:'2026-09-22',tags:[],subtasks:[],links:[],
     history:[{t:1750000001000,type:'created'}]}
  ],
  savedViews:[],notifications:[],notifiedKeys:{},trash:[],
  settings:{dateFormat:'DD.MM.YYYY',defaultAreaId:'a_work',defaultBoardId:'b_work',
            defaultPriority:'normal',dueSoonDays:3,completedBehavior:'show',
            autoArchiveDays:14,notificationsEnabled:false,firstRun:false},
  meta:{version:1}
};

(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:900}});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e)));
await page.goto(FILE);await page.waitForTimeout(400);
if(await page.locator('#lgGo').count()){
  await page.fill('#lgUser','Vladi');await page.fill('#lgPass','12345');
  await page.click('#lgGo');await page.waitForTimeout(500);
}

console.log('\n-- Erststart bietet die Uebernahme an --');
await page.waitForSelector('#frSample',{timeout:5000});
ok('Knopf "Aufgaben uebernehmen" ist da',(await page.locator('#frImport').count())>0);
await page.click('#frImport');
await page.waitForTimeout(500);
ok('Auswahl zwischen Datei und Text',(await page.locator('#icFile').count())>0&&(await page.locator('#icText').count())>0);

console.log('\n-- Text einfuegen --');
await page.click('#icText');await page.waitForTimeout(400);
ok('Eingabefeld erscheint',(await page.locator('#imText').count())>0);

// Leer
await page.click('#imTextGo');await page.waitForTimeout(250);
ok('leere Eingabe wird abgefangen',await page.locator('#imTextErr').isVisible());

// Unsinn
await page.fill('#imText','das ist kein json');
await page.click('#imTextGo');await page.waitForTimeout(250);
ok('kaputtes JSON wird erklaert',/JSON/.test(await page.locator('#imTextErr').textContent()));

// Gueltiges JSON, aber kein Backup
await page.fill('#imText','{"foo":1}');
await page.click('#imTextGo');await page.waitForTimeout(250);
ok('falsche Struktur wird erklaert',/tasks/.test(await page.locator('#imTextErr').textContent()));

// Das echte Backup
await page.fill('#imText',JSON.stringify(BACKUP));
await page.click('#imTextGo');await page.waitForTimeout(600);
ok('Bilanz nennt die Anzahl',/2/.test(await page.locator('#genModal').textContent()));
ok('Zusammenfuehren wird angeboten',(await page.locator('#imMerge').count())>0);
await page.click('#imMerge');await page.waitForTimeout(800);

console.log('\n-- Bilanz --');
ok('Bilanz-Dialog erscheint',(await page.locator('#genModal').count())>0);
await page.keyboard.press('Escape').catch(()=>{});
await page.waitForTimeout(300);
if(await page.locator('#genModal').count()){
  await page.click('#genModal .btn-primary').catch(()=>{});await page.waitForTimeout(300);
}

console.log('\n-- Die Aufgaben sind im Board --');
await page.evaluate(()=>{const b=document.querySelector('[data-board]');if(b)b.click();});
await page.waitForTimeout(600);
const titles=await page.evaluate(()=>[...document.querySelectorAll('.card-title')].map(e=>e.textContent.trim()));
ok('Altaufgabe eins sichtbar',titles.some(t=>/Altaufgabe eins/.test(t)),'gefunden: '+JSON.stringify(titles));
ok('Altaufgabe zwei sichtbar',titles.some(t=>/Altaufgabe zwei/.test(t)));
ok('Spalten aus dem Backup uebernommen',await page.evaluate(()=>[...document.querySelectorAll('.column')].length>=3));

console.log('\n-- Outlook greift auf den Altdaten --');
const link=page.locator('a.cal-mini').first();
ok('Outlook-Knopf auch an importierten Aufgaben',(await link.count())>0);
if(await link.count()){
  const href=await link.getAttribute('href');
  ok('Zeitpunkt aus dem Altbestand uebernommen',/startdt=2026-09-2\dT/.test(href),href.slice(0,120));
}

console.log('\n-- Zweiter Import erzeugt keine Doppelten --');
await page.evaluate(()=>importTextDialog());
await page.waitForTimeout(400);
await page.fill('#imText',JSON.stringify(BACKUP));
await page.click('#imTextGo');await page.waitForTimeout(500);
await page.click('#imMerge');await page.waitForTimeout(700);
await page.keyboard.press('Escape').catch(()=>{});await page.waitForTimeout(300);
await page.evaluate(()=>{const b=document.querySelector('[data-board]');if(b)b.click();});
await page.waitForTimeout(500);
const dupes=await page.evaluate(()=>{
  const t=[...document.querySelectorAll('.card-title')].map(e=>e.textContent.trim());
  return t.length-new Set(t).size;
});
eq('keine doppelten Karten',dupes,0);

ok('keine JS-Fehler',errs.length===0,errs.slice(0,5).join('\n'));
await b.close();
console.log('\n'+pass+' ok, '+fail+' fehlgeschlagen\n');
process.exit(fail?1:0);
})().catch(e=>{console.error('ABBRUCH',e);process.exit(1);});
