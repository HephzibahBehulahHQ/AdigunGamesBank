import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from './campaign.js';
import { validCampaignSave } from '../shared/progression.js';
import { describeMapCell } from './map.js';
import { createGame, startGame, stepGame, commandMove, commandWait, pauseGame, resumeGame, hazardPosition, nearby } from './engine.js';

const $ = id => document.getElementById(id), canvas = $('volt-canvas'), progress = createCampaign(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set(), directions = { north: {x:0,z:-1}, east: {x:1,z:0}, south: {x:0,z:1}, west: {x:-1,z:0} };
let state, scene = null, recorded = false, dirty = true, lastFrame = 0, lastUI = 0, pointerDirection = null, pointerStarted = 0, coreRows = [], mapCells = [];
let mode = 'continuous'; try { if (localStorage.getItem('adigun.volt-dodge.controls.v1') === 'step') mode = 'step'; } catch { /* Commands do not depend on storage. */ }
$('control-mode').value = mode;
const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
function confirmedSave() { try { const saved = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null'); return validCampaignSave(saved) && saved.completed >= progress.completed; } catch { return false; } }
function clearInput() { keys.clear(); pointerDirection = null; for (const name of Object.keys(directions)) $(name).classList.remove('pressed'); }
function announce() { text($('command-status'), `Column ${state.player.x.toFixed(2)}, row ${state.player.z.toFixed(2)}. ${state.collected.filter(Boolean).length} of ${state.config.cores.length} cores. ${state.shields} shields. ${(state.config.timeLimit - state.time).toFixed(1)} seconds left.`); }
function command(action, describe = false) { action(); sync(); lastFrame = 0; if (describe) announce(); }
function buildMap() {
  const header = document.createElement('tr'), corner = document.createElement('th'); corner.scope = 'col'; corner.textContent = 'r/c'; header.append(corner);
  for (let x = 0; x < state.config.size; x++) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = String(x); header.append(th); }
  $('map-head').replaceChildren(header); $('map-body').replaceChildren(); mapCells = [];
  for (let z = 0; z < state.config.size; z++) {
    const tr = document.createElement('tr'), row = document.createElement('th'); row.scope = 'row'; row.textContent = String(z); tr.append(row);
    for (let x = 0; x < state.config.size; x++) {
      const td = document.createElement('td'), icon = document.createElement('span'), description = document.createElement('span'); icon.setAttribute('aria-hidden','true'); description.className='sr-only'; td.append(icon,description); tr.append(td); mapCells.push({x,z,td,icon,description});
    }
    $('map-body').append(tr);
  }
}
function buildControls() {
  text($('brief'), state.config.brief); $('core-list').replaceChildren();
  coreRows = state.config.cores.map(core => {
    const li = document.createElement('li'); li.dataset.letter = String.fromCharCode(65 + core.id);
    const content = document.createElement('div'), title = document.createElement('strong'), coordinate = document.createElement('small'), status = document.createElement('span');
    title.textContent = core.name; coordinate.textContent = `Column ${core.x} · Row ${core.z}`; content.append(title,coordinate,status); li.append(content); $('core-list').append(li); return {li,status};
  });
  text($('exit-position'), `Column ${state.config.exit.x} · Row ${state.config.exit.z}`);
  text($('hazard-count'), `${state.config.hazards.length} active spark junctions / patrols.`); buildMap();
}
function sync() {
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  const labels = { ready:'READY',running: mode==='step'?'STEP PLAY':'ON MISSION',paused:'PAUSED',won:'SECTOR CLEAR',lost:'MISSION FAILED' };
  text($('phase'),labels[state.phase]); $('phase').dataset.phase=state.phase; $('phase').dataset.mode=mode;
  text($('tier'),state.config.tier); text($('unlock-status'),`Sector ${progress.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`);
  $('level').max=String(progress.unlocked); $('level').disabled=['running','paused'].includes(state.phase); $('load-level').disabled=$('level').disabled;
  $('control-mode').disabled=state.phase==='running'; $('start').disabled=state.phase!=='ready'; $('pause').disabled=!['running','paused'].includes(state.phase); text($('pause'),state.phase==='paused'?'Resume mission':'Pause mission');
  $('next-level').hidden=state.phase!=='won'||state.config.level>=LEVEL_COUNT;
  for(const name of Object.keys(directions))$(name).disabled=state.phase!=='running'; $('wait').disabled=state.phase!=='running'||mode!=='step';
  text($('mode-help'),mode==='step'?'Each direction advances one unit with the same collision engine; time is frozen between commands. Wait advances 0.5 s.':'Focus the arena for WASD / arrows, or hold a direction button. A short tap nudges the rover. Pause to switch modes.');
  coreRows.forEach((row,index)=>{row.li.classList.toggle('collected',state.collected[index]);text(row.status,state.collected[index]?'Recovered':'Awaiting pickup');});
  const remaining=state.collected.filter(value=>!value).length;
  text($('exit-status'),state.phase==='won'?'Exit reached. Sector complete.':remaining?`Locked · ${remaining} core${remaining===1?'':'s'} remaining`:'Open · bring the rover to the gate.'); $('exit-status').classList.toggle('open',remaining===0);
  text($('message'),state.message); $('message').className=`message${state.phase==='lost'?' error':state.phase==='won'?' success':''}`;
  text($('save-status'),!progress.completed?'Cleared sectors save on this device.':`${progress.completed.toLocaleString()} sectors cleared. ${confirmedSave()?'Progress saved on this device.':'Progress is available for this session only; browser storage could not confirm a save.'}`);
  if(state.phase!=='running')clearInput(); telemetry(); updateMap(); dirty=true;
}
function telemetry() {
  text($('core-count'),`${state.collected.filter(Boolean).length} / ${state.config.cores.length}`); text($('shields'),`${state.shields} / ${state.config.shields}`);
  text($('time-left'),`${Math.max(0,state.config.timeLimit-state.time).toFixed(1)} s`); text($('position'),`${state.player.x.toFixed(2)}, ${state.player.z.toFixed(2)}`);
  $('position').dataset.x=String(state.player.x); $('position').dataset.z=String(state.player.z);
  text($('nearby'),`From the nearest cell: ${nearby(state).map(route=>`${route.name} ${route.blocked?'wall':'open'}`).join(' · ')}.`);
}
function updateMap() {
  const sparks=state.config.hazards.map(hazard=>hazardPosition(hazard,state.time));
  for(const cell of mapCells) {
    const view=describeMapCell(state,cell.x,cell.z,sparks);
    cell.td.className=view.classes.join(' ');text(cell.icon,view.symbol);text(cell.description,view.description);
  }
  text($('spark-positions'),sparks.map((spark,index)=>`Spark ${index+1}: column ${spark.x.toFixed(2)}, row ${spark.z.toFixed(2)}`).join(' · '));
}
function loadLevel(value) {
  const level=Number(value);
  if(!Number.isInteger(level)||level<1||level>progress.unlocked){$('level').value=String(state?.config.level||1);if(state){state.message='Clear the current unlocked sector before loading a later one.';sync();}return;}
  state=createGame(level);recorded=false;clearInput();lastFrame=0;$('level').value=String(level);buildControls();scene?.rebuild(state.config);sync();
}
function retry(){loadLevel(state.config.level);}
function togglePause(){command(()=>state.phase==='paused'?resumeGame(state):pauseGame(state));}
$('start').addEventListener('click',()=>{command(()=>startGame(state));if(mode==='continuous')canvas.focus({preventScroll:true});});
$('pause').addEventListener('click',togglePause);$('retry').addEventListener('click',retry);$('load-level').addEventListener('click',()=>loadLevel($('level').value));$('next-level').addEventListener('click',()=>loadLevel(state.config.level+1));
$('control-mode').addEventListener('change',()=>{mode=$('control-mode').value;clearInput();try{localStorage.setItem('adigun.volt-dodge.controls.v1',mode);}catch{}sync();lastFrame=0;});
for(const name of Object.keys(directions)){
  const button=$(name);
  button.addEventListener('pointerdown',event=>{if(mode!=='continuous'||state.phase!=='running')return;pointerDirection=name;pointerStarted=state.time;button.classList.add('pressed');button.setPointerCapture(event.pointerId);});
  button.addEventListener('pointerup',()=>{if(pointerDirection===name){const short=state.time-pointerStarted<.08;pointerDirection=null;button.classList.remove('pressed');if(short)command(()=>stepGame(state,directions[name],.12),true);}});
  button.addEventListener('pointercancel',clearInput);
  button.addEventListener('click',event=>{if(mode==='step'||event.detail===0)command(()=>commandMove(state,name),true);});
}
$('wait').addEventListener('click',()=>command(()=>commandWait(state),true));
const keyDirections={w:'north',arrowup:'north',d:'east',arrowright:'east',s:'south',arrowdown:'south',a:'west',arrowleft:'west'};
canvas.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(keyDirections[key]){event.preventDefault();if(mode==='step'){if(!event.repeat)command(()=>commandMove(state,keyDirections[key]),true);}else keys.add(key);}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat)togglePause();}
  if(key==='r'){event.preventDefault();if(!event.repeat)retry();}
});
canvas.addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(keyDirections[key]){event.preventDefault();keys.delete(key);}});canvas.addEventListener('blur',clearInput);window.addEventListener('blur',clearInput);
$('map-details').addEventListener('toggle',updateMap);$('view-arena').addEventListener('click',()=>{scene?.setView('arena');dirty=true;});$('view-top').addEventListener('click',()=>{scene?.setView('top');dirty=true;});
$('quality').addEventListener('change',()=>{dirty=true;});new ResizeObserver(()=>{dirty=true;}).observe(canvas);reducedMotion.addEventListener('change',()=>{dirty=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='running'){pauseGame(state);sync();}clearInput();lastFrame=0;});
function graphicsFailure(message){$('graphics-fallback').hidden=false;$('quality').disabled=true;$('view-arena').disabled=true;$('view-top').disabled=true;$('map-details').open=true;text($('graphics-status'),message);delete canvas.dataset.renderer;delete canvas.dataset.resolution;mode='step';$('control-mode').value=mode;if(state.phase==='running')pauseGame(state);clearInput();sync();}
canvas.addEventListener('stage-lost',()=>graphicsFailure('Graphics connection lost. Mission paused; continue with the map and step commands.'));
loadLevel(progress.unlocked);
try{const{createScene}=await import('./scene.js');scene=createScene({canvas,qualitySelect:$('quality'),status:$('graphics-status')});scene.rebuild(state.config);dirty=true;}
catch{graphicsFailure('WebGL 2 unavailable. The same sector is playable with the coordinate map and step commands.');}
function frame(time){
  const elapsed=lastFrame?Math.max(0,Math.min(.1,(time-lastFrame)/1000)):0;lastFrame=time;
  const previousPhase=state.phase,previousEvent=state.events.at(-1);
  if(state.phase==='running'&&mode==='continuous'){
    const input={x:0,z:0};for(const key of keys){const direction=directions[keyDirections[key]];input.x+=direction.x;input.z+=direction.z;}if(pointerDirection){input.x+=directions[pointerDirection].x;input.z+=directions[pointerDirection].z;}
    stepGame(state,input,elapsed);dirty=true;
  }
  if(state.phase!==previousPhase||state.events.at(-1)!==previousEvent)sync();
  else if(state.phase==='running'&&time-lastUI>120){telemetry();if($('map-details').open)updateMap();lastUI=time;}
  if(scene&&dirty){scene.update(state,reducedMotion.matches);scene.render();dirty=false;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
