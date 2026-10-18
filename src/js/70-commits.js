/* ---------- individual commitments ---------- */
function Commits(cfg){
  var MAXD=optDate(cfg.maxDue),MIN=cfg.min||3,MAX=cfg.max||5,PLAN=cfg.id||'plan';
  var who=rosterSel('cm-who'),text=h('input',{type:'text',id:'cm-text',placeholder:'The priority, or the item to stop, defer, or delegate'});
  var kind=opts(h('select',{id:'cm-kind','aria-label':'Type'}),[['p','Priority'],['stop','Stop, defer, or delegate']],'p');kind.firstChild.remove();
  var kpi=h('input',{type:'text',id:'cm-kpi',placeholder:'Daily or weekly KPI'}),sup=h('input',{type:'text',id:'cm-sup',placeholder:'Support needed from'});
  var ci=h('input',{type:'date',id:'cm-ci','aria-label':'Check-in date'}),du=h('input',{type:'date',id:'cm-du','aria-label':'Due date'});du.value=MAXD||'';
  var err=h('div',{class:'err'});
  who.firstChild.textContent='Me';
  function post(){
    var t=txt(text.value);if(!t){err.textContent='Write the commitment first.';return}
    var w=who.value||me.who;if(!w){err.textContent='Pick whose commitment this is.';return}
    var k=kind.value;
    if(k==='p'&&(!ci.value||!du.value)){err.textContent='A priority needs a check-in date and a due date.';return}
    if(MAXD&&du.value&&du.value>MAXD){err.textContent='Due dates run no later than '+fmtDate(MAXD)+'.';return}
    if(!needWho())return;err.textContent='';
    addDoc('commits',{plan:PLAN,who:w,kind:k,text:t,kpi:txt(kpi.value),support:txt(sup.value),checkin:ci.value,due:du.value,by:me.who});
    text.value='';kpi.value='';sup.value='';text.focus();
  }
  text.addEventListener('keydown',function(e){if(e.key==='Enter')post()});
  var grid=h('div',{class:'pgrid'});
  var cnt=h('span',{class:'meter'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title||'Individual plans'}),cnt),
    h('div',{class:'composer'},
      h('div',{class:'crow'},h('label',{class:'fld',for:'cm-who',style:'flex:0 0 9rem'},h('span',{text:'Whose'}),who),h('label',{class:'fld',for:'cm-kind',style:'flex:0 0 13rem'},h('span',{text:'Type'}),kind),text),
      h('div',{class:'crow'},kpi,sup,h('label',{class:'fld',for:'cm-ci',style:'flex:0 0 9rem'},h('span',{text:'Check-in'}),ci),h('label',{class:'fld',for:'cm-du',style:'flex:0 0 9rem'},h('span',{text:'Due'}),du),h('button',{class:'btn pri',type:'button',text:'Add',onclick:post})),err),grid);
  on(['commits'],function(){
    var all=list('commits',function(c){return (c.plan||PLAN)===PLAN}).sort(byTs),ready=0;
    grid.replaceChildren();
    ROSTER.forEach(function(w){
      var mine=all.filter(function(c){return c.who===w}),pri=mine.filter(function(c){return c.kind!=='stop'}),ok=pri.length>=MIN&&pri.length<=MAX;if(pri.length>=MIN)ready++;
      grid.append(h('div',{class:'pcard'},h('h3',null,w,h('span',{class:'chip '+(ok?'ok':(pri.length>MAX?'bad':'warn')),text:pri.length+' of '+MIN+'-'+MAX})),
        mine.length?mine.map(function(c){
          return h('div',{class:'citem'+(c.kind==='stop'?' stop':'')},h('p',{text:(c.kind==='stop'?'Stop: ':'')+c.text}),
            h('div',{class:'m'},c.kpi?h('span',{text:'KPI '+c.kpi}):'',c.support?h('span',{text:'Needs '+c.support}):'',c.checkin?h('span',{text:'Check-in '+fmtDate(c.checkin)}):'',c.due?h('span',{text:'Due '+fmtDate(c.due)}):'',h('button',{class:'x','aria-label':'Remove',onclick:function(){delDoc('commits',c.id)},text:'×'})));
        }):h('div',{class:'muted',style:'font-size:.8rem',text:'Nothing yet.'})));
    });
    cnt.textContent=ready+' of '+ROSTER.length+' have '+MIN+' or more';cnt.className='meter'+(ready===ROSTER.length?' ok':'');
  });
  return box;
}
