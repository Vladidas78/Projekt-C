/* Laedt die <script>-Bloecke aus kanban.html in einen vm-Kontext.
   Nachgebaut nach dem Verfahren aus docs/handover-v1.2.md. */
const fs=require('fs'),vm=require('vm'),path=require('path');

function noopEl(){
  const el={style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    children:[],value:'',innerHTML:'',textContent:'',
    appendChild(){},removeChild(){},remove(){},setAttribute(){},getAttribute(){return null;},
    addEventListener(){},removeEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},
    closest(){return null;},focus(){},select(){},getBoundingClientRect(){return{left:0,top:0,width:0,height:0};}};
  return el;
}
function memStore(){
  const m={};
  return {getItem:k=>(k in m?m[k]:null),setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];},clear(){for(const k in m)delete m[k];}};
}

function load(file){
  const html=fs.readFileSync(file||path.join(__dirname,'..','kanban.html'),'utf8');
  const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  let code=blocks.join('\n;\n');
  // init() am Ende abschneiden - wir wollen keine App starten
  code=code.replace(/\ninit\(\);\s*$/,'\n');
  if(/\binit\(\);/.test(code.split('\n').slice(-6).join('\n'))) throw new Error('init() nicht abgeschnitten');
  // Bruecke zu den let/const-Variablen
  code+=';globalThis.__T={getState:()=>state,setState:v=>{state=v},getUi:()=>ui};';

  const doc={createElement:()=>noopEl(),body:noopEl(),head:noopEl(),
    querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
    documentElement:noopEl(),execCommand(){return true;}};
  const sandbox={console,document:doc,localStorage:memStore(),sessionStorage:memStore(),
    navigator:{userAgent:'node',clipboard:null},location:{href:'file:///kanban.html',reload(){}},
    setTimeout,clearTimeout,setInterval:()=>0,clearInterval,requestAnimationFrame:fn=>fn&&0,
    Intl,Date,Math,JSON,URLSearchParams,encodeURIComponent,decodeURIComponent};
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  sandbox.window.addEventListener=()=>{};
  sandbox.window.matchMedia=()=>({matches:false,addEventListener(){}});
  vm.createContext(sandbox);
  vm.runInContext(code,sandbox,{filename:'kanban.html'});
  return sandbox;
}
module.exports={load};
