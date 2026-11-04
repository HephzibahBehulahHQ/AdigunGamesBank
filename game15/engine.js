import { FIRST_COVER, SIZE, missionFor } from './campaign.js';
export { SIZE };
export const TERRAIN=FIRST_COVER;
export const sectorName=(x,y)=>`${String.fromCharCode(65+y)}${x+1}`;
export const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const living=(s,team)=>s.units.filter(u=>u.hp>0&&(!team||u.team===team));
export const unitAt=(s,x,y,ignore)=>s.units.find(u=>u.hp>0&&u.id!==ignore&&u.x===x&&u.y===y);
export const isCover=(s,x,y)=>(s.config?.terrain||TERRAIN).some(p=>p[0]===x&&p[1]===y);
const announce=(s,message)=>{s.log.unshift(message);s.log.length=Math.min(s.log.length,40);s.event++;};
const canAct=(s,u)=>u&&u.hp>0&&!u.acted&&!s.winner&&s.phase===u.team;

export function newGame(level=1) {
  const config=missionFor(level);
  return {config,round:1,phase:'player',units:config.units.map(u=>({...u,hp:u.maxHp,acted:false,guarded:false})),
    selected:null,log:[`Mission ${config.level}: ${config.objective}`],winner:null,event:0,
    hold:0,enemyHold:0,carrier:null,core:{...config.relay},lastAction:null};
}

/** Supercover line test: a shot cannot pass through a touching pair of wall corners. */
export function lineOfSight(s,a,b) {
  if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isInteger)) return false;
  let x=a.x,y=a.y;const dx=b.x-a.x,dy=b.y-a.y,sx=Math.sign(dx),sy=Math.sign(dy);
  const stepX=dx?1/Math.abs(dx):Infinity,stepY=dy?1/Math.abs(dy):Infinity;
  let tx=stepX/2,ty=stepY/2;
  const blocked=(cx,cy)=>!(cx===a.x&&cy===a.y)&&!(cx===b.x&&cy===b.y)&&(isCover(s,cx,cy)||!!unitAt(s,cx,cy,a.id));
  while(x!==b.x||y!==b.y) {
    if(Math.abs(tx-ty)<1e-10) {
      if(blocked(x+sx,y)||blocked(x,y+sy)) return false;
      x+=sx;y+=sy;tx+=stepX;ty+=stepY;
    } else if(tx<ty) {x+=sx;tx+=stepX;} else {y+=sy;ty+=stepY;}
    if(blocked(x,y)) return false;
  }
  return true;
}

export function attackTargets(s,u) {
  if(!u||u.hp<=0||s.winner) return [];
  return s.units.filter(v=>v.hp>0&&v.team!==u.team&&distance(u,v)<=u.range&&lineOfSight(s,u,v));
}

export function legalMoves(s,u) {
  if(!canAct(s,u)) return [];
  const seen=new Set([`${u.x},${u.y}`]),queue=[{x:u.x,y:u.y,steps:0}],out=[];
  const blocked=(x,y)=>x<0||y<0||x>=SIZE||y>=SIZE||isCover(s,x,y)||!!unitAt(s,x,y,u.id);
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];if(p.steps>=u.move) continue;
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) {
      if(!dx&&!dy) continue;
      const x=p.x+dx,y=p.y+dy,key=`${x},${y}`;
      if(blocked(x,y)||seen.has(key)||(dx&&dy&&(blocked(p.x+dx,p.y)||blocked(p.x,p.y+dy)))) continue;
      seen.add(key);const next={x,y,steps:p.steps+1};queue.push(next);out.push({x,y});
    }
  }
  return out;
}

function win(s,team,message) {s.winner=team;s.phase='over';s.selected=null;announce(s,message);}
function startPhase(s,team) {
  s.phase=team;for(const u of living(s,team)){u.acted=false;u.guarded=false;}
}
function checkObjective(s) {
  if(!living(s,'player').length){win(s,'ai','Mission lost. Your squad has been disabled.');return;}
  if(s.config.mode==='eliminate'&&!living(s,'ai').length){win(s,'player','Sector secured. All opposing drones are disabled.');return;}
  if(s.config.mode==='retrieve'&&s.carrier){const carrier=s.units.find(u=>u.id===s.carrier);if(carrier.hp>0&&carrier.x===0)win(s,'player','Data core recovered. Its carrier reached the west extraction edge.');}
}
function finish(s) {
  checkObjective(s);if(s.winner) return;
  if(s.phase==='player'&&living(s,'player').every(u=>u.acted)){s.selected=null;startPhase(s,'ai');return;}
  if(s.phase==='ai'&&living(s,'ai').every(u=>u.acted)) {
    if(s.config.mode==='uplink') {
      const ours=living(s,'player').some(u=>distance(u,s.config.relay)<=1),theirs=living(s,'ai').some(u=>distance(u,s.config.relay)<=1);
      s.hold=ours&&!theirs?s.hold+1:0;s.enemyHold=theirs&&!ours?s.enemyHold+1:0;
      if(s.hold>=s.config.holdRounds){win(s,'player','Uplink secured. The transmission is complete.');return;}
      if(s.enemyHold>=s.config.holdRounds){win(s,'ai','Mission lost. The opposing squad secured the uplink.');return;}
    }
    if(s.round>=s.config.roundLimit){win(s,'ai','Mission time expired. Review your approach and retry.');return;}
    s.round++;startPhase(s,'player');announce(s,`Round ${s.round}. Your squad is ready.`);
  }
}
function damage(s,u,v) {
  const from={x:u.x,y:u.y},to={x:v.x,y:v.y};
  if(v.guarded){v.guarded=false;announce(s,`${v.name}'s guard absorbs the pulse from ${u.name}.`);}
  else {v.hp=Math.max(0,v.hp-1);announce(s,`${u.name} hits ${v.name}: ${v.hp} hull remaining.`);}
  if(v.hp===0&&s.carrier===v.id){s.core={x:v.x,y:v.y};s.carrier=null;announce(s,`The data core was dropped at ${sectorName(v.x,v.y)}.`);}
  s.lastAction={type:'attack',from,to,team:u.team,event:s.event};
}
export function selectUnit(s,id) {
  const u=s.units.find(v=>v.id===id&&v.team==='player');if(!canAct(s,u))return false;
  s.selected=id;return true;
}
export function playerMove(s,id,x,y) {
  const u=s.units.find(v=>v.id===id&&v.team==='player');
  if(!canAct(s,u)||!Number.isInteger(x)||!Number.isInteger(y)||!legalMoves(s,u).some(p=>p.x===x&&p.y===y))return false;
  const from={x:u.x,y:u.y};u.x=x;u.y=y;u.acted=true;s.selected=null;
  announce(s,`${u.name} moves to ${sectorName(x,y)}.`);s.lastAction={type:'move',from,to:{x,y},team:'player',event:s.event};finish(s);return true;
}
export function playerAttack(s,id,targetId) {
  const u=s.units.find(v=>v.id===id&&v.team==='player'),v=s.units.find(unit=>unit.id===targetId);
  if(!canAct(s,u)||!v||!attackTargets(s,u).some(t=>t.id===targetId))return false;
  damage(s,u,v);u.acted=true;s.selected=null;finish(s);return true;
}
export function playerGuard(s,id) {
  const u=s.units.find(v=>v.id===id&&v.team==='player');if(!canAct(s,u))return false;
  u.guarded=true;u.acted=true;s.selected=null;announce(s,`${u.name} guards: its shield will absorb one pulse.`);finish(s);return true;
}
export function endPlayerTurn(s) {
  if(s.phase!=='player'||s.winner)return false;
  for(const u of living(s,'player'))if(!u.acted)playerGuard(s,u.id);
  return true;
}
export function collectCore(s,id) {
  const u=s.units.find(v=>v.id===id&&v.team==='player');
  if(!canAct(s,u)||s.config.mode!=='retrieve'||s.carrier||u.x!==s.core.x||u.y!==s.core.y)return false;
  s.carrier=id;u.acted=true;s.selected=null;announce(s,`${u.name} collects the data core. Return to column 1.`);finish(s);return true;
}

function pathDistances(s,goal) {
  const result=new Map([[`${goal.x},${goal.y}`,0]]),queue=[goal];
  for(let i=0;i<queue.length;i++)for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]) {
    const x=queue[i].x+dx,y=queue[i].y+dy,k=`${x},${y}`;
    if(x<0||y<0||x>=SIZE||y>=SIZE||isCover(s,x,y)||result.has(k))continue;
    result.set(k,result.get(`${queue[i].x},${queue[i].y}`)+1);queue.push({x,y});
  }
  return result;
}
export function chooseAIAction(s,u) {
  if(!canAct(s,u))return {type:'wait'};
  const targets=attackTargets(s,u).sort((a,b)=>(a.id===s.carrier?-100:0)-(b.id===s.carrier?-100:0)+a.hp-b.hp||distance(u,a)-distance(u,b));
  if(targets.length)return {type:'attack',target:targets[0]};
  const opponents=living(s,u.team==='ai'?'player':'ai');
  if(!opponents.length)return {type:'guard'};
  const goal=s.config.mode==='uplink'?s.config.relay:s.carrier?s.units.find(v=>v.id===s.carrier):opponents.reduce((best,v)=>distance(u,v)<distance(u,best)?v:best);
  const routes=pathDistances(s,goal);let best=null,score=-Infinity;
  for(const p of legalMoves(s,u)) {
    const h={...u,...p};const canFire=opponents.some(e=>distance(h,e)<=u.range&&lineOfSight(s,h,e));
    const threats=opponents.filter(e=>distance(e,h)<=e.range&&lineOfSight(s,e,h)).length;
    const nearCover=s.config.terrain.some(([x,y])=>distance(h,{x,y})===1);
    const route=routes.get(`${p.x},${p.y}`)??50;
    const onGoal=s.config.mode==='uplink'&&distance(h,s.config.relay)<=1;
    const value=(canFire?34:0)-route*7-threats*(3+8*s.config.aiSkill)+(nearCover?3*s.config.aiSkill:0)+(onGoal?42:0);
    if(value>score){score=value;best=p;}
  }
  return best?{type:'move',to:best}:{type:'guard'};
}
export function runAIPhase(s) {
  if(s.phase!=='ai'||s.winner)return s;
  for(const u of living(s,'ai')) {
    if(u.acted||s.winner)continue;const action=chooseAIAction(s,u);
    if(action.type==='attack')damage(s,u,action.target);
    else if(action.type==='move'){const from={x:u.x,y:u.y};u.x=action.to.x;u.y=action.to.y;announce(s,`${u.name} moves to ${sectorName(u.x,u.y)}.`);s.lastAction={type:'move',from,to:{x:u.x,y:u.y},team:'ai',event:s.event};}
    else {u.guarded=true;announce(s,`${u.name} guards its position.`);}
    u.acted=true;checkObjective(s);
  }
  if(!s.winner)finish(s);return s;
}
