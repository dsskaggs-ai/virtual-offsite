/* ============================ shell: rail, top bar, log ============================ */
var cur=null,leading=false,follow=true,isAdmin=false,peersNow=[];
function nowScene(){
  var n=zoneNow(),d=DATES[n.date];if(!d)return null;
  var s=SCENES.filter(function(x){return x.day===d&&n.min>=mins(x.s)&&n.min<mins(x.e)})[0];
  return s?s.id:null;
}
function renderAgenda(){
  var box=$('#agenda');box.replaceChildren();
  var live=S.live.state&&S.live.state.scene,nowId=nowScene();
  DAYLIST.forEach(function(d){
    box.append(h('div',{class:'day-h',text:DAYS[d]}));
    var rows=SCENES.filter(function(s){return s.day===d}).map(function(s){return {t:mins(s.s),s:s}})
      .concat(BREAKS.filter(function(b){return b.day===d}).map(function(b){return {t:mins(b.s),b:b}}))
      .sort(function(a,b){return a.t-b.t});
    rows.forEach(function(r){
      if(r.b){box.append(h('div',{class:'brk',text:t12(r.b.s)+' '+r.b.l}));return}
      var s=r.s,here=peersNow.filter(function(p){return p.presence&&p.presence.scene===s.id}).length;
      var tag=live===s.id?h('span',{class:'tag lead',text:'Live'}):(nowId===s.id?h('span',{class:'tag',text:'Now'}):(here>1?h('span',{class:'tag',text:here+' here'}):''));
      box.append(h('button',{class:'sess',type:'button','aria-current':String(cur===s.id),onclick:function(){go(s.id,true)}},
        h('span',{class:'t'},h('b',{text:t12(s.s)}),h('i',{text:t12(s.e)})),h('span',{class:'n',text:s.title}),tag));
    });
  });
}
function renderProg(){
  var p=progress(),box=$('#prog');box.replaceChildren(h('h3',{text:'What must leave the room'}));
  DAYLIST.forEach(function(d){
    var items=p.filter(function(x){return x.day===d});if(!items.length)return;
    box.append(h('div',{class:'sec-h',style:'margin-top:.3rem',text:(DAYLIST.length>1?DAYS[d].split(' · ')[0]+' · ':'')+items.filter(function(x){return x.done}).length+' of '+items.length}));
    items.forEach(function(x){box.append(h('div',{class:'pitem'+(x.done?' done':'')},h('span',{class:'tick'}),x.l,h('small',{text:x.d})))});
  });
}
function renderLog(){
  var rail=$('#logRail');
  if(!rail.firstChild){
    var ta=h('textarea',{id:'dec-text',rows:2,placeholder:'What was decided?'});
    var ow=opts(h('select',{id:'dec-owner','aria-label':'Owner'}),ROSTER);
    var ci=h('input',{id:'dec-checkin',type:'date','aria-label':'Check-in date'}),du=h('input',{id:'dec-due',type:'date','aria-label':'Due date'});
    var err=h('div',{class:'err',id:'dec-err'});
    var btn=h('button',{class:'btn pri',type:'button',text:'Log decision',onclick:function(){
      var t=txt(ta.value);if(!t){err.textContent='Write the decision first.';return}
      if(ow.value&&(!ci.value||!du.value)){err.textContent='An owner needs both a check-in date and a due date.';return}
      if(!needWho())return;
      err.textContent='';
      addDoc('decisions',{text:t,owner:ow.value,checkin:ci.value,due:du.value,scene:cur,who:me.who,done:false});
      ta.value='';ow.value='';ci.value='';du.value='';
    }});
    rail.append(
      h('div',{class:'ph'},h('h2',{class:'sec-h',text:'Decision log'}),h('span',{class:'meter',id:'dec-count'})),
      h('div',{class:'composer'},ta,
        h('div',{class:'crow'},h('label',{class:'fld',for:'dec-owner'},h('span',{text:'Owner'}),ow)),
        h('div',{class:'crow'},h('label',{class:'fld',for:'dec-checkin'},h('span',{text:'Check-in'}),ci),h('label',{class:'fld',for:'dec-due'},h('span',{text:'Due'}),du)),
        err,h('div',{class:'crow'},btn,h('button',{class:'btn',type:'button',text:'Copy log',onclick:function(ev){copyText(decisionsText(),ev.currentTarget)}}))),
      h('div',{class:'log',id:'dec-list'}));
  }
  var items=list('decisions').sort(function(a,b){return b.ts-a.ts});
  $('#dec-count').textContent=items.filter(function(d){return !d.done}).length+' open, '+items.length+' total';
  var box=$('#dec-list');box.replaceChildren();
  if(!items.length)box.append(h('div',{class:'empty',text:'Nothing logged yet. Decisions made in the room go here, with an owner and two dates.'}));
  items.forEach(function(d){
    var cb=h('input',{type:'checkbox','aria-label':'Mark done',onchange:function(){upd('decisions',d.id,{done:cb.checked})}});cb.checked=!!d.done;
    var sc=SCENE[d.scene];
    box.append(h('div',{class:'dec'+(d.done?' done':'')},cb,
      h('div',null,h('p',{text:d.text}),h('div',{class:'m'},d.owner?h('span',null,'Owner ',h('b',{text:d.owner})):'',d.checkin?h('span',null,'Check-in ',h('b',{text:fmtDate(d.checkin)})):'',d.due?h('span',null,'Due ',h('b',{text:fmtDate(d.due)})):'',h('span',{text:(sc?sc.title+' · ':'')+(d.who||'')+' · '+fmtTime(d.ts)}))),
      h('button',{class:'x','aria-label':'Remove decision',onclick:function(){delDoc('decisions',d.id)},text:'×'})));
  });
}
function decisionsText(){
  return list('decisions').sort(byTs).map(function(d){
    return '- '+(d.done?'[done] ':'')+d.text+(d.owner?' | Owner: '+d.owner:'')+(d.checkin?' | Check-in: '+fmtDate(d.checkin):'')+(d.due?' | Due: '+fmtDate(d.due):'');
  }).join('\n')||'No decisions logged.';
}

/* ============================ stage ============================ */
function go(id,fromUser){
  if(!SCENE[id])return;
  if(fromUser){
    if(isAdmin&&leading&&canWrite){setDoc('live','state',{scene:id,ts:Date.now()})}
    else if(!isAdmin&&follow&&S.live.state&&S.live.state.scene!==id){follow=false;renderFollow()}
  }
  cur=id;renderStage(id);renderAgenda();
  $('#app').dataset.pane='stage';syncPanes();
  if(window.__room)window.__room.presence({scene:id,who:me.who||null});
  try{history.replaceState(null,'','#'+id)}catch(e){}
}
function syncPanes(){var p=$('#app').dataset.pane;document.querySelectorAll('.panes .btn').forEach(function(b){b.classList.toggle('on',b.dataset.pane===p)})}

function renderStage(id){
  handlers=handlers.filter(function(o){return o.global});
  var sc=SCENE[id],stage=$('#stage');
  var head=h('div',{class:'head-row'},h('div',null,h('div',{class:'kick'},h('b',{text:DAYS[sc.day]}),' · '+t12(sc.s)+'-'+t12(sc.e)+' · '+sc.mins+' min'),h('h1',{text:sc.title})));
  var brief=h('div',{class:'brief'},
    h('div',{class:'out'},h('div',{class:'sec-h',text:'Required output'}),h('p',{text:sc.out})),
    h('ul',{class:'pts',html:sc.pts.map(function(p){return '<li>'+p+'</li>'}).join('')}));
  var inner=h('div',{class:'stage-in'},head,brief);
  if(!canWrite)inner.append(h('div',{class:'banner',id:'banner',text:'You can read this page but not change it. Ask the facilitator for access.'}));
  sc.tools.forEach(function(t){var f=TOOLS[t.k];if(f)inner.append(f(t,sc))});
  if(!sc.nonotes)inner.append(Notes(sc.id));
  stage.replaceChildren(inner);stage.scrollTop=0;
}
function showBanner(){ if(!$('#banner')&&$('.stage-in'))$('.stage-in').children[1].after(h('div',{class:'banner',id:'banner',text:'You can read this page but not change it. Ask the facilitator for access.'})) }
