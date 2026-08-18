#!/usr/bin/env node
/**
 * Parses every JSON file the theme ships (config, locales, templates) and
 * fails loudly on the first syntax error. Shopify rejects the whole theme
 * upload on a single bad comma, so this runs in CI before anything else.
 */
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['config', 'locales', 'templates', 'templates/customers', 'sections'];
const SKIP = new Set(['node_modules', '.git', '.shopify']);
const SCHEMA_RE = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/;

async function filesIn(dir, extension) {
  let entries;
  try {
    entries = await readdir(join(ROOT, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && !SKIP.has(entry.name) && entry.name.endsWith(extension))
    .map((entry) => join(ROOT, dir, entry.name));
}

const jsonFiles = (await Promise.all(DIRS.map((dir) => filesIn(dir, '.json')))).flat();
const liquidSections = await filesIn('sections', '.liquid');

if (jsonFiles.length === 0) {
  console.error('No JSON files found — is this the theme root?');
  process.exit(1);
}

let checked = 0;
let failed = 0;

function check(label, source) {
  checked += 1;
  try {
    JSON.parse(source);
    console.log(`  ok  ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${label}\n      ${error.message}`);
  }
}

for (const file of jsonFiles) {
  check(relative(ROOT, file), readFileSync(file, 'utf8'));
}

// Section schemas are JSON embedded in Liquid. A bad one breaks the theme
// editor without breaking the storefront, which makes it easy to miss.
for (const file of liquidSections) {
  const match = SCHEMA_RE.exec(readFileSync(file, 'utf8'));
  if (!match) {
    console.error(`FAIL  ${relative(ROOT, file)}\n      no {% schema %} block`);
    checked += 1;
    failed += 1;
    continue;
  }
  check(`${relative(ROOT, file)} (schema)`, match[1]);
}

console.log(`\n${checked - failed}/${checked} JSON documents valid.`);
process.exit(failed > 0 ? 1 : 0);
