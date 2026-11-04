const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// A small DOM adapter exercises the shipped event handlers. These are logic
// integration checks; they do not substitute for a real-browser render check.
function harness(game, { saved = "1", storage = new Map(), blockedStorage = false } = {}) {
  const elements = new Map(), events = [], timeouts = new Map(), intervals = new Map();
  let nextTimer = 1;
  if (!storage.has(`hbgb.level.v1.${game}`)) storage.set(`hbgb.level.v1.${game}`, saved);
  function node() {
    const element = {
      children: [], style: {}, dataset: {}, attributes: {}, listeners: new Map(),
      textContent: "", innerHTML: "", value: "", className: "", disabled: false,
      setAttribute(name, value) { this.attributes[name] = String(value); },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); return child; },
      prepend(child) { this.children.unshift(child); },
      replaceChildren(...children) { this.children = children; },
      addEventListener(name, listener) {
        this.listeners.set(name, [...(this.listeners.get(name) || []), listener]);
      },
      fire(name, extra = {}) {
        const event = { target: this, preventDefault() {}, ...extra };
        if (this[`on${name}`]) this[`on${name}`](event);
        (this.listeners.get(name) || []).forEach(listener => listener(event));
      },
      click() { if (!this.disabled) this.fire("click"); },
      focus() {}
    };
    element.classList = {
      add(...classes) { element.className = [...new Set([...element.className.split(/\s+/).filter(Boolean), ...classes])].join(" "); },
      contains(name) { return element.className.split(/\s+/).includes(name); }
    };
    return element;
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  };
  const modes = ["sequence", "matrix", "rule"].map(mode => {
    const button = node(); button.dataset.mode = mode; return button;
  });
  const body = node();
  const context = vm.createContext({
    document: {
      body, createElement: node, getElementById: get,
      querySelectorAll(selector) {
        if (selector === "[data-mode]") return modes;
        if (selector === ".cell") return get("board").children;
        return [];
      }
    },
    window: { dispatchEvent(event) { events.push(event); } },
    location: { pathname: `/AdigunGamesBank/${game}/` },
    localStorage: {
      getItem(key) { if (blockedStorage) throw Error("Storage disabled"); return storage.get(key) ?? null; },
      setItem(key, value) { if (blockedStorage) throw Error("Storage disabled"); storage.set(key, value); }
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout(callback) { const id = nextTimer++; timeouts.set(id, callback); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(callback) { const id = nextTimer++; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); }
  });
  function load(file) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  load("assets/game-levels.js");
  return {
    get, load, modes, body, events, storage, levels: context.window.HBGameLevels,
    flushTimeouts() { const batch = [...timeouts.values()]; timeouts.clear(); batch.forEach(callback => callback()); },
    tickIntervals(count) { for (let i = 0; i < count; i++) [...intervals.values()].forEach(callback => callback()); }
  };
}

test("unlocking the final practice stage is distinct from completing it", () => {
  const h = harness("game8", { saved: "9999" });
  assert.equal(h.levels.complete(9999), 10000);
  assert.equal(h.levels.isMastered, false);
  assert.equal(h.levels.completed, 9999);
  assert.doesNotMatch(h.body.children[0].textContent, /FINAL STAGE CLEARED/);
  h.levels.complete(9999); // A stale completion cannot clear the new stage.
  assert.equal(h.levels.isMastered, false);
  h.levels.complete(10000);
  assert.equal(h.levels.isMastered, true);
  assert.equal(h.levels.completed, 10000);
  h.levels.complete(10000);
  assert.equal(h.events.length, 2);
  const reloaded = harness("game8", { storage: h.storage });
  assert.equal(reloaded.levels.isMastered, true);
  reloaded.levels.reset();
  assert.equal(reloaded.levels.current, 1);
  assert.equal(reloaded.levels.completed, 0);
  assert.equal(h.storage.get("hbgb.level.v1.game8.mastered"), "0");
});

test("corrupt saved levels and disabled storage cannot break progression", () => {
  for (const saved of ["Infinity", "NaN", "-1", "0", "1.5", "unknown", "9007199254740992"]) {
    assert.equal(harness("game2", { saved }).levels.current, 1, saved);
  }
  const h = harness("game2", { blockedStorage: true });
  assert.equal(h.levels.complete(), 2);
  assert.equal(h.levels.reset(), 1);
});

function solveCircuit(h, level) {
  const pieces = level % 2
    ? [[1, "─"], [2, "─"], [3, "─"], [4, "┐"], [9, "│"], [14, "│"], [19, "│"]]
    : [[5, "│"], [10, "│"], [15, "│"], [20, "└"], [21, "─"], [22, "─"], [23, "─"]];
  for (const [index, glyph] of pieces) {
    for (let clicks = 0; h.get("board").children[index].textContent !== glyph && clicks < 12; clicks++) {
      h.get("board").children[index].click();
    }
    assert.equal(h.get("board").children[index].textContent, glyph);
  }
}

test("CIRCUIT RUSH awards a cleared board once and leaves the final stage playable", () => {
  const h = harness("game2", { saved: "9999" });
  h.load("game2/script.js");
  solveCircuit(h, 9999);
  h.get("check-btn").fire("click");
  const score = h.get("score").textContent;
  h.get("check-btn").fire("click");
  assert.equal(h.get("score").textContent, score);
  assert.equal(h.levels.current, 10000);
  assert.equal(h.levels.isMastered, false);
  assert.equal(h.get("next-btn").disabled, false);
  h.get("next-btn").click();
  solveCircuit(h, 10000);
  h.get("check-btn").click();
  assert.equal(h.levels.isMastered, true);
  assert.equal(h.get("next-btn").disabled, true);
});

test("CIRCUIT RUSH expiry prevents late awards and offers a same-stage retry", () => {
  const h = harness("game2");
  h.load("game2/script.js");
  solveCircuit(h, 1);
  h.tickIntervals(60);
  h.get("check-btn").fire("click");
  assert.equal(h.levels.current, 1);
  assert.equal(h.get("check-btn").disabled, true);
  assert.equal(h.get("next-btn").disabled, false);
  h.get("next-btn").click();
  assert.equal(h.levels.current, 1);
  assert.equal(h.get("check-btn").disabled, false);
  assert.equal(h.get("timer").textContent, 60);
});

function solveFuses(h) {
  const initial = h.get("box").children.map(button => button.classList.contains("on"));
  for (let mask = 0; mask < 512; mask++) {
    const state = initial.slice();
    for (let index = 0; index < 9; index++) {
      if (!(mask & (1 << index))) continue;
      const row = Math.floor(index / 3), column = index % 3;
      for (const [r, c] of [[row, column], [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]) {
        if (r >= 0 && r < 3 && c >= 0 && c < 3) state[r * 3 + c] = !state[r * 3 + c];
      }
    }
    if (state.every(Boolean)) {
      for (let index = 0; index < 9; index++) if (mask & (1 << index)) h.get("box").children[index].click();
      return;
    }
  }
  assert.fail("Displayed fuse puzzle must be solvable");
}

test("FUSE BOX cannot award duplicate progress while the next board is pending", () => {
  const h = harness("game8");
  h.load("assets/game8.js");
  solveFuses(h);
  h.get("check").fire("click");
  h.get("check").fire("click");
  assert.equal(h.levels.current, 2);
  assert.equal(h.events.length, 1);
  h.flushTimeouts();
  assert.equal(h.get("check").disabled, false);
});

test("FUSE BOX clears the final stage once without scheduling another round", () => {
  const h = harness("game8", { saved: "10000" });
  h.load("assets/game8.js");
  solveFuses(h);
  h.get("check").fire("click");
  h.get("check").fire("click");
  h.flushTimeouts();
  assert.equal(h.levels.isMastered, true);
  assert.equal(h.events.length, 1);
  assert.equal(h.get("check").disabled, true);
});

test("CORTEX PRIME accepts the output implied by its displayed rule and blocks repeated awards", () => {
  for (const level of [1, 2, 37, 250, 5000, 9999, 10000]) {
    const h = harness("game12", { saved: String(level) });
    h.load("assets/game12.js");
    h.modes.find(button => button.dataset.mode === "rule").click();
    const html = h.get("puzzle").innerHTML;
    const examples = [...html.matchAll(/INPUT (\d+) → (\d+)/g)].map(match => [Number(match[1]), Number(match[2])]);
    const requested = Number(html.match(/<br>INPUT (\d+) →/)[1]);
    const slope = (examples[1][1] - examples[0][1]) / (examples[1][0] - examples[0][0]);
    const expected = examples[0][1] + (requested - examples[0][0]) * slope;
    h.get("answer").value = String(expected);
    h.get("submit").fire("click");
    h.get("submit").fire("click");
    assert.equal(h.levels.current, Math.min(10000, level + 1), `stage ${level}`);
    assert.equal(h.levels.isMastered, level === 10000);
    assert.equal(h.events.length, 1);
  }
});
