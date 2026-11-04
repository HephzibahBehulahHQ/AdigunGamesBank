import test from 'node:test';
import assert from 'node:assert/strict';
import { offsideSnapshot, tackleDecision, inPenaltyArea } from '../game11/rules.js';
import { FIELD, createMatch, startMatch, stepMatch, passBall, shootBall, selectPlayer, attemptTackle, queueSubstitution, cancelSubstitutions } from '../game11/engine.js';
import { buildFootballScene } from '../game11/scene.js';
import { THREE } from '../shared/three-stage.js';

const actor = (id, team, x, y = 0) => ({ id, team, x, y, vx: 0, vy: 0, facingX: team === 0 ? 1 : -1, facingY: 0, active: true });

test('offside uses the second-last opponent, ball and attacking half; level positions stay onside', () => {
  const kicker = actor('h1', 0, 10), receiver = actor('h2', 0, 31);
  const players = [kicker, receiver, actor('h3', 0, 30), actor('a1', 1, 40), actor('a2', 1, 30)];
  assert.deepEqual(offsideSnapshot(players, { x: 10 }, kicker).candidates, ['h2']);
  assert.deepEqual(offsideSnapshot(players, { x: 32 }, kicker).candidates, []);
  receiver.x = -1; players[2].x = -2; players[3].x = -10; players[4].x = -20;
  assert.deepEqual(offsideSnapshot(players, { x: -15 }, kicker).candidates, []);
});

test('offside mirrors for both teams and only direct corner, goal-kick and throw-in receptions are exempt', () => {
  const kicker = actor('a1', 1, -10), receiver = actor('a2', 1, -31);
  const players = [kicker, receiver, actor('h1', 0, -40), actor('h2', 0, -30)];
  assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker).candidates, ['a2']);
  for (const type of ['Corner', 'Goal kick', 'Throw-in']) assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker, type).candidates, []);
  assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker, 'Direct free kick').candidates, ['a2']);
});

test('a reachable ball-first tackle is legal, a slow body-first contact is a foul without an automatic card', () => {
  const holder = actor('h1', 0, 0), challenger = actor('a1', 1, 1.1), ball = { owner: 'h1', x: 0.78, y: 0 };
  assert.equal(tackleDecision([holder, challenger], ball, challenger, holder).foul, false);
  challenger.x = -1;
  const foul = tackleDecision([holder, challenger], ball, challenger, holder);
  assert.equal(foul.foul, true); assert.equal(foul.sanction, null); assert.equal(foul.penalty, false);
  challenger.vx = 8;
  assert.equal(tackleDecision([holder, challenger], ball, challenger, holder).sanction, 'yellow');
});

test('penalty-area and DOGSO decisions distinguish genuine ball challenges from no-ball contact', () => {
  const holder = actor('h1', 0, 40), challenger = actor('a2', 1, 40, 1.3), keeper = actor('a1', 1, 51);
  const ball = { owner: holder.id, x: 40.78, y: 0 };
  const inside = tackleDecision([holder, challenger, keeper], ball, challenger, holder);
  assert.equal(inside.penalty, true); assert.equal(inside.dogso, true); assert.equal(inside.sanction, 'yellow');
  challenger.x = 39; challenger.y = 0;
  assert.equal(tackleDecision([holder, challenger, keeper], ball, challenger, holder).sanction, 'red');
  holder.x = 30; challenger.x = 30; challenger.y = 1.3; ball.x = 30.78;
  const outside = tackleDecision([holder, challenger, keeper], ball, challenger, holder);
  assert.equal(outside.penalty, false); assert.equal(outside.sanction, 'red');
  assert.equal(inPenaltyArea({ x: -40, y: 0 }, 0), true);
  assert.equal(inPenaltyArea({ x: -40, y: 0 }, 1), false);
});

test('excessive relative speed is sanctioned even when the ball is reachable', () => {
  const holder = actor('h1', 0, 0), challenger = actor('a1', 1, 1.1), ball = { owner: 'h1', x: 0.78, y: 0 };
  holder.vx = 6; challenger.vx = -8;
  const result = tackleDecision([holder, challenger], ball, challenger, holder);
  assert.equal(result.foul, true); assert.equal(result.severity, 'serious'); assert.equal(result.sanction, 'red');
});

const get = (s, id) => s.players.find(p => p.id === id);
function isolatedMatch() {
  const s = createMatch(); startMatch(s);
  s.players.forEach((p, i) => Object.assign(p, { x: -35 + i * 0.7, y: 24 + i % 4, vx: 0, vy: 0, cooldown: 0, decision: 100 }));
  return s;
}
function advance(s, seconds) { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepMatch(s, {}, 1 / 60); }
function looseAt(s, x, y = 0, vx = 0) {
  Object.assign(s.ball, { owner: null, x, y, z: FIELD.ballRadius, vx, vy: 0, vz: 0, ignoreId: null, ignoreTime: 0 });
}
function passPosition(s, onside = false) {
  const kicker = get(s, 'h10'), receiver = get(s, 'h11');
  Object.assign(kicker, { x: 10, y: 0, facingX: 1, facingY: 0, cooldown: 0 });
  Object.assign(receiver, { x: onside ? 29 : 31, y: 0 });
  Object.assign(get(s, 'a1'), { x: 45, y: 20 }); Object.assign(get(s, 'a2'), { x: 30, y: 20 });
  Object.assign(s.ball, { owner: kicker.id, x: 10.78, y: 0 });
  s.controlledId = kicker.id;
  assert.equal(passBall(s, receiver.id), true);
  return receiver;
}
function bodyFoul(s, { offenderId = 'a2', victimId = 'h10', x = 0, reckless = false, side = false } = {}) {
  const victim = get(s, victimId), offender = get(s, offenderId);
  Object.assign(victim, { x, y: 0, vx: 0, vy: 0, facingX: 1, facingY: 0, cooldown: 0 });
  Object.assign(offender, { x: x - (side ? 0 : 1), y: side ? 1.3 : 0, vx: reckless ? 8 : 0, vy: 0, cooldown: 0 });
  Object.assign(s.ball, { owner: victim.id, x: x + 0.78, y: 0 });
  s.phase = 'live'; s.restartKick = s.restartTouch = s.offside = null;
  assert.equal(attemptTackle(s, offender.id), true);
  return offender;
}
function touchline(s) {
  s.phase = 'live'; s.restartKick = null;
  looseAt(s, 0, 34.2); s.ball.lastTouch = 1;
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.restartKick.type, 'Throw-in');
}

test('offside position alone does not stop play; involvement is judged using the kick snapshot even after retreat', () => {
  const s = isolatedMatch(), receiver = passPosition(s);
  assert.ok(s.offside.candidates.includes(receiver.id));
  assert.equal(s.phase, 'live'); assert.equal(s.stats.offsides[0], 0);
  receiver.x = -2; receiver.y = 0; looseAt(s, -2);
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.phase, 'restart'); assert.equal(s.restartKick.type, 'Indirect free kick');
  assert.equal(s.restartKick.team, 1); assert.ok(s.restartKick.x < 0);
  assert.equal(s.stats.offsides[0], 1); assert.deepEqual(s.score, [0, 0]);
});

test('a receiver onside at the kick may run beyond the defensive line and receive legally', () => {
  const s = isolatedMatch(), receiver = passPosition(s, true);
  receiver.x = 36; receiver.y = 0; looseAt(s, 36);
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, receiver.id); assert.equal(s.phase, 'live'); assert.equal(s.stats.offsides[0], 0);
});

test('direct throw-in reception is exempt; the receiving player’s next kick creates a normal snapshot', () => {
  const s = isolatedMatch(); touchline(s); advance(s, 1.2);
  const taker = get(s, s.restartKick.takerId), receiver = s.players.find(p => p.team === 0 && p.id !== taker.id && !p.keeper);
  Object.assign(receiver, { x: 30, y: 15, cooldown: 0 });
  assert.equal(passBall(s, receiver.id, taker.id), true);
  assert.equal(s.offside.exempt, true); assert.deepEqual(s.offside.candidates, []); assert.equal(s.ball.z, 1.8);
  looseAt(s, receiver.x, receiver.y); stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, receiver.id); assert.equal(s.stats.offsides[0], 0);
  const next = get(s, 'h11');
  Object.assign(receiver, { x: 10, y: 0, cooldown: 0 }); Object.assign(next, { x: 31, y: 0 });
  Object.assign(get(s, 'a1'), { x: 45, y: 20 }); Object.assign(get(s, 'a2'), { x: 30, y: 20 });
  s.ball.x = 10.78; s.ball.y = 0;
  assert.equal(passBall(s, next.id, receiver.id), true); assert.equal(s.offside.exempt, false);
  assert.ok(s.offside.candidates.includes(next.id));
});

test('a goal-frame rebound and deliberate save preserve offside; ordinary opponent control resets it', () => {
  const s = isolatedMatch(); passPosition(s);
  looseAt(s, 52, FIELD.goalWidth / 2 + 0.06, 60); stepMatch(s, {}, 1 / 60);
  assert.ok(s.offside.candidates.includes('h11')); assert.match(s.event, /goal frame/);
  const keeper = get(s, 'a1'); Object.assign(keeper, { x: 49, y: 0, cooldown: 0 });
  looseAt(s, 48.8, 0, 20); stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, keeper.id); assert.ok(s.offside.candidates.includes('h11'));
  const defender = get(s, 'a2'); Object.assign(defender, { x: 20, y: 0, cooldown: 0 });
  looseAt(s, 20); stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, defender.id); assert.equal(s.offside, null);
});

test('an offside attacker challenging the saving goalkeeper is penalised before winning possession', () => {
  const s = isolatedMatch(); passPosition(s);
  const keeper = get(s, 'a1'), attacker = get(s, 'h11');
  Object.assign(keeper, { x: 45, y: 0 }); Object.assign(attacker, { x: 44, y: 0, cooldown: 0 });
  Object.assign(s.ball, { owner: keeper.id, x: 44.22, y: 0 });
  attemptTackle(s, attacker.id);
  assert.equal(s.stats.offsides[0], 1); assert.equal(s.restartKick.team, 1); assert.equal(s.stats.fouls[0], 0);
});

test('careless contact awards a playable direct free kick; clock and player movement wait for the real kick', () => {
  const s = isolatedMatch(); bodyFoul(s);
  assert.equal(s.stats.fouls[1], 1); assert.equal(s.stats.yellows[1], 0); assert.equal(s.restartKick.type, 'Direct free kick');
  const time = s.elapsed; advance(s, 1.2);
  assert.equal(s.phase, 'live'); assert.equal(s.elapsed, time);
  const taker = get(s, s.restartKick.takerId), before = [taker.x, taker.y];
  stepMatch(s, { x: 1, sprint: true }, 0.25); assert.deepEqual([taker.x, taker.y], before);
  assert.equal(shootBall(s, -1), true); assert.equal(s.restartKick, null); assert.equal(s.ball.owner, null);
  assert.ok(Math.hypot(s.ball.vx, s.ball.vy) > 20); stepMatch(s, {}, 1 / 60); assert.ok(s.elapsed > time);
});

test('second yellow sends off the actual player; the vacancy cannot be replaced or selected', () => {
  const s = isolatedMatch();
  const offender = bodyFoul(s, { offenderId: 'h2', victimId: 'a10', reckless: true });
  assert.equal(offender.yellowCards, 1); assert.equal(offender.active, true);
  bodyFoul(s, { offenderId: 'h2', victimId: 'a10', reckless: true });
  assert.equal(offender.yellowCards, 2); assert.equal(offender.redCard, true); assert.equal(offender.active, false);
  assert.equal(s.players.filter(p => p.team === 0 && p.active).length, 10);
  assert.equal(s.stats.yellows[0], 2); assert.equal(s.stats.reds[0], 1);
  assert.equal(selectPlayer(s, offender.id), false);
  assert.equal(queueSubstitution(s, offender.id, 'h12').ok, false);
});

test('penalty setup puts players legally outside the area and the actual forward shot can score', () => {
  const s = isolatedMatch(); Object.assign(get(s, 'a1'), { x: 51, y: 0 });
  const offender = bodyFoul(s, { x: 40, side: true });
  assert.equal(s.restartKick.type, 'Penalty'); assert.equal(offender.yellowCards, 1);
  assert.deepEqual([s.ball.x, s.ball.y], [41.5, 0]);
  const keeper = get(s, 'a1'); assert.deepEqual([keeper.x, keeper.y], [52.5, 0]);
  for (const p of s.players.filter(p => p.active && p.id !== s.restartKick.takerId && p.id !== keeper.id)) {
    assert.ok(p.x < 41.5); assert.ok(!inPenaltyArea(p, 1)); assert.ok(Math.hypot(p.x - 41.5, p.y) >= 9.15);
  }
  advance(s, 1.2); assert.equal(passBall(s), false); assert.equal(shootBall(s, 1), true); assert.ok(s.ball.vx > 0);
  advance(s, 0.6); assert.deepEqual(s.score, [1, 0]); assert.equal(s.phase, 'goal');
});

test('direct red for denying a clear chance removes the offender; fewer than seven abandons without awarding a win', () => {
  const s = isolatedMatch(); Object.assign(get(s, 'a1'), { x: 51, y: 0 });
  const offender = bodyFoul(s, { x: 30, side: true });
  assert.equal(offender.redCard, true); assert.equal(s.restartKick.type, 'Direct free kick');
  for (const id of ['a3', 'a4', 'a5', 'a6']) bodyFoul(s, { offenderId: id, x: 30, side: true });
  assert.equal(s.players.filter(p => p.team === 1 && p.active).length, 6);
  assert.equal(s.phase, 'fulltime'); assert.equal(s.qualified, false); assert.equal(s.winner, null);
  assert.match(s.endReason, /fewer than seven/); assert.deepEqual(s.score, [0, 0]);
});

test('indirect kicks cannot score directly; a taker’s second touch awards the opposing indirect kick', () => {
  const s = isolatedMatch(), receiver = passPosition(s); looseAt(s, receiver.x); stepMatch(s, {}, 1 / 60);
  advance(s, 1.2);
  // The awarded away restart is still awaiting its real first kick.
  const takerId = s.restartKick.takerId;
  assert.equal(shootBall(s, 0, takerId), true);
  s.players.forEach(p => { p.y = 25; p.cooldown = 0; });
  looseAt(s, -52.3, 0, -30); stepMatch(s, {}, 1 / 60);
  assert.deepEqual(s.score, [0, 0]); assert.equal(s.restartKick.type, 'Goal kick');
  assert.equal(s.restartKick.team, 0);
  advance(s, 1.2); const goalTaker = get(s, s.restartKick.takerId);
  assert.equal(passBall(s, null, goalTaker.id), true);
  goalTaker.cooldown = 0; looseAt(s, goalTaker.x, goalTaker.y); stepMatch(s, {}, 1 / 60);
  assert.equal(s.restartKick.type, 'Indirect free kick'); assert.equal(s.restartKick.team, 1);
});

test('queued substitutions replace roster identity and restore stamina only at a real stoppage', () => {
  const s = isolatedMatch(); selectPlayer(s, 'h11'); get(s, 'h11').stamina = 0.1;
  assert.equal(queueSubstitution(s, 'h11', 'h12').ok, true);
  assert.ok(get(s, 'h11')); assert.equal(get(s, 'h12'), undefined); assert.equal(s.substitutions.used[0], 0);
  touchline(s);
  assert.equal(get(s, 'h11'), undefined); assert.equal(get(s, 'h12').stamina, 1);
  assert.equal(get(s, 'h12').slot, 11); assert.equal(s.substitutions.used[0], 1); assert.equal(s.substitutions.windows[0], 1);
  assert.ok(get(s, s.controlledId)?.active); assert.equal(s.bench[0][0].used, true);
  assert.equal(queueSubstitution(s, 'h2', 'h12').ok, false);
  assert.equal(queueSubstitution(s, 'h1', 'h13').ok, false);
  assert.equal(queueSubstitution(s, 'h2', 'h13').ok, true); assert.equal(s.substitutions.windows[0], 1);
  assert.equal(s.substitutions.used[0], 2); assert.equal(s.players.filter(p => p.team === 0 && p.active).length, 11);
});

test('five substitutions and three separate opportunities are enforced; cancellation consumes neither', () => {
  const s = isolatedMatch(); queueSubstitution(s, 'h2', 'h12'); cancelSubstitutions(s);
  touchline(s); assert.equal(s.substitutions.used[0], 0); assert.equal(s.substitutions.windows[0], 0);
  for (const [outgoing, incoming] of [['h2','h12'],['h3','h13'],['h4','h14']]) {
    s.phase = 'live'; s.restartKick = null;
    assert.equal(queueSubstitution(s, outgoing, incoming).ok, true); touchline(s);
  }
  assert.equal(s.substitutions.windows[0], 3);
  assert.equal(queueSubstitution(s, 'h5', 'h15').ok, true); assert.equal(queueSubstitution(s, 'h6', 'h16').ok, true);
  assert.equal(s.substitutions.used[0], 5); assert.equal(s.substitutions.windows[0], 3);
  assert.equal(queueSubstitution(s, 'h7', 'h17').ok, false);
  const t = isolatedMatch();
  for (const [outgoing, incoming] of [['h2','h12'],['h3','h13'],['h4','h14']]) {
    t.phase = 'live'; t.restartKick = null; queueSubstitution(t, outgoing, incoming); touchline(t);
  }
  t.phase = 'live'; t.restartKick = null;
  assert.equal(queueSubstitution(t, 'h5', 'h15').ok, false); assert.equal(t.substitutions.used[0], 3);
});

test('rendered roster hides departed and dismissed players and creates the real incoming model', () => {
  const s = isolatedMatch(), scene = new THREE.Scene(), view = buildFootballScene({ scene });
  view.update(s, 0);
  queueSubstitution(s, 'h11', 'h12'); touchline(s); view.update(s, 0);
  const model = id => view.playerRoots.find(root => root.userData.playerId === id);
  assert.equal(model('h11').visible, false); assert.equal(model('h12').visible, true);
  assert.equal(view.playerRoots.filter(root => root.visible).length, 22);
  bodyFoul(s, { offenderId: 'h2', victimId: 'a10', reckless: true }); bodyFoul(s, { offenderId: 'h2', victimId: 'a10', reckless: true });
  view.update(s, 0); assert.equal(model('h2').visible, false); assert.equal(view.playerRoots.filter(root => root.visible).length, 21);
});

test('goal-kick/corner placement and opponent separation stay legal at the field boundaries', () => {
  const s = isolatedMatch();
  s.players.filter(p => p.team === 0).forEach(p => Object.assign(p, { x: 50, y: 20 }));
  looseAt(s, 52.3, 12, 30); s.ball.lastTouch = 0; stepMatch(s, {}, 1 / 60);
  assert.equal(s.restartKick.type, 'Goal kick'); assert.ok(s.ball.x >= 47 && s.ball.x <= 52.5);
  for (const p of s.players.filter(p => p.team === 0)) assert.equal(inPenaltyArea(p, 1), false);
  s.phase = 'live'; s.restartKick = null;
  s.players.filter(p => p.team === 1).forEach(p => Object.assign(p, { x: 51.8, y: 33 }));
  looseAt(s, 52.3, 32, 30); s.ball.lastTouch = 1; stepMatch(s, {}, 1 / 60);
  assert.equal(s.restartKick.type, 'Corner'); assert.ok(Math.hypot(52.5 - s.ball.x, 34 - s.ball.y) <= 1);
  for (const p of s.players.filter(p => p.team === 1)) assert.ok(Math.hypot(p.x - s.ball.x, p.y - s.ball.y) >= 9.15);
});

test('a keeper contact before the goal line stops a fast ball before it can score in the same time step', () => {
  const s = isolatedMatch(), keeper = get(s, 'a1');
  Object.assign(keeper, { x: 52, y: 0, cooldown: 0 }); looseAt(s, 51.8, 0, 65);
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, keeper.id); assert.deepEqual(s.score, [0, 0]); assert.equal(s.phase, 'live'); assert.ok(s.ball.x < 52.5);
});

test('a throw-in cannot be shot, an indirect own goal awards a corner, and idle restarts resume real play', () => {
  const s = isolatedMatch(); touchline(s); advance(s, 1.2);
  assert.equal(shootBall(s), false); assert.equal(s.restartKick.type, 'Throw-in');
  advance(s, 4.2); assert.equal(s.restartKick, null); assert.ok(s.elapsed > 0);
  const t = isolatedMatch(); bodyFoul(t); advance(t, 1.2); shootBall(t, 0);
  t.players.forEach(p => { p.y = 25; p.cooldown = 0; }); looseAt(t, -52.3, 0, -30);
  stepMatch(t, {}, 1 / 60); assert.deepEqual(t.score, [0, 0]); assert.equal(t.restartKick.type, 'Corner'); assert.equal(t.restartKick.team, 1);
});
