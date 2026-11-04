import test from 'node:test';
import assert from 'node:assert/strict';
import { levelConfig, createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from '../game4/campaign.js';
import { createGame, startGame, stepGame, commandMove, commandWait, pauseGame, resumeGame, hazardPosition, sweepCircle, sweepBox, moveAlongWalls, distance } from '../game4/engine.js';

const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const DIRS = [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
function firstRoute(state) { for (const [direction, count] of [['east',6],['south',6],['west',6]]) for (let n = 0; n < count && state.phase === 'running'; n++) commandMove(state, direction); }

// Independent validation: use only final wall geometry and full spark track
// envelopes, then BFS between targets and a subset DP for an optimal core order.
// No generator witness cells, reference route, engine pathfinder or solution
// fields are consumed by this solver.
function independentRoute(config) {
  const size = config.size, id = point => point.z * size + point.x;
  const obstacles = new Set(config.walls.map(id));
  for (const hazard of config.hazards) {
    for (let z = Math.min(hazard.a.z, hazard.b.z); z <= Math.max(hazard.a.z, hazard.b.z); z++) {
      for (let x = Math.min(hazard.a.x, hazard.b.x); x <= Math.max(hazard.a.x, hazard.b.x); x++) obstacles.add(z * size + x);
    }
  }
  const anchors = [config.start, ...config.cores, config.exit], maps = [];
  for (const origin of anchors) {
    const queue = [origin], previous = new Map([[id(origin), null]]), steps = new Map([[id(origin), 0]]);
    for (let index = 0; index < queue.length; index++) {
      const point = queue[index];
      for (const [direction, dx, dz] of DIRS) {
        const next = { x: point.x + dx, z: point.z + dz }, nextId = id(next);
        if (next.x < 0 || next.z < 0 || next.x >= size || next.z >= size || obstacles.has(nextId) || previous.has(nextId)) continue;
        previous.set(nextId, { point: id(point), direction }); steps.set(nextId, steps.get(id(point)) + 1); queue.push(next);
      }
    }
    maps.push({ previous, steps });
  }
  const count = config.cores.length, full = (1 << count) - 1;
  const costs = Array.from({ length: full + 1 }, () => Array(count).fill(Infinity));
  const parents = Array.from({ length: full + 1 }, () => Array(count).fill(-1));
  for (let i = 0; i < count; i++) costs[1 << i][i] = maps[0].steps.get(id(config.cores[i])) ?? Infinity;
  for (let mask = 1; mask <= full; mask++) for (let last = 0; last < count; last++) {
    if (!(mask & (1 << last)) || !Number.isFinite(costs[mask][last])) continue;
    for (let next = 0; next < count; next++) if (!(mask & (1 << next))) {
      const nextMask = mask | (1 << next), distance = maps[last + 1].steps.get(id(config.cores[next])) ?? Infinity;
      const cost = costs[mask][last] + distance;
      if (cost < costs[nextMask][next]) { costs[nextMask][next] = cost; parents[nextMask][next] = last; }
    }
  }
  let last = -1, length = Infinity;
  for (let i = 0; i < count; i++) {
    const cost = costs[full][i] + (maps[i + 1].steps.get(id(config.exit)) ?? Infinity);
    if (cost < length) { length = cost; last = i; }
  }
  assert.ok(last >= 0 && Number.isFinite(length), `No independent safe route for sector ${config.level}`);
  const order = []; let mask = full;
  while (last >= 0) { order.push(last + 1); const previous = parents[mask][last]; mask &= ~(1 << last); last = previous; }
  order.reverse(); order.push(anchors.length - 1);
  const route = []; let from = 0;
  for (const target of order) {
    const reversed = []; let cursor = id(anchors[target]);
    while (cursor !== id(anchors[from])) {
      const step = maps[from].previous.get(cursor); assert.ok(step, `Unreachable target ${config.level}`); reversed.push(step.direction); cursor = step.point;
    }
    route.push(...reversed.reverse()); from = target;
  }
  return route;
}

test('Swept geometry detects wall, moving spark and pickup crossings even when endpoints miss them', () => {
  const wall = sweepBox({x:0,z:0},{x:10,z:0},4,6,-1,1); near(wall.time,.4); assert.deepEqual(wall.normal,{x:-1,z:0});
  assert.equal(sweepBox({x:0,z:2},{x:10,z:2},4,6,-1,1),null);
  near(sweepCircle({x:0,z:0},{x:10,z:0},{x:5,z:0},{x:5,z:0},.5),.45);
  near(sweepCircle({x:0,z:0},{x:0,z:0},{x:5,z:0},{x:-5,z:0},.5),.45);
  assert.equal(sweepCircle({x:0,z:2},{x:10,z:2},{x:5,z:0},{x:5,z:0},.5),null);
});

test('The first sector requires actual core retrieval and exit contact, with a complete player-driven route', () => {
  const state=createGame(1); assert.equal(startGame(state),true); firstRoute(state);
  assert.equal(state.phase,'won'); assert.ok(state.collected.every(Boolean)); assert.equal(state.shields,3);
  assert.ok(distance(state.player,state.config.exit)<=.4300001); near(state.time,7.028);
  assert.equal(stepGame(state,{x:1,z:0},1),false);
});

test('Every one of 10,000 distinct sectors is independently reachable and wins through the actual movement/collision engine', () => {
  const signatures=new Set();
  for(let level=1;level<=LEVEL_COUNT;level++) {
    const state=createGame(level), c=state.config;
    assert.equal(c.cores.length,3+c.tierIndex); assert.ok(c.hazards.length>=2);
    const signature=JSON.stringify([c.size,c.start,c.exit,c.walls,c.cores.map(({x,z})=>[x,z]),c.hazards.map(({a,b,speed,offset,radius})=>[a,b,speed,offset,radius]),c.speed,c.shields,c.timeLimit]);
    assert.equal(signatures.has(signature),false,`Duplicate physical sector ${level}`); signatures.add(signature);
    const route=independentRoute(c); assert.ok(route.length/c.speed<c.timeLimit,`Deadline ${level}`);
    startGame(state);
    for(const direction of route) {
      if(state.phase==='won')break;
      assert.equal(commandMove(state,direction),true);
      assert.notEqual(state.phase,'lost',`Sector ${level}: ${state.message}`);
    }
    assert.equal(state.phase,'won',`Sector ${level} did not finish`); assert.ok(state.collected.every(Boolean));
    assert.equal(state.shields,c.shields,`Safe route hit a spark in ${level}`); assert.ok(distance(state.player,c.exit)<=.4300001);
  }
  assert.equal(signatures.size,LEVEL_COUNT);
});

test('Seeds, tier changes and bounded levels affect real arena geometry and objectives', () => {
  assert.deepEqual(levelConfig(7423),levelConfig(7423));
  assert.equal(levelConfig(0).level,1); assert.equal(levelConfig(10001).level,1); assert.equal(levelConfig(NaN).level,1);
  assert.deepEqual([1,2001,4001,6001,8001].map(level=>levelConfig(level).cores.length),[3,4,5,6,7]);
  assert.equal(levelConfig(10000).tier,'Professional Master'); assert.equal(levelConfig(10000).size,13);
  assert.equal(levelConfig(10000).shields,2);
  for(const level of [1,2001,4001,6001,8001,10000]) {
    const c=levelConfig(level), wallSet=new Set(c.walls.map(w=>`${w.x},${w.z}`));
    for(let z=0;z<c.size;z++)for(let x=0;x<c.size;x++)assert.equal(c.blocked[z][x],wallSet.has(`${x},${z}`));
    assert.equal(new Set(c.cores.map(core=>`${core.x},${core.z}`)).size,c.cores.length);
  }
});

test('Large movement steps cannot cross walls and diagonal steering has no speed boost', () => {
  const wall=createGame(1); wall.config.hazards=[]; wall.player={x:1,z:3}; startGame(wall); stepGame(wall,{x:1,z:0},1);
  assert.ok(wall.player.x<2.270001&&wall.player.x>2.26999); assert.equal(wall.blocked,true);
  const boundary=createGame(1); startGame(boundary); stepGame(boundary,{x:0,z:-1},1); assert.ok(boundary.player.z>=.73&&boundary.player.z<.73001);
  const slide=moveAlongWalls(wall.config,{x:1,z:3},{x:10,z:1}); assert.ok(slide.segments.length>1);
  const straight=createGame(1), diagonal=createGame(1); startGame(straight); startGame(diagonal);
  stepGame(straight,{x:1,z:0},.1); stepGame(diagonal,{x:1,z:1},.1);
  near(distance(straight.player,straight.config.start),.25); near(distance(diagonal.player,diagonal.config.start),.25);
});

test('A fast spark crossing and reversing within one frame still collides with a stationary rover', () => {
  const state=createGame(1); state.player={x:4,z:4};
  state.config.hazards=[{id:0,a:{x:2,z:4},b:{x:6,z:4},speed:40,offset:0,radius:.22}];
  startGame(state); stepGame(state,{x:0,z:0},.2);
  assert.equal(state.shields,2); assert.equal(state.phase,'running');
  near(hazardPosition(state.config.hazards[0],0).x,2); near(hazardPosition(state.config.hazards[0],.1).x,6); near(hazardPosition(state.config.hazards[0],.2).x,2);
});

test('Swept pickup and exit events are processed in physical order and require returning to a previously locked exit', () => {
  const state=createGame(1); state.config.hazards=[]; state.config.cores=[{id:0,name:'Core A',x:3,z:1}]; state.collected=[false]; state.config.exit={x:2,z:1};
  startGame(state); stepGame(state,{x:1,z:0},1);
  assert.deepEqual(state.collected,[true]); assert.equal(state.phase,'running'); assert.ok(state.player.x>3);
  stepGame(state,{x:-1,z:0},1); assert.equal(state.phase,'won'); assert.ok(distance(state.player,state.config.exit)<=.4300001);
});

test('Idling never collects cores or wins, and the finite deadline causes a genuine loss', () => {
  const state=createGame(1); startGame(state);
  for(let i=0;i<10;i++)stepGame(state,{},1);
  assert.equal(state.phase,'running'); assert.ok(state.collected.every(value=>!value)); assert.deepEqual(state.player,state.config.start);
  for(let i=0;i<20;i++)stepGame(state,{},1);
  assert.equal(state.phase,'lost'); assert.equal(state.fault,'timeout'); near(state.time,state.config.timeLimit); assert.ok(state.collected.every(value=>!value));
});

test('Spark contacts consume finite shields with a bounded recovery interval; retry clears all partial progress', () => {
  const state=createGame(1); startGame(state); commandMove(state,'east'); commandMove(state,'south');
  assert.equal(state.shields,2); stepGame(state,{},.1); assert.equal(state.shields,2);
  for(let i=0;i<6&&state.phase==='running';i++)commandWait(state);
  assert.equal(state.phase,'lost'); assert.equal(state.fault,'shields'); assert.equal(state.shields,0);
  const retry=createGame(state.config.level); assert.equal(retry.time,0); assert.equal(retry.shields,3); assert.ok(retry.collected.every(value=>!value));
  startGame(retry); firstRoute(retry); assert.equal(retry.phase,'won');
});

test('Pause and invalid commands cannot move the rover, consume time or corrupt finite coordinates', () => {
  const state=createGame(1); assert.equal(commandMove(state,'east'),false); startGame(state); pauseGame(state);
  const frozen=JSON.stringify([state.player,state.time,state.shields,state.collected]);
  assert.equal(stepGame(state,{x:1,z:1},1),false); assert.equal(commandMove(state,'east'),false); assert.equal(commandWait(state),false);
  assert.equal(JSON.stringify([state.player,state.time,state.shields,state.collected]),frozen); assert.equal(resumeGame(state),true);
  assert.equal(commandMove(state,'teleport'),false);
  for(const bad of [0,-1,NaN,Infinity])assert.equal(stepGame(state,{x:1,z:0},bad),false);
  stepGame(state,{x:Infinity,z:NaN},.1); assert.deepEqual(state.player,state.config.start); assert.ok(Number.isFinite(state.time));
});

test('Reference route outcomes and collision event timing are stable under fine and coarse movement updates', () => {
  const coarse=createGame(1), fine=createGame(1); startGame(coarse); startGame(fine);
  for(const [direction,count]of[['east',6],['south',6],['west',6]]) {
    const input=direction==='east'?{x:1,z:0}:direction==='south'?{x:0,z:1}:{x:-1,z:0};
    for(let n=0;n<count;n++) {
      commandMove(coarse,direction); let remaining=1/fine.config.speed;
      while(remaining>1e-9&&fine.phase==='running'){const dt=Math.min(.013,remaining);stepGame(fine,input,dt);remaining-=dt;}
    }
  }
  assert.equal(fine.phase,'won'); assert.equal(coarse.phase,'won'); near(fine.time,coarse.time); near(fine.player.x,coarse.player.x); near(fine.player.z,coarse.player.z);
});

test('Volt Dodge campaign validates sequential completion, corrupt storage, session play and final mastery', () => {
  const values=new Map(), storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const key=`adigun.campaign.v1.${CAMPAIGN_ID}`, progress=createCampaign(storage);
  assert.equal(progress.complete(2),false); assert.equal(progress.complete(1),true); assert.equal(progress.complete(1),false); assert.equal(createCampaign(storage).unlocked,2);
  values.set(key,'bad'); assert.equal(createCampaign(storage).completed,0);
  values.set(key,JSON.stringify({version:1,completed:9999,unlocked:10000}));const final=createCampaign(storage);
  assert.equal(final.complete(10000),true); assert.equal(final.mastered,true); assert.equal(final.complete(10001),false);
  const unavailable=createCampaign({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});
  assert.equal(unavailable.complete(1),true); assert.equal(unavailable.unlocked,2);
});
