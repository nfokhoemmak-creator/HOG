#!/usr/bin/env node
/**
 * Cross-reference checks on top of validate-json.mjs:
 *
 *  1. Every section type referenced by templates/*.json and the section
 *     groups resolves to sections/<type>.liquid.
 *  2. Every block type used in a template exists in that section's schema.
 *  3. Every setting id a template sets exists in the section schema (warn —
 *     Shopify ignores unknown ids, but they're almost always typos).
 *  4. Every {% render 'name' %} resolves to snippets/name.liquid.
 *  5. Liquid block tags are balanced per file (if/unless/case/for/form/
 *     capture/style/schema/paginate/comment).
 *  6. Schema presets only reference block types the section declares.
 *
 * Exits non-zero on errors; warnings don't fail the build.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCHEMA_RE = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/;

let errors = 0;
let warnings = 0;
const err = (msg) => { errors += 1; console.error(`ERROR ${msg}`); };
const warn = (msg) => { warnings += 1; console.warn(` warn ${msg}`); };

function files(dir, ext) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => join(abs, e.name));
}

/* ---- collect section schemas ------------------------------------------- */

const sectionSchemas = new Map(); // type -> { settings: Set, blocks: Map<type, Set<settingIds>> }

for (const file of files('sections', '.liquid')) {
  const type = basename(file, '.liquid');
  const match = SCHEMA_RE.exec(readFileSync(file, 'utf8'));
  if (!match) continue;
  let schema;
  try {
    schema = JSON.parse(match[1]);
  } catch {
    continue; // validate-json reports the parse error
  }
  const settingIds = new Set((schema.settings || []).map((s) => s.id).filter(Boolean));
  const blocks = new Map();
  for (const block of schema.blocks || []) {
    blocks.set(block.type, new Set((block.settings || []).map((s) => s.id).filter(Boolean)));
  }
  sectionSchemas.set(type, { settings: settingIds, blocks, schema, file });
}

/* ---- 1–3: template + group references ---------------------------------- */

const templateFiles = [
  ...files('templates', '.json'),
  ...files('sections', '.json'), // header-group.json / footer-group.json
];

for (const file of templateFiles) {
  const label = relative(ROOT, file);
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  for (const [sid, section] of Object.entries(doc.sections || {})) {
    const meta = sectionSchemas.get(section.type);
    if (!meta) {
      err(`${label}: section "${sid}" references missing section type "${section.type}"`);
      continue;
    }
    for (const id of Object.keys(section.settings || {})) {
      if (!meta.settings.has(id)) warn(`${label}: ${sid} sets unknown setting "${id}" (${section.type})`);
    }
    for (const [bid, block] of Object.entries(section.blocks || {})) {
      const blockMeta = meta.blocks.get(block.type);
      if (!blockMeta) {
        err(`${label}: ${sid}.${bid} uses block type "${block.type}" not in ${section.type} schema`);
        continue;
      }
      for (const id of Object.keys(block.settings || {})) {
        if (!blockMeta.has(id)) warn(`${label}: ${sid}.${bid} sets unknown block setting "${id}"`);
      }
    }
    const order = section.block_order || [];
    for (const bid of order) {
      if (!(section.blocks || {})[bid]) err(`${label}: ${sid} block_order references missing block "${bid}"`);
    }
  }
  for (const sid of doc.order || []) {
    if (!(doc.sections || {})[sid]) err(`${label}: order references missing section "${sid}"`);
  }
}

/* ---- 4: render targets --------------------------------------------------- */

const snippetNames = new Set(files('snippets', '.liquid').map((f) => basename(f, '.liquid')));
const liquidFiles = [
  ...files('layout', '.liquid'),
  ...files('sections', '.liquid'),
  ...files('snippets', '.liquid'),
  ...files('templates', '.liquid'),
  ...files('templates/customers', '.liquid'),
];

const RENDER_RE = /\{%-?\s*(?:render|include)\s+'([^']+)'/g;

for (const file of liquidFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(RENDER_RE)) {
    if (!snippetNames.has(match[1])) {
      err(`${relative(ROOT, file)}: renders missing snippet "${match[1]}"`);
    }
  }
}

/* ---- 5: balanced block tags ---------------------------------------------- */

const PAIRS = ['if', 'unless', 'case', 'for', 'form', 'capture', 'style', 'schema', 'paginate', 'comment', 'javascript', 'stylesheet'];
const TAG_RE = /\{%-?\s*(end)?(if|unless|case|for|form|capture|style|schema|paginate|comment|javascript|stylesheet)\b/g;

for (const file of liquidFiles) {
  const source = readFileSync(file, 'utf8');
  const counts = Object.fromEntries(PAIRS.map((t) => [t, 0]));
  for (const match of source.matchAll(TAG_RE)) {
    counts[match[2]] += match[1] ? -1 : 1;
  }
  for (const tag of PAIRS) {
    if (counts[tag] !== 0) {
      err(`${relative(ROOT, file)}: unbalanced {% ${tag} %} (${counts[tag] > 0 ? 'missing end' : 'extra end'}${tag})`);
    }
  }
}

/* ---- 6: preset block types ----------------------------------------------- */

for (const [type, meta] of sectionSchemas) {
  for (const preset of meta.schema.presets || []) {
    for (const block of preset.blocks || []) {
      if (!meta.blocks.has(block.type)) {
        err(`sections/${type}.liquid: preset uses undeclared block type "${block.type}"`);
      }
    }
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
