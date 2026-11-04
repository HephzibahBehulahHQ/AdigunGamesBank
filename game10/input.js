/** Track each physical input independently so a second touch cannot release
 * an existing throttle/steering touch when browser focus changes. */
export function bindHoldButton(button, control, held) {
  const pointers = new Set(), keys = new Set();
  const refresh = () => {
    const active = pointers.size > 0 || keys.size > 0;
    if (active) held.add(control); else held.delete(control);
    button.setAttribute('aria-pressed', String(active));
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); button.focus();
    button.setPointerCapture(event.pointerId); pointers.add(event.pointerId); refresh();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => { pointers.delete(event.pointerId); refresh(); });
  button.addEventListener('keydown', event => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); keys.add(event.key); refresh(); }
  });
  button.addEventListener('keyup', event => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); keys.delete(event.key); refresh(); }
  });
  button.addEventListener('blur', () => { keys.clear(); refresh(); });
  refresh();
  return () => { pointers.clear(); keys.clear(); refresh(); };
}
