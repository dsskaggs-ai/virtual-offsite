/* ---------- issues list: identify, discuss, solve. Ranked by votes, worked from the top. ---------- */
function Issues(cfg){
  var cards={},vc={};
  var ti=h('input',{type:'text',id:'is-new-'+cfg.id,placeholder:'Add an issue','aria-label':'New issue'}),dt=h('textarea',{id:'is-new-d-'+cfg.id,rows:2,placeholder:'A line of detail, if it helps (optional)'});
  function addNew(){var t=txt(ti.value);if(!t||!needWho())return;addDoc('issues',{title:t,detail:txt(dt.value),status:'open',who:me.who,src:'room'});ti.value='';dt.value='';ti.focus()}
  ti.addEventListener('keydown',function(e){if(e.key==='Enter')addNew()});
  var hA=h('div',{class:'sec-h',text:'Working on now'}),hO=h('div',{class:'sec-h',text:'Open, ranked by votes'}),hS=h('div',{class:'sec-h',text:'Solved'}),hP=h('div',{class:'sec-h',text:'Parked'});
  var main=h('div',{class:'rocks'},hA,hO,hS,hP),cnt=h('span',{class:'meter'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),cnt),
    h('p',{class:'help',text:cfg.prompt||'Add an issue, vote for the ones that matter most, and work them from the top.'}),
    h('div',{class:'legend'},h('span',null,h('b',{text:'Identify'}),' the real issue'),h('span',null,h('b',{text:'Discuss'}),' until everyone has spoken'),h('span',null,h('b',{text:'Solve'}),' with a decision and a to-do')),
    h('div',{class:'composer'},h('div',{class:'crow'},ti,h('button',{class:'btn pri',type:'button',text:'Add',onclick:addNew})),dt),main);
  function card(id){
    var ss=[];
    var t=h('input',{type:'text',class:'rt',id:'is-'+id+'-title','aria-label':'Issue'});ss.push(bind(t,'issues',id,'title'));
    var dtl=h('textarea',{id:'is-'+id+'-detail',rows:2,placeholder:'Detail','aria-label':'Detail'});ss.push(bind(dtl,'issues',id,'detail'));
    var res=h('textarea',{id:'is-'+id+'-res',rows:2,placeholder:'The decision, in a sentence','aria-label':'Resolution'});ss.push(bind(res,'issues',id,'resolution'));
    function sb(label,v,cls){return h('button',{type:'button',class:cls||'',text:label,onclick:function(){var r=S.issues[id];upd('issues',id,{status:r&&r.status===v?'open':v})}})}
    var bW=sb('Working','active'),bS=sb('Solved','solved','good'),bP=sb('Park','parked','bad');
    var vb=h('button',{class:'vote',type:'button'});
    vb.addEventListener('click',function(){if(!guard())return;var vid=id+'_'+voteKey();if(S.votes[vid])delDoc('votes',vid);else setDoc('votes',vid,{idea:id,v:voteKey(),ts:Date.now()})});
    /* a to-do from this issue */
    var tt=h('input',{type:'text',id:'is-'+id+'-tt',placeholder:'To-do that solves it'}),to=rosterSel('is-'+id+'-to'),tc=h('input',{type:'date',id:'is-'+id+'-tc','aria-label':'Check-in date'}),td=h('input',{type:'date',id:'is-'+id+'-td','aria-label':'Due date'}),te=h('div',{class:'err'});
    to.firstChild.textContent='Owner';to.setAttribute('aria-label','Owner');
    var add=h('button',{class:'btn sm',type:'button',text:'Add to-do',onclick:function(){
      var x=txt(tt.value);if(!x){te.textContent='Write the to-do first.';return}
      if(!to.value||!tc.value||!td.value){te.textContent='A to-do needs an owner, a check-in date, and a due date.';return}
      if(!needWho())return;te.textContent='';
      addDoc('todos',{text:x,owner:to.value,checkin:tc.value,due:td.value,status:'',sess:ROOM.sess,issue:id,src:'issue',who:me.who});tt.value='';toast('To-do added')}});
    tc.value=addDaysISO(todayISO(),3);td.value=addDaysISO(todayISO(),7);
    var rm=h('button',{class:'x','aria-label':'Remove issue',text:'×'}),rt;
    rm.addEventListener('click',function(){if(rm.dataset.sure){delDoc('issues',id);return}rm.dataset.sure='1';rm.textContent='Sure?';clearTimeout(rt);rt=setTimeout(function(){delete rm.dataset.sure;rm.textContent='×'},3000)});
    var meta=h('div',{class:'sum'});
    var el=h('article',{class:'rock'},h('div',{class:'rh'},t,vb,h('div',{class:'seg',role:'group','aria-label':'Status'},bW,bS,bP),rm),meta,
      h('div',{class:'rbody',style:'display:flex;flex-direction:column;gap:.6rem'},dtl,h('label',{class:'fld',for:'is-'+id+'-res'},h('span',{text:'Resolution'}),res),
        h('div',{class:'crow'},tt,h('label',{class:'fld',for:'is-'+id+'-to',style:'flex:0 0 10rem'},to),tc,td,add),te));
    return {el:el,sync:function(){var r=S.issues[id];if(!r)return;ss.forEach(function(s){s()});
      var st=r.status||'open';el.dataset.status=st==='solved'?'approved':(st==='parked'?'rejected':(st==='active'?'active':'proposed'));
      bW.setAttribute('aria-pressed',String(st==='active'));bS.setAttribute('aria-pressed',String(st==='solved'));bP.setAttribute('aria-pressed',String(st==='parked'));
      var mine=!!S.votes[id+'_'+voteKey()],nv=vc[id]||0;vb.className='vote'+(mine?' on':'');vb.setAttribute('aria-pressed',String(mine));vb.textContent='+1 '+nv;vb.setAttribute('aria-label',(mine?'Remove your vote. ':'Vote for this. ')+nv+' votes so far');
      meta.replaceChildren(h('span',{text:(r.who||'')+(r.src==='metric'?' · from the scorecard':(r.src==='rock'?' · from the priorities':''))}),r.resolution?h('span',{class:'sw',text:'Decision: '+r.resolution}):'')}};
  }
  function layout(){
    var items=list('issues');
    var g={a:[],o:[],s:[],p:[]};
    items.forEach(function(r){var st=r.status||'open';g[st==='active'?'a':(st==='solved'?'s':(st==='parked'?'p':'o'))].push(r)});
    function rank(l){l.sort(function(a,b){return (vc[b.id]||0)-(vc[a.id]||0)||(a.ts||0)-(b.ts||0)})}
    rank(g.a);rank(g.o);rank(g.s);rank(g.p);
    [['a',10],['o',1000],['s',3000],['p',5000]].forEach(function(x){g[x[0]].forEach(function(r,i){if(cards[r.id])cards[r.id].el.style.order=String(x[1]+i)})});
    hA.style.order='0';hO.style.order='999';hS.style.order='2999';hP.style.order='4999';
    hA.hidden=!g.a.length;hO.hidden=!g.o.length;hS.hidden=!g.s.length;hP.hidden=!g.p.length;
    cnt.textContent=(g.a.length+g.o.length)+' open, '+g.s.length+' solved'+(g.p.length?', '+g.p.length+' parked':'');
  }
  on(['issues','votes'],function(){
    vc={};list('votes').forEach(function(v){vc[v.idea]=(vc[v.idea]||0)+1});
    var items=list('issues');
    Object.keys(cards).forEach(function(id){if(!S.issues[id]){cards[id].el.remove();delete cards[id]}});
    items.forEach(function(r){if(!cards[r.id]){cards[r.id]=card(r.id);main.append(cards[r.id].el)}cards[r.id].sync()});
    layout();
    var e=box.querySelector('.empty');
    if(!items.length){if(!e)main.before(h('div',{class:'empty',text:'No issues yet. Add the first one above.'}))}else if(e)e.remove();
  });
  return box;
}
