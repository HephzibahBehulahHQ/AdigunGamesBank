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
