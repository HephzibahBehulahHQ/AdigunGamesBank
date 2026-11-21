import { THREE } from '../shared/three-stage.js';

/** Two-segment leg solve in model coordinates, biased towards a forward knee. */
export function solveLeg(hip, requestedAnkle, upper, lower) {
  const direction = requestedAnkle.clone().sub(hip);
  const length = direction.length();
  if (length < 1e-6) direction.set(0, -1, 0);
  else direction.divideScalar(length);
  const reach = THREE.MathUtils.clamp(length, Math.abs(upper - lower) + 0.0001, upper + lower - 0.0001);
  const along = (upper ** 2 - lower ** 2 + reach ** 2) / (2 * reach);
  const lift = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  const bend = new THREE.Vector3(0, 0, 1).projectOnPlane(direction);
  if (bend.lengthSq() < 1e-5) bend.set(1, 0, 0).projectOnPlane(direction);
  bend.normalize();
  return {
    knee: hip.clone().addScaledVector(direction, along).addScaledVector(bend, lift),
    ankle: hip.clone().addScaledVector(direction, reach)
  };
}

/** Toe offsets over one gait cycle. During the first half relative travel cancels root travel. */
export function lateralStep(distance, stride, foot) {
  const cycle = 2 * stride;
  const phase = ((distance + foot * stride) % cycle) / cycle;
  if (phase < 0.5) return { offset: stride * (0.5 - 2 * phase), lift: 0, advancing: false };
  const swing = (phase - 0.5) * 2;
  const eased = swing ** 2 * (3 - 2 * swing);
  return {
    offset: stride * (eased - 0.5),
    lift: 0.09 * (stride / 0.8) * Math.sin(Math.PI * swing),
    advancing: true
  };
}
