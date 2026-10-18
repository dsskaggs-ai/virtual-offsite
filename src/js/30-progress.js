/* ============================ progress: the template's checks, evaluated live ============================ */
function gateOK(r,keys){return (keys||GATE_ALL).every(function(k){return txt(r[k])})}
function num(v){var s=String(v==null?'':v).trim();if(!s)return NaN;var neg=/^\(.*\)$/.test(s)||/^-/.test(s);s=s.replace(/[(),$%\s-]/g,'').replace(/[kKmMbB]$/,'');var n=parseFloat(s);return isNaN(n)?NaN:(neg?-n:n)}
function signedCount(sid){return ROSTER.filter(function(w){var r=S.signoff[sid+'_'+slug(w)];return r&&r.ok}).length}
function priorTodos(){return list('todos',function(t){return (t.sess||1)<ROOM.sess})}
function newTodos(){return list('todos',function(t){return (t.sess||1)===ROOM.sess})}
function metricState(m){
  var o=m.status;if(o==='on'||o==='off')return o;
  var g=num(m.goal),v=num(m.value);if(isNaN(g)||isNaN(v))return '';
  return (m.dir==='lo'?v<=g:v>=g)?'on':'off';
}
function avgRating(id){var r=list('ratings',function(x){return x.sid===id});if(!r.length)return null;return r.reduce(function(a,x){return a+(+x.v||0)},0)/r.length}
function progress(){
  return (ROOM.checks||[]).map(function(c){
    var o={day:(c.day||0)+1,l:c.l,done:false,d:'open'},f;
    switch(c.kind){
      case 'rocks':{
        var tc=findTool('rocks',function(t){return t.scope===c.scope}),keys=c.gate?((tc&&tc.gate)||GATE_ALL):[];
        var a=list('rocks',function(x){return x.scope===c.scope&&x.status==='approved'});
        o.done=a.length>=c.min&&a.length<=c.max&&a.every(function(x){return gateOK(x,keys)});o.d=a.length+' of '+(c.min===c.max?c.max:c.min+'-'+c.max);break}
      case 'targets':{
        var t=list('targets',function(x){return x.scope===c.scope&&!x.rejected}),ag=t.filter(function(x){return x.agreed&&txt(x.target)}).length;
        o.done=t.length>0&&ag===t.length;o.d=ag+' of '+t.length;break}
      case 'form':{
        f=F(c.id);var n=c.keys.filter(function(k){return txt(f[k])}).length;o.done=n===c.keys.length;o.d=o.done?'set':(n?n+' of '+c.keys.length:'open');break}
      case 'pairs':{
        f=F(c.id);var n2=c.keys.filter(function(k){return txt(f[k+'_v'])}).length;o.done=n2===c.keys.length;o.d=n2+' of '+c.keys.length;break}
      case 'commits':{
        var ready=ROSTER.filter(function(w){return list('commits',function(x){return x.who===w&&x.kind!=='stop'&&(x.plan||c.id)===c.id}).length>=c.min}).length;
        o.done=ROSTER.length>0&&ready===ROSTER.length;o.d=ready+' of '+ROSTER.length;break}
      case 'signoff':{var sn=signedCount(c.id);o.done=ROSTER.length>0&&sn===ROSTER.length;o.d=sn+' of '+ROSTER.length;break}
      case 'metrics':{
        var m=list('metrics',function(x){return x.scope===c.id}),fl=m.filter(function(x){return txt(x.value)}).length;
        o.done=m.length>0&&fl===m.length;o.d=fl+' of '+m.length;break}
      case 'rocktrack':{
        var rt=list('rocks',function(x){return x.scope===c.id}),tr=rt.filter(function(x){return x.track}).length;
        o.done=rt.length>0&&tr===rt.length;o.d=tr+' of '+rt.length;break}
      case 'todosreview':{
        var pr=priorTodos(),dn=pr.filter(function(x){return x.status==='done'||x.status==='missed'}).length;
        o.done=dn===pr.length;o.d=pr.length?dn+' of '+pr.length:'none due';break}
      case 'todosnew':{
        var nt=newTodos();o.done=nt.length>0&&nt.every(function(x){return txt(x.owner)&&x.due&&x.checkin});o.d=nt.length+' added';break}
      case 'ratings':{var rr=list('ratings',function(x){return x.sid===c.id}).length;o.done=ROSTER.length>0&&rr>=ROSTER.length;o.d=rr+' of '+ROSTER.length;break}
      case 'updates':{var up=list('updates',function(x){return txt(x.today)}).length;o.done=ROSTER.length>0&&up>=ROSTER.length;o.d=up+' of '+ROSTER.length;break}
    }
    return o;
  });
}
