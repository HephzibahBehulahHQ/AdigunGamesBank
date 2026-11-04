import { hazardPosition } from './engine.js';

/** The command map has distinct visible keys as well as text descriptions.
 * X is reserved for extraction so it cannot collide with Core E in later tiers. */
export function describeMapCell(state, x, z, sparks = state.config.hazards.map(hazard => hazardPosition(hazard, state.time))) {
  const descriptions = [], classes = [], core = state.config.cores.find(core => !state.collected[core.id] && core.x === x && core.z === z);
  let symbol = '';
  if (state.config.blocked[z][x]) { descriptions.push('Wall'); classes.push('wall'); } else descriptions.push('Open floor');
  if (core) { descriptions.push(core.name); classes.push('core'); symbol = String.fromCharCode(65 + core.id); }
  if (state.config.exit.x === x && state.config.exit.z === z) { descriptions.push(state.collected.every(Boolean) ? 'Open exit' : 'Locked exit'); classes.push('exit'); symbol = 'X'; }
  if (sparks.some(spark => Math.round(spark.x) === x && Math.round(spark.z) === z)) { descriptions.push('Spark hazard'); classes.push('spark'); symbol = '!'; }
  if (Math.round(state.player.x) === x && Math.round(state.player.z) === z) { descriptions.push('Rover'); classes.push('rover'); symbol = 'R'; }
  return { symbol, classes, description: descriptions.join(', ') };
}
