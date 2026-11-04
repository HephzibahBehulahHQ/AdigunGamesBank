import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionFor, validateMission, reachableCells } from '../game15/campaign.js';
import { newGame, legalMoves, attackTargets, lineOfSight, living, isCover, chooseAIAction, selectUnit, playerMove, playerAttack, playerGuard, collectCore, endPlayerTurn, runAIPhase } from '../game15/engine.js';
import { openTacticsCampaign, SAVE_KEY } from '../game15/save.js';

function invariant(state) {
  const occupied=new Set();
  for(const unit of living(state)) {
    const key=`${unit.x},${unit.y}`;
    assert.ok(Number.isInteger(unit.x)&&Number.isInteger(unit.y)&&unit.x>=0&&unit.x<8&&unit.y>=0&&unit.y<8);
    assert.ok(!isCover(state,unit.x,unit.y)&&!occupied.has(key),`Illegal position for ${unit.id}`);
    assert.ok(unit.hp>0&&unit.hp<=unit.maxHp);occupied.add(key);
  }
  assert.ok(state.round>=1&&state.round<=state.config.roundLimit);
}

// These are complete input sequences, starting with generated missions and using
// exactly the operations exposed by the command controls. No state edits occur.
function playSequence(level, sequence) {
  const state=newGame(level);
  for(const [id,action,...args] of sequence) {
    if(state.phase==='ai')runAIPhase(state);
    assert.equal(state.winner,null,'The sequence must not act after completion');
    assert.equal(selectUnit(state,id),true,`${id} must be ready`);
    const accepted=action==='move'?playerMove(state,id,...args):action==='attack'?playerAttack(state,id,...args):action==='collect'?collectCore(state,id):playerGuard(state,id);
    assert.equal(accepted,true,`${id}: ${action} ${args.join(',')}`);invariant(state);
  }
  if(state.phase==='ai')runAIPhase(state);
  return state;
}

const firstMission=[
  ['P1','move',2,2],['P2','move',3,5],['P3','move',2,3],
  ['P1','attack','E1'],['P2','attack','E2'],['P3','move',1,2],
  ['P1','attack','E1'],['P2','attack','E2'],['P3','move',2,1],
  ['P1','attack','E1'],['P3','move',4,2],['P1','attack','E3'],
  ['P3','attack','E2'],['P1','attack','E3'],['P3','move',3,2],
  ['P3','move',2,3],['P3','attack','E3']
];

test('TACTICS GRID: all 10,000 missions have distinct connected geometry, legal deployment and reachable objectives',()=>{
  const geometries=new Set(),modes=new Set(),tiers=new Set();
  for(let level=1;level<=10000;level++) {
    const config=missionFor(level);
    assert.deepEqual(validateMission(config),[],`Mission ${level}`);
    const key=config.terrain.map(([x,y])=>`${x},${y}`).sort().join(';');
    assert.ok(!geometries.has(key),`Mission ${level} duplicates terrain`);geometries.add(key);
    const reachable=reachableCells(config.terrain,config.relay);
    assert.ok(config.units.every(unit=>reachable.has(`${unit.x},${unit.y}`)));
    assert.ok([...reachable].some(key=>key.startsWith('0,')),'A west-edge extraction exists');
    modes.add(config.mode);tiers.add(config.tier);
  }
  assert.equal(geometries.size,10000);
  assert.deepEqual([...modes].sort(),['eliminate','retrieve','uplink']);
  assert.deepEqual([...tiers],['Beginner','Apprentice','Skilled','Expert','Professional Master']);
});

test('TACTICS GRID: mission generation is reproducible, isolated and changes real difficulty parameters',()=>{
  for(const level of [1,2,2000,2001,4001,6001,8001,10000])assert.deepEqual(missionFor(level),missionFor(level));
  const mutated=missionFor(42);mutated.terrain[0][0]=99;mutated.units[0].maxHp=99;
  assert.deepEqual(validateMission(missionFor(42)),[]);
  for(const input of [-1,0,10001,2.5,NaN,'bad'])assert.equal(missionFor(input).level,1);
  const beginner=missionFor(1),master=missionFor(10000);
  assert.ok(master.roundLimit<beginner.roundLimit&&master.aiSkill>beginner.aiSkill);
  assert.ok(master.units[3].maxHp>beginner.units[3].maxHp&&master.units[3].move>beginner.units[3].move);
  assert.ok(master.units[4].range>beginner.units[4].range&&master.holdRounds>beginner.holdRounds);
});

test('TACTICS GRID: authored first-mission command sequence wins through the real enemy response',()=>{
  const state=playSequence(1,firstMission);
  assert.equal(state.winner,'player');assert.equal(state.round,8);assert.equal(living(state,'ai').length,0);
  assert.ok(living(state,'player').length>0);assert.equal(state.phase,'over');
});

test('TACTICS GRID: full uplink playthrough captures the objective with opponents still active',()=>{
  const state=playSequence(3,[['P1','move',2,1],['P2','move',2,4],['P3','move',1,4],['P1','move',3,3],['P2','attack','E2'],['P3','move',2,3]]);
  assert.equal(state.winner,'player');assert.equal(state.hold,state.config.holdRounds);assert.ok(living(state,'ai').length>0);
});

test('TACTICS GRID: full retrieval playthrough requires collecting and returning the core',()=>{
  const state=playSequence(4,[
    ['P1','move',2,1],['P2','move',3,2],['P3','move',1,3],
    ['P1','attack','E1'],['P2','attack','E1'],['P3','move',2,2],
    ['P1','attack','E1'],['P2','attack','E2'],['P3','move',3,3],
    ['P1','attack','E3'],['P2','attack','E2'],['P3','move',2,2],
    ['P1','attack','E2'],['P3','attack','E3'],['P1','attack','E3'],
    ['P3','move',3,4],['P1','move',3,3],['P3','collect'],
    ['P1','guard'],['P3','move',1,4],['P1','guard'],['P3','move',0,4]
  ]);
  assert.equal(state.winner,'player');assert.equal(state.carrier,'P3');assert.equal(state.round,9);
});

function routesTo(state,goal) {
  const routes=new Map([[`${goal.x},${goal.y}`,0]]),queue=[goal];
  for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const x=queue[i].x+dx,y=queue[i].y+dy,key=`${x},${y}`;
    if(x<0||x>7||y<0||y>7||isCover(state,x,y)||routes.has(key))continue;
    routes.set(key,routes.get(`${queue[i].x},${queue[i].y}`)+1);queue.push({x,y});
  }
  return routes;
}

function playWithLegalPolicy(level) {
  const state=newGame(level);let actions=0;
  while(!state.winner&&actions<500) {
    if(state.phase==='ai'){runAIPhase(state);invariant(state);continue;}
    for(const unit of living(state,'player')) {
      if(state.winner||state.phase!=='player')break;
      if(unit.acted)continue;
      assert.equal(selectUnit(state,unit.id),true);let accepted;
      if(state.config.mode==='retrieve'&&!living(state,'ai').length) {
        if(state.carrier&&state.carrier!==unit.id)accepted=playerGuard(state,unit.id);
        else if(!state.carrier&&unit.x===state.core.x&&unit.y===state.core.y)accepted=collectCore(state,unit.id);
        else {
          const route=routesTo(state,state.carrier?{x:0,y:unit.y}:state.core);
          const destination=legalMoves(state,unit).sort((a,b)=>(route.get(`${a.x},${a.y}`)??100)-(route.get(`${b.x},${b.y}`)??100))[0];
          accepted=destination?playerMove(state,unit.id,destination.x,destination.y):playerGuard(state,unit.id);
        }
      } else {
        const action=chooseAIAction(state,unit);
        accepted=action.type==='attack'?playerAttack(state,unit.id,action.target.id):action.type==='move'?playerMove(state,unit.id,action.to.x,action.to.y):playerGuard(state,unit.id);
      }
      assert.equal(accepted,true);actions++;invariant(state);
    }
  }
  assert.ok(actions<500,'The campaign turn budget must terminate play');
  assert.ok(state.winner);return state;
}

test('TACTICS GRID: representative complete legal-input wins and losses across all five tiers, including mission 10,000',()=>{
  for(const [level,winner] of [[1,'player'],[3,'player'],[4,'player'],[2002,'player'],[4003,'player'],[6002,'ai'],[8002,'player'],[10000,'player']])assert.equal(playWithLegalPolicy(level).winner,winner,`Mission ${level}`);
});

test('TACTICS GRID: a passive player can lose and a fresh retry restores the same mission',()=>{
  const state=newGame(1);
  for(let round=0;round<40&&!state.winner;round++){assert.equal(endPlayerTurn(state),true);runAIPhase(state);invariant(state);}
  assert.equal(state.winner,'ai');assert.equal(state.phase,'over');
  const retry=newGame(1);assert.deepEqual(retry.config,state.config);assert.equal(retry.round,1);assert.equal(retry.winner,null);
  assert.ok(retry.units.every(unit=>unit.hp===unit.maxHp&&!unit.acted));
});

// Controlled rule fixtures below are not used as campaign-completion evidence.
function fixture(level=1) {
  const state=newGame(level);state.config.terrain=[];
  const positions=[[0,0],[7,7],[6,7],[1,0],[0,1],[7,0]];
  state.units.forEach((unit,i)=>{[unit.x,unit.y]=positions[i];});return state;
}

test('TACTICS GRID: blocked corners and intervening drones prevent illegal shots and moves',()=>{
  const state=fixture(),unit=state.units[0],target=state.units[3];
  target.x=2;target.y=2;state.units[4].x=7;state.units[4].y=3;
  state.config.terrain=[[1,0],[0,1]];
  assert.equal(lineOfSight(state,unit,target),false);assert.deepEqual(legalMoves(state,unit),[]);
  assert.equal(playerMove(state,'P1',1,1),false);assert.equal(playerAttack(state,'P1','E1'),false);
  state.config.terrain=[];assert.equal(lineOfSight(state,unit,target),true);
  state.units[4].x=1;state.units[4].y=1;assert.equal(lineOfSight(state,unit,target),false);
  assert.ok(!attackTargets(state,unit).includes(target));
});

test('TACTICS GRID: guard absorbs one pulse, a second pulse damages hull, and the next phase resets guard',()=>{
  const state=fixture(),hull=state.units[0].hp;
  assert.equal(playerGuard(state,'P1'),true);assert.equal(state.units[0].guarded,true);
  assert.equal(playerGuard(state,'P1'),false);assert.equal(endPlayerTurn(state),true);runAIPhase(state);
  assert.equal(state.units[0].hp,hull-1);assert.equal(state.units[0].guarded,false);
  assert.ok(state.log.some(line=>line.includes('absorbs the pulse')));
  assert.equal(state.round,2);assert.equal(state.units[0].acted,false);
});

test('TACTICS GRID: unavailable actions cannot mutate dead, activated, enemy-turn or completed states',()=>{
  for(const change of [state=>{state.units[0].hp=0;},state=>{state.units[0].acted=true;},state=>{state.phase='ai';},state=>{state.winner='player';state.phase='over';}]) {
    const state=newGame(4);change(state);const before=JSON.stringify(state);
    assert.equal(selectUnit(state,'P1'),false);assert.equal(playerMove(state,'P1',1,1),false);
    assert.equal(playerAttack(state,'P1','E1'),false);assert.equal(playerGuard(state,'P1'),false);assert.equal(collectCore(state,'P1'),false);
    assert.equal(JSON.stringify(state),before);
  }
});

test('TACTICS GRID: collecting consumes an activation and losing the carrier drops the recoverable core',()=>{
  const state=fixture(4),carrier=state.units[0];state.core={x:2,y:0};
  assert.equal(collectCore(state,'P1'),false);carrier.x=2;carrier.hp=1;
  assert.equal(collectCore(state,'P1'),true);assert.equal(state.carrier,'P1');assert.equal(carrier.acted,true);
  assert.equal(collectCore(state,'P1'),false);assert.equal(playerMove(state,'P1',0,0),false);
  assert.equal(endPlayerTurn(state),true);runAIPhase(state);
  assert.equal(carrier.hp,0);assert.equal(state.carrier,null);assert.deepEqual(state.core,{x:2,y:0});assert.equal(state.winner,null);
});

test('TACTICS GRID: mission budgets terminate play even while surviving drones remain',()=>{
  const state=newGame(4);state.config.roundLimit=1;
  endPlayerTurn(state);runAIPhase(state);
  assert.equal(state.winner,'ai');assert.equal(state.round,1);assert.ok(living(state,'player').length);
  assert.match(state.log[0],/time expired/);
});

function memoryStorage(raw=null) {
  const values=new Map(raw===null?[]:[[SAVE_KEY,raw]]);
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

test('TACTICS GRID: a real mission clear persists once, replay cannot skip a level, and reload restores progress',()=>{
  const storage=memoryStorage(),save=openTacticsCampaign(storage),state=playSequence(1,firstMission);
  assert.equal(state.winner,'player');assert.equal(save.progress.complete(state.config.level),true);assert.equal(save.saved(),true);
  assert.equal(save.progress.complete(1),false);assert.equal(save.progress.complete(3),false);
  const loaded=openTacticsCampaign(storage);assert.equal(loaded.progress.completed,1);assert.equal(loaded.progress.unlocked,2);
  assert.match(loaded.description(),/saved on this device/);
});

test('TACTICS GRID: malformed and inconsistent saves recover safely with visible diagnostic text',()=>{
  for(const raw of ['{','null','[]','{"version":1,"unlocked":9999,"completed":1}','{"version":2,"unlocked":2,"completed":1}']) {
    const save=openTacticsCampaign(memoryStorage(raw));assert.equal(save.progress.unlocked,1);assert.equal(save.progress.completed,0);
    assert.match(save.description(),/unreadable campaign save was reset/);
  }
});

test('TACTICS GRID: denied reads and failed writes preserve session play without claiming a durable save',()=>{
  const denied={getItem(){throw new Error('Denied');},setItem(){throw new Error('Denied');},removeItem(){throw new Error('Denied');}};
  const save=openTacticsCampaign(denied);assert.match(save.description(),/storage is unavailable/);
  assert.equal(save.progress.complete(1),true);assert.equal(save.progress.unlocked,2);assert.equal(save.saved(),false);assert.match(save.description(),/Session-only progress/);
  const full=memoryStorage();full.setItem=()=>{throw new Error('Quota');};
  const quota=openTacticsCampaign(full);assert.equal(quota.progress.complete(1),true);assert.equal(quota.saved(),false);assert.match(quota.description(),/could not save/);
});
