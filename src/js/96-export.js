/* ============================ record export ============================ */
function voteCount(id){return list('votes',function(v){return v.idea===id}).length}
function dline(l){return l.filter(function(x){return x!==''&&x!=null}).join(' | ')}
function toolRecord(t,sc,L){
  switch(t.k){
    case 'form':{
      var f=F(t.id),any=false,rows=[];
      t.rows.forEach(function(r){
        if(r.type==='head'){rows.push('**'+r.label+'**');return}
        if(r.type==='pair'){var v=f[r.k+'_v'],x=f[r.k+'_t'];if(v||x){any=true;rows.push('- '+r.label+': '+(v||'undecided')+(x?' | '+x:''))}return}
        var val=txt(f[r.k]);if(val){any=true;rows.push('- '+r.label+': '+(r.type==='date'?fmtDate(val):val))}
      });
      if(any){L.push('#### '+t.title);rows.forEach(function(x){L.push(x)});L.push('')}break}
    case 'wall':{
      var items=list('ideas',function(i){return i.scene===sc.id+':'+t.id}).sort(byTs);
      if(items.length){L.push('#### '+t.title);items.forEach(function(i){L.push('- '+(t.tags?'['+(t.tags[i.tag||0]||'')+'] ':'')+i.text+' ('+(i.who||'?')+') [votes '+voteCount(i.id)+']'+(t.extras||[]).map(function(x){return i[x.k]?' | '+x.label+': '+i[x.k]:''}).join(''))});L.push('')}break}
    case 'board':{
      var cs=list('cards',function(x){return x.scene===t.id}).sort(byTs);
      if(cs.length){L.push('#### '+t.title);t.cols.forEach(function(c){var m=cs.filter(function(x){return x.col===c.k});if(m.length){L.push('- '+c.l+': '+m.map(function(x){return x.text}).join('; '))}});L.push('')}break}
    case 'rocks':{
      var rr=list('rocks',function(r){return r.scope===t.scope}).sort(byOrd);
      if(rr.length){L.push('#### '+t.title);rr.forEach(function(r){L.push('- **'+r.title+'** ['+(r.status||'proposed')+'] Votes: '+voteCount(r.id)+' | Owner: '+(r.owner||'-')+' | Finish line: '+(r.finish||'-')+' | Leading indicator: '+(r.leading||'-')+' | Data source: '+(r.source||'-')+' | Tradeoff: '+(r.tradeoff||'-')+' | Check-in: '+(fmtDate(r.checkin)||'-')+' | Due: '+(fmtDate(r.due)||'-'))});L.push('')}break}
    case 'rocktrack':{
      var rt=list('rocks',function(r){return r.scope===t.id}).sort(byOrd);
      if(rt.length){L.push('#### '+t.title);rt.forEach(function(r){L.push('- '+r.title+' | '+(r.track==='on'?'on track':(r.track==='off'?'off track':(r.track==='done'?'done':'not scored')))+' | Owner: '+(r.owner||'-')+' | Due: '+(fmtDate(r.due)||'-')+(r.note?' | '+r.note:''))});L.push('')}break}
    case 'targets':{
      var tg=list('targets',function(r){return r.scope===t.scope}).sort(byOrd);
      if(tg.length){L.push('#### '+t.title);tg.forEach(function(x){L.push('- '+x.metric+': '+(txt(x.target)||'open')+(x.agreed?' (agreed)':'')+(x.rejected?' (skipped)':'')+' [votes '+voteCount(x.id)+']'+(x.note?' | '+x.note:'')+(x.ref?' | Ref: '+x.ref:''))});L.push('')}break}
    case 'commits':{
      var cm=list('commits',function(c){return (c.plan||t.id)===t.id});
      if(cm.length){L.push('#### '+t.title);ROSTER.forEach(function(w){var m=cm.filter(function(c){return c.who===w}).sort(byTs);if(m.length){L.push('**'+w+'**');m.forEach(function(c){L.push('- '+(c.kind==='stop'?'[stop] ':'')+c.text+(c.kpi?' | KPI: '+c.kpi:'')+(c.support?' | Needs: '+c.support:'')+(c.checkin?' | Check-in: '+fmtDate(c.checkin):'')+(c.due?' | Due: '+fmtDate(c.due):''))})}});L.push('')}break}
    case 'metrics':{
      var mm=list('metrics',function(m){return m.scope===t.id}).sort(byOrd);
      if(mm.length){L.push('#### '+t.title);mm.forEach(function(m){var s=metricState(m);L.push('- '+m.name+(m.type?' ['+m.type+']':'')+' | Goal '+(m.goal||'-')+' | Actual '+(m.value||'-')+' | Last '+(m.prev||'-')+(m.owner?' | Owner '+m.owner:'')+(s?' | '+(s==='on'?'on track':'off track'):''))});L.push('')}break}
    case 'links':{
      var lk=list('links');
      if(lk.length){L.push('#### '+t.title);lk.forEach(function(x){var r=S.rocks[x.id];if(r)L.push('- '+r.title+' enables '+(x.priority==='none'?'none, conflict to resolve':((S.rocks[x.priority]||{}).title||'-'))+(x.move?' | First move: '+x.move:'')+(x.conflict?' | Conflict: '+x.conflict:''))});L.push('')}break}
  }
}
function buildRecord(){
  var dates=(ROOM.dates||[]).filter(Boolean).map(fmtDate).join(', ');
  var L=['# '+ROOM.title,ROOM.tname+(dates?' · '+dates:'')+(ROOM.recurring?' · Session '+ROOM.sess:''),'','## Decision log',decisionsText(),''];
  SCENES.forEach(function(sc){
    var body=[];
    sc.tools.forEach(function(t){toolRecord(t,sc,body)});
    list('notes',function(n){return n.scene===sc.id}).sort(byTs).forEach(function(n){body.push('- Note ('+(n.who||'?')+'): '+n.text)});
    if(body.length){L.push('## '+DAYS[sc.day].split(' · ')[0]+' · '+sc.title);body.forEach(function(x){L.push(x)});L.push('')}
  });
  var td=list('todos').sort(byTs);
  if(td.length){L.push('## To-dos');td.forEach(function(t){L.push('- '+(t.status==='done'?'[done] ':(t.status==='missed'?'[not done] ':''))+t.text+' | Owner: '+(t.owner||'-')+' | Check-in: '+(fmtDate(t.checkin)||'-')+' | Due: '+(fmtDate(t.due)||'-')+(t.measure?' | Moves: '+t.measure:'')+(t.note?' | '+t.note:''))});L.push('')}
  var is=list('issues').sort(byTs);
  if(is.length){L.push('## Issues');is.forEach(function(i){L.push('- ['+(i.status||'open')+'] '+i.title+' [votes '+voteCount(i.id)+']'+(i.detail?' | '+i.detail:'')+(i.resolution?' | Decision: '+i.resolution:''))});L.push('')}
  var up=list('updates').sort(byTs);
  if(up.length){L.push('## Stand-up');up.forEach(function(u){L.push('- '+u.who+' | Finished: '+(u.yesterday||'-')+' | Today: '+(u.today||'-')+' | Blocked by: '+(u.blockers||'-'))});L.push('')}
  var so=list('signoff',function(s){return s.ok}).sort(byTs);
  if(so.length){L.push('## Sign-offs');so.forEach(function(s){L.push('- '+s.who+': '+(s.action||'-')+' | next check '+(fmtDate(s.check)||'-'))});L.push('')}
  var rs=list('ratings',function(r){return +r.v>0});
  if(rs.length){var a=rs.reduce(function(x,r){return x+(+r.v)},0)/rs.length;L.push('## Meeting rating','- Average '+a.toFixed(1)+' from '+rs.length+' ('+rs.map(function(r){return r.who+' '+r.v}).join(', ')+')','')}
  var ideas=list('ideas',function(i){return !SCENE[i.scene.split(':')[0]]});
  return L.join('\n');
}
