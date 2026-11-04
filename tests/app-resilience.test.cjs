const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real app handlers with a small DOM/renderer adapter. Fixture
// outcomes isolate persistence feedback; they are not gameplay-win evidence.
async function loadApp(game, { writeFails = false, readFails = false, completed = false, savedValues = {}, failedWriteKeys = [], silentWriteKeys = [] } = {}) {
  const { campaign, validLevel, validCampaignSave } = await import('../shared/progression.js');
  const football = await import('../game11/engine.js');
  const bible = await import('../game23/engine.js');
  const circuits = await import('../game3/circuit.js');
  const nodes = new Map(), values = new Map(Object.entries(savedValues)), listeners = new Map();
  let disposed = 0, rendered = 0;
  function node() {
    return { value: '', checked: false, children: [], style: {}, dataset: {}, hidden: false, handlers: new Map(),
      textContent: '', className: '', classList: { toggle() {} },
      addEventListener(type, handler) { const list = this.handlers.get(type) || []; list.push(handler); this.handlers.set(type, list); }, setAttribute() {}, focus() {}, setPointerCapture() {},
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; }
    };
  }
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  get('yaw').value = '0'; get('elevation').value = '35'; get('speed').value = '18';
  const storage = {
    getItem(key) { if (readFails) throw Error('Storage denied'); return values.get(key) ?? null; },
    setItem(key, value) { if (writeFails || failedWriteKeys.includes(key)) throw Error('Quota exceeded'); if (!silentWriteKeys.includes(key)) values.set(key, value); }
  };
  const window = {
    addEventListener(type, callback, options = {}) {
      const list = listeners.get(type) || [];
      list.push({ callback, once: options.once }); listeners.set(type, list);
    }
  };
  const context = vm.createContext({
    ...football, ...bible, ...circuits, validLevel, validCampaignSave,
    createMatch(level) { const state = football.createMatch(level); if (completed) { state.phase = 'fulltime'; state.qualified = true; state.winner = 'home'; state.score = [1, 0]; } return state; },
    createGame(level) { const state = bible.createGame(level); if (completed) { state.phase = 'won'; state.hits = 3; state.throws = 3; } return state; },
    campaign: (id, supplied) => campaign(id, supplied || storage),
    localStorage: storage, window,
    document: { getElementById: get, createElement: node, body: node(), addEventListener() {}, hidden: false },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    THREE: { Raycaster: class {}, Vector2: class {} },
    createStage: () => ({ render() {}, dispose() {} }),
    buildFootballScene: () => ({ update() {}, playerRoots: [] }),
    buildValleyScene: () => ({ update() {} }),
    createBench: () => ({ render() { rendered++; }, dispose() { disposed++; }, view() {} })
  });
  const source = fs.readFileSync(path.join(__dirname, '..', game, 'app.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(source, context, { filename: `${game}/app.js` });
  return {
    get, values,
    trigger(id, type) { const target = get(id); for (const handler of target.handlers.get(type) || []) handler({ target, preventDefault() {} }); },
    get disposed() { return disposed; }, get rendered() { return rendered; },
    dispatch(type, event) {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter(handler => !handler.once));
      handlers.forEach(handler => handler.callback(event));
    }
  };
}

test('Electronicer retains and redraws its renderer after a cached history return', async () => {
  const app = await loadApp('game3');
  app.dispatch('pagehide', { persisted: true });
  assert.equal(app.disposed, 0);
  const renders = app.rendered;
  app.dispatch('pageshow', { persisted: true });
  assert.ok(app.rendered > renders);
  app.dispatch('pagehide', { persisted: false });
  assert.equal(app.disposed, 1);
});

for (const game of ['game11', 'game23']) {
  test(`${game} declares session-only progress when the campaign write fails`, async () => {
    const app = await loadApp(game, { completed: true, writeFails: true });
    assert.match(app.get('overlay-copy').textContent, /session only/);
    assert.match(app.get('campaign-status').textContent, /storage could not save/);
    assert.equal(app.values.size, 0);
    assert.doesNotMatch(app.get('overlay-copy').textContent, /is saved on this device/);
  });
  test(`${game} confirms saved progress only after storage can read it back`, async () => {
    const app = await loadApp(game, { completed: true });
    assert.match(app.get('overlay-copy').textContent, /Campaign progress is saved on this device/);
    const saved = [...app.values.values()].map(value => JSON.parse(value));
    assert.ok(saved.some(value => value.version === 1 && value.completed === 1));
    const denied = await loadApp(game, { completed: true, readFails: true });
    assert.match(denied.get('overlay-copy').textContent, /session only/);
  });
  test(`${game} rejects inconsistent saved state when a new campaign write fails`, async () => {
    const key = `adigun.campaign.v1.${game === 'game11' ? 'football' : 'bible-valley-of-elah'}`;
    const app = await loadApp(game, { completed:true, writeFails:true,
      savedValues:{[key]:JSON.stringify({version:1,completed:20,unlocked:1})} });
    assert.match(app.get('overlay-copy').textContent, /session only/);
    assert.doesNotMatch(app.get('overlay-copy').textContent, /is saved on this device/);
  });
}

for (const mode of ['throws', 'silent']) {
  test(`Electronicer does not treat a saved bench as a saved campaign when its write ${mode}`, async () => {
    const key = 'adigun.campaign.v1.electronicer';
    const app = await loadApp('game3', mode === 'throws' ? {failedWriteKeys:[key]} : {silentWriteKeys:[key]});
    for (const id of ['link1','link2']) { app.get(id).checked=true; app.trigger(id,'change'); }
    app.trigger('power','click'); app.trigger('verify','click');
    assert.match(app.get('message').textContent,/Level 1 commissioned/);
    assert.match(app.get('message').textContent,/session only/);
    assert.match(app.get('save-status').textContent,/could not confirm saved progress/);
    assert.ok(app.values.has('adigun.electronicer.bench.v1'));
    assert.equal(app.values.has(key),false);
  });
}
