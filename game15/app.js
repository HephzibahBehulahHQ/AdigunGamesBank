import { validLevel } from '../shared/progression.js';
import { openTacticsCampaign } from './save.js';
import { objectiveLabel, createTapTracker } from './interaction.js';
import { createStage } from '../shared/three-stage.js';
import { buildTacticsScene } from './scene.js';
import { newGame, legalMoves, attackTargets, selectUnit, playerMove, playerAttack, playerGuard, endPlayerTurn, collectCore, runAIPhase, sectorName, living, unitAt, isCover, distance } from './engine.js';

const $=id=>document.getElementById(id), canvas=$('board'), save=openTacticsCampaign(), progress=save.progress;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let game=newGame(progress.unlocked),started=false,paused=false,recorded=false,focus={x:0,y:1};
let stage=null,view=null,aiTimer=null,effectTimer=null,drawRequest=null,lastAnnouncement=-1,graphicsAvailable=true;
const unitButtons=new Map(),cells=new Map(),opponents=new Map();
const selected=()=>game.units.find(u=>u.id===game.selected)||null;
const actionable=()=>started&&!paused&&game.phase==='player'&&!game.winner;
function message(text){$('message').textContent=text;}
const storedProgress=save.saved, campaignText=save.description;
function draw(){
  drawRequest=null;if(!view||!graphicsAvailable)return;
  const u=selected(),moves=actionable()&&u?legalMoves(game,u):[],targets=actionable()&&u?attackTargets(game,u):[];
  view.update(game,focus,moves,targets);stage.render();
  if(view.hasEffect()){clearTimeout(effectTimer);effectTimer=setTimeout(requestDraw,240);}
}
function requestDraw(){if(drawRequest===null)drawRequest=requestAnimationFrame(draw);}
function stopTimers(){clearTimeout(aiTimer);aiTimer=null;clearTimeout(effectTimer);}
function scheduleAI(){
  if(!started||paused||document.hidden||game.phase!=='ai'||game.winner){clearTimeout(aiTimer);aiTimer=null;return;}
  if(aiTimer!==null)return;
  aiTimer=setTimeout(()=>{aiTimer=null;if(paused||document.hidden||game.phase!=='ai')return;runAIPhase(game);render();},motion.matches?0:340);
}
function options(select,items,empty){
  const old=select.value;select.replaceChildren();
  for(const item of items.length?items:[{value:'',text:empty}]){const option=document.createElement('option');option.value=item.value;option.textContent=item.text;select.append(option);}
  if(items.some(item=>item.value===old))select.value=old;
}
function describeCell(x,y){
  const occupant=unitAt(game,x,y);
  const marker=objectiveLabel(game,x,y),objective=marker==='LINK'?' Uplink terminal.':marker==='CORE'?' Data core; Collect uses an activation.':'';
  if(occupant)return `${sectorName(x,y)}: ${occupant.name} (${occupant.id}), ${occupant.team==='player'?'your drone':'opponent'}, ${occupant.hp} of ${occupant.maxHp} hull${occupant.guarded?', guarding':''}${occupant.acted?', activated':''}.${objective}`;
  if(isCover(game,x,y))return `${sectorName(x,y)}: solid barrier. Blocks movement and sight.`;
  if(game.config.mode==='uplink'&&x===game.config.relay.x&&y===game.config.relay.y)return `${sectorName(x,y)}: uplink terminal.`;
  if(game.config.mode==='retrieve'&&!game.carrier&&x===game.core.x&&y===game.core.y)return `${sectorName(x,y)}: data core. Move here, then Collect.`;
  return `${sectorName(x,y)}: clear sector.`;
}
function render(){
  if(game.winner==='player'&&!recorded){progress.complete(game.config.level);recorded=true;}
  const u=selected(),active=actionable(),moves=active&&u?legalMoves(game,u):[],targets=active&&u?attackTargets(game,u):[];
  $('level-readout').textContent=`Mission ${game.config.level.toLocaleString()} / 10,000`;
  $('tier').textContent=game.config.tier;$('round').textContent=`${game.round} / ${game.config.roundLimit}`;
  $('phase').textContent=!started?'Awaiting command':paused?'Paused':game.phase==='player'?'Your turn':game.phase==='ai'?'Opponent turn':game.winner==='player'?'Mission cleared':'Mission lost';
  $('squad-count').textContent=living(game,'player').length;$('enemy-count').textContent=living(game,'ai').length;
  $('mission-title').textContent=game.config.title;$('objective').textContent=game.config.objective;
  $('mission-progress').textContent=game.config.mode==='eliminate'?`${3-living(game,'ai').length} of 3 opposing drones disabled.`:game.config.mode==='uplink'?`Uplink at ${sectorName(game.config.relay.x,game.config.relay.y)}. Uncontested control: your squad ${game.hold} / ${game.config.holdRounds}; opposition ${game.enemyHold} / ${game.config.holdRounds}.`:
    game.carrier?`Core carrier: ${game.units.find(v=>v.id===game.carrier).name}. Extract at column 1.`:`Core location: ${sectorName(game.core.x,game.core.y)}. Collecting uses one activation.`;
  $('campaign-status').textContent=campaignText();$('level').max=String(progress.unlocked);$('level').value=String(game.config.level);
  $('load-level').disabled=$('level').disabled=started&&!game.winner;
  $('start').disabled=started;$('pause').disabled=!started||!!game.winner;$('pause').textContent=paused?'Resume · Esc':'Pause · Esc';
  $('next').hidden=!(game.winner==='player'&&game.config.level<progress.unlocked);
  $('selected-readout').textContent=u?`${u.name} · ${u.hp}/${u.maxHp} hull · move ${u.move} · range ${u.range}${u.id===game.carrier?' · carrying the data core':''}.`:'Select a ready drone.';
  for(const unit of game.units){
    if(unit.team==='player'){
      const button=unitButtons.get(unit.id);button.disabled=!active||unit.acted||unit.hp===0;
      button.setAttribute('aria-pressed',String(unit.id===game.selected));
      button.firstElementChild.textContent=`${unit.id} · ${unit.name}`;
      button.lastElementChild.textContent=unit.hp?`${unit.hp}/${unit.maxHp} hull · ${unit.acted?'ACTED':unit.guarded?'GUARDED':'READY'}`:'DISABLED';
    }else{
      const item=opponents.get(unit.id);item.firstElementChild.textContent=`${unit.id} · ${unit.name}`;
      item.lastElementChild.textContent=unit.hp?` · ${unit.hp}/${unit.maxHp} hull · ${sectorName(unit.x,unit.y)}${unit.guarded?' · guarded':''}`:' · disabled';
    }
  }
  options($('move-to'),moves.sort((a,b)=>a.y-b.y||a.x-b.x).map(p=>({value:`${p.x},${p.y}`,text:`${sectorName(p.x,p.y)} · column ${p.x+1}, row ${String.fromCharCode(65+p.y)}`})),'Select a ready drone');
  options($('target-select'),targets.map(v=>({value:v.id,text:`${v.id} · ${v.name} · ${v.hp} hull${v.guarded?' · guarded':''}`})),'No visible target in range');
  $('move').disabled=$('move-to').disabled=!active||!moves.length;$('attack').disabled=$('target-select').disabled=!active||!targets.length;
  $('guard').disabled=!active||!u;$('end-turn').disabled=!active;
  $('collect').hidden=game.config.mode!=='retrieve';$('collect').disabled=!active||!u||!!game.carrier||u.x!==game.core.x||u.y!==game.core.y;
  $('legal-summary').textContent=u?`${moves.length} legal destinations · ${targets.length} visible targets. Guard absorbs one incoming pulse. End turn guards every remaining ready drone.`:'Select a ready drone. Your squad and command map provide complete keyboard, mouse and touch actions.';
  const moveKeys=new Set(moves.map(p=>`${p.x},${p.y}`)),targetKeys=new Set(targets.map(p=>`${p.x},${p.y}`));
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const key=`${x},${y}`,cell=cells.get(key),occupant=unitAt(game,x,y),cover=isCover(game,x,y);
    cell.className=[cover?'cover':'',occupant?.team==='player'?'friendly':occupant?'opponent':'',moveKeys.has(key)?'move-option':'',targetKeys.has(key)?'target-option':'',occupant?.id===game.selected?'selected':'',focus.x===x&&focus.y===y?'cursor':''].filter(Boolean).join(' ');
    const objective=objectiveLabel(game,x,y)||'·';
    cell.firstElementChild.textContent=sectorName(x,y);cell.lastElementChild.textContent=cover?'WALL':occupant?`${occupant.id} ${occupant.hp}`:objective;
    cell.setAttribute('aria-label',`${cell.firstElementChild.textContent} ${cell.lastElementChild.textContent}. ${describeCell(x,y)}`+(moveKeys.has(key)?' Legal move destination.':'')+(targetKeys.has(key)?' Attack available.':''));
    cell.setAttribute('aria-selected',String(focus.x===x&&focus.y===y));cell.setAttribute('aria-disabled',String(!active||cover));cell.tabIndex=focus.x===x&&focus.y===y?0:-1;
  }
  $('sector-readout').textContent=describeCell(focus.x,focus.y);
  $('feed').replaceChildren(...game.log.slice(0,9).map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
  const overlay=$('overlay');overlay.hidden=graphicsAvailable&&started&&!paused&&!game.winner;
  if(!graphicsAvailable){$('overlay-kicker').textContent='ACCESSIBLE COMMAND MODE';$('overlay-title').textContent='3D rendering unavailable.';$('overlay-copy').textContent='The labelled sector map and squad commands provide every tactical action. Use a WebGL 2 browser to restore the 3D view.';}
  else if(!started){$('overlay-kicker').textContent='SQUAD READY';$('overlay-title').textContent=game.config.title;$('overlay-copy').textContent='Begin the mission. Select a drone, then move, fire or guard. The command map offers the same actions as the 3D scene.';}
  else if(paused){$('overlay-kicker').textContent='TACTICAL PAUSE';$('overlay-title').textContent='Take your time.';$('overlay-copy').textContent='Resume when you are ready. The opponent will not act while paused.';}
  else if(game.winner){$('overlay-kicker').textContent=game.winner==='player'?'MISSION CLEARED':'MISSION LOST';$('overlay-title').textContent=game.winner==='player'?'Sector objective achieved.':'Reassess. Reposition. Retry.';$('overlay-copy').textContent=game.log[0]+(game.winner==='player'?` ${storedProgress()?'Campaign progress is saved on this device.':'Session-only progress: browser storage could not save it. Keep this page open.'}`:' Earlier campaign progress is preserved.');}
  if(started&&lastAnnouncement!==game.event){message(game.log[0]);lastAnnouncement=game.event;}
  requestDraw();scheduleAI();
}
function focusBoard(){(graphicsAvailable?canvas:cells.get(`${focus.x},${focus.y}`)).focus({preventScroll:true});}
function act(operation){if(!actionable())return false;const fromMap=$('command-grid').contains(document.activeElement);const accepted=operation();if(accepted){render();if(fromMap)cells.get(`${focus.x},${focus.y}`).focus({preventScroll:true});else focusBoard();}else message('That action is unavailable. Choose a ready drone and a legal destination or visible target.');return accepted;}
function select(id){if(!actionable()||!selectUnit(game,id))return false;const unit=selected();focus={x:unit.x,y:unit.y};render();message(`${unit.name} selected. Move ${unit.move} sectors or fire within range ${unit.range}.`);return true;}
function activate(x,y){
  if(!actionable())return;focus={x,y};const unit=unitAt(game,x,y);
  if(unit?.team==='player'){if(!select(unit.id))message(`${unit.name} has already acted.`);return;}
  const u=selected();if(!u){message('Select a ready drone first.');render();return;}
  if(unit?.team==='ai'){act(()=>playerAttack(game,u.id,unit.id));return;}
  act(()=>playerMove(game,u.id,x,y));
}
function start(){if(started)return;started=true;paused=false;lastAnnouncement=-1;render();focusBoard();}
function loadMission(level,begin=false){stopTimers();game=newGame(level);started=begin;paused=false;recorded=false;focus={x:game.units[0].x,y:game.units[0].y};lastAnnouncement=-1;render();message(begin?game.log[0]:'Select Begin to deploy your squad.');}
function togglePause(){if(!started||game.winner)return;paused=!paused;if(paused)stopTimers();render();message(paused?'Mission paused. Opponent actions are suspended.':'Mission resumed.');}
for(const unit of game.units){
  if(unit.team==='player'){const button=document.createElement('button');button.id=`unit-${unit.id}`;button.type='button';button.append(document.createElement('strong'),document.createTextNode(' '),document.createElement('small'));button.addEventListener('click',()=>select(unit.id));unitButtons.set(unit.id,button);$('squad').append(button);}
  else{const item=document.createElement('li');item.id=`enemy-${unit.id}`;item.append(document.createElement('strong'),document.createElement('span'));opponents.set(unit.id,item);$('opponents').append(item);}
}
for(let y=0;y<8;y++){
  const row=document.createElement('div');row.setAttribute('role','row');
  for(let x=0;x<8;x++){
    const cell=document.createElement('button');cell.id=`sector-${x}-${y}`;cell.type='button';cell.setAttribute('role','gridcell');cell.append(document.createElement('b'),document.createTextNode(' '),document.createElement('span'));
    cell.addEventListener('click',()=>activate(x,y));cell.addEventListener('focus',()=>{if(focus.x!==x||focus.y!==y){focus={x,y};render();}});cells.set(`${x},${y}`,cell);row.append(cell);
  }$('command-grid').append(row);
}
function keyControl(event){
  if(event.altKey||event.ctrlKey||event.metaKey)return;const key=event.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
    event.preventDefault();focus.x=Math.max(0,Math.min(7,focus.x+(key==='arrowright'?1:key==='arrowleft'?-1:0)));focus.y=Math.max(0,Math.min(7,focus.y+(key==='arrowdown'?1:key==='arrowup'?-1:0)));render();
    if(event.currentTarget===$('command-grid'))cells.get(`${focus.x},${focus.y}`).focus({preventScroll:true});return;
  }
  const commands={enter:()=>started?activate(focus.x,focus.y):start(),'1':()=>select('P1'),'2':()=>select('P2'),'3':()=>select('P3'),g:()=>selected()&&act(()=>playerGuard(game,selected().id)),c:()=>selected()&&act(()=>collectCore(game,selected().id)),e:()=>act(()=>endPlayerTurn(game)),escape:togglePause,r:()=>loadMission(game.config.level,true),m:()=>{$('move-to').focus();},f:()=>{$('target-select').focus();}};
  if(commands[key]){event.preventDefault();commands[key]();}
}
canvas.addEventListener('keydown',keyControl);$('command-grid').addEventListener('keydown',keyControl);
const taps=createTapTracker((x,y)=>{if(!view||!graphicsAvailable)return;const p=view.pick(x,y,canvas.getBoundingClientRect());if(p)activate(p.x,p.y);});
canvas.addEventListener('pointerdown',taps.down);canvas.addEventListener('pointerup',taps.up);canvas.addEventListener('pointercancel',taps.cancel);
$('start').addEventListener('click',start);$('restart').addEventListener('click',()=>loadMission(game.config.level,true));$('pause').addEventListener('click',togglePause);
$('next').addEventListener('click',()=>{if(game.winner==='player'&&game.config.level<progress.unlocked)loadMission(game.config.level+1);});
$('load-level').addEventListener('click',()=>{const value=Number($('level').value);if(!Number.isInteger(value)||value<1||value>progress.unlocked){message(`Choose an unlocked mission from 1 to ${progress.unlocked}.`);return;}loadMission(validLevel(value));});
$('move').addEventListener('click',()=>{const u=selected(),coordinates=$('move-to').value.split(',').map(Number);if(u&&coordinates.length===2)act(()=>playerMove(game,u.id,...coordinates));});
$('attack').addEventListener('click',()=>{const u=selected();if(u)act(()=>playerAttack(game,u.id,$('target-select').value));});
$('guard').addEventListener('click',()=>{const u=selected();if(u)act(()=>playerGuard(game,u.id));});
$('collect').addEventListener('click',()=>{const u=selected();if(u)act(()=>collectCore(game,u.id));});
$('end-turn').addEventListener('click',()=>act(()=>endPlayerTurn(game)));
function graphicsFailure(){graphicsAvailable=false;canvas.style.opacity='0';$('quality').disabled=$('camera').disabled=true;$('map-details').open=true;if(document.activeElement===canvas)focusBoard();canvas.tabIndex=-1;canvas.setAttribute('aria-hidden','true');render();message('3D graphics are unavailable. The accessible sector map and labelled commands remain fully playable.');}
try{stage=createStage({canvas,qualitySelect:$('quality'),status:$('render-status'),position:[18,22,24]});view=buildTacticsScene(stage,game,()=>motion.matches);}catch{graphicsFailure();}
$('quality').addEventListener('change',requestDraw);$('camera').addEventListener('change',()=>{view?.cameraView($('camera').value);requestDraw();});
canvas.addEventListener('stage-lost',graphicsFailure);
const resizeObserver=new ResizeObserver(requestDraw);resizeObserver.observe(canvas);motion.addEventListener('change',requestDraw);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(aiTimer);aiTimer=null;}else{requestDraw();scheduleAI();}});
window.addEventListener('pagehide',event=>{stopTimers();if(drawRequest!==null)cancelAnimationFrame(drawRequest);drawRequest=null;if(!event.persisted){resizeObserver.disconnect();stage?.dispose();}});
window.addEventListener('pageshow',event=>{if(event.persisted){requestDraw();scheduleAI();}});
render();
