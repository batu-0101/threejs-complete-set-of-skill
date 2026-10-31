// Copied into the skill suite by repair-webdesign.py. Expand globs ourselves:
// Windows does not expand them, and node --check accepts only one input file.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const patterns = process.argv.slice(2);
if (!patterns.length) throw new Error('Pass one or more relative JavaScript file patterns.');
const files = new Set();
for (const pattern of patterns) {
  const segments = pattern.replaceAll('\\', '/').split('/');
  if (path.isAbsolute(pattern) || segments.some(part => !part || part === '..' || part === '**')) {
    throw new Error(`Unsupported relative syntax-check pattern: ${pattern}`);
  }
  let matches = [process.cwd()];
  for (let index = 0; index < segments.length; index++) {
    const escaped = segments[index].replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(`^${escaped.replaceAll('*', '.*').replaceAll('?', '.')}$`);
    const last = index === segments.length - 1;
    matches = matches.flatMap(folder => readdirSync(folder, { withFileTypes: true })
      .filter(entry => matcher.test(entry.name) && (last ? entry.isFile() : entry.isDirectory()))
      .map(entry => path.join(folder, entry.name)));
  }
  if (!matches.length) throw new Error(`No files matched syntax-check pattern: ${pattern}`);
  for (const file of matches) files.add(file);
}
for (const file of [...files].sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checked ${files.size} JavaScript files.`);
