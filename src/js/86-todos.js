/* ---------- to-dos and commitments. Review last session's, and make new ones with an owner and two dates. ---------- */
function Todos(cfg){
  var NOUN=cfg.noun||'to-do',mode=cfg.mode||'both',rows={};
  var showReview=mode==='review'||mode==='both',showNew=mode==='new'||mode==='both';
  var cnt=h('span',{class:'meter'}),parts=[];
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),cnt));
  if(cfg.help)box.append(h('p',{class:'help',text:cfg.help}));

  var revBox=null,revList=null,revSum=null;
  if(showReview){
    revSum=h('div',{class:'help'});revList=h('div',{class:'feed'});
    revBox=h('div',{style:'display:flex;flex-direction:column;gap:.5rem'},h('div',{class:'sec-h',text:'From last session'}),revSum,revList);box.append(revBox);
  }
  var newList=h('div',{class:'feed'}),text=null;
  if(showNew){
    text=h('input',{type:'text',id:'td-text-'+cfg.id,placeholder:'The '+NOUN+', one sentence'});
    var who=rosterSel('td-who-'+cfg.id),ci=h('input',{type:'date',id:'td-ci-'+cfg.id,'aria-label':'Check-in date'}),du=h('input',{type:'date',id:'td-du-'+cfg.id,'aria-label':'Due date'}),err=h('div',{class:'err'});
    who.firstChild.textContent='Owner';who.setAttribute('aria-label','Owner');
    ci.value=addDaysISO(todayISO(),3);du.value=addDaysISO(todayISO(),7);
    var ms=cfg.measure?h('select',{id:'td-ms-'+cfg.id,'aria-label':'Lead measure this moves'}):null;
    function fillMeasures(){
      if(!ms)return;var cur=ms.value;var names=list('metrics',function(m){return m.type==='lead'}).sort(byOrd).map(function(m){return m.name});
      var key=names.join('|');if(ms.dataset.k===key)return;ms.dataset.k=key;
      ms.replaceChildren.apply(ms,[h('option',{value:'',text:names.length?'Lead measure it moves':'No lead measures yet'})].concat(names.map(function(n){return h('option',{value:n,text:n})})));ms.value=cur;
    }
    var post=function(){
      var t=txt(text.value);if(!t){err.textContent='Write the '+NOUN+' first.';return}
      if(!who.value||!ci.value||!du.value){err.textContent='A '+NOUN+' needs an owner, a check-in date, and a due date.';return}
      if(ms&&!ms.value){err.textContent='Pick the lead measure it moves.';return}
      if(!needWho())return;err.textContent='';
      var d={text:t,owner:who.value,checkin:ci.value,due:du.value,status:'',sess:ROOM.sess,src:cfg.id,who:me.who};if(ms)d.measure=ms.value;
      addDoc('todos',d);text.value='';text.focus();
    };
    text.addEventListener('keydown',function(e){if(e.key==='Enter')post()});
    box.append(h('div',{class:'sec-h',text:showReview?'New '+NOUN+'s':'Add a '+NOUN}),
      h('div',{class:'composer'},h('div',{class:'crow'},text),h('div',{class:'crow'},h('label',{class:'fld',for:'td-who-'+cfg.id,style:'flex:0 0 11rem'},h('span',{text:'Owner'}),who),
        ms?h('label',{class:'fld',for:'td-ms-'+cfg.id,style:'flex:1 1 12rem'},h('span',{text:'Moves'}),ms):'',
        h('label',{class:'fld',for:'td-ci-'+cfg.id,style:'flex:0 0 9rem'},h('span',{text:'Check-in'}),ci),h('label',{class:'fld',for:'td-du-'+cfg.id,style:'flex:0 0 9rem'},h('span',{text:'Due'}),du),
        h('button',{class:'btn pri',type:'button',text:'Add',onclick:post})),err),newList);
  }
  function row(id,review){
    var ss=[];
    var t=h('input',{type:'text',class:'tdt',id:'td-'+id+'-t','aria-label':'Text'});ss.push(bind(t,'todos',id,'text'));
    var o=rosterSel('td-'+id+'-o');o.setAttribute('aria-label','Owner');o.firstChild.textContent='Owner';ss.push(bind(o,'todos',id,'owner'));
    var c=h('input',{type:'date',id:'td-'+id+'-c','aria-label':'Check-in date'});ss.push(bind(c,'todos',id,'checkin'));
    var d=h('input',{type:'date',id:'td-'+id+'-d','aria-label':'Due date'});ss.push(bind(d,'todos',id,'due'));
    var n=h('input',{type:'text',id:'td-'+id+'-n',placeholder:'If not done, why?','aria-label':'Note'});ss.push(bind(n,'todos',id,'note'));
    function sb(label,v,cls){return h('button',{type:'button',class:cls||'',text:label,onclick:function(){var r=S.todos[id];upd('todos',id,{status:r&&r.status===v?'':v})}})}
    var bd=sb('Done','done','good'),bm=sb('Not done','missed','bad');
    var tag=h('span',{class:'chip'});
    var el=h('div',{class:'tdrow'},h('div',{class:'crow',style:'flex-wrap:nowrap'},t,review?h('div',{class:'seg',role:'group','aria-label':'Result'},bd,bm):'',h('button',{class:'x','aria-label':'Remove',onclick:function(){delDoc('todos',id)},text:'×'})),
      h('div',{class:'crow'},h('label',{class:'fld',for:'td-'+id+'-o',style:'flex:0 0 11rem'},o),h('label',{class:'fld',for:'td-'+id+'-c',style:'flex:0 0 9rem'},c),h('label',{class:'fld',for:'td-'+id+'-d',style:'flex:0 0 9rem'},d),review?n:'',tag));
    return {el:el,review:review,sync:function(){var r=S.todos[id];if(!r)return;ss.forEach(function(s){s()});
      bd.setAttribute('aria-pressed',String(r.status==='done'));bm.setAttribute('aria-pressed',String(r.status==='missed'));
      n.hidden=!(r.status==='missed');
      var late=r.due&&r.due<todayISO()&&r.status!=='done';
      tag.textContent=(r.measure?'Moves '+r.measure:'')+(late&&review&&!r.status?' · overdue':'');tag.hidden=!tag.textContent;tag.className='chip'+(late?' warn':'');
      el.dataset.s=r.status||''}};
  }
  on(['todos','metrics'],function(){
    if(showNew&&ms)fillMeasures();
    var prior=showReview?priorTodos().sort(byTs):[],fresh=showNew?newTodos().sort(byTs):[];
    var want={};prior.forEach(function(r){want[r.id]='r'});fresh.forEach(function(r){want[r.id]='n'});
    Object.keys(rows).forEach(function(id){if(!S.todos[id]||want[id]!==(rows[id].review?'r':'n')){rows[id].el.remove();delete rows[id]}});
    prior.forEach(function(r){if(!rows[r.id]){rows[r.id]=row(r.id,true);revList.append(rows[r.id].el)}rows[r.id].sync()});
    fresh.forEach(function(r){if(!rows[r.id]){rows[r.id]=row(r.id,false);newList.append(rows[r.id].el)}rows[r.id].sync()});
    if(showReview){
      var done=prior.filter(function(r){return r.status==='done'}).length,pct=prior.length?Math.round(done/prior.length*100):0;
      revSum.textContent=prior.length?(done+' of '+prior.length+' done, '+pct+'%'+(cfg.goal?'. Goal is '+cfg.goal+'%.':'.')):'Nothing was carried over from last session.';
      revBox.hidden=!prior.length&&mode!=='review';
    }
    cnt.textContent=(showNew?fresh.length+' new':'')+(showNew&&showReview?', ':'')+(showReview?prior.filter(function(r){return r.status==='done'||r.status==='missed'}).length+' of '+prior.length+' reviewed':'');
    var e=newList.querySelector('.empty');
    if(showNew&&!fresh.length&&!e)newList.append(h('div',{class:'empty',text:'No '+NOUN+'s yet.'}));
    if(showNew&&fresh.length&&e)e.remove();
  });
  return box;
}
