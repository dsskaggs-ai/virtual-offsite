/* ============================ helpers ============================ */
var $=function(s,r){return (r||document).querySelector(s)};
function h(tag,attrs){
  var el=document.createElement(tag);
  if(attrs)Object.keys(attrs).forEach(function(k){
    var v=attrs[k]; if(v==null||v===false)return;
    if(k==='class')el.className=v;
    else if(k==='text')el.textContent=v;
    else if(k==='html')el.innerHTML=v;
    else if(k.slice(0,2)==='on')el.addEventListener(k.slice(2),v);
    else el.setAttribute(k,v===true?'':v);
  });
  for(var i=2;i<arguments.length;i++)add(el,arguments[i]);
  return el;
}
function add(el,k){ if(k==null||k===false)return; if(Array.isArray(k))k.forEach(function(x){add(el,x)}); else el.append(k.nodeType?k:document.createTextNode(String(k))); }
function txt(v){return (v==null?'':String(v)).trim()}
function opts(sel,choices,cur){
  sel.append(h('option',{value:'',text:''}));
  choices.forEach(function(c){var v=Array.isArray(c)?c[0]:c,l=Array.isArray(c)?c[1]:c;sel.append(h('option',{value:v,text:l}))});
  if(cur!=null)sel.value=cur;
  return sel;
}
function rosterSel(id){return opts(h('select',{id:id}),ROSTER)}
function hue(s){var n=0;s=String(s||'?');for(var i=0;i<s.length;i++)n=(n*31+s.charCodeAt(i))%360;return n}
function initials(s){s=txt(s);if(!s)return '?';var p=s.split(/\s+/);return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase()}
function fmtTime(ts){try{return new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:TZ})}catch(e){return ''}}
function fmtDate(d){ if(!d)return ''; var p=String(d).split('-'); if(p.length!==3)return d; var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]; return m+' '+(+p[2]); }
function mins(t){var p=t.split(':');return +p[0]*60+ +p[1]}
function t12(t){var p=t.split(':'),hh=+p[0];return ((hh%12)||12)+':'+p[1]}
function zoneNow(){
  try{
    var f=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    var p={};f.formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});
    return {date:p.year+'-'+p.month+'-'+p.day,min:((+p.hour)%24)*60+(+p.minute)};
  }catch(e){return {date:'',min:0}}
}
var toastT;
function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200)}
function copyText(s,btn){
  function done(){ if(btn){var o=btn.textContent;btn.textContent='Copied';setTimeout(function(){btn.textContent=o},1400)} else toast('Copied') }
  function fallback(){
    var ta=h('textarea',{rows:8,readonly:true,style:'position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:40;height:12rem'});
    ta.value=s;document.body.append(ta);ta.select();
    toast('Select and copy the text, then click away');
    ta.addEventListener('blur',function(){ta.remove()});
  }
  try{ navigator.clipboard.writeText(s).then(done,fallback) }catch(e){ fallback() }
}

function slug(s){return String(s||'').normalize('NFKD').replace(/[^\w]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'x'}
function uid(){return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function addDaysISO(d,n){var t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)}
function todayISO(){return zoneNow().date||new Date().toISOString().slice(0,10)}
function optDate(v){ if(!v)return ''; if(v.charAt(0)==='$')return ROOM.opts[v.slice(1)]||''; return v }
