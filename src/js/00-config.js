/* ============================ room configuration, injected by the server as window.__HOST ============================ */
var HOST=window.__HOST||{role:'member',rid:'local',who:'',room:{title:'Meeting',tname:'Meeting',look:'field',theme:'light',tz:'America/Chicago',start:'09:00',dates:[],opts:{},sess:1,recurring:false,people:[{n:'Guest',lead:true}],checks:[],days:[{label:'Meeting',items:[{id:'open',title:'Open',mins:30,out:'Start here.',pts:[],tools:[]}]}]}};
var ROOM=HOST.room,RID=HOST.rid||'local',LS='lr.'+RID+'.';
var TZ=ROOM.tz||'America/Chicago';
var ROSTER=(ROOM.people||[]).map(function(p){return p.n});
var COLS=['live','notes','ideas','votes','cards','rocks','targets','commits','decisions','forms','links','signoff','issues','todos','metrics','ratings','updates'];
var GATE_ALL=['owner','finish','leading','source','tradeoff'];
var GATE_LABELS={owner:'at least one owner',finish:'finish line',leading:'leading indicator',source:'data source',tradeoff:'tradeoff'};

/* the agenda: scenes carry minutes, and start and end times are worked out here from the start time */
var DAYS={},DATES={},BREAKS=[],SCENES=[],DAYLIST=[];
function hhmm(m){m=((m%1440)+1440)%1440;var a=Math.floor(m/60),b=m%60;return (a<10?'0':'')+a+':'+(b<10?'0':'')+b}
function dayLong(d){try{return new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'})}catch(e){return d}}
(function(){
  (ROOM.days||[]).forEach(function(d,di){
    var day=di+1,date=(ROOM.dates||[])[di]||'';
    DAYLIST.push(day);DAYS[day]=d.label+(date?' · '+dayLong(date):'');
    if(date)DATES[date]=day;
    var t=mins(ROOM.start||'09:00');
    d.items.forEach(function(it){
      var s=t,e=t+it.mins;t=e;
      if(it.brk){BREAKS.push({day:day,s:hhmm(s),e:hhmm(e),l:it.brk});return}
      var sc={};Object.keys(it).forEach(function(k){sc[k]=it[k]});sc.day=day;sc.s=hhmm(s);sc.e=hhmm(e);sc.pts=sc.pts||[];sc.tools=sc.tools||[];SCENES.push(sc);
    });
  });
})();
var SCENE={};SCENES.forEach(function(s){SCENE[s.id]=s});
function findTool(k,pred){
  for(var i=0;i<SCENES.length;i++)for(var j=0;j<SCENES[i].tools.length;j++){var t=SCENES[i].tools[j];if(t.k===k&&(!pred||pred(t)))return t}
  return null;
}
function allTools(k){var o=[];SCENES.forEach(function(sc){sc.tools.forEach(function(t){if(!k||t.k===k)o.push({t:t,sc:sc})})});return o}
