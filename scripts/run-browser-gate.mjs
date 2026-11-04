import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mode = process.argv[2];
if (!['contracts', 'gameplay'].includes(mode)) throw new Error('Select contracts or gameplay');
const specs = readdirSync(path.join(root, 'tests/browser'))
  .filter(name => name.endsWith('.spec.js') && name !== 'accessibility.spec.js' && (mode === 'contracts' || name !== 'arena-contract.spec.js'))
  .sort().map(name => `tests/browser/${name}`);
if (!specs.length) throw new Error('No game browser suites were discovered');
const selector = mode === 'contracts' ? ['--grep', 'TEST-ONLY gateway|keeps visible keyboard'] : ['--grep-invert', 'keeps visible keyboard'];
const extra = process.argv.slice(3);
if (extra.some(value => value !== '--list')) throw new Error('Only --list is accepted as an optional argument');
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config=playwright.config.js', ...specs, ...selector, ...extra], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
