/** Rule decisions use pitch-plane body centres. Referee judgement is modelled,
 * not asserted to reproduce every situation in the Laws of the Game. */
export const FIELD = Object.freeze({ length: 105, width: 68, goalWidth: 7.32, goalHeight: 2.44, ballRadius: 0.11 });
export const RESTART_EXEMPTIONS = Object.freeze(['Throw-in', 'Goal kick', 'Corner']);
export const activePlayer = p => !!p && p.active !== false && !p.redCard;
export const attackingDirection = team => team === 0 ? 1 : -1;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function inPenaltyArea(point, defendingTeam) {
  const ownEnd = defendingTeam === 0 ? -1 : 1;
  return point.x * ownEnd >= FIELD.length / 2 - 16.5 &&
    point.x * ownEnd <= FIELD.length / 2 && Math.abs(point.y) <= 20.16;
}

/** Position alone never whistles an offence. Store this snapshot at the kick;
 * the match engine penalises a listed player only when they touch/challenge. */
export function offsideSnapshot(players, ball, kicker, restartType = null) {
  const sign = attackingDirection(kicker.team);
  const defenders = players.filter(p => activePlayer(p) && p.team !== kicker.team)
    .map(p => p.x * sign).sort((a, b) => b - a);
  const line = Math.max(ball.x * sign, defenders[1] ?? FIELD.length / 2);
  const exempt = RESTART_EXEMPTIONS.includes(restartType);
  const candidates = exempt ? [] : players.filter(p => activePlayer(p) && p.team === kicker.team &&
    p.id !== kicker.id && p.x * sign > 0 && p.x * sign > line + 1e-7).map(p => p.id);
  return { team: kicker.team, kickerId: kicker.id, ballX: ball.x, line: line * sign, candidates, exempt };
}

/** A reproducible contact model: reachable ball-first tackles are legal;
 * late/body-first challenges are fouls. Speed thresholds classify the game's
 * careless/reckless/excessive-force contacts; these are simulation choices. */
export function tackleDecision(players, ball, challenger, holder) {
  if (!activePlayer(challenger) || !activePlayer(holder) || challenger.team === holder.team ||
    ball.owner !== holder.id || distance(challenger, holder) > 1.45) return { contact: false, foul: false };
  const dx = challenger.x - holder.x, dy = challenger.y - holder.y;
  const behind = dx * holder.facingX + dy * holder.facingY < -0.25;
  const ballDistance = distance(challenger, ball);
  const speed = Math.hypot(challenger.vx, challenger.vy);
  const closingSpeed = Math.hypot(challenger.vx - holder.vx, challenger.vy - holder.vy);
  const serious = closingSpeed > 13.4;
  const reachable = ballDistance <= 1.24 && !(behind && ballDistance > 1.05);
  if (reachable && !serious) return { contact: true, foul: false, attemptedBall: true };
  const penalty = inPenaltyArea(holder, challenger.team);
  const sign = attackingDirection(holder.team), goalDistance = FIELD.length / 2 - holder.x * sign;
  const covering = players.filter(p => activePlayer(p) && p.team === challenger.team && p.id !== challenger.id &&
    p.x * sign > holder.x * sign && Math.abs(p.y - holder.y) < 18).length;
  const dogso = goalDistance > 0 && goalDistance < 28 && Math.abs(holder.y) < 18.5 &&
    holder.facingX * sign > 0.6 && covering < 2;
  const attemptedBall = !behind && ballDistance <= 1.9;
  const reckless = speed > 6.8 || closingSpeed > 8;
  const sanction = serious ? 'red' : dogso ? (penalty && attemptedBall ? 'yellow' : 'red') : reckless ? 'yellow' : null;
  return { contact: true, foul: true, penalty, dogso, attemptedBall, sanction,
    severity: serious ? 'serious' : reckless ? 'reckless' : 'careless',
    reason: serious ? 'Excessive-force challenge' : dogso ? 'Denial of a clear scoring opportunity' : reckless ? 'Reckless challenge' : 'Careless challenge' };
}
