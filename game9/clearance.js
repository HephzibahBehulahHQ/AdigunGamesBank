import { randomFor, validLevel } from '../shared/progression.js';

export const LINE = 0;
export const SAFETY_LINE = 8;
export const BALL_RADIUS = 0.11;
export const STEP = 0.1;
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
    return {
      pace,
      approachTime,
      crossing: (random() * 2 - 1) * (2.1 + difficulty),
      origin: (random() * 2 - 1) * 5,
      channel: (random() > 0.5 ? 1 : -1) * (2.5 + random() * 2),
      halfWidth: 1.15 - difficulty * 0.55,
      drift: (random() * 2 - 1) * difficulty * 0.17
    };
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
  const end = clearanceAt(delivery.contact, angle, feed.drift, SAFETY_LINE);
  state.trajectory = { ...delivery, end, angle, drift: feed.drift };
  const safe = Math.abs(end.x - feed.channel) <= feed.halfWidth - BALL_RADIUS;
  state.result = safe ? 'cleared' : 'unsafe';
  return safe;
}

export function nextFeed(state) {
  if (state.result !== 'cleared' || state.index + 1 >= state.feeds.length) return false;
  Object.assign(state, { index: state.index + 1, tick: 0, defender: 0, result: 'ready', trajectory: null });
  return true;
}
