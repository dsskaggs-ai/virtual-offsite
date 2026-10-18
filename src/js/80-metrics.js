/* ---------- scorecard: numbers with a goal, an actual, last time's actual, and on or off track ----------
   A table on a wide stage. Below about 44rem of width (the middle column on a laptop) each row becomes a two line card:
   name and status on top, numbers and small controls below. Status, better, and type are buttons that cycle a value. */
var MT_ARROW='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 13V3.5M3.8 7.6 8 3.4l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var MT_ST={'':'on',on:'off',off:''},MT_TY={'':'lead',lead:'lag',lag:''},MT_TYL={lead:'Lead',lag:'Lag'};
function Metrics(cfg){
  var SCOPE=cfg.id,rows={};
  var nm=h('input',{type:'text',id:'mt-new-'+SCOPE,placeholder:'Add a measure','aria-label':'New measure'});
  var tbody=h('tbody'),cnt=h('span',{class:'meter'});
  function addNew(){var t=txt(nm.value);if(!t||!needWho())return;addDoc('metrics',{scope:SCOPE,name:t,owner:'',goal:'',value:'',prev:'',dir:'',type:'',status:'',ord:Date.now()});nm.value=''}
  nm.addEventListener('keydown',function(e){if(e.key==='Enter')addNew()});
  var cols=[['Measure','mt-name']].concat(cfg.owners?[['Owner','mt-own']]:[]).concat(cfg.types?[['Type','mt-type']]:[])
    .concat([['Goal','mt-goal'],['Actual','mt-act'],['Last','mt-last'],['Better','mt-dir'],['Status','mt-st'],['','mt-iss'],['','mt-del']]);
  var tcls='mt'+(cfg.owners?' mt-o':'')+(cfg.types?' mt-t':'');
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),cnt),
    cfg.help?h('p',{class:'help',text:cfg.help}):'',
    h('div',{class:'tw mtw'},h('table',{class:tcls},h('thead',null,h('tr',null,cols.map(function(c){return h('th',{class:c[1],text:c[0]})}))),tbody)),
    h('div',{class:'crow'},nm,h('button',{class:'btn',type:'button',text:'Add measure',onclick:addNew})));
  var autoGrow=!(window.CSS&&CSS.supports&&CSS.supports('field-sizing','content'));
  function grow(el){if(!autoGrow)return;el.style.height='auto';if(el.scrollHeight)el.style.height=el.scrollHeight+'px'}
  function row(id){
    var ss=[];
    function inp(k,label,ph){var el=h('input',{type:'text',id:'mt-'+id+'-'+k,placeholder:ph||'','aria-label':label});ss.push(bind(el,'metrics',id,k));return el}
    /* the name wraps instead of being cut off: a one line textarea that grows with its text */
    var name=h('textarea',{id:'mt-'+id+'-name',class:'mt-nm',rows:1,'aria-label':'Measure name',spellcheck:'false'});ss.push(bind(name,'metrics',id,'name'));
    name.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();name.blur()}});
    name.addEventListener('input',function(){if(/\n/.test(name.value))name.value=name.value.replace(/\s*\n\s*/g,' ');grow(name)});
    if(autoGrow&&window.ResizeObserver)new ResizeObserver(function(){grow(name)}).observe(name);
    var goal=inp('goal','Goal','Goal'),val=inp('value','Actual','Actual');
    /* owner: an initials chip with the native roster select laid over it, invisible, so the picker and keyboard still work */
    var own=null,ini=null,ownTd=null;
    if(cfg.owners){
      own=rosterSel('mt-'+id+'-owner');own.setAttribute('aria-label','Owner');ss.push(bind(own,'metrics',id,'owner'));
      ini=h('span',{class:'mt-ini','aria-hidden':'true'});
      own.addEventListener('change',function(){paintOwner(own.value)});
      ownTd=h('td',{class:'mt-own'},h('span',{class:'mt-ow'},ini,own));
    }
    function paintOwner(n){
      if(!ini)return;n=txt(n);
      ini.textContent=n?initials(n):'+';ini.className='mt-ini'+(n?'':' none');
      if(n)ini.style.setProperty('--h',hue(n));else ini.style.removeProperty('--h');
      ownTd.setAttribute('title',n||'Pick an owner');
    }
    var type=cfg.types?h('button',{type:'button',class:'mt-tog mt-ty',id:'mt-'+id+'-type',onclick:function(){var m=S.metrics[id];if(!m||!needWho())return;upd('metrics',id,{type:MT_TY[m.type||'']||''})}}):null;
    var dir=h('button',{type:'button',class:'mt-tog mt-arrow',id:'mt-'+id+'-dir',html:MT_ARROW,onclick:function(){var m=S.metrics[id];if(!m||!needWho())return;upd('metrics',id,{dir:m.dir==='lo'?'hi':'lo'})}});
    var st=h('button',{type:'button',class:'chip mt-pill',id:'mt-'+id+'-status',onclick:function(){var m=S.metrics[id];if(!m||!needWho())return;upd('metrics',id,{status:MT_ST[m.status||'']||''})}});
    var prev=h('span',{class:'mt-pv'}),iss=h('button',{class:'btn sm',type:'button',text:'To issues'});
    var del=h('button',{class:'x','aria-label':'Remove measure',onclick:function(){delDoc('metrics',id)},text:'×'});
    iss.addEventListener('click',function(){
      var m=S.metrics[id];if(!m||m.issued||!needWho())return;
      addDoc('issues',{title:m.name+' is off track',detail:'Goal '+(m.goal||'-')+', actual '+(m.value||'-'),status:'open',who:me.who,src:'metric'});upd('metrics',id,{issued:true});
    });
    var tr=h('tr',{class:'mrow'},h('td',{class:'mt-name'},name),ownTd||'',type?h('td',{class:'mt-type'},type):'',
      h('td',{class:'num mt-goal','data-l':'Goal'},goal),h('td',{class:'num mt-act','data-l':'Actual'},val),h('td',{class:'ref mt-last','data-l':'Last'},prev),
      h('td',{class:'mt-dir'},dir),h('td',{class:'mt-st'},st),h('td',{class:'mt-iss'},cfg.toIssue?iss:''),h('td',{class:'mt-del'},del));
    return {el:tr,sync:function(){var m=S.metrics[id];if(!m)return;ss.forEach(function(s){s()});grow(name);prev.textContent=m.prev||'';
      paintOwner(m.owner);
      var lo=m.dir==='lo',dl=lo?'Better when lower':'Better when higher';
      dir.setAttribute('aria-label',dl);dir.title=dl;dir.dataset.v=m.dir||'';dir.classList.toggle('lo',lo);
      if(type){var tv=MT_TYL[m.type]?m.type:'';type.dataset.v=tv;type.textContent=tv?MT_TYL[tv]:'Type';type.classList.toggle('none',!tv);
        type.setAttribute('aria-label','Lead or lag: '+(tv?MT_TYL[tv]:'not set')+'. Click to change.');type.title='Lead or lag. Click to change.'}
      var s=metricState(m),ov=m.status==='on'||m.status==='off',lbl=s==='on'?'On track':(s==='off'?'Off track':'No status');
      st.dataset.v=ov?m.status:'';st.className='chip mt-pill'+(s==='on'?' ok':(s==='off'?' bad':' none'))+(ov?' set':'');
      st.textContent='';st.append(h('span',{text:lbl}));if(ov)st.append(h('span',{class:'mt-set',text:'set'}));
      st.setAttribute('aria-label','Status: '+lbl+(ov?' (set by hand)':(s?' (from the numbers)':''))+'. Click to change.');
      st.title=ov?'Set by hand. Click to change.':'Click to set by hand.';
      iss.hidden=s!=='off';iss.disabled=!!m.issued;iss.textContent=m.issued?'In issues':'To issues'}};
  }
  on(['metrics'],function(){
    var items=list('metrics',function(m){return m.scope===SCOPE}).sort(byOrd);
    Object.keys(rows).forEach(function(id){if(!S.metrics[id]){rows[id].el.remove();delete rows[id]}});
    items.forEach(function(m){if(!rows[m.id]){rows[m.id]=row(m.id);tbody.append(rows[m.id].el)}rows[m.id].sync()});
    var on_=items.filter(function(m){return metricState(m)==='on'}).length,off=items.filter(function(m){return metricState(m)==='off'}).length;
    cnt.textContent=items.length?(on_+' on track, '+off+' off track, '+(items.length-on_-off)+' open'):'No measures yet';
    cnt.className='meter'+(items.length&&on_===items.length?' ok':'');
  });
  return box;
}

/* ---------- Rocks, tracked week to week: on track, off track, or done ---------- */
function RockTrack(cfg){
  var SCOPE=cfg.id,NOUN=cfg.noun||'Priority',NPL=/y$/i.test(NOUN)?NOUN.slice(0,-1).toLowerCase()+'ies':NOUN.toLowerCase()+'s',rows={};
  var ti=h('input',{type:'text',id:'rt-new-'+SCOPE,placeholder:'Add a '+NOUN.toLowerCase(),'aria-label':'New '+NOUN}),ow=rosterSel('rt-owner-'+SCOPE),du=h('input',{type:'date',id:'rt-due-'+SCOPE,'aria-label':'Due date'});
  ow.firstChild.textContent='Owner';ow.setAttribute('aria-label','Owner');
  function addNew(){var t=txt(ti.value);if(!t||!needWho())return;addDoc('rocks',{scope:SCOPE,title:t,owner:ow.value,due:du.value,track:'',note:'',status:'approved',ord:Date.now()});ti.value='';ow.value='';du.value=''}
  ti.addEventListener('keydown',function(e){if(e.key==='Enter')addNew()});
  var list_=h('div',{class:'feed'}),cnt=h('span',{class:'meter'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),cnt),
    h('p',{class:'help',text:'One word per '+NOUN.toLowerCase()+': on track, off track, or done.'}),
    h('div',{class:'crow'},ti,h('label',{class:'fld',for:'rt-owner-'+SCOPE,style:'flex:0 0 11rem'},ow),h('label',{class:'fld',for:'rt-due-'+SCOPE,style:'flex:0 0 9rem'},du),h('button',{class:'btn',type:'button',text:'Add',onclick:addNew})),list_);
  function row(id){
    var ss=[];
    var t=h('input',{type:'text',class:'rt',id:'rt-'+id+'-title','aria-label':'Title'});ss.push(bind(t,'rocks',id,'title'));
    var o=rosterSel('rt-'+id+'-owner');o.setAttribute('aria-label','Owner');o.firstChild.textContent='Owner';ss.push(bind(o,'rocks',id,'owner'));
    var d=h('input',{type:'date',id:'rt-'+id+'-due','aria-label':'Due date'});ss.push(bind(d,'rocks',id,'due'));
    var n=h('input',{type:'text',id:'rt-'+id+'-note',placeholder:'Note','aria-label':'Note'});ss.push(bind(n,'rocks',id,'note'));
    function tb(label,v,cls){return h('button',{type:'button',class:cls||'',text:label,onclick:function(){var r=S.rocks[id];upd('rocks',id,{track:r&&r.track===v?'':v})}})}
    var bo=tb('On track','on','good'),bf=tb('Off track','off','bad'),bd=tb('Done','done','good');
    var iss=h('button',{class:'btn sm',type:'button',text:'To issues'});
    iss.addEventListener('click',function(){var r=S.rocks[id];if(!r||r.issued||!needWho())return;addDoc('issues',{title:r.title+' is off track',detail:'Owner '+(r.owner||'-')+', due '+(fmtDate(r.due)||'-'),status:'open',who:me.who,src:'rock'});upd('rocks',id,{issued:true})});
    var el=h('div',{class:'rock','data-status':'proposed'},h('div',{class:'rh'},t,h('div',{class:'seg',role:'group','aria-label':'Status'},bo,bf,bd)),
      h('div',{class:'ggrid'},h('label',{class:'fld',for:'rt-'+id+'-owner'},h('span',{text:'Owner'}),o),h('label',{class:'fld',for:'rt-'+id+'-due'},h('span',{text:'Due'}),d),h('label',{class:'fld',for:'rt-'+id+'-note'},h('span',{text:'Note'}),n)),
      h('div',{class:'rf'},cfg.toIssue?iss:'',h('span',{style:'margin-left:auto'},h('button',{class:'x','aria-label':'Remove',onclick:function(){delDoc('rocks',id)},text:'×'}))));
    return {el:el,sync:function(){var r=S.rocks[id];if(!r)return;ss.forEach(function(s){s()});
      bo.setAttribute('aria-pressed',String(r.track==='on'));bf.setAttribute('aria-pressed',String(r.track==='off'));bd.setAttribute('aria-pressed',String(r.track==='done'));
      el.dataset.status=r.track==='off'?'rejected':(r.track==='on'||r.track==='done'?'approved':'proposed');
      iss.hidden=r.track!=='off';iss.disabled=!!r.issued;iss.textContent=r.issued?'In issues':'To issues'}};
  }
  on(['rocks'],function(){
    var items=list('rocks',function(r){return r.scope===SCOPE}).sort(byOrd);
    Object.keys(rows).forEach(function(id){if(!S.rocks[id]){rows[id].el.remove();delete rows[id]}});
    items.forEach(function(r){if(!rows[r.id]){rows[r.id]=row(r.id);list_.append(rows[r.id].el)}rows[r.id].sync()});
    var a=items.filter(function(r){return r.track==='on'||r.track==='done'}).length,b=items.filter(function(r){return r.track==='off'}).length;
    cnt.textContent=items.length?(a+' on track or done, '+b+' off track, '+(items.length-a-b)+' not scored'):'None yet';
    var e=box.querySelector('.empty');
    if(!items.length&&!e)list_.before(h('div',{class:'empty',text:'No '+NPL+' yet. Add them once. They stay from session to session.'}));
    if(items.length&&e)e.remove();
  });
  return box;
}
