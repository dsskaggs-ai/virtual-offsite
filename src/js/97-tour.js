/* ============================ first-visit tour for the room ============================
   One tour for facilitators and one for participants. Each shows once per browser. The Tutorial button replays it.
   Steps that point at a button the person does not have are dropped (opt:true). */
function roomTourSteps(lead){
  var pane=function(p){return function(){var a=$('#app');if(a&&a.dataset.pane!==p){a.dataset.pane=p;syncPanes()}}};
  var s=[];
  s.push({title:'Welcome to '+(ROOM.title||'the meeting'),body:[
    'This page is the meeting. Everyone has the same page open, and what anyone types shows up for the others within a couple of seconds.',
    lead?'You are the facilitator. This tour takes about a minute and covers what you can do that others cannot.':'This tour takes about a minute. You can replay it any time with the Tutorial button.']});
  s.push({sel:'#agenda',before:pane('agenda'),title:'The agenda',body:[
    'Each row is an agenda item with its start and end time. Click one to open it.',
    lead?'When Leading the room is on, the item you open moves everyone who is following you.':'The item that is live shows a Live tag.',
    'Under the agenda, What must leave the room ticks off as the room completes each required output. It is the quickest way to see what is still open.']});
  s.push({sel:'#stage',before:pane('stage'),title:'The stage',body:[
    'The highlighted card at the top is the one output this item must produce. Below it are short talking points and the working tools for the item.',
    '- Type straight into any field. It saves as you type.',
    '- Notes at the bottom of an item are for anything that does not fit a tool.',
    '- Hover a long text box to read everything typed in it.']});
  s.push({sel:'#whoWrap',opt:true,title:'Typing as',body:[
    'Your name is already picked. If you are scribing for someone else in the room, change it before you type so their entries carry their name.',
    'Agree, Question, and Push back next to it float up on everyone\'s screen without interrupting whoever is talking.']});
  if(lead){
    s.push({sel:'#followBtn',opt:true,title:'Leading the room',body:[
      'When this is on, the item you open is the item everyone sees. Turn it off to look ahead or back without moving the room.']});
  }else{
    s.push({sel:'#followBtn',opt:true,title:'Following the presenter',body:[
      'While this is on, your screen goes where the facilitator goes. Open any other item and it turns off so you can read ahead. Click it again to rejoin.']});
  }
  s.push({sel:'#logRail',before:pane('log'),title:'The decision log',body:[
    'When the room decides something, log it here with an owner, a check-in date, and a due date. Tick it done when it is finished.']});
  s.push({sel:'#themeBtn',before:pane('stage'),title:'Make it comfortable',body:[
    '- Theme switches light, dark, and automatic, for you only.',
    '- Large text helps when the page is on a shared screen.',
    '- Focus hides the side panels so the item fills the screen.',
    'Tutorial, right beside them, replays this tour any time.']});
  s.push({sel:'#saveBtn',opt:true,title:'Save a record',body:[
    'Save record gives you a file of everything entered in the room: decisions, numbers, commitments, and notes. Anyone can save one at any time.']});
  if(lead){
    s.push({sel:'#shareBtn',opt:true,title:ROOM.recurring?'Room code and next session':'Room code',body:[
      'Room code copies the link and code for anyone who was not invited. They join by typing their name and are always participants. Personal links from the organizer are better because they show who is who.'].concat(ROOM.recurring?[
      'When the meeting is over, click Next session twice. The record is saved and the room is ready for the next one.',
      '- Open issues and unfinished to-dos carry over.',
      '- Scorecard actuals move to Last.',
      '- Everything else starts clear.']:[])});
  }
  return s;
}
function startRoomTour(force){
  var lead=HOST.role==='lead';
  return Tour.start({key:lead?'lead':'member',force:!!force,steps:roomTourSteps(lead),onEnd:function(){var a=$('#app');if(a&&a.dataset.pane!=='stage'){a.dataset.pane='stage';syncPanes()}}});
}
