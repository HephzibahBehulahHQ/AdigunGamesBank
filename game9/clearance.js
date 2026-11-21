import { randomFor, validLevel } from '../shared/progression.js';

export const LINE = 0;
export const SAFETY_LINE = 8;
export const BALL_RADIUS = 0.11;
export const STEP = 0.1;
export const CLEARANCE_SPEED = 14;
const HALF_GOAL = 3.66;
const DEFENDER_SPEED = 4.5;
const CONTROL_REACH = 0.62;
const CLEARANCE_WINDOW = 2.3;
const PLANT_DISTANCE = 0.45;

export function makeDrill(level) {
  level = validLevel(level);
  const difficulty = (level - 1) / 9999;
  const random = randomFor(level ^ 0x3efa91);
  return Array.from({ length: 3 + Math.floor(difficulty * 3) }, () => {
    const pace = Math.round(9 + difficulty * 13 + random() * 5);
    const approachTime = Math.round((2.2 - difficulty * 0.9 + random() * 0.4) / STEP) * STEP;
    const feed = {
      pace,
      approachTime,
      crossing: (random() * 2 - 1) * (2.1 + difficulty),
      origin: (random() * 2 - 1) * 5,
      channel: (random() > 0.5 ? 1 : -1) * (2.5 + random() * 2),
      halfWidth: 1.15 - difficulty * 0.55,
      drift: (random() * 2 - 1) * difficulty * 0.17
    };
    if (level > 2000) {
      const z = 5.35 + random() * 0.65;
      const centerLine = feed.crossing + z / SAFETY_LINE * (feed.channel - feed.crossing) +
        feed.drift * z * (z / SAFETY_LINE - 1);
      const side = random() < 0.5 ? -1 : 1;
      feed.pressure = {
        z,
        center: centerLine + side * (0.57 + random() * 0.10),
        phase: random() * Math.PI * 2,
        speed: 1.8 + 2.8 * difficulty,
        range: 0.075 + 0.085 * difficulty
      };
    }
    if (level > 6000) {
      feed.receiver = {
        phase: random() * Math.PI * 2,
        speed: 1.35 + difficulty,
        range: 0.22 + 0.11 * difficulty
      };
    }
    return feed;
  });
}

export function incomingAt(feed, time) {
  const fraction = time / feed.approachTime;
  return {
    x: feed.origin + (feed.crossing - feed.origin) * fraction,
    z: feed.pace * (feed.approachTime - time)
  };
}

export function clearanceAt(contact, angle, drift, z) {
  const distance = z - contact.z;
  return {
    x: contact.x + distance * Math.tan(angle * Math.PI / 180) + drift * distance ** 2 / SAFETY_LINE,
    z
  };
}

export function readContact(feed, tick, defender) {
  const time = tick * STEP;
  const ball = incomingAt(feed, time);
  const delay = Math.max(0, (ball.z - PLANT_DISTANCE) / feed.pace);
  const contact = delay > 0 ? incomingAt(feed, time + delay) : ball;
  const reachable = ball.z <= CLEARANCE_WINDOW && ball.z >= LINE - BALL_RADIUS &&
    Math.abs(contact.x - defender) <= CONTROL_REACH;
  return { ball, contact, delay, reachable };
}

export function pressureAt(feed, time) {
  const player = feed.pressure;
  if (!player) return null;
  const tracksReceiver = receiverAt(feed, time + (SAFETY_LINE - player.z) / CLEARANCE_SPEED) - feed.channel;
  const x = player.center + tracksReceiver * player.z / SAFETY_LINE + player.range * Math.sin(player.phase + player.speed * time);
  return { x, z: player.z };
}

export function receiverAt(feed, time) {
  const run = feed.receiver;
  return feed.channel + (run ? run.range * Math.sin(run.phase + run.speed * time) : 0);
}

export function planClearance(feed, delivery, tick, angle) {
  const { contact, delay } = delivery;
  const end = clearanceAt(contact, angle, feed.drift, SAFETY_LINE);
  const launchTime = tick * STEP + delay;
  const receiveTime = launchTime + (SAFETY_LINE - contact.z) / CLEARANCE_SPEED;
  const receiver = receiverAt(feed, receiveTime);
  const atGate = Math.abs(end.x - receiver) <= feed.halfWidth - BALL_RADIUS;
  const pressure = feed.pressure;
  if (!pressure) return { end, atGate, interception: null, receiver, receiveTime };
  const time = launchTime + (pressure.z - contact.z) / CLEARANCE_SPEED;
  const player = pressureAt(feed, time);
  const ball = clearanceAt(contact, angle, feed.drift, player.z);
  const interception = Math.abs(ball.x - player.x) <= 0.42 + BALL_RADIUS ? { ball, time } : null;
  return { end, atGate, interception, receiver, receiveTime };
}

export function createDrill(level) {
  return { feeds: makeDrill(level), index: 0, tick: 0, defender: 0, result: 'ready', trajectory: null };
}

export function advance(state, movement = 0) {
  if (state.result !== 'ready') return;
  state.tick += 1;
  state.defender = Math.max(-HALF_GOAL, Math.min(HALF_GOAL, state.defender + Math.sign(movement) * DEFENDER_SPEED * STEP));
  const ball = incomingAt(state.feeds[state.index], state.tick * STEP);
  if (ball.z <= LINE - BALL_RADIUS) state.result = 'conceded';
}

export function clear(state, angle) {
  if (state.result !== 'ready' || !Number.isInteger(angle) || Math.abs(angle) > 60) return false;
  const feed = state.feeds[state.index];
  const delivery = readContact(feed, state.tick, state.defender);
  if (!delivery.reachable) {
    state.result = 'missed';
    return false;
  }
  const plan = planClearance(feed, delivery, state.tick, angle);
  state.trajectory = { ...delivery, ...plan, angle, drift: feed.drift };
  state.result = plan.interception ? 'intercepted' : plan.atGate ? 'cleared' : 'unsafe';
  return state.result === 'cleared';
}

export function nextFeed(state) {
  if (state.result !== 'cleared' || state.index + 1 >= state.feeds.length) return false;
  Object.assign(state, { index: state.index + 1, tick: 0, defender: 0, result: 'ready', trajectory: null });
  return true;
}
