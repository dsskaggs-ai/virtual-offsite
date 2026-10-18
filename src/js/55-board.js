/* ---------- gap board ---------- */
function Board(cfg,sc){
  var COLSB=cfg.cols;
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:cfg.title}),h('span',{class:'meter',id:'bc-'+cfg.id})),
    h('p',{class:'help',text:cfg.help||'Add each item, then drag it to a column or use the menu on the card.'}));
  var cols={};
  var board=h('div',{class:'board'});
  COLSB.forEach(function(c){
    var inp=h('input',{type:'text',id:'bd-'+cfg.id+'-'+c.k,placeholder:'Add to '+c.l,'aria-label':'Add to '+c.l});
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){var t=txt(inp.value);if(!t||!needWho())return;addDoc('cards',{scene:cfg.id,col:c.k,text:t,who:me.who});inp.value=''}});
    var body=h('div',{style:'display:flex;flex-direction:column;gap:.45rem'});
    var el=h('div',{class:'col','data-k':c.k},h('h3',null,c.l,h('span',{})),h('div',{class:'def',text:c.d}),inp,body);
    el.addEventListener('dragover',function(e){e.preventDefault();el.classList.add('over')});
    el.addEventListener('dragleave',function(){el.classList.remove('over')});
    el.addEventListener('drop',function(e){e.preventDefault();el.classList.remove('over');var id=e.dataTransfer.getData('text/plain');if(id&&S.cards[id]&&S.cards[id].col!==c.k)upd('cards',id,{col:c.k})});
    cols[c.k]={el:el,body:body,count:el.querySelector('h3 span')};board.append(el);
  });
  box.append(board);
  on(['cards'],function(){
    var items=list('cards',function(x){return x.scene===cfg.id}).sort(byTs);
    $('#bc-'+cfg.id,box).textContent=items.length+' items';
    COLSB.forEach(function(c){
      var mine=items.filter(function(x){return x.col===c.k});
      cols[c.k].count.textContent=mine.length;cols[c.k].body.replaceChildren();
      mine.forEach(function(x){
        var sel=opts(h('select',{'aria-label':'Move to column'}),COLSB.map(function(g){return [g.k,g.l]}),x.col);sel.firstChild.remove();
        sel.value=x.col;sel.addEventListener('change',function(){upd('cards',x.id,{col:sel.value})});
        var card=h('div',{class:'gcard',draggable:'true'},h('p',{text:x.text}),h('div',{class:'ft'},h('span',{text:x.who||''}),sel,h('button',{class:'x','aria-label':'Remove',onclick:function(){delDoc('cards',x.id)},text:'×'})));
        card.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',x.id);e.dataTransfer.effectAllowed='move'});
        cols[c.k].body.append(card);
      });
    });
  });
  return box;
}
