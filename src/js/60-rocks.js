/* ---------- rocks and annual priorities ---------- */
/* owners control: one or more names from the roster, stored as a comma separated string in the existing owner field so earlier data and exports keep working */
function OwnersField(id){
  var chips=h('div',{class:'ochips'}),sel=h('select',{id:'rock-'+id+'-ownerAdd','aria-label':'Add an owner'});
  var wrap=h('div',{class:'fld'},h('span',{text:'Owners'}),chips,sel),last=null;
  function names(){var r=S.rocks[id]||{};return txt(r.owner)?String(r.owner).split(/\s*,\s*/).filter(Boolean):[]}
  function save(l){upd('rocks',id,{owner:l.join(', ')})}
  sel.addEventListener('change',function(){var v=sel.value;if(!v)return;var l=names();if(l.indexOf(v)<0)l.push(v);save(l);sel.value=''});
  function sync(){
    var l=names(),key=l.join('|');
    if(key===last)return;last=key;
    chips.replaceChildren();
    l.forEach(function(n){chips.append(h('span',{class:'ochip'},n,h('button',{type:'button','aria-label':'Remove '+n,text:'×',onclick:function(){save(names().filter(function(x){return x!==n}))}})))});
    sel.replaceChildren();sel.append(h('option',{value:'',text:l.length?'Add another owner':'Add an owner'}));
    ROSTER.filter(function(n){return l.indexOf(n)<0}).forEach(function(n){sel.append(h('option',{value:n,text:n}))});
    sel.value='';
  }
  return {wrap:wrap,sync:sync};
}

function Rocks(cfg){
  var cards={},sortVotes=false,vc={};
  var NOUN=(cfg.noun||'priority'),NPL=/y$/i.test(NOUN)?NOUN.slice(0,-1).toLowerCase()+'ies':NOUN.toLowerCase()+'s',GT=(cfg.gate||GATE_ALL).map(function(k){return {k:k,l:GATE_LABELS[k]}}),DUE=optDate(cfg.due);
  var cnt=h('div',{class:'meter'});
  var title=h('input',{type:'text',id:'rock-new-'+cfg.scope,placeholder:'Add a '+NOUN.toLowerCase(),'aria-label':'New title'});
  function addNew(){var t=txt(title.value);if(!t||!needWho())return;var all=list('rocks',function(r){return r.scope===cfg.scope});addDoc('rocks',{scope:cfg.scope,title:t,desc:'',status:'proposed',due:DUE,who:me.who});title.value=''}
  title.addEventListener('keydown',function(e){if(e.key==='Enter')addNew()});
  var hA=h('div',{class:'sec-h'}),hO=h('div',{class:'sec-h',text:'Still to decide'}),hR=h('div',{class:'sec-h',text:'Rejected and parked'});
  var main=h('div',{class:'rocks'},hA,hO,hR);
  var sortBtn=h('button',{class:'btn sm',type:'button',text:'Sort by votes','aria-pressed':'false',onclick:function(){sortVotes=!sortVotes;sortBtn.classList.toggle('on',sortVotes);sortBtn.setAttribute('aria-pressed',String(sortVotes));layout()}});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),h('div',{class:'crow',style:'flex:0 0 auto'},cnt,sortBtn)),
    h('p',{class:'help',text:'Vote on each one. Approved '+NPL+' move to the top and rejected ones to the bottom, so what is left to decide stays in the middle.'}),
    h('div',{class:'crow'},title,h('button',{class:'btn',type:'button',text:'Add',onclick:addNew})),main);
  function approvedCount(){return list('rocks',function(r){return r.scope===cfg.scope&&r.status==='approved'}).length}
  function card(id){
    var inputs=[];
    function fld(k,label,type,sel){
      var el=sel?rosterSel('rock-'+id+'-'+k):h(type==='area'?'textarea':'input',{id:'rock-'+id+'-'+k,type:type==='date'?'date':'text',rows:type==='area'?2:null});
      var sync=bind(el,'rocks',id,k);inputs.push(sync);
      var wrap=h('label',{class:'fld',for:'rock-'+id+'-'+k},h('span',{text:label}),el);return {wrap:wrap,el:el};
    }
    var ti=h('input',{type:'text',class:'rt',id:'rock-'+id+'-title','aria-label':'Title'});inputs.push(bind(ti,'rocks',id,'title'));
    var desc=h('textarea',{id:'rock-'+id+'-desc',rows:2,'aria-label':'Description'});inputs.push(bind(desc,'rocks',id,'desc'));
    var ow=OwnersField(id);
    var f={owner:{wrap:ow.wrap},finish:fld('finish','Finish line','text'),leading:fld('leading','Leading indicator','text'),source:fld('source','Data source','text'),tradeoff:fld('tradeoff','Tradeoff: what stops or moves','text'),checkin:fld('checkin','Check-in date','date'),due:fld('due','Due date','date')};
    var bP=h('button',{type:'button',text:'Proposed','aria-pressed':'true',onclick:function(){upd('rocks',id,{status:'proposed'})}});
    var bA=h('button',{type:'button',class:'good',text:'Approve','aria-pressed':'false',onclick:function(){upd('rocks',id,{status:'approved'})}});
    var bR=h('button',{type:'button',class:'bad',text:'Reject','aria-pressed':'false',onclick:function(){upd('rocks',id,{status:'rejected'})}});
    var msg=h('span',{class:'err'}),chips=h('span',{class:'crow',style:'flex:0 0 auto;gap:.3rem'});
    var vb=h('button',{class:'vote',type:'button'});
    vb.addEventListener('click',function(){
      if(!guard())return;var vid=id+'_'+voteKey();
      if(S.votes[vid])delDoc('votes',vid);else setDoc('votes',vid,{idea:id,v:voteKey(),ts:Date.now()});
    });
    var rm=h('button',{class:'btn link sm',type:'button',text:'Remove'}),rt;
    rm.addEventListener('click',function(){ if(rm.dataset.sure){delDoc('rocks',id);return} rm.dataset.sure='1';rm.textContent='Click again to remove';clearTimeout(rt);rt=setTimeout(function(){delete rm.dataset.sure;rm.textContent='Remove'},3000)});
    var sum=h('div',{class:'sum'}),openState=null,editBtn=h('button',{class:'btn sm',type:'button'});
    var el=h('article',{class:'rock'},h('div',{class:'rh'},ti,vb,h('div',{class:'seg',role:'group','aria-label':'Status'},bP,bA,bR)),sum,
      h('div',{class:'rbody'},desc,h('div',{class:'ggrid'},f.owner.wrap,f.finish.wrap,f.leading.wrap,f.source.wrap,f.tradeoff.wrap,f.checkin.wrap,f.due.wrap)),
      h('div',{class:'rf'},chips,msg,h('span',{style:'margin-left:auto;display:flex;gap:.4rem;align-items:center'},editBtn,rm)));
    function isOpen(r){
      if(openState!=null)return openState;
      return (r.status||'proposed')==='proposed'||el.contains(document.activeElement);
    }
    editBtn.addEventListener('click',function(){var r=S.rocks[id];if(!r)return;openState=!isOpen(r);sync()});
    function sync(){
      var r=S.rocks[id];if(!r)return;
      inputs.forEach(function(s){s()});ow.sync();
      el.dataset.status=r.status||'proposed';
      var mine=!!S.votes[id+'_'+voteKey()],nv=vc[id]||0;
      vb.className='vote'+(mine?' on':'');vb.setAttribute('aria-pressed',String(mine));vb.textContent='+1 '+nv;vb.setAttribute('aria-label',(mine?'Remove your vote. ':'Vote for this. ')+nv+' votes so far');
      var o=isOpen(r);el.dataset.open=o?'1':'0';editBtn.textContent=o?'Done editing':'Edit';editBtn.setAttribute('aria-expanded',String(o));
      sum.replaceChildren(h('span',{class:'sw',text:txt(r.owner)||'No owner yet'}),h('span',{text:txt(r.finish)||'No finish line yet'}));
      var missing=GT.filter(function(g){return !txt(r[g.k])});
      GT.forEach(function(g){f[g.k].wrap.classList.toggle('miss',!txt(r[g.k])&&r.status!=='rejected')});
      var ok=!missing.length,capHit=r.status!=='approved'&&approvedCount()>=cfg.max;
      bP.setAttribute('aria-pressed',String((r.status||'proposed')==='proposed'));
      bA.setAttribute('aria-pressed',String(r.status==='approved'));
      bR.setAttribute('aria-pressed',String(r.status==='rejected'));
      bA.disabled=r.status!=='approved'&&(!ok||capHit);
      chips.replaceChildren(h('span',{class:'chip '+(ok?'ok':'warn'),text:'Gate '+(GT.length-missing.length)+' of '+GT.length}),
        h('span',{class:'chip '+(txt(r.checkin)&&txt(r.due)?'ok':'warn'),text:txt(r.checkin)&&txt(r.due)?'Check-in '+fmtDate(r.checkin)+' · Due '+fmtDate(r.due):'Needs check-in and due dates'}));
      msg.textContent=r.status==='approved'?'':(capHit?approvedCount()+' of '+cfg.max+' approved. Swap one out first.':(!ok?'To approve, add: '+missing.map(function(g){return g.l}).join(', ')+'.':''));
    }
    return {el:el,sync:sync};
  }
  /* Cards stay put in the DOM. Order is set with CSS order, so nobody loses the cursor when a vote or a status change reshuffles the list. */
  function layout(){
    var rows=list('rocks',function(r){return r.scope===cfg.scope}).sort(byOrd);
    var g={a:[],o:[],r:[]};
    rows.forEach(function(r){g[r.status==='approved'?'a':(r.status==='rejected'?'r':'o')].push(r)});
    function rank(l){l.sort(sortVotes?function(a,b){return (vc[b.id]||0)-(vc[a.id]||0)||byOrd(a,b)}:byOrd)}
    rank(g.a);rank(g.o);rank(g.r);
    [['a',10],['o',1000],['r',2000]].forEach(function(x){g[x[0]].forEach(function(r,i){if(cards[r.id])cards[r.id].el.style.order=String(x[1]+i)})});
    hA.style.order='0';hO.style.order='999';hR.style.order='1999';
    hA.textContent='Approved, '+g.a.length+' of '+cfg.max;
    hA.hidden=!g.a.length;hR.hidden=!g.r.length;
    hO.hidden=!(g.o.length&&(g.a.length||g.r.length));
  }
  on(['rocks','votes'],function(){
    var rows=list('rocks',function(r){return r.scope===cfg.scope}).sort(byOrd);
    vc={};list('votes').forEach(function(v){vc[v.idea]=(vc[v.idea]||0)+1});
    Object.keys(cards).forEach(function(id){if(!S.rocks[id]){cards[id].el.remove();delete cards[id]}});
    rows.forEach(function(r){if(!cards[r.id]){cards[r.id]=card(r.id);main.append(cards[r.id].el)}});
    rows.forEach(function(r){cards[r.id].sync()});
    var n=approvedCount();
    cnt.className='meter'+(n>cfg.max?' over':(n>=cfg.min&&n<=cfg.max?' ok':''));
    cnt.replaceChildren(h('span',{text:n+' approved, '+(cfg.min===cfg.max?cfg.max:cfg.min+' to '+cfg.max)+' allowed'}),h('span',{class:'bar'},h('i',{style:'width:'+Math.min(100,n/cfg.max*100)+'%'})));
    layout();
    var e=box.querySelector('.empty');
    if(!rows.length){if(!e)main.before(h('div',{class:'empty',text:'No '+NPL+' yet. Add one above when the room is ready to name it.'}))}
    else if(e)e.remove();
  });
  return box;
}
