import { LEVEL_COUNT, tierFor, validLevel } from '../shared/progression.js';

export const FIELD = Object.freeze({ length: 105, width: 68, goalWidth: 7.32, goalHeight: 2.44, ballRadius: 0.11 });
const HALF = FIELD.length / 2, SIDE = FIELD.width / 2, DT = 1 / 60;
const FORMATION = [[-48,0],[-33,-25],[-36,-9],[-36,9],[-33,25],[-18,-20],[-22,0],[-18,20],[-8,-23],[-6,0],[-8,23]];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => { const length = Math.hypot(x, y); return length ? { x: x / length, y: y / length } : { x: 0, y: 0 }; };
const teamName = (s, team) => team === 0 ? 'Adigun XI' : s.config.opponent;

export function levelConfig(value) {
  const level = validLevel(value), skill = (level - 1) / (LEVEL_COUNT - 1);
  return Object.freeze({
    level, tier: tierFor(level), seed: (level * 2654435761) >>> 0,
    opponent: ['Copper Coast XI', 'Cedar Vale XI', 'Ivory Ridge XI', 'Northbridge XI'][(level - 1) % 4],
    opponentSpeed: 4.65 + skill * 1.85, opponentSkill: 0.25 + skill * 0.7,
    decisionInterval: 1.0 - skill * 0.71, pressDistance: 13 + skill * 13,
    shotError: 2.4 - skill * 1.95, goalkeeperSpeed: 3.5 + skill * 2.4,
    matchSeconds: 120 + Math.floor(skill * 60), winMargin: 1 + Math.floor(skill * 2.999),
    requiredGoals: 1 + Math.floor(skill * 2.999), formationWidth: 0.8 + skill * 0.2
  });
}

export function createMatch(level = 1) {
  const config = levelConfig(level);
  const players = [0, 1].flatMap(team => FORMATION.map(([x, y], i) => ({
    id: `${team === 0 ? 'h' : 'a'}${i + 1}`, team, number: i + 1, keeper: i === 0,
    baseX: x, baseY: y, x: team === 0 ? x : -x, y: team === 0 ? y : -y,
    vx: 0, vy: 0, facingX: team === 0 ? 1 : -1, facingY: 0, stamina: 1,
    cooldown: 0, decision: i * 0.07, running: 0
  })));
  const match = {
    config, players, controlledId: 'h10', phase: 'ready', pausedFrom: null,
    elapsed: 0, accumulator: 0, score: [0, 0], winner: null, qualified: false,
    ball: { x: 0, y: 0, z: FIELD.ballRadius, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: 0, ignoreId: null, ignoreTime: 0 },
    rng: config.seed, restartTime: 0, kickoffTeam: 0, pending: {}, eventNumber: 0,
    event: 'Kick off when ready. Adigun XI attacks the goal on the right.', stats: { shots: [0, 0], passes: [0, 0], saves: [0, 0] }
  };
  prepareKickoff(match, 0);
  return match;
}
function random(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
function announce(s, message) { s.event = message; s.eventNumber++; }
function player(s, id) { return s.players.find(p => p.id === id); }
function prepareKickoff(s, team) {
  for (const p of s.players) {
    const sign = p.team === 0 ? 1 : -1;
    p.x = p.baseX * sign; p.y = p.baseY * sign; p.vx = p.vy = 0; p.cooldown = 0;
  }
  const taker = s.players.find(p => p.team === team && p.number === 10);
  taker.x = team === 0 ? -0.8 : 0.8; taker.y = 0;
  s.ball = { x: 0, y: 0, z: FIELD.ballRadius, vx: 0, vy: 0, vz: 0, owner: taker.id, lastTouch: team, ignoreId: null, ignoreTime: 0 };
  if (team === 0) s.controlledId = taker.id;
}
export function startMatch(s) { if (s.phase !== 'ready') return false; s.phase = 'live'; announce(s, 'Kickoff. Adigun XI attacks right; Copper shirts attack left.'); return true; }
export function pauseMatch(s) {
  if (!['live', 'goal', 'restart'].includes(s.phase)) return false;
  s.pausedFrom = s.phase; s.phase = 'paused'; s.accumulator = 0; s.pending = {}; return true;
}
export function resumeMatch(s) { if (s.phase !== 'paused') return false; s.phase = s.pausedFrom || 'live'; s.pausedFrom = null; return true; }
export function selectPlayer(s, id) {
  const p = player(s, id);
  if (!p || p.team !== 0 || s.phase === 'fulltime') return false;
  s.controlledId = id; return true;
}
export function switchPlayer(s) {
  const candidates = s.players.filter(p => p.team === 0 && p.id !== s.controlledId && !p.keeper);
  candidates.sort((a, b) => distance(a, s.ball) - distance(b, s.ball));
  return candidates[0] ? selectPlayer(s, candidates[0].id) : false;
}
function release(s, p, target, speed, lift) {
  const direction = unit(target.x - p.x, target.y - p.y), b = s.ball;
  if (!direction.x && !direction.y) return false;
  b.owner = null; b.x = p.x + direction.x * 0.92; b.y = p.y + direction.y * 0.92; b.z = FIELD.ballRadius + 0.04;
  b.vx = direction.x * speed; b.vy = direction.y * speed; b.vz = lift;
  b.lastTouch = p.team; b.ignoreId = p.id; b.ignoreTime = 0.38; p.cooldown = 0.6;
  p.facingX = direction.x; p.facingY = direction.y;
  return true;
}
function choosePass(s, p, explicit) {
  const direct = player(s, explicit);
  if (direct && direct.team === p.team && direct.id !== p.id && distance(direct, p) < 45) return direct;
  const sign = p.team === 0 ? 1 : -1;
  const choices = s.players.filter(q => q.team === p.team && q.id !== p.id && distance(q, p) > 3 && distance(q, p) < 38);
  choices.sort((a, b) => {
    const merit = q => (q.x - p.x) * sign * 0.65 - distance(q, p) * 0.2 + Math.min(8, ...s.players.filter(r => r.team !== p.team).map(r => distance(q, r))) * 1.3;
    return merit(b) - merit(a);
  });
  return choices[0];
}
export function passBall(s, targetId = null, actorId = s.controlledId) {
  const p = player(s, actorId);
  if (s.phase !== 'live' || !p || s.ball.owner !== p.id || p.cooldown > 0) return false;
  const target = choosePass(s, p, targetId);
  if (!target) return false;
  const lead = { x: target.x + target.vx * 0.35, y: target.y + target.vy * 0.35 };
  release(s, p, lead, clamp(12 + distance(p, target) * 0.45, 14, 26), 0.45);
  s.stats.passes[p.team]++;
  announce(s, `${teamName(s, p.team)} #${p.number} passes to #${target.number}.`);
  return true;
}
export function shootBall(s, aim = 0, actorId = s.controlledId) {
  const p = player(s, actorId);
  if (s.phase !== 'live' || !p || s.ball.owner !== p.id || p.cooldown > 0) return false;
  const sign = p.team === 0 ? 1 : -1;
  const target = { x: sign * (HALF + 3), y: clamp(Number.isFinite(aim) ? aim : 0, -1, 1) * 2.55 };
  if (p.team === 1) target.y += (random(s) - 0.5) * s.config.shotError;
  release(s, p, target, p.team === 0 ? 28 : 22 + s.config.opponentSkill * 7, 1.1 + Math.min(1.3, Math.abs(target.x - p.x) * 0.025));
  s.stats.shots[p.team]++;
  announce(s, `${teamName(s, p.team)} #${p.number} shoots.`);
  return true;
}
function drive(p, dx, dy, speed, dt) {
  const d = unit(dx, dy), targetX = d.x * speed, targetY = d.y * speed;
  const response = Math.min(1, dt * 12);
  p.vx += (targetX - p.vx) * response; p.vy += (targetY - p.vy) * response;
  p.x = clamp(p.x + p.vx * dt, -HALF + 0.65, HALF - 0.65);
  p.y = clamp(p.y + p.vy * dt, -SIDE + 0.65, SIDE - 0.65);
  if (Math.hypot(p.vx, p.vy) > 0.2) { const facing = unit(p.vx, p.vy); p.facingX = facing.x; p.facingY = facing.y; }
  p.running += Math.hypot(p.vx, p.vy) * dt;
}
function nearestChasers(s, team) {
  return s.players.filter(p => p.team === team && !p.keeper && p.id !== s.controlledId).sort((a, b) => distance(a, s.ball) - distance(b, s.ball)).slice(0, 2).map(p => p.id);
}
function aiMove(s, p, dt, chasers) {
  const sign = p.team === 0 ? 1 : -1, b = s.ball, owner = player(s, b.owner);
  const attacking = owner?.team === p.team;
  const speed = p.team === 0 ? 5.6 : s.config.opponentSpeed;
  if (p.keeper) {
    const goalX = -sign * (HALF - 2.2), targetY = clamp(b.y * 0.24, -2.65, 2.65);
    const targetX = Math.abs(b.x - goalX) < 13 && Math.abs(b.y) < 13 ? goalX + sign * 2.2 : goalX;
    drive(p, targetX - p.x, targetY - p.y, p.team === 0 ? 5.0 : s.config.goalkeeperSpeed, dt);
    if (b.owner === p.id && p.cooldown <= 0) passBall(s, null, p.id);
    return;
  }
  if (b.owner === p.id) {
    const danger = s.players.filter(q => q.team !== p.team && distance(p, q) < 5);
    p.decision -= dt;
    if (p.decision <= 0 && p.cooldown <= 0) {
      p.decision = p.team === 1 ? s.config.decisionInterval : 0.7;
      if ((HALF - p.x * sign) < 24 && Math.abs(p.y) < 19) shootBall(s, (random(s) < 0.5 ? -1 : 1) * 0.8, p.id);
      else if (danger.length > 0 && random(s) < 0.75) passBall(s, null, p.id);
    }
    const bend = danger.reduce((sum, q) => sum + (p.y >= q.y ? 1 : -1) * 1.4, 0);
    drive(p, sign, -p.y * 0.018 + bend, speed * 0.93, dt);
    return;
  }
  if (!attacking && chasers.includes(p.id) && distance(p, b) < s.config.pressDistance + 17) {
    drive(p, b.x + b.vx * 0.13 - p.x, b.y + b.vy * 0.13 - p.y, speed, dt);
  } else {
    const advance = attacking ? 23 : clamp(b.x * sign * 0.25, -13, 12);
    const targetX = clamp((p.baseX + advance) * sign, -HALF + 6, HALF - 6);
    const targetY = clamp(p.baseY * (p.team ? s.config.formationWidth : 0.9) * sign + b.y * 0.14, -SIDE + 4, SIDE - 4);
    const d = Math.hypot(targetX - p.x, targetY - p.y);
    drive(p, d < 0.6 ? 0 : targetX - p.x, d < 0.6 ? 0 : targetY - p.y, speed * 0.8, dt);
  }
}
function claim(s, p, keeperSave = false) {
  s.ball.owner = p.id; s.ball.lastTouch = p.team; s.ball.vx = s.ball.vy = s.ball.vz = 0;
  p.cooldown = keeperSave ? 0.45 : 0.13;
  if (p.team === 0) s.controlledId = p.id;
  if (keeperSave) { s.stats.saves[p.team]++; announce(s, `${teamName(s, p.team)} goalkeeper holds the shot.`); }
}
function restart(s, team, x, y, type) {
  const taker = s.players.filter(p => p.team === team && (type === 'Goal kick' ? p.keeper : !p.keeper)).sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }))[0];
  taker.x = clamp(x, -HALF + 1, HALF - 1); taker.y = clamp(y, -SIDE + 1, SIDE - 1); taker.vx = taker.vy = 0;
  claim(s, taker); s.ball.x = taker.x; s.ball.y = taker.y; s.ball.z = FIELD.ballRadius;
  s.phase = 'restart'; s.restartTime = 1.1;
  announce(s, `${type} for ${teamName(s, team)}.`);
}
function segmentDistance(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, square = dx * dx + dy * dy;
  const t = square ? clamp(((x - a.x) * dx + (y - a.y) * dy) / square, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, y - a.y - dy * t), t };
}
function ballStep(s, dt) {
  const b = s.ball, previous = { x: b.x, y: b.y, z: b.z }, owner = player(s, b.owner);
  b.ignoreTime = Math.max(0, b.ignoreTime - dt);
  if (owner) {
    b.x = owner.x + owner.facingX * 0.78; b.y = owner.y + owner.facingY * 0.78; b.z = FIELD.ballRadius;
    const challenger = s.players.filter(p => p.team !== owner.team && p.cooldown <= 0 && distance(p, owner) < 1.05).sort((a, c) => distance(a, b) - distance(c, b))[0];
    if (challenger && random(s) < dt * (challenger.team === 0 ? 3.0 : 1.5 + s.config.opponentSkill * 3)) {
      owner.cooldown = 0.9; claim(s, challenger); announce(s, `${teamName(s, challenger.team)} #${challenger.number} wins possession.`);
    }
  } else {
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 9.81 * dt;
    if (b.z <= FIELD.ballRadius) { b.z = FIELD.ballRadius; b.vz = Math.abs(b.vz) > 0.65 ? Math.abs(b.vz) * 0.42 : 0; }
    const drag = Math.exp(-(b.z <= FIELD.ballRadius + 0.02 ? 0.62 : 0.08) * dt);
    b.vx *= drag; b.vy *= drag;
    // Swept collisions prevent fast shots from tunnelling through nearby feet/keepers.
    for (const p of s.players) {
      if (p.id === b.ignoreId && b.ignoreTime > 0) continue;
      const contact = segmentDistance(p.x, p.y, previous, b);
      const height = previous.z + (b.z - previous.z) * contact.t;
      if (contact.distance < (p.keeper ? 1.03 : 0.62) && height < (p.keeper ? 2.05 : 0.82) && p.cooldown <= 0) {
        claim(s, p, p.keeper && Math.hypot(b.vx, b.vy) > 12); break;
      }
    }
  }
  // Solid posts and crossbar: a shot touching their volume cannot also score.
  for (const sign of [-1, 1]) {
    const cross = (sign * HALF - previous.x) / (b.x - previous.x);
    if (cross >= 0 && cross <= 1 && Number.isFinite(cross)) {
      const y = previous.y + (b.y - previous.y) * cross, z = previous.z + (b.z - previous.z) * cross;
      const post = Math.abs(Math.abs(y) - (FIELD.goalWidth / 2 + 0.06)) < FIELD.ballRadius + 0.06 && z < FIELD.goalHeight + FIELD.ballRadius;
      const bar = Math.abs(z - (FIELD.goalHeight + 0.06)) < FIELD.ballRadius + 0.06 && Math.abs(y) < FIELD.goalWidth / 2 + FIELD.ballRadius;
      if (post || bar) { b.x = sign * (HALF - FIELD.ballRadius - 0.08); b.vx *= -0.65; b.owner = null; announce(s, 'Off the goal frame. Play continues.'); return; }
    }
  }
  for (const sign of [-1, 1]) {
    const plane = sign * (HALF + FIELD.ballRadius);
    if (previous.x * sign <= HALF + FIELD.ballRadius && b.x * sign > HALF + FIELD.ballRadius) {
      const t = (plane - previous.x) / (b.x - previous.x);
      const y = previous.y + (b.y - previous.y) * t, z = previous.z + (b.z - previous.z) * t;
      if (Math.abs(y) + FIELD.ballRadius < FIELD.goalWidth / 2 && z + FIELD.ballRadius < FIELD.goalHeight) {
        const team = sign === 1 ? 0 : 1;
        s.score[team]++; s.phase = 'goal'; s.restartTime = 2.2; s.kickoffTeam = 1 - team;
        b.owner = null; b.vx *= 0.15; b.vy *= 0.15;
        announce(s, `GOAL for ${teamName(s, team)}. ${s.score[0]} – ${s.score[1]}.`); return;
      }
      const defending = sign === 1 ? 1 : 0;
      if (b.lastTouch === defending) restart(s, 1 - defending, sign * (HALF - 1.2), Math.sign(b.y || 1) * (SIDE - 1.2), 'Corner');
      else restart(s, defending, sign * (HALF - 6), 0, 'Goal kick');
      return;
    }
  }
  if (Math.abs(b.y) > SIDE + FIELD.ballRadius) restart(s, 1 - b.lastTouch, clamp(b.x, -HALF + 3, HALF - 3), Math.sign(b.y) * (SIDE - 1), 'Throw-in');
}
function finish(s) {
  s.phase = 'fulltime'; s.elapsed = s.config.matchSeconds;
  s.winner = s.score[0] > s.score[1] ? 'home' : s.score[0] < s.score[1] ? 'away' : 'draw';
  s.qualified = s.winner === 'home' && s.score[0] - s.score[1] >= s.config.winMargin && s.score[0] >= s.config.requiredGoals;
  s.pending = {};
  announce(s, `Full time: Adigun XI ${s.score[0]} – ${s.score[1]} ${s.config.opponent}. ${s.qualified ? 'Campaign objective achieved.' : 'Objective not achieved. Retry the match.'}`);
}
function tick(s, input, dt) {
  if (s.phase === 'goal' || s.phase === 'restart') {
    s.restartTime -= dt;
    if (s.restartTime <= 0) { if (s.phase === 'goal') prepareKickoff(s, s.kickoffTeam); s.phase = 'live'; }
    return;
  }
  if (s.phase !== 'live') return;
  if (input.switch) switchPlayer(s);
  if (input.pass) passBall(s, input.passTarget);
  if (input.shoot) shootBall(s, input.aim ?? 0);
  const controlled = player(s, s.controlledId), chasers = [nearestChasers(s, 0), nearestChasers(s, 1)];
  for (const p of s.players) {
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.id === controlled.id) {
      const dx = clamp(Number(input.x) || 0, -1, 1), dy = clamp(Number(input.y) || 0, -1, 1);
      const sprinting = input.sprint && p.stamina > 0.05 && (dx || dy);
      p.stamina = clamp(p.stamina + (sprinting ? -0.12 : 0.075) * dt, 0, 1);
      drive(p, dx, dy, sprinting ? 8 : 6.2, dt);
      if (input.tackle && p.cooldown <= 0) {
        const holder = player(s, s.ball.owner);
        if (holder && holder.team !== p.team && distance(p, holder) < 1.65) { holder.cooldown = 1; claim(s, p); announce(s, 'Clean tackle. Adigun XI takes possession.'); }
        else p.cooldown = 0.55;
      }
    } else aiMove(s, p, dt, chasers[p.team]);
  }
  // Player bodies have finite width, including when the two teams press together.
  for (let i = 0; i < s.players.length; i++) for (let j = i + 1; j < s.players.length; j++) {
    const a = s.players[i], b = s.players[j], d = distance(a, b);
    if (d > 0 && d < 0.62) { const push = (0.62 - d) * 0.5, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push; }
  }
  ballStep(s, dt);
  s.elapsed += dt;
  if (s.elapsed + 1e-7 >= s.config.matchSeconds) finish(s);
}
export function stepMatch(s, input = {}, seconds = DT) {
  if (!Number.isFinite(seconds) || seconds <= 0 || ['ready', 'paused', 'fulltime'].includes(s.phase)) return s;
  const dt = Math.min(seconds, 0.25);
  for (const action of ['pass', 'shoot', 'switch', 'tackle']) if (input[action]) s.pending[action] = true;
  if (input.passTarget) s.pending.passTarget = input.passTarget;
  s.accumulator += dt;
  while (s.accumulator + 1e-10 >= DT) {
    tick(s, { ...input, ...s.pending }, DT); s.pending = {}; s.accumulator -= DT;
    input = { ...input, pass: false, shoot: false, switch: false, tackle: false };
    if (s.phase === 'fulltime') { s.accumulator = 0; break; }
  }
  return s;
}
