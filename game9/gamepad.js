/** Standard Xbox-style mapping from the browser Gamepad API. */
export function gamepadControls(actions) {
  const buttons = { clear: 0, advance: 1, reset: 3, live: 9, left: 14, right: 15 };
  let activeIndex = null;
  let previous = new Set();
  let frame;
  let movement = 0;

  function currentPad() {
    try {
      return Array.from(navigator.getGamepads?.() ?? [])
        .find(pad => pad?.connected && pad.mapping === 'standard');
    } catch {
      return null;
    }
  }

  function read() {
    frame = undefined;
    const pad = currentPad();
    if (!pad || document.hidden || !document.hasFocus()) {
      movement = 0;
      activeIndex = null;
      previous.clear();
      return;
    }
    const down = new Set(Object.values(buttons).filter(index => pad.buttons[index]?.pressed));
    const axis = pad.axes[0] ?? 0;
    movement = Math.abs(axis) > 0.26 ? Math.sign(axis) : 0;
    if (activeIndex === pad.index) {
      const pressed = index => down.has(index) && !previous.has(index);
      if (pressed(buttons.live)) actions.live();
      if (pressed(buttons.left)) actions.aim(-1);
      if (pressed(buttons.right)) actions.aim(1);
      if (pressed(buttons.clear)) actions.clear();
      if (pressed(buttons.advance)) actions.advance();
      if (pressed(buttons.reset)) actions.reset();
    }
    previous = down;
    activeIndex = pad.index;
    frame = requestAnimationFrame(read);
  }

  function start() {
    if (frame === undefined) read();
  }
  window.addEventListener('gamepadconnected', start);
  window.addEventListener('gamepaddisconnected', start);
  window.addEventListener('focus', start);
  document.addEventListener('visibilitychange', start);
  start();
  return { get movement() { return movement; } };
}
