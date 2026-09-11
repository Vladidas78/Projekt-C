/* Prueft den Geraete-Sync gegen eine nachgebaute Artifact-Datenbank.
   Zwei Sandboxes = zwei Geraete an einem gemeinsamen Speicher. */
const {load}=require('./harness');
let pass=0,fail=0;
const ok=(n,c,i)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(i?'\n         '+i:'')));};
const eq=(n,a,b)=>ok(n,a===b,'erwartet '+JSON.stringify(b)+', bekommen '+JSON.stringify(a));
const tick=(ms=25)=>new Promise(r=>setTimeout(r,ms));

/* --- gemeinsamer Speicher ------------------------------------------------ */
function makeStore(){
  const docs={},subs={};
  const S={docs,writes:0,fail:null};
  S.db=()=>({
    doc(p){
      return {
        id:p.split('/').pop(),path:p,
        get(){const d=docs[p];return Promise.resolve({id:p,exists:!!d,
          data:()=>d?JSON.parse(JSON.stringify(d)):undefined,
          metadata:{fromCache:false,hasPendingWrites:false}});},
        set(data){
          if(S.fail)return Promise.reject({code:S.fail,message:'x'});
          S.writes++;docs[p]=JSON.parse(JSON.stringify(data));
          setTimeout(()=>(subs[p]||[]).forEach(fn=>{try{fn({id:p,exists:true,
            data:()=>JSON.parse(JSON.stringify(docs[p])),
            metadata:{fromCache:false,hasPendingWrites:false}});}catch(e){console.error(e);}}),1);
          return Promise.resolve();
        },
        onSnapshot(next){(subs[p]=subs[p]||[]).push(next);return ()=>{};}
      };
    }
  });
  return S;
}
/* --- ein Geraet ---------------------------------------------------------- */
function device(store){
  const S=load({claude:{use:n=>Promise.resolve(n==='db'?(store?store.db():null):null)}});
  S.__T.setState(S.defaultState());
  S.render=()=>{};S.toast=()=>{};S.renderSidebar=()=>'';S.refreshBadges=()=>{};
  S.autoArchive=()=>{};S.setupPWA=()=>{};S.checkReminders=()=>{};
  return S;
}
const titles=S=>S.__T.getState().tasks.map(t=>t.title).sort();

(async()=>{
console.log('\n-- Erstverbindung --');
const store=makeStore();
const A=device(store);
A.createTask(A.makeTask({id:'t_a',title:'Aufgabe A',boardId:'b_work',areaId:'a_work',columnId:'c_in'}));
await A.cloudInit();await tick();
ok('A legt den Speicher an',!!store.docs['state/board']);
ok('Stand liegt als JSON-Text',typeof store.docs['state/board'].json==='string');
ok('A meldet synchronisiert',/Gespeichert|Synchronisiert/.test(A.__T.syncTxt()),A.__T.syncTxt());

console.log('\n-- Zweites Geraet uebernimmt --');
const B=device(store);
await B.cloudInit();await tick();
eq('B sieht A-Aufgabe',titles(B).join(','),'Aufgabe A');
ok('B hat keine Beispieldaten dazugemischt',B.__T.getState().tasks.length===1);

console.log('\n-- Aenderung von B kommt bei A an --');
B.createTask(B.makeTask({id:'t_b',title:'Aufgabe B',boardId:'b_work',areaId:'a_work',columnId:'c_in'}));
await B.cloudPush();await tick(60);
eq('A hat beide Aufgaben',titles(A).join(','),'Aufgabe A,Aufgabe B');
eq('B hat beide Aufgaben',titles(B).join(','),'Aufgabe A,Aufgabe B');

console.log('\n-- Kein Schreib-Pingpong --');
const before=store.writes;
await tick(150);
ok('keine Endlosschleife nach Ruhe',store.writes-before<=2,'zusaetzliche Schreibvorgaenge: '+(store.writes-before));

console.log('\n-- Konflikt: zuletzt geaendert gewinnt --');
const ta=A.__T.getState().tasks.find(t=>t.id==='t_a');
const tb=B.__T.getState().tasks.find(t=>t.id==='t_a');
const t0=Date.now();
ta.title='von A geaendert';ta.history.push({t:t0+1000,type:'edited'});
tb.title='von B geaendert';tb.history.push({t:t0+5000,type:'edited'});
await B.cloudPush();await tick(60);
eq('spaetere Fassung setzt sich durch',A.__T.getState().tasks.find(t=>t.id==='t_a').title,'von B geaendert');

console.log('\n-- Ohne Datenbank --');
const C=device(null);
await C.cloudInit();await tick();
ok('faellt auf lokal zurueck',C.__T.cloudDoc()===null);
eq('Anzeige sagt es klar',C.__T.syncTxt(),'Nur dieses Geraet');
ok('kein Artifact -> keine Sync-Zeile',device(null)&&true);
const D=load({});
eq('ohne window.claude bleibt es lokal',D.isArtifact(),false);

console.log('\n-- Schreibfehler --');
const store2=makeStore();
const E=device(store2);
await E.cloudInit();await tick();
store2.fail='resource_exhausted';
await E.cloudPush();await tick();
ok('Fehler wird sichtbar gemeldet',/Zu viele|Nicht gespeichert/.test(E.__T.syncTxt()),E.__T.syncTxt());
ok('App laeuft weiter',E.__T.getState()!==null);
store2.fail=null;
await E.cloudPush();await tick();
ok('erholt sich nach dem Fehler',/Gespeichert|Synchronisiert/.test(E.__T.syncTxt()),E.__T.syncTxt());

console.log('\n'+pass+' ok, '+fail+' fehlgeschlagen\n');
process.exit(fail?1:0);
})().catch(e=>{console.error('ABBRUCH',e);process.exit(1);});
