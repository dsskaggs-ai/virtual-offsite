/* ============================ state and data layer ============================ */
var S={};COLS.forEach(function(c){S[c]={}});
var db=null,canWrite=true,localOnly=false;
var handlers=[],pending={},flushing=false;
function on(cols,fn,global){var o={cols:cols,fn:fn,global:!!global};handlers.push(o);try{fn()}catch(e){console.error(e)}return o}
function notify(col){pending[col]=1;if(flushing)return;flushing=true;requestAnimationFrame(function(){
  flushing=false;var p=pending;pending={};
  handlers.slice().forEach(function(o){ if(o.cols.some(function(c){return p[c]})){try{o.fn()}catch(e){console.error(e)}} });
})}
function list(col,pred){
  var out=Object.keys(S[col]).map(function(k){return S[col][k]});
  if(pred)out=out.filter(pred);
  return out;
}
function byTs(a,b){return (a.ts||0)-(b.ts||0)}
function byOrd(a,b){var x=a.ord!=null?a.ord:a.ts||0,y=b.ord!=null?b.ord:b.ts||0;return x-y}
function F(id){return S.forms[id]||{}}

var me={who:'',vk:''};
try{me.who=localStorage.getItem(LS+'who')||'';me.vk=localStorage.getItem(LS+'vk')||''}catch(e){}
if(HOST.who&&ROSTER.indexOf(HOST.who)>=0)me.who=HOST.who;
if(!me.vk){me.vk='v'+Math.random().toString(36).slice(2,10);try{localStorage.setItem(LS+'vk',me.vk)}catch(e){}}

var Q={};
function enqueue(path,fn){var p=(Q[path]||Promise.resolve()).catch(function(){}).then(fn);Q[path]=p;return p}
function fail(e,creating){
  console.error(e);
  var c=e&&e.code;
  /* invalid_argument on a create means the rules refused the write; on an update it can just mean the item was removed a moment ago */
  if(c==='invalid_argument'&&creating){canWrite=false;showBanner()}
  toast(c==='quota_exceeded'?'The room is full. Delete something and try again.':c==='invalid_argument'?(creating?'You can read this page but not change it. Ask the facilitator for access.':'That item changed or was removed. Look at the screen and try again.'):'That did not save. Check your connection and try again.');
}
function failC(e){fail(e,true)}
function guard(){ if(!canWrite){toast('You can read this page but not change it. Ask the facilitator for access.');return false} return true }
function needWho(){
  if(!guard())return false;
  if(!me.who){var w=$('#whoWrap');w.classList.add('need');toast('Pick who is typing first');$('#whoSel').focus();return false}
  return true;
}
function addDoc(col,data){ if(!guard())return Promise.resolve(); data.ts=Date.now(); return db.collection(col).add(data).catch(failC) }
function upd(col,id,data,create){
  if(!guard())return Promise.resolve();
  return enqueue(col+'/'+id,function(){
    var ref=db.doc(col+'/'+id);
    return ref.update(data).catch(function(e){ if(create&&e&&e.code==='invalid_argument') return ref.set(data); throw e });
  }).catch(fail);
}
function setDoc(col,id,data){ if(!guard())return Promise.resolve(); return enqueue(col+'/'+id,function(){return db.doc(col+'/'+id).set(data)}).catch(failC) }
function delDoc(col,id){ if(!guard())return Promise.resolve(); return enqueue(col+'/'+id,function(){return db.doc(col+'/'+id).delete()}).catch(fail) }

/* in-memory store used when live sharing is not available, so the page still works for one person */
function memoryDb(){
  var data={},subs={};
  function snap(col){var docs=Object.keys(data[col]||{}).sort().map(function(id){var d=data[col][id];return {id:id,exists:true,data:function(){return d}}});return {docs:docs,size:docs.length,empty:!docs.length}}
  function fire(col){(subs[col]||[]).forEach(function(f){f(snap(col))})}
  function ref(col,id){return {id:id,path:col+'/'+id,
    get:function(){var d=(data[col]||{})[id];return Promise.resolve({id:id,exists:!!d,data:function(){return d}})},
    set:function(v){(data[col]=data[col]||{})[id]=JSON.parse(JSON.stringify(v));fire(col);return Promise.resolve()},
    update:function(v){var d=(data[col]||{})[id];if(!d)return Promise.reject({code:'invalid_argument',message:'missing '+col+'/'+id});Object.assign(d,JSON.parse(JSON.stringify(v)));fire(col);return Promise.resolve()},
    delete:function(){if(data[col])delete data[col][id];fire(col);return Promise.resolve()}}}
  return {
    doc:function(p){var s=p.split('/');return ref(s[0],s[1])},
    collection:function(col){return {
      doc:function(id){return ref(col,id||('m'+Math.random().toString(36).slice(2,10)))},
      add:function(v){var id='m'+Math.random().toString(36).slice(2,10);return ref(col,id).set(v).then(function(){return ref(col,id)})},
      onSnapshot:function(next){(subs[col]=subs[col]||[]).push(next);setTimeout(function(){next(snap(col))},0);return function(){}}}}
  };
}
function subscribe(){
  COLS.forEach(function(c){
    db.collection(c).onSnapshot(function(snap){
      var m={};snap.docs.forEach(function(d){var v=d.data()||{};var o={};Object.keys(v).forEach(function(k){o[k]=v[k]});o.id=d.id;m[d.id]=o});
      S[c]=m;notify(c);
    },function(e){console.error('snapshot',c,e)});
  });
}

/* input bound to one field of one document. Writes are debounced; remote changes never overwrite a field being typed in. */
function bind(el,col,id,key,create){
  function get(){var d=S[col][id];return d&&d[key]!=null?d[key]:''}
  var t,dirty=false;
  function push(){dirty=false;var o={};o[key]=el.value;upd(col,id,o,create)}
  if(el.tagName==='SELECT'||el.type==='date'||el.type==='checkbox'){
    el.addEventListener('change',function(){var o={};o[key]=el.type==='checkbox'?el.checked:el.value;upd(col,id,o,create)});
  }else{
    el.addEventListener('input',function(){dirty=true;clearTimeout(t);t=setTimeout(push,450)});
    /* only push on blur when this person actually typed; merely clicking through a field must never write an old value over someone else's edit */
    el.addEventListener('blur',function(){clearTimeout(t);if(dirty){if(String(get())!==el.value)push();else dirty=false}else{var v=get();if(el.value!==String(v))el.value=v}});
  }
  return function(){
    var v=get();
    if(el.type==='checkbox'){el.checked=!!v;return}
    if(document.activeElement===el&&dirty)return;
    if(el.value!==String(v))el.value=v;
  };
}
