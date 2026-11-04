const grid = document.querySelector('#game-grid'), results = document.querySelector('#results'), search = document.querySelector('#search');
const filters = [...document.querySelectorAll('[data-filter]')], themeButton = document.querySelector('#theme');
let games = [], filter = 'all';
const colors = { engineering: 'cyan', sports: 'green', strategy: 'violet', thinking: 'gold-text', trading: 'green', bible: 'gold-text' };
const symbols = { engineering: '⌁', sports: '◎', strategy: '▦', thinking: '◇', trading: '↗', bible: '✦' };
function element(tag, text, className) {
  const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
}
function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const selected = games.filter(game => (filter === 'all' || game.genre === filter) && `${game.title} ${game.description} ${game.genre}`.toLocaleLowerCase().includes(query));
  const nodes = selected.map((game) => {
    const card = element('article', '', 'game-card'), top = element('div', '', `card-art ${colors[game.genre] || 'cyan'}`);
    top.append(element('span', symbols[game.genre] || '◇', 'card-symbol'));
    top.setAttribute('aria-hidden', 'true'); top.append(element('span', game.id.replace('game', '').padStart(2, '0'), 'card-number'));
    const body = element('div', '', 'card-body'), meta = element('div', '', 'card-meta');
    meta.append(element('span', game.genre.toUpperCase()), element('span', game.id === 'game22' ? 'API REQUIRED' : game.rendering.is3D ? '3D BUILD' : 'LEGACY 2D'));
    const heading = element('h3'), link = element('a', game.title); link.href = game.path; heading.append(link);
    body.append(meta, heading, element('p', game.description));
    const bottom = element('div', '', 'card-bottom');
    bottom.append(element('span', game.status === 'Blocked' ? 'Setup required' : 'Development edition'), element('span', game.status === 'Blocked' ? 'Configure ↗' : 'Play ↗'));
    body.append(bottom); card.append(top, body); return card;
  });
  grid.replaceChildren(...nodes);
  results.textContent = `${selected.length} ${selected.length === 1 ? 'title' : 'titles'}${query ? ` matching “${search.value.trim()}”` : ' to explore'}`;
  if (!nodes.length) grid.append(element('p', 'No games match. Try another title or select All games.', 'empty'));
}
filters.forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter; filters.forEach(item => item.setAttribute('aria-pressed', String(item === button))); render();
}));
search.addEventListener('input', render);
function setTheme(light) {
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  themeButton.setAttribute('aria-pressed', String(light)); themeButton.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
  try { localStorage.setItem('adigun.theme', light ? 'light' : 'dark'); } catch { /* Theme remains available for this visit. */ }
}
try { setTheme(localStorage.getItem('adigun.theme') === 'light'); } catch { setTheme(false); }
themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'light'));
try {
  const response = await fetch(new URL('../data/games.json', import.meta.url));
  if (!response.ok) throw new Error('Catalog unavailable');
  const catalog = await response.json(); if (!Array.isArray(catalog.games)) throw new Error('Invalid catalog');
  games = catalog.games; document.querySelector('#title-count').textContent = games.length; render();
} catch { document.querySelector('#load-error').hidden = false; results.textContent = 'The library could not be loaded.'; }
