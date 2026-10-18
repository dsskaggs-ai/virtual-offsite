/* ---------- targets table ---------- */
function Targets(cfg){
  var rows={},sortVotes=false,vc={},pending=false;
  var tbody=h('tbody');
  var mi=h('input',{type:'text',id:'tg-new-'+cfg.scope,placeholder:'Add a metric','aria-label':'New metric'});
  function addNew(){var t=txt(mi.value);if(!t||!needWho())return;addDoc('targets',{scope:cfg.scope,metric:t,ref:'',target:'',note:'',agreed:false});mi.value=''}
  mi.addEventListener('keydown',function(e){if(e.key==='Enter')addNew()});
  var cnt=h('span',{class:'meter'});
  var sortBtn=h('button',{class:'btn sm',type:'button',text:'Sort by votes','aria-pressed':'false',onclick:function(){sortVotes=!sortVotes;sortBtn.classList.toggle('on',sortVotes);sortBtn.setAttribute('aria-pressed',String(sortVotes));layout()}});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),h('div',{class:'crow',style:'flex:0 0 auto'},cnt,sortBtn)),
    h('p',{class:'help',text:cfg.help||'Set each target and the operating change that delivers it. Vote, and mark a target agreed only when the room agrees. Targets stay open until then.'}),
    h('div',{class:'tw'},h('table',null,h('thead',null,h('tr',null,h('th',{text:'Metric'}),h('th',{text:'Reference'}),h('th',{text:'Target'}),h('th',{text:'Operating bridge and assumptions'}),h('th',{text:'Vote'}),h('th',{text:'Agreed'}))),tbody)),
    h('div',{class:'crow'},mi,h('button',{class:'btn',type:'button',text:'Add row',onclick:addNew})));
  function row(id){
    var syncs=[],cells={};
    function inp(k,ph){var el=h('input',{type:'text',id:'tg-'+id+'-'+k,placeholder:ph||'','aria-label':k});syncs.push(bind(el,'targets',id,k));return el}
    var m=inp('metric'),t=inp('target','Set target'),n=inp('note','What has to change');
    var ag=h('input',{type:'checkbox',id:'tg-'+id+'-agreed','aria-label':'Agreed'});syncs.push(bind(ag,'targets',id,'agreed'));
    var ref=h('td',{class:'ref'});
    var del=h('button',{class:'x','aria-label':'Remove row',onclick:function(){delDoc('targets',id)},text:'×'});
    var vb=h('button',{class:'vote tg-vote',type:'button'});
    vb.addEventListener('click',function(){
      if(!guard())return;var vid=id+'_'+voteKey();
      if(S.votes[vid])delDoc('votes',vid);else setDoc('votes',vid,{idea:id,v:voteKey(),ts:Date.now()});
    });
    var sk=h('button',{class:'skipb',type:'button',text:'Skip','aria-pressed':'false',title:'Not adopting this one. It moves to the bottom.',onclick:function(){var r=S.targets[id];if(r)upd('targets',id,{rejected:!r.rejected})}});
    var tr=h('tr',null,h('td',null,m),ref,h('td',{class:'num'},t),h('td',null,n),h('td',null,vb),h('td',null,h('div',{class:'crow',style:'flex-wrap:nowrap;gap:.2rem'},ag,sk,del)));
    return {el:tr,sync:function(){var r=S.targets[id];if(!r)return;syncs.forEach(function(s){s()});ref.textContent=r.ref||'';
      var mine=!!S.votes[id+'_'+voteKey()],nv=vc[id]||0;
      vb.className='vote tg-vote'+(mine?' on':'');vb.setAttribute('aria-pressed',String(mine));vb.textContent='+1 '+nv;vb.setAttribute('aria-label',(mine?'Remove your vote. ':'Vote for this. ')+nv+' votes so far');
      sk.setAttribute('aria-pressed',String(!!r.rejected));sk.textContent=r.rejected?'Skipped':'Skip';
      tr.className=r.rejected?'dropped':((r.agreed&&txt(r.target))?'agreed':'')}};
  }
  /* Agreed rows go to the top, skipped rows to the bottom. A row is not moved while someone is typing in the table. */
  function layout(){
    var items=list('targets',function(r){return r.scope===cfg.scope}).sort(byOrd);
    function grp(r){return r.rejected?2:((r.agreed&&txt(r.target))?0:1)}
    items.sort(function(a,b){return grp(a)-grp(b)||(sortVotes?(vc[b.id]||0)-(vc[a.id]||0):0)||byOrd(a,b)});
    var want=items.map(function(r){return rows[r.id]&&rows[r.id].el}).filter(Boolean);
    var a=document.activeElement;
    if(a&&tbody.contains(a)&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&a.type==='text'))){pending=true;return}
    pending=false;
    var curr=Array.prototype.slice.call(tbody.children);
    if(curr.length===want.length&&want.every(function(e,i){return curr[i]===e}))return;
    want.forEach(function(e){tbody.append(e)});
  }
  tbody.addEventListener('focusout',function(){if(pending)setTimeout(layout,80)});
  on(['targets','votes'],function(){
    var items=list('targets',function(r){return r.scope===cfg.scope}).sort(byOrd);
    vc={};list('votes').forEach(function(v){vc[v.idea]=(vc[v.idea]||0)+1});
    Object.keys(rows).forEach(function(id){if(!S.targets[id]){rows[id].el.remove();delete rows[id]}});
    items.forEach(function(r){if(!rows[r.id]){rows[r.id]=row(r.id);tbody.append(rows[r.id].el)}rows[r.id].sync()});
    var ag=items.filter(function(r){return r.agreed&&txt(r.target)&&!r.rejected}).length,sk=items.filter(function(r){return r.rejected}).length;
    cnt.textContent=ag+' of '+(items.length-sk)+' agreed'+(sk?', '+sk+' skipped':'');cnt.className='meter'+(items.length-sk>0&&ag===items.length-sk?' ok':'');
    layout();
  });
  return box;
}
