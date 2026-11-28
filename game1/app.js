import { createGame, pulse, undo, pause, hint, matched, labelFor, PHASE_NAMES } from './engine.js';
import { campaign, validCampaignSave, LEVEL_COUNT } from '../shared/progression.js';
const $=id=>document.getElementById(id), progress=campaign('neon-pulse');
let state=createGame(progress.unlocked), scene=null, recorded=false, buttons=[], dirty=true;
let noticeTimer, initialMessage = state.message;
function showNotice(text){
  const notice=$('message');
  if(notice.textContent===text)return;
  clearTimeout(noticeTimer);
  notice.textContent=text;
  notice.classList.toggle('sr-only',!text);
  if(text)noticeTimer=setTimeout(()=>notice.classList.add('sr-only'),3400);
}
function showFallback(){
  const fallback=$('graphics-fallback');
  fallback.append($('signal-grid'));
  fallback.hidden=false;
  $('quality').disabled=true;
}
function saveMessage(){let durable=false;try{const saved=JSON.parse(localStorage.getItem('adigun.campaign.v1.neon-pulse')||'null');durable=validCampaignSave(saved)&&saved.completed>=progress.completed;}catch{}return progress.completed?`${progress.completed.toLocaleString()} ${progress.completed===1?'board':'boards'} commissioned. ${durable?'Progress saved on this device.':'Progress is available for this session only; browser storage could not confirm a save.'}`:'Completed boards save on this device.';}
function build(){const grid=$('signal-grid');grid.style.setProperty('--size',state.config.size);buttons=state.cells.map((_,i)=>{const button=document.createElement('button');button.type='button';button.className='signal';button.id=`signal-${i}`;const label=document.createElement('strong');label.textContent=labelFor(state.config.size,i);const led=document.createElement('i');led.className='led';led.setAttribute('aria-hidden','true');const value=document.createElement('span'),detail=document.createElement('span');detail.className='sr-only';button.append(label,led,value,detail);button.addEventListener('click',()=>{state.selected=i;act(()=>pulse(state,i));});button.addEventListener('keydown',event=>navigate(event,i,true));return button;});grid.replaceChildren(...buttons);$('level').value=state.config.level;}
function sync(){if(state.phase==='won'&&!recorded){progress.complete(state.config.level);recorded=true;}$('tier').textContent=state.config.tier;$('level').max=progress.unlocked;$('unlock-status').textContent=`Board ${progress.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`;$('phase').textContent=state.phase.toUpperCase();$('phase').dataset.phase=state.phase;$('matched').textContent=`${matched(state)} / ${state.cells.length}`;$('moves').textContent=`${state.moves} / ${state.config.moveLimit}`;$('selected').textContent=labelFor(state.config.size,state.selected);showNotice(state.message===initialMessage?'':state.message);$('save-status').textContent=saveMessage();$('pulse').disabled=state.phase!=='playing';$('undo').disabled=!['playing','lost'].includes(state.phase)||!state.history.length;$('hint').disabled=state.phase!=='playing';$('pause').disabled=!['playing','paused'].includes(state.phase);const pauseLabel=state.phase==='paused'?'Resume board':'Pause board';$('pause').textContent=state.phase==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',pauseLabel);$('pause').title=pauseLabel;$('next-level').hidden=state.phase!=='won'||state.config.level===LEVEL_COUNT;
buttons.forEach((button,i)=>{const current=state.cells[i],target=state.config.target[i];button.dataset.current=current;button.dataset.match=current===target;button.setAttribute('aria-pressed',String(i===state.selected));button.children[2].textContent=`${current} → ${target}`;button.children[3].textContent=`Current ${PHASE_NAMES[current]}; target ${PHASE_NAMES[target]}. Pulse signal.`;button.disabled=state.phase!=='playing';});dirty=true;}
function act(fn){fn();sync();}
function load(value){const level=Number(value);if(!Number.isInteger(level)||level<1||level>progress.unlocked){$('level').value=state.config.level;showNotice('Complete the current unlocked board before loading a later one.');return;}state=createGame(level);initialMessage=state.message;recorded=false;build();sync();}
function navigate(event,index,focus){if(event.altKey||event.ctrlKey||event.metaKey)return;const size=state.config.size,row=Math.floor(index/size),col=index%size;let next=index;switch(event.key){case'ArrowLeft':next=row*size+Math.max(0,col-1);break;case'ArrowRight':next=row*size+Math.min(size-1,col+1);break;case'ArrowUp':next=Math.max(0,row-1)*size+col;break;case'ArrowDown':next=Math.min(size-1,row+1)*size+col;break;default:return;}event.preventDefault();state.selected=next;sync();if(focus)buttons[next].focus();}
$('load-level').addEventListener('click',()=>load($('level').value));$('restart').addEventListener('click',()=>load(state.config.level));$('next-level').addEventListener('click',()=>load(state.config.level+1));$('pulse').addEventListener('click',()=>act(()=>pulse(state,state.selected)));$('undo').addEventListener('click',()=>act(()=>undo(state)));$('pause').addEventListener('click',()=>act(()=>pause(state)));$('hint').addEventListener('click',()=>act(()=>hint(state)));
$('help-open').addEventListener('click',()=> $('studio-help').showModal());
const canvas=$('neon-canvas');canvas.addEventListener('keydown',event=>{if(event.key.startsWith('Arrow'))navigate(event,state.selected,false);else if(['Enter',' ','u','U'].includes(event.key)){event.preventDefault();act(()=>event.key==='Enter'?pulse(state,state.selected):event.key===' '?pause(state):undo(state));}});
canvas.addEventListener('stage-lost',showFallback);$('quality').addEventListener('change',()=>{dirty=true;});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='playing')act(()=>pause(state));});
build();sync();
import('./scene.js').then(({createScene})=>{scene=createScene(canvas,$('quality'),$('graphics-status'),index=>{state.selected=index;act(()=>pulse(state,index));});dirty=true;}).catch(()=>{showFallback();$('graphics-status').textContent='3D graphics unavailable. The signal matrix remains playable.';});
const sceneObserver=new ResizeObserver(()=>{dirty=true;});sceneObserver.observe(canvas);
let frame=0;function render(){if(dirty&&scene){scene.update(state);dirty=false;}frame=requestAnimationFrame(render);}frame=requestAnimationFrame(render);window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);sceneObserver.disconnect();scene?.dispose();});
