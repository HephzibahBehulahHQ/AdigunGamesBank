import { THREE, createStage } from '../shared/three-stage.js';
import { campaign } from '../shared/progression.js';
import { createMatch, startMatch, stepMatch, pauseMatch, resumeMatch, selectPlayer } from './engine.js';
import { buildFootballScene } from './scene.js';

const $ = id => document.getElementById(id);
const canvas = $('pitch'), save = campaign('football'), held = new Set();
let match = createMatch(save.unlocked), queued = {}, touchSprint = false, lastTime = null, lastUI = -1, lastTactical = -1, lastEvent = -1, recorded = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stage = createStage({canvas,qualitySelect:$('quality'),status:$('render-status'),position:[0,58,65],target:[0,0,0]});
const visual = buildFootballScene(stage), raycaster = new THREE.Raycaster();
const activePhases = ['live','goal','restart'];
const actionButtons = ['pass','shoot','switch','tackle','sprint','up','down','left','right'];

function clearInput() { held.clear(); queued = {}; touchSprint = false; $('sprint').setAttribute('aria-pressed','false'); }
function focusPitch() { canvas.focus({preventScroll:true}); }
function message(text) { $('message').textContent = text; }
function progressSaved() {
  try {
    const stored = JSON.parse(globalThis.localStorage.getItem('adigun.campaign.v1.football') || 'null');
    return stored?.version === 1 && Number.isInteger(stored.completed) && stored.completed >= save.completed;
  } catch { return false; }
}
function saveFeedback() {
  return progressSaved() ? 'Campaign progress is saved on this device.' : 'Progress is available for this session only. Browser storage could not save it; keep this page open.';
}
function brief() {
  $('level').max = String(save.unlocked); $('level').value = String(match.config.level);
  $('campaign-status').textContent = (save.mastered ? 'Campaign complete · all levels replayable.' : `Level ${save.unlocked.toLocaleString()} unlocked · ${save.completed.toLocaleString()} cleared.`) + (save.completed > 0 ? ` ${saveFeedback()}` : ' Completed levels save here when browser storage is available.');
  $('tier').textContent = match.config.tier; $('difficulty-readout').textContent = match.config.tier;
  $('level-readout').textContent = `${match.config.level.toLocaleString()} / 10,000`;
  $('duration-readout').textContent = `${match.config.matchSeconds} seconds`;
  $('opponent').textContent = match.config.opponent;
  $('objective-heading').textContent = match.config.winMargin === 1 ? 'Win the match.' : `Win by ${match.config.winMargin} goals.`;
  $('objective').textContent = `At full time, score at least ${match.config.requiredGoals} ${match.config.requiredGoals===1?'goal':'goals'} and lead by ${match.config.winMargin} or more. Opponent pressure and decision speed increase through the campaign.`;
  $('player-select').replaceChildren(...match.players.filter(p=>p.team===0).map(p=>{
    const option=document.createElement('option');option.value=p.id;option.textContent=`#${p.number} · ${p.keeper?'Goalkeeper':p.number<=5?'Defender':p.number<=8?'Midfielder':'Forward'}`;return option;
  }));
}
function updateUI(force = false) {
  const whole = Math.floor(match.elapsed), controlled = match.players.find(p=>p.id===match.controlledId);
  if (match.eventNumber !== lastEvent) { message(match.event); lastEvent = match.eventNumber; }
  if(force || match.elapsed-lastTactical>=0.2 || lastTactical<0) {
    lastTactical=match.elapsed;
    $('player-x').textContent=controlled.x.toFixed(1);$('player-y').textContent=controlled.y.toFixed(1);
    $('ball-x').textContent=match.ball.x.toFixed(1);$('ball-y').textContent=match.ball.y.toFixed(1);
  }
  if (!force && whole === lastUI) return;
  lastUI=whole;
  $('home-score').textContent=String(match.score[0]);$('away-score').textContent=String(match.score[1]);
  const remaining=Math.max(0,Math.ceil(match.config.matchSeconds-match.elapsed));
  $('clock').textContent=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
  $('clock').setAttribute('aria-label',`${remaining} seconds remaining`);
  $('controlled').textContent=`#${controlled.number}`;$('player-select').value=controlled.id;
  $('stamina').textContent=`${Math.round(controlled.stamina*100)}%`;
  const owner=match.players.find(p=>p.id===match.ball.owner);
  $('possession').textContent=owner?(owner.team===0?'Adigun XI':match.config.opponent):'Loose ball';
  const zone=controlled.x < -18?'defensive third':controlled.x > 18?'attacking third':'midfield';
  const flank=controlled.y < -12?'far wing':controlled.y > 12?'near wing':'centre';
  $('situation').textContent=`You control #${controlled.number} in the ${flank}, ${zone}. ${owner?`${owner.team===0?'Adigun':'Opponent'} #${owner.number} has the ball.`:'The ball is free.'}`;
  for(const stat of ['shots','passes','saves']) { $(`home-${stat}`).textContent=String(match.stats[stat][0]);$(`away-${stat}`).textContent=String(match.stats[stat][1]); }
  const playing=activePhases.includes(match.phase), paused=match.phase==='paused', finished=match.phase==='fulltime';
  $('start').disabled=match.phase!=='ready';$('pause').disabled=!playing&&!paused;$('pause').textContent=paused?'Resume · Esc':'Pause · Esc';
  $('load-level').disabled=playing;$('level').disabled=playing;
  actionButtons.forEach(id=>$(id).disabled=match.phase!=='live');
  $('match-overlay').hidden=playing;
  if (paused) { $('overlay-title').textContent='Match paused';$('overlay-copy').textContent='Press Resume or Escape when you are ready.'; }
  if (match.phase==='ready') { $('overlay-title').textContent='Your match starts here.';$('overlay-copy').textContent='You attack right. Press Kick off, then build your first chance.'; }
  if (finished) {
    if(!recorded) { if(match.qualified) save.complete(match.config.level);recorded=true;brief();$('player-select').value=match.controlledId; }
    $('overlay-title').textContent=match.qualified?'Objective achieved':match.winner==='draw'?'Full time · Draw':match.winner==='home'?'Win · Target not met':'Full time · Defeat';
    $('overlay-copy').textContent=`Adigun XI ${match.score[0]} – ${match.score[1]} ${match.config.opponent}. ${match.qualified?saveFeedback():'Restart to try this level again.'}`;
  }
  $('next').hidden=!(finished&&match.qualified&&match.config.level<10000&&save.unlocked>match.config.level);
}
function reset(level=match.config.level) { clearInput();match=createMatch(level);lastTime=null;lastUI=-1;lastTactical=-1;lastEvent=-1;recorded=false;brief();updateUI(true);visual.update(match,0,reducedMotion.matches);stage.render(); }
function kickOff() { if(startMatch(match)) { lastTime=null;updateUI(true);focusPitch(); } }
function togglePause() {
  if(match.phase==='paused') resumeMatch(match);else pauseMatch(match);
  clearInput();lastTime=null;updateUI(true);focusPitch();
}
$('start').addEventListener('click',kickOff);
$('pause').addEventListener('click',togglePause);
$('restart').addEventListener('click',()=>{reset();focusPitch();});
$('next').addEventListener('click',()=>{reset(Math.min(save.unlocked,match.config.level+1));focusPitch();});
$('load-level').addEventListener('click',()=>{
  const level=Number($('level').value);
  if(!Number.isInteger(level)||level<1||level>save.unlocked) { message(`Choose an unlocked level between 1 and ${save.unlocked}.`);return; }
  reset(level);
});
$('player-select').addEventListener('change',()=>{selectPlayer(match,$('player-select').value);updateUI(true);focusPitch();});
for(const action of ['pass','shoot','switch','tackle']) $(action).addEventListener('click',()=>{if(match.phase==='live'){queued[action]=true;focusPitch();}});
$('sprint').addEventListener('click',()=>{touchSprint=!touchSprint;$('sprint').setAttribute('aria-pressed',String(touchSprint));focusPitch();});
for(const [id,key] of [['up','w'],['down','s'],['left','a'],['right','d']]) {
  const button=$(id);
  button.addEventListener('pointerdown',event=>{if(match.phase!=='live')return;event.preventDefault();button.setPointerCapture(event.pointerId);held.add(key);focusPitch();});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,()=>held.delete(key));
}
const moveKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','shift']);
canvas.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(moveKeys.has(key)){event.preventDefault();held.add(key);return;}
  if([' ','p','q','e','escape','r','j','k','l','enter'].includes(key)) event.preventDefault();
  if(event.repeat)return;
  if(key==='escape'){togglePause();return;}
  if(key==='r'){reset();return;}
  if(key==='enter'&&match.phase==='ready'){kickOff();return;}
  if(['j','k','l'].includes(key)) $('aim').value=String({j:-1,k:0,l:1}[key]);
  if(match.phase!=='live')return;
  const action={' ':'shoot',p:'pass',q:'switch',e:'tackle'}[key];
  if(action)queued[action]=true;
});
window.addEventListener('keyup',event=>held.delete(event.key.toLowerCase()));
function backgroundPause() { if(activePhases.includes(match.phase)){pauseMatch(match);message('Match paused while this tab is inactive.');}clearInput();lastTime=null;updateUI(true); }
window.addEventListener('blur',backgroundPause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});
canvas.addEventListener('stage-lost',()=>{pauseMatch(match);clearInput();updateUI(true);message('Graphics connection lost. Reload the page to resume from your saved campaign level.');});
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  focusPitch();
  const rect=canvas.getBoundingClientRect();
  const point=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(point,stage.camera);
  const hit=raycaster.intersectObjects(visual.playerRoots,true).find(hit=>{
    let object=hit.object;while(object&&!object.userData.playerId)object=object.parent;
    return object?.userData.playerId?.startsWith('h');
  });
  if(hit){let object=hit.object;while(object&&!object.userData.playerId)object=object.parent;selectPlayer(match,object.userData.playerId);updateUI(true);}
});
function frame(time) {
  const seconds=lastTime===null?0:Math.min(0.25,(time-lastTime)/1000);lastTime=time;
  const down=key=>held.has(key);
  const before=match.phase;
  stepMatch(match,{
    x:Number(down('d')||down('arrowright'))-Number(down('a')||down('arrowleft')),
    y:Number(down('s')||down('arrowdown'))-Number(down('w')||down('arrowup')),
    sprint:touchSprint||down('shift'),aim:Number($('aim').value),...queued
  },seconds);
  if(seconds>0)queued={};
  visual.update(match,activePhases.includes(match.phase)?seconds:0,reducedMotion.matches);
  updateUI(before!==match.phase);stage.render();requestAnimationFrame(frame);
}
brief();updateUI(true);visual.update(match,0,reducedMotion.matches);stage.render();requestAnimationFrame(frame);
window.addEventListener('pagehide',event=>{if(!event.persisted)stage.dispose();});
