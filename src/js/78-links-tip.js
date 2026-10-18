/* ---------- links between two lists ---------- */
function Links(cfg){
  var tbody=h('tbody'),rows={};
  var box=h('section',{class:'panel'},h('h2',{text:cfg.title||'What each one enables'}),
    h('p',{class:'help',text:'Approved items appear here. Pick the annual priority each one enables and write the first 30-day move after its finish line. Priorities still marked proposed can be chosen too.'}),
    h('div',{class:'tw'},h('table',null,h('thead',null,h('tr',null,h('th',{text:'First-quarter priority'}),h('th',{text:'Enables priority'}),h('th',{text:'First 30-day move'}),h('th',{text:'Conflict to resolve'}))),tbody)));
  function row(r){
    var sel=h('select',{id:'lk-'+r.id+'-p'}),mv=h('input',{type:'text',id:'lk-'+r.id+'-m',placeholder:'First move'}),cf=h('input',{type:'text',id:'lk-'+r.id+'-c',placeholder:'None, or what must give'});
    var syncs=[bind(sel,'links',r.id,'priority',true),bind(mv,'links',r.id,'move',true),bind(cf,'links',r.id,'conflict',true)];
    var t=h('td');var tr=h('tr',null,t,h('td',null,sel),h('td',null,mv),h('td',null,cf));
    return {el:tr,sel:sel,syncs:syncs,title:t};
  }
  on(['rocks','links'],function(){
    var q4=list('rocks',function(r){return r.scope===cfg.from&&r.status==='approved'}).sort(byOrd);
    var y7all=list('rocks',function(r){return r.scope===cfg.to}).sort(byOrd);
    Object.keys(rows).forEach(function(id){if(!q4.some(function(r){return r.id===id})){rows[id].el.remove();delete rows[id]}});
    q4.forEach(function(r){
      if(!rows[r.id]){rows[r.id]=row(r);tbody.append(rows[r.id].el)}
      var x=rows[r.id];x.title.replaceChildren(h('b',{text:r.title}),h('div',{class:'muted',style:'font-size:.74rem',text:(r.owner||'no owner')+' · due '+(fmtDate(r.due)||'open')}));
      /* Offer every priority that is not rejected, approved ones first, plus the one already chosen. The list is rebuilt only when it changes, so an open dropdown is not closed by someone else's edit. */
      var chosen=(S.links[r.id]&&S.links[r.id].priority)||'';
      var pool=y7all.filter(function(p){return p.status!=='rejected'||p.id===chosen}).sort(function(a,b){return (b.status==='approved')-(a.status==='approved')});
      var key=pool.map(function(p){return p.id+'|'+p.title+'|'+p.status}).join('~');
      if(x.optKey!==key){
        x.optKey=key;var keep=x.sel.value;
        x.sel.replaceChildren.apply(x.sel,[h('option',{value:'',text:pool.length?'Choose':'Choose (no priorities yet)'}),h('option',{value:'none',text:'None, resolve the conflict'})].concat(pool.map(function(p){return h('option',{value:p.id,text:p.title+(p.status==='approved'?'':(p.status==='rejected'?' (rejected)':' (proposed)'))})})));
        x.sel.value=chosen||keep||'';
      }
      x.syncs.forEach(function(s){s()});
    });
    var e=box.querySelector('.empty');
    if(!q4.length&&!e)box.append(h('div',{class:'empty',text:'No approved items yet. Approve them above and they appear here.'}));
    if(q4.length&&e)e.remove();
  });
  return box;
}


/* ---------- hover to read the full text of any box that is too small for what was typed ---------- */
(function(){
  var tip=null,timer=null,cur=null;
  function ensure(){if(!tip){tip=document.createElement('div');tip.className='fulltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip)}return tip}
  function hide(){clearTimeout(timer);cur=null;if(tip)tip.hidden=true}
  function textOf(el){
    if(el.tagName==='SELECT'){var o=el.options[el.selectedIndex];return o?o.textContent:''}
    return el.value||'';
  }
  function clipped(el){
    if(el.tagName==='TEXTAREA')return el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2;
    return el.scrollWidth>el.clientWidth+1;
  }
  function show(el){
    var t=textOf(el);if(!t||!clipped(el))return;
    var d=ensure(),lab=el.getAttribute('aria-label')||(el.labels&&el.labels[0]&&el.labels[0].textContent)||'';
    d.replaceChildren();
    if(lab&&lab.length<60){var sm=document.createElement('small');sm.textContent=lab;d.appendChild(sm)}
    d.appendChild(document.createTextNode(t));
    d.hidden=false;cur=el;
    var r=el.getBoundingClientRect(),w=d.offsetWidth,hh=d.offsetHeight,vw=window.innerWidth,vh=window.innerHeight;
    var left=Math.max(8,Math.min(r.left,vw-w-8)),top=r.bottom+6;
    if(top+hh>vh-8)top=Math.max(8,r.top-hh-6);
    d.style.left=left+'px';d.style.top=top+'px';
  }
  document.addEventListener('mouseover',function(e){
    var el=e.target&&e.target.closest?e.target.closest('input,textarea,select'):null;
    if(!el||el===cur){return}
    if(el.tagName==='INPUT'&&['text','search','url','email',''].indexOf(el.type||'')<0&&el.type!=='text')return;
    hide();timer=setTimeout(function(){show(el)},280);
  });
  document.addEventListener('mouseout',function(e){
    var el=e.target&&e.target.closest?e.target.closest('input,textarea,select'):null;
    if(el&&(!e.relatedTarget||!el.contains(e.relatedTarget)))hide();
  });
  ['keydown','input','scroll','mousedown','wheel'].forEach(function(n){document.addEventListener(n,hide,true)});
})();
