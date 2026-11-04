import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..'), output = path.join(root, 'dist');
// Preserve the directory inode: the managed preview serves this directory continuously.
await mkdir(output, { recursive: true });
const files = ['index.html', 'style.css', 'script.js', 'CNAME', '.nojekyll'];
const folders = ['assets', 'shared', 'vendor', 'data', ...(await readdir(root)).filter(name => /^game\d+$/.test(name))];
for (const name of [...files, ...folders]) {
  try { await cp(path.join(root, name), path.join(output, name), { recursive: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const hashes = {};
async function fingerprint(directory, prefix = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await fingerprint(path.join(directory, entry.name), `${relative}/`);
    else hashes[relative] = createHash('sha256').update(await readFile(path.join(directory, entry.name))).digest('hex');
  }
}
await fingerprint(output);
const fingerprintSha256 = createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const modified = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
await writeFile(path.join(output, 'build-evidence.json'), JSON.stringify({ baseCommit, modified, fingerprintSha256, files: hashes }, null, 2));
console.log(`Static build: ${Object.keys(hashes).length} files; SHA256 ${fingerprintSha256}; base ${baseCommit}${modified ? ' + working changes' : ''}`);
