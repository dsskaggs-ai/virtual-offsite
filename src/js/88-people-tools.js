/* ---------- stand-up round table: yesterday, today, blockers for each person ---------- */
function Standup(cfg){
  var cards={},cnt=h('span',{class:'meter'}),grid=h('div',{class:'pgrid'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),cnt),
    h('p',{class:'help',text:'Each person writes their own card. Yesterday\'s plan is carried over, so update it and then write today\'s.'}),grid);
  function card(w){
    var id=slug(w),ss=[];
    function ta(k,ph){var el=h('textarea',{id:'up-'+id+'-'+k,rows:2,placeholder:ph,'aria-label':ph});ss.push(bind(el,'updates',id,k,true));return el}
    var y=ta('yesterday','Finished since last time'),t=ta('today','Doing today'),b=ta('blockers','Blocked by');
    var chip=h('span',{class:'chip'});
    var el=h('div',{class:'pcard'},h('h3',null,w,chip),h('label',{class:'fld',for:'up-'+id+'-yesterday'},h('span',{text:'Finished'}),y),h('label',{class:'fld',for:'up-'+id+'-today'},h('span',{text:'Today'}),t),h('label',{class:'fld',for:'up-'+id+'-blockers'},h('span',{text:'Blocked by'}),b));
    return {el:el,sync:function(){var r=S.updates[id]||{};ss.forEach(function(s){s()});
      var blocked=txt(r.blockers),posted=txt(r.today);chip.textContent=blocked?'Blocked':(posted?'Posted':'Open');chip.className='chip '+(blocked?'bad':(posted?'ok':'warn'));
      el.classList.toggle('mine',w===me.who)}};
  }
  ROSTER.forEach(function(w){cards[w]=card(w);grid.append(cards[w].el)});
  on(['updates'],function(){
    var n=0,bl=0;ROSTER.forEach(function(w){cards[w].sync();var r=S.updates[slug(w)]||{};if(txt(r.today))n++;if(txt(r.blockers))bl++});
    cnt.textContent=n+' of '+ROSTER.length+' posted'+(bl?', '+bl+' blocked':'');cnt.className='meter'+(n===ROSTER.length?' ok':'');
  });
  return box;
}

/* ---------- rate the meeting, one to ten ---------- */
function Rating(cfg){
  var btns=[],avg=h('span',{class:'meter'}),who=h('div',{class:'ochips'});
  var seg=h('div',{class:'seg rate',role:'group','aria-label':'Your rating'});
  for(var i=1;i<=10;i++)(function(v){var b=h('button',{type:'button',text:String(v),onclick:function(){
    if(!needWho())return;var id=cfg.id+'_'+slug(me.who),r=S.ratings[id];upd('ratings',id,{sid:cfg.id,who:me.who,v:r&&r.v===v?0:v,ts:Date.now()},true)}});btns.push(b);seg.append(b)})(i);
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),avg),cfg.prompt?h('p',{class:'help',text:cfg.prompt}):'',seg,who);
  on(['ratings'],function(){
    var rs=list('ratings',function(x){return x.sid===cfg.id&&+x.v>0}),mine=S.ratings[cfg.id+'_'+slug(me.who)];
    btns.forEach(function(b,i){b.setAttribute('aria-pressed',String(!!mine&&mine.v===i+1))});
    var a=rs.length?rs.reduce(function(s,x){return s+(+x.v)},0)/rs.length:null;
    avg.textContent=a==null?'No ratings yet':'Average '+a.toFixed(1)+' from '+rs.length+' of '+ROSTER.length;avg.className='meter'+(a!=null&&a>=8?' ok':'');
    who.replaceChildren();rs.sort(byTs).forEach(function(x){who.append(h('span',{class:'ochip',style:'padding-right:.6rem'},x.who+' · '+x.v))});
  });
  return box;
}

/* ---------- recap of this session ---------- */
function Recap(cfg){
  var box=h('section',{class:'panel rb'});
  on(['decisions','todos','issues','ratings'],function(){
    var dec=list('decisions').sort(byTs),td=newTodos().sort(byTs),sv=list('issues',function(i){return i.status==='solved'}).sort(byTs);
    box.replaceChildren(h('div',{class:'ph'},h('h2',{text:cfg.title||'Recap'})),
      h('div',{class:'rbgrid'},
        h('div',{class:'rbsec'},h('h3',{text:'New to-dos'}),td.length?h('ul',null,td.map(function(t){return h('li',null,h('b',{text:t.text}),h('span',{class:'k',text:(t.owner||'no owner')+' · check-in '+(fmtDate(t.checkin)||'open')+' · due '+(fmtDate(t.due)||'open')}))})):h('div',{class:'muted',text:'None yet.'})),
        h('div',{class:'rbsec'},h('h3',{text:'Issues solved'}),sv.length?h('ul',null,sv.map(function(t){return h('li',null,h('b',{text:t.title}),h('span',{text:t.resolution||''}))})):h('div',{class:'muted',text:'None yet.'})),
        h('div',{class:'rbsec'},h('h3',{text:'Decisions logged'}),dec.length?h('ul',null,dec.map(function(t){return h('li',null,h('b',{text:t.text}),h('span',{class:'k',text:(t.owner||'no owner')+(t.due?' · due '+fmtDate(t.due):'')}))})):h('div',{class:'muted',text:'None yet.'}))));
  });
  return box;
}
