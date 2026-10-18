/* ---------- sign-off ---------- */
function Signoff(cfg){
  var grid=h('div',{class:'so'}),cnt=h('span',{class:'meter'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:'Owners sign off on '+cfg.label}),cnt),
    h('p',{class:'help',text:'Each owner states the first action and the next check, then signs off. One person can type for another using the Typing as menu.'}),grid);
  var cards={};
  function card(w){
    var id=cfg.id+'_'+slug(w);
    var a=h('input',{type:'text',id:'so-'+id+'-a',placeholder:'First action'}),c=h('input',{type:'date',id:'so-'+id+'-c','aria-label':'Next check date'});
    var sa=bind(a,'signoff',id,'action',true),sc=bind(c,'signoff',id,'check',true);
    var btn=h('button',{class:'btn',type:'button',onclick:function(){
      var r=S.signoff[id]||{};
      if(!r.ok&&(!txt(r.action)||!r.check)){toast(w+' needs a first action and a next check date before signing off.');return}
      upd('signoff',id,{who:w,sid:cfg.id,ok:!r.ok,ts:Date.now()},true);
    }});
    var el=h('div',{class:'pcard'},h('h3',null,w,h('span',{class:'chip',id:'so-'+id+'-chip'})),h('label',{class:'fld',for:'so-'+id+'-a'},h('span',{text:'First action'}),a),h('label',{class:'fld',for:'so-'+id+'-c'},h('span',{text:'Next check'}),c),btn);
    return {el:el,sync:function(){var r=S.signoff[id]||{};sa();sc();el.classList.toggle('ok',!!r.ok);btn.textContent=r.ok?'Signed off. Undo':'Sign off';btn.className='btn'+(r.ok?'':' pri');var ch=$('#so-'+id+'-chip',el);ch.textContent=r.ok?'Signed':'Open';ch.className='chip '+(r.ok?'ok':'warn')}};
  }
  ROSTER.forEach(function(w){cards[w]=card(w);grid.append(cards[w].el)});
  on(['signoff'],function(){
    var n=0;ROSTER.forEach(function(w){cards[w].sync();var r=S.signoff[cfg.id+'_'+slug(w)];if(r&&r.ok)n++});
    cnt.textContent=n+' of '+ROSTER.length+' signed';cnt.className='meter'+(n===ROSTER.length?' ok':'');
  });
  return box;
}
