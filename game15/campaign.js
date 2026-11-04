import { randomFor, tierFor, validLevel } from '../shared/progression.js';

export const SIZE = 8;
export const FIRST_COVER = [[3,3],[3,4],[4,3],[4,4],[2,6],[5,1]];
const fixedCover = [[1,2],[1,5],[6,2],[6,5]];
const directions = [[1,0],[-1,0],[0,1],[0,-1]];
const coordinate = (x,y) => `${x},${y}`;
let layouts;

/** Cardinal connectivity is stricter than the game's corner-safe eight-way movement. */
export function reachableCells(terrain, start = {x:0,y:0}) {
  const blocked = new Set(terrain.map(([x,y]) => coordinate(x,y)));
  if (blocked.has(coordinate(start.x,start.y))) return new Set();
  const seen = new Set([coordinate(start.x,start.y)]), queue = [start];
  for (let i=0;i<queue.length;i++) for (const [dx,dy] of directions) {
    const x=queue[i].x+dx,y=queue[i].y+dy,k=coordinate(x,y);
    if(x<0||y<0||x>=SIZE||y>=SIZE||blocked.has(k)||seen.has(k)) continue;
    seen.add(k);queue.push({x,y});
  }
  return seen;
}

// Four independently placed central barriers encode the mission, not its displayed number.
// These combinations are filtered once, on demand; no map leaves an isolated open sector.
function coverLayouts() {
  if(layouts) return layouts;
  const candidates=[];
  for(let x=2;x<=5;x++) for(let y=1;y<=6;y++) candidates.push([x,y]);
  layouts=[];
  outer: for(let a=0;a<21;a++) for(let b=a+1;b<22;b++) for(let c=b+1;c<23;c++) for(let d=c+1;d<24;d++) {
    const cover=[...fixedCover,candidates[a],candidates[b],candidates[c],candidates[d]];
    if(reachableCells(cover).size!==SIZE*SIZE-cover.length) continue;
    layouts.push([a,b,c,d]);
    if(layouts.length===9999) break outer;
  }
  if(layouts.length!==9999) throw new Error('Campaign layout construction failed.');
  return layouts;
}

const rows = [[1,3,5],[0,3,6],[2,4,7],[0,4,7],[1,4,6],[0,2,5]];
const profiles = [
  {id:'P1',team:'player',name:'Vanguard',role:'assault',maxHp:4,move:2,range:3},
  {id:'P2',team:'player',name:'Ranger',role:'recon',maxHp:3,move:3,range:4},
  {id:'P3',team:'player',name:'Guardian',role:'support',maxHp:5,move:2,range:3},
  {id:'E1',team:'ai',name:'Flanker',role:'recon',maxHp:3,move:2,range:3},
  {id:'E2',team:'ai',name:'Sentinel',role:'support',maxHp:3,move:2,range:3},
  {id:'E3',team:'ai',name:'Striker',role:'assault',maxHp:3,move:2,range:3}
];

export function missionFor(value = 1) {
  const level=validLevel(value), progress=(level-1)/9999, random=randomFor(15000+level*37);
  let terrain;
  if(level===1) terrain=FIRST_COVER.map(p=>[...p]);
  else {
    const candidates=[];
    for(let x=2;x<=5;x++) for(let y=1;y<=6;y++) candidates.push([x,y]);
    const indices=coverLayouts()[((level-2)*7919)%9999]; // 7919 is coprime to 9999.
    terrain=[...fixedCover,...indices.map(i=>candidates[i])].map(p=>[...p]);
  }
  const mode=level===1?'eliminate':['eliminate','uplink','retrieve'][(level-2)%3];
  const relayOptions=[[3,3],[4,4],[3,4],[4,3],[3,2],[4,5]].filter(([x,y])=>!terrain.some(p=>p[0]===x&&p[1]===y));
  const relay=relayOptions[Math.floor(random()*relayOptions.length)];
  const playerRows=level===1?rows[0]:rows[Math.floor(random()*rows.length)];
  const enemyRows=level===1?rows[0]:rows[Math.floor(random()*rows.length)];
  const enemyHull=level<4001?3:level<8001?Math.floor(random()*2)+3:4;
  const units=profiles.map((profile,i)=>({...profile,x:i<3?0:7,y:(i<3?playerRows:enemyRows)[i%3],
    maxHp:i<3?profile.maxHp:enemyHull,move:i>=3&&level>6000&&profile.role==='recon'?3:profile.move,
    range:i>=3&&level>4000&&profile.role==='support'?4:profile.range}));
  return {level,tier:tierFor(level),mode,terrain,relay:{x:relay[0],y:relay[1]},
    holdRounds:level>6000?3:2,roundLimit:Math.round(40-12*progress),aiSkill:.15+.85*progress,
    title:mode==='eliminate'?'Secure the sector':mode==='uplink'?'Hold the uplink':'Recover the data core',
    objective:mode==='eliminate'?'Disable all three opposing drones.':mode==='uplink'?
      `Keep a friendly drone within one sector of the uplink, with no opponent nearby, for ${level>6000?3:2} consecutive rounds.`:
      'Move onto the data-core sector, collect it, then return its carrier to the west edge (column 1).',units};
}

export function validateMission(config) {
  const problems=[],occupied=new Set(),cover=new Set(config.terrain.map(([x,y])=>coordinate(x,y)));
  if(config.terrain.some(([x,y])=>!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=SIZE||y>=SIZE)||cover.size!==config.terrain.length) problems.push('Invalid barriers');
  const reachable=reachableCells(config.terrain);
  if(reachable.size!==SIZE*SIZE-cover.size) problems.push('Disconnected sectors');
  for(const unit of config.units) {
    const key=coordinate(unit.x,unit.y);
    if(!reachable.has(key)||occupied.has(key)||unit.maxHp<1||unit.move<1||unit.range<1) problems.push(`Invalid deployment ${unit.id}`);
    occupied.add(key);
  }
  if(!reachable.has(coordinate(config.relay.x,config.relay.y))) problems.push('Unreachable objective');
  if(config.units.filter(u=>u.team==='player').length!==3||config.units.filter(u=>u.team==='ai').length!==3) problems.push('Invalid squad');
  return problems;
}
