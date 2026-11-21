import { THREE, material } from '../shared/three-stage.js';
import { randomFor } from '../shared/progression.js';

const SIZE = 1024;
const WIDTH_METRES = 0.72;
const HEIGHT_METRES = 1.80;

function textile(background, threads, decorate) {
  const surface = document.createElement('canvas');
  surface.width = surface.height = SIZE;
  const context = surface.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, SIZE, SIZE);
  decorate?.(context);
  const random = randomFor(43);
  context.fillStyle = threads;
  for (let y = 0; y < SIZE; y += 3) {
    for (let x = (y % 2) * 2; x < SIZE; x += 4) {
      context.globalAlpha = 0.12 + random() * 0.22;
      context.fillRect(x, y, 1.5, 0.7);
    }
  }
  const map = new THREE.CanvasTexture(surface);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

const row = metres => SIZE * (1 - metres / HEIGHT_METRES);

function stripe(context, top, metres, color) {
  context.fillStyle = color;
  context.fillRect(0, row(top), SIZE, SIZE * metres / HEIGHT_METRES);
}

export function outfitMaterials(positions, role) {
  const away = role === 'press';
  const uv = new Float32Array(positions.length / 3 * 2);
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const x = positions[vertex * 3];
    const y = positions[vertex * 3 + 1];
    const z = positions[vertex * 3 + 2];
    // Reverse the chest projection so the number faces forward on each side.
    uv[vertex * 2] = THREE.MathUtils.clamp(0.5 + (z > 0.03 ? x : -x) / WIDTH_METRES, 0, 1);
    uv[vertex * 2 + 1] = y / HEIGHT_METRES;
  }
  const jersey = textile(away ? '#8f332c' : '#204778', '#96acbc', context => {
    context.fillStyle = away ? '#5e251d' : '#172e4b';
    context.fillRect(120, row(1.52), 96, row(0.96) - row(1.52));
    context.fillRect(SIZE - 216, row(1.52), 96, row(0.96) - row(1.52));
    stripe(context, 1.51, 0.027, '#d9c58d');
    stripe(context, 0.99, 0.012, '#141e2e');
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '800 150px system-ui';
    context.lineWidth = 5;
    context.strokeStyle = '#172237';
    const number = away ? '9' : role === 'receive' ? '8' : '4';
    context.strokeText(number, SIZE / 2, row(1.28));
    context.fillStyle = '#f3ebd5';
    context.fillText(number, SIZE / 2, row(1.28));
    context.font = '700 28px system-ui';
    context.fillText('ADIGUN', SIZE / 2, row(1.43));
  });
  const shorts = textile('#192433', '#677c96', context => {
    stripe(context, 0.93, 0.025, '#101824');
    stripe(context, 0.39, 0.017, '#344a62');
  });
  const socks = textile('#dddfd5', '#f2f2e9', context => {
    stripe(context, 0.357, 0.015, '#244470');
    stripe(context, 0.33, 0.012, '#244470');
  });
  return {
    uv,
    palette: [
      material('#936349', { roughness: 0.65 }),
      material('#ffffff', { map: jersey, roughness: 0.88, metalness: 0 }),
      material('#ffffff', { map: shorts, roughness: 0.89, metalness: 0 }),
      material('#ffffff', { map: socks, roughness: 0.92, metalness: 0 }),
      material('#232327', { roughness: 0.45 }),
      material('#c9c4b6', { roughness: 0.28 })
    ]
  };
}
