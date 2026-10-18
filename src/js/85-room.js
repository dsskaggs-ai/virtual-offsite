/* ============================ room: presence and reactions ============================ */
function buildReactions(box){
  var room=window.__room;if(!room)return;
  [['agree','Agree',''],['q','Question','q'],['push','Push back','p']].forEach(function(r){
    box.append(h('button',{class:'btn sm',type:'button',text:r[1],onclick:function(){room.emit('react',{k:r[0],who:me.who||'Someone'}).catch(function(){})}}));
  });
}
function float(msg){
  var m={agree:['Agree',''],q:['Question','q'],push:['Push back','p']},d=m[msg.k];if(!d)return;
  var box=$('#floaters');var el=h('div',{class:'fl '+d[1],text:d[0]+(msg.who?' · '+String(msg.who).slice(0,24):''),style:'left:'+(8+Math.random()*80)+'%'});
  box.append(el);setTimeout(function(){el.remove()},2700);
}
function renderHere(){
  var box=$('#here');box.replaceChildren();
  var seen={},list_=peersNow.filter(function(p){var k=(p.by||p.peer);if(seen[k])return false;seen[k]=1;return true});
  list_.slice(0,6).forEach(function(p){var w=(p.presence&&p.presence.who)||'?';box.append(h('div',{class:'av'+(p.isMe?' me':''),style:'--h:'+hue(w),title:(w==='?'?'Someone':w)+(p.isMe?' (you)':''),text:initials(w)}))});
  if(list_.length>6)box.append(h('div',{class:'av more',text:'+'+(list_.length-6)}));
}
function renderFollow(){
  var b=$('#followBtn');
  if(!window.__room&&!db)return;
  b.hidden=false;
  if(isAdmin){b.textContent=leading?'Leading the room':'Not leading';b.classList.toggle('on',leading);b.title='When on, the scene you open follows to everyone who is following.'}
  else{b.textContent=follow?'Following presenter':'Rejoin presenter';b.classList.toggle('on',follow)}
}
