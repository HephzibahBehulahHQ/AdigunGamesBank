import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(path.join(root, 'data/games.json'), 'utf8'));
const ids = new Set(), routes = new Set(), failures = [];
for (const game of catalog.games) {
  if (ids.has(game.id) || routes.has(game.path)) failures.push(`Duplicate game identity: ${game.id}`);
  ids.add(game.id); routes.add(game.path);
  for (const field of ['title','genre','platforms','rendering','levels','controls','accessibility','performance','assetRights','testing','deployment','status','policy','design']) if (!(field in game)) failures.push(`${game.id}: missing ${field}`);
  if (game.levels.target !== 10000 || game.policy.commit !== 'd42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e') failures.push(`${game.id}: incorrect requirements or policy adoption`);
  try { await access(path.join(root, game.path, 'index.html')); } catch { failures.push(`Missing game entry: ${game.path}`); }
}
for (const file of ['index.html', ...catalog.games.map(g => `${g.path}index.html`)]) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = match[1]; if (/^(https?:|data:|mailto:|#|\/\/)/i.test(url)) continue;
    const clean = decodeURIComponent(url.split(/[?#]/)[0]); if (!clean) continue;
    try { await access(path.resolve(root, path.dirname(file), clean)); } catch { failures.push(`${file}: broken local link ${url}`); }
  }
}
const logo = await readFile(path.join(root, 'assets/corporate/hephzibah-behulah-official.jpg'));
const logoSha = createHash('sha1').update(`blob ${logo.length}\0`).update(logo).digest('hex');
if (logoSha !== 'f7b0e4a650d861fb9d52ed91ea894edec030e03b') failures.push('Official artwork was altered');
for (const entry of ['shared','game3','game11','game15','game22','game23','assets']) {
  for (const name of await readdir(path.join(root, entry))) if (/\.(?:js|mjs)$/.test(name)) {
    try { execFileSync(process.execPath, ['--check', path.join(root, entry, name)], { stdio: 'pipe' }); } catch { failures.push(`Invalid JavaScript: ${entry}/${name}`); }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Release integrity: ${catalog.games.length} unique entries, local links, pinned policy, official artwork and JavaScript syntax verified.`);
