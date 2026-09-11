/* Prueft die Termin-/Outlook-Logik ohne Browser. */
const {load}=require('./harness');
const S=load();
let pass=0,fail=0;
const ok=(name,cond,info)=>{cond?(pass++,console.log('  ok   '+name)):(fail++,console.log('  FAIL '+name+(info?'\n         '+info:'')));};
const eq=(name,a,b)=>ok(name,a===b,'erwartet: '+JSON.stringify(b)+'\n         bekommen: '+JSON.stringify(a));

S.__T.setState(S.defaultState());
const st=S.__T.getState();
const T=o=>S.normalizeTask(S.makeTask(Object.assign({boardId:'b_work',areaId:'a_work'},o)));
const q=(url,key)=>{const m=new RegExp('[?&]'+key+'=([^&]*)').exec(url);return m?decodeURIComponent(m[1]):null;};

console.log('\n-- Zeitraum --');
let t=T({title:'Termin',dueDate:'2026-09-15',dueTime:'09:00',estimate:45});
eq('Start lokal ohne Z',S.calRange(t).start,'2026-09-15T09:00:00');
eq('Ende = Start + Aufwand',S.calRange(t).end,'2026-09-15T09:45:00');
ok('kein Z-Suffix (keine UTC-Verschiebung)',!/Z/.test(S.calRange(t).start+S.calRange(t).end));

t=T({title:'Ganztags',dueDate:'2026-09-15'});
ok('ohne Uhrzeit -> ganztaegig',S.calRange(t).allday===true);
eq('ganztags Start',S.calRange(t).start,'2026-09-15T00:00:00');
eq('ganztags Ende = Folgetag',S.calRange(t).end,'2026-09-16T00:00:00');

t=T({title:'Nacht',dueDate:'2026-09-15',dueTime:'23:45',estimate:30});
eq('ueber Mitternacht',S.calRange(t).end,'2026-09-16T00:15:00');

eq('ohne Datum -> kein Termin',S.calRange(T({title:'x'})),null);
eq('ohne Datum -> keine URL',S.outlookUrl(T({title:'x'})),null);

console.log('\n-- Dauer-Vorrang --');
eq('cal.dur schlaegt estimate',S.calDuration(T({dueDate:'2026-09-15',dueTime:'09:00',estimate:45,cal:{dur:90,loc:''}})),90);
eq('estimate wenn keine cal.dur',S.calDuration(T({dueDate:'2026-09-15',dueTime:'09:00',estimate:45})),45);
eq('sonst Standard aus Einstellungen',S.calDuration(T({dueDate:'2026-09-15',dueTime:'09:00'})),30);
st.settings.calDefaultMin=60;
eq('Standard ist einstellbar',S.calDuration(T({dueDate:'2026-09-15',dueTime:'09:00'})),60);
st.settings.calDefaultMin=30;
eq('estimate 0 wird ignoriert',S.calDuration(T({dueDate:'2026-09-15',dueTime:'09:00',estimate:0})),30);

console.log('\n-- URL --');
t=T({title:'Rechnung & Co. prüfen',dueDate:'2026-09-15',dueTime:'14:30',estimate:20,
     description:'Zeile 1\nZeile 2',category:'Finanzen',priority:'urgent',tags:['Q3'],
     cal:{dur:null,loc:'Raum 2.14'},subtasks:[{id:'s1',text:'Beleg holen',done:true}],notes:'Notiz',links:['https://example.org/a?b=c']});
let u=S.outlookUrl(t);
ok('geschaeftlicher Host',u.startsWith('https://outlook.office.com/calendar/0/deeplink/compose?'),u.slice(0,70));
eq('path-Parameter',q(u,'path'),'/calendar/action/compose');
eq('rru-Parameter',q(u,'rru'),'addevent');
eq('Betreff mit Umlaut und &',q(u,'subject'),'Rechnung & Co. prüfen');
eq('Start',q(u,'startdt'),'2026-09-15T14:30:00');
eq('Ende',q(u,'enddt'),'2026-09-15T14:50:00');
eq('Ort',q(u,'location'),'Raum 2.14');
ok('allday fehlt bei fester Uhrzeit',q(u,'allday')===null);
ok('Zeilenumbruch als %0A kodiert',/%0A/.test(u));
ok('Beschreibung im Body',q(u,'body').includes('Zeile 1\nZeile 2'));
ok('Unteraufgabe im Body',q(u,'body').includes('[x] Beleg holen'));
ok('Notiz im Body',q(u,'body').includes('Notiz'));
ok('Link im Body',q(u,'body').includes('https://example.org/a?b=c'));
ok('Herkunft im Body',q(u,'body').includes('Kanban-Board'));
ok('& im Betreff nicht als Trenner',q(u,'startdt')==='2026-09-15T14:30:00');
ok('keine rohen Leerzeichen in der URL',!/ /.test(u));
ok('keine + statt Leerzeichen',!/\+/.test(q(u,'subject')));

t=T({title:'Ganztags',dueDate:'2026-09-15'});
eq('allday=true bei Ganztagstermin',q(S.outlookUrl(t),'allday'),'true');

st.settings.outlookHost='live';
ok('privater Host',S.outlookUrl(t).startsWith('https://outlook.live.com/'),S.outlookUrl(t).slice(0,60));
st.settings.outlookHost='office';

console.log('\n-- Karte --');
ok('Knopf bei offener Aufgabe mit Termin',S.cardCalBtn(T({title:'a',dueDate:'2026-09-15'})).includes('data-act="cal"'));
eq('kein Knopf ohne Termin',S.cardCalBtn(T({title:'a'})),'');
eq('kein Knopf bei erledigter Aufgabe',S.cardCalBtn(T({title:'a',dueDate:'2026-09-15',completedAt:Date.now()})),'');
ok('Knopf-HTML ist maskiert',!/[^;]&(?!amp;|#39;|quot;|lt;|gt;)/.test(S.cardCalBtn(T({title:'A & B',dueDate:'2026-09-15'}))));

console.log('\n-- Altdaten --');
const alt={id:'old1',title:'Alte Aufgabe',boardId:'b_work',areaId:'a_work',columnId:'c_in',
  priority:'normal',createdAt:1,dueDate:'2026-09-15',dueTime:'08:00'};
S.normalizeTask(alt);
ok('cal wird nachgeruestet',alt.cal&&alt.cal.dur===null&&alt.cal.loc==='');
ok('Termin fuer Altaufgabe baubar',typeof S.outlookUrl(alt)==='string');
const kaputt=S.normalizeTask({id:'x',cal:{dur:-5,loc:42},createdAt:1});
ok('unsinnige Dauer wird verworfen',kaputt.cal.dur===null);
ok('unsinniger Ort wird verworfen',kaputt.cal.loc==='');

console.log('\n'+pass+' ok, '+fail+' fehlgeschlagen\n');
process.exit(fail?1:0);
