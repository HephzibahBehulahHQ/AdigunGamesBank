export async function createGamePitch(options) {
  const context = options.canvas.getContext('webgl2', {
    antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  if (!context) return null;
  const { createPitch } = await import('./pitch.js');
  return createPitch({ ...options, context });
}
