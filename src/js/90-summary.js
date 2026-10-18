/* ---------- the plan, read back from what the room entered ---------- */
function sectionData(sec){
  var L=[];
  switch(sec.kind){
    case 'targets':list('targets',function(t){return t.scope===sec.scope&&!t.rejected}).sort(byOrd).forEach(function(t){L.push({b:t.metric,t:txt(t.target)||'owed',k:t.note||'',chip:t.agreed&&txt(t.target)?'agreed':''})});break;
    case 'rocks':list('rocks',function(r){return r.scope===sec.scope&&r.status==='approved'}).sort(byOrd).forEach(function(r){L.push({b:r.title,k:(r.owner||'no owner')+' · due '+(fmtDate(r.due)||'open'),t:r.finish||''})});if(!L.length)L.push({t:'None approved yet.',muted:1});break;
    case 'crit':{var f=F(sec.form);
      [['1','Number 1'],['2','Number 2']].forEach(function(n){var p='c'+n[0];L.push({k:n[1]+(f[p+'type']?' · '+f[p+'type']:''),b:txt(f[p+'name'])||'owed',t:[f[p+'cel']&&'celebrate '+f[p+'cel'],f[p+'goal']&&'goal '+f[p+'goal'],f[p+'dis']&&'disappointing '+f[p+'dis']].filter(Boolean).join(' · ')})});
      L.push({k:'Balance',t:txt(f.balance)||'owed'});if(f.theme!==undefined)L.push({k:'Theme',b:txt(f.theme)||'owed'});break}
    case 'pairs':{var g=F(sec.form);sec.items.forEach(function(x){L.push({k:x[1],b:g[x[0]+'_v']||'undecided',t:g[x[0]+'_t']||''})});break}
    case 'fields':{var q=F(sec.form);sec.items.forEach(function(x){L.push({k:x[1],b:txt(q[x[0]])||'owed'})});break}
    case 'checks':progress().forEach(function(c){L.push({t:c.l+' ('+c.d+')',chip:c.done?'yes':'open'})});break;
  }
  return L;
}
function Summary(cfg){
  var box=h('section',{class:'panel rb'});
  var copy=h('button',{class:'btn',type:'button',text:'Copy the page',onclick:function(ev){copyText(summaryText(cfg),ev.currentTarget)}});
  function line(r){
    return h('li',null,r.k?h('span',{class:'k',text:r.k}):'',r.b?h('b',{text:r.b}):'',r.t?h('span',{class:r.muted?'muted':'',text:r.t}):'',r.chip?h('span',{class:'chip '+(r.chip==='open'?'warn':'ok'),text:r.chip}):'');
  }
  on(COLS,function(){
    var cols=cfg.sections.map(function(sec){
      return h('div',{class:'rbsec'},h('h3',{text:sec.h}),h('ul',null,sectionData(sec).map(line)));
    });
    box.replaceChildren(h('div',{class:'ph'},h('h2',{text:cfg.title}),copy),h('div',{class:'rbgrid'},cols));
  });
  return box;
}
function summaryText(cfg){
  var out=[cfg.copy||cfg.title,ROOM.title,''];
  cfg.sections.forEach(function(sec){out.push(sec.h);sectionData(sec).forEach(function(r){out.push('- '+[r.k,r.b,r.t,r.chip&&'['+r.chip+']'].filter(Boolean).join(' | '))});out.push('')});
  return out.join('\n');
}

/* ---------- decisions that must leave the room, for the scenes that ask for them ---------- */
function Required(cfg){
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:'Decisions that must leave the room'}),h('span',{class:'meter'})),h('div',{class:'feed'}));
  on(COLS,function(){
    var p=progress().filter(function(x){return cfg.day==null||x.day===cfg.day+1}),l=box.querySelector('.feed');l.replaceChildren();
    p.forEach(function(x){l.append(h('div',{class:'pitem'+(x.done?' done':''),style:'font-size:.95rem'},h('span',{class:'tick'}),x.l,h('small',{text:x.d})))});
    box.querySelector('.meter').textContent=p.filter(function(x){return x.done}).length+' of '+p.length+' done';
  });
  return box;
}

var TOOLS={
  required:function(t){return Required(t)},
  form:function(t){return Form(t)},
  wall:function(t,sc){return Wall(t,sc)},
  board:function(t,sc){return Board(t,sc)},
  rocks:function(t){return Rocks(t)},
  rocktrack:function(t){return RockTrack(t)},
  targets:function(t){return Targets(t)},
  commits:function(t){return Commits(t)},
  signoff:function(t){return Signoff(t)},
  links:function(t){return Links(t)},
  metrics:function(t){return Metrics(t)},
  issues:function(t){return Issues(t)},
  todos:function(t){return Todos(t)},
  standup:function(t){return Standup(t)},
  rating:function(t){return Rating(t)},
  recap:function(t){return Recap(t)},
  summary:function(t){return Summary(t)}
};
