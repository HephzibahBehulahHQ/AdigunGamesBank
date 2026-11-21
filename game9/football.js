import { THREE, material } from '../shared/three-stage.js';
import { BALL_RADIUS } from './clearance.js';

/** A 32-panel ball from the truncated icosahedron, curved onto a sphere. */
export function createFootball() {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const positions = ico.getAttribute('position');
  const vertices = [];
  const triangles = [];
  const neighbours = [];
  for (let i = 0; i < positions.count; i += 3) {
    const triangle = [];
    for (let j = 0; j < 3; j++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i + j);
      let index = vertices.findIndex(vertex => vertex.distanceToSquared(point) < 1e-9);
      if (index < 0) {
        index = vertices.length;
        vertices.push(point);
        neighbours.push(new Set());
      }
      triangle.push(index);
    }
    triangles.push(triangle);
    triangle.forEach((vertex, edge) => {
      neighbours[vertex].add(triangle[(edge + 1) % 3]);
      neighbours[vertex].add(triangle[(edge + 2) % 3]);
    });
  }
  ico.dispose();
  const cut = (a, b) => vertices[a].clone().lerp(vertices[b], 1 / 3);
  const hexagons = triangles.map(([a, b, c]) => [cut(a, b), cut(b, a), cut(b, c), cut(c, b), cut(c, a), cut(a, c)]);
  const pentagons = neighbours.map((links, index) => {
    const normal = vertices[index].clone().normalize();
    const ref = vertices[[...links][0]].clone().projectOnPlane(normal).normalize();
    const tangent = normal.clone().cross(ref);
    const angle = point => Math.atan2(point.dot(tangent), point.dot(ref));
    return [...links].map(other => cut(index, other)).sort((a, b) => angle(a) - angle(b));
  });
  const ball = new THREE.Group();
  const seam = material('#363a35', { roughness: 0.81 });
  const leather = material('#eae4d3', { roughness: 0.65 });
  const darkPanel = material('#20282b', { roughness: 0.72 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS * 0.991, 32, 24), seam);
  core.castShadow = true;
  ball.add(core);
  function panels(polygons, surface) {
    const coords = [];
    const normals = [];
    function triangle(a, b, c, depth) {
      if (depth === 0) {
        for (const point of [a, b, c]) {
          const unit = point.clone().normalize();
          normals.push(...unit);
          coords.push(...unit.multiplyScalar(BALL_RADIUS));
        }
        return;
      }
      const ab = a.clone().lerp(b, 0.5);
      const bc = b.clone().lerp(c, 0.5);
      const ca = c.clone().lerp(a, 0.5);
      triangle(a, ab, ca, depth - 1);
      triangle(ab, b, bc, depth - 1);
      triangle(ca, bc, c, depth - 1);
      triangle(ab, bc, ca, depth - 1);
    }
    for (const polygon of polygons) {
      const center = polygon.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(polygon.length);
      const rim = polygon.map(point => point.clone().lerp(center, 0.022));
      const winding = rim[0].clone().sub(center).cross(rim[1].clone().sub(center)).dot(center);
      if (winding < 0) rim.reverse();
      for (let index = 0; index < rim.length; index++) triangle(center, rim[index], rim[(index + 1) % rim.length], 2);
    }
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    mesh.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    ball.add(new THREE.Mesh(mesh, surface));
  }
  panels(hexagons, leather);
  panels(pentagons, darkPanel);
  return ball;
}
