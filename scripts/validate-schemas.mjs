#!/usr/bin/env node
/**
 * Mirrors the parts of Shopify's theme-import validation that Theme Check
 * does not cover. Exit 1 on any finding.
 *  - url settings may only default to /collections or /collections/all
 *  - no setting may have a blank ("") default; resource settings may not have defaults
 *  - select defaults must be one of the options; range defaults inside min..max and on step; (max-min)/step <= 101
 *  - video_url settings need an `accept` array
 *  - JSON template / group / settings_data values must not contain "{{" (parsed as dynamic sources)
 *  - JSON template select values must be one of the schema options, ranges inside bounds, checkboxes boolean
 *  - JSON templates may reference only existing sections and block types
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const findings = [];
const schemas = {};
const NO_DEFAULT = new Set(['image_picker', 'video', 'product', 'collection', 'product_list', 'collection_list', 'blog', 'article', 'page', 'font_picker_never', 'metaobject', 'metaobject_list', 'color_scheme']);

for (const file of readdirSync(join(ROOT, 'sections')).filter((f) => f.endsWith('.liquid'))) {
  const src = readFileSync(join(ROOT, 'sections', file), 'utf8');
  const m = /{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/.exec(src);
  if (!m) continue;
  let schema;
  try { schema = JSON.parse(m[1]); } catch (e) { findings.push(`${file}: schema JSON parse error ${e.message}`); continue; }
  const name = file.replace(/\.liquid$/, '');
  schemas[name] = schema;
  const check = (settings, where) => {
    for (const st of settings || []) {
      const id = st.id || st.type;
      if ('default' in st) {
        if (st.default === '') findings.push(`${file} ${where}: setting "${id}" has a blank default`);
        if (st.type === 'url' && !['/collections', '/collections/all'].includes(st.default)) findings.push(`${file} ${where}: url setting "${id}" default must be /collections or /collections/all`);
        if (NO_DEFAULT.has(st.type)) findings.push(`${file} ${where}: ${st.type} setting "${id}" cannot have a default`);
        if (st.type === 'select' && !(st.options || []).some((o) => o.value === st.default)) findings.push(`${file} ${where}: select "${id}" default "${st.default}" not in options`);
        if (st.type === 'range') {
          const { min, max, step = 1 } = st;
          if (st.default < min || st.default > max) findings.push(`${file} ${where}: range "${id}" default ${st.default} outside ${min}..${max}`);
          if (Math.abs(((st.default - min) / step) - Math.round((st.default - min) / step)) > 1e-9) findings.push(`${file} ${where}: range "${id}" default ${st.default} not on step ${step}`);
        }
        if (st.type === 'checkbox' && typeof st.default !== 'boolean') findings.push(`${file} ${where}: checkbox "${id}" default must be boolean`);
      }
      if (st.type === 'range') {
        const { min, max, step = 1 } = st;
        if ((max - min) / step > 101) findings.push(`${file} ${where}: range "${id}" has more than 101 steps`);
      }
      if (st.type === 'video_url' && !Array.isArray(st.accept)) findings.push(`${file} ${where}: video_url "${id}" needs an accept array`);
      if (st.type === 'select' && !(st.options || []).length) findings.push(`${file} ${where}: select "${id}" has no options`);
    }
  };
  check(schema.settings, 'settings');
  for (const b of schema.blocks || []) check(b.settings, `block ${b.type}`);
  if ((schema.blocks || []).length > 0 && schema.max_blocks > 50) findings.push(`${file}: max_blocks > 50`);
  for (const p of schema.presets || []) {
    if (!p.name) findings.push(`${file}: preset without name`);
    for (const pb of p.blocks || []) if (!(schema.blocks || []).some((b) => b.type === pb.type)) findings.push(`${file}: preset block type "${pb.type}" not in schema`);
  }
}

function checkValues(file, sectionType, settings, schemaSettings, where) {
  for (const [key, value] of Object.entries(settings || {})) {
    if (typeof value === 'string' && value.includes('{{')) findings.push(`${file} ${where}: "${key}" contains {{ }} (dynamic source)`);
    const st = (schemaSettings || []).find((s) => s.id === key);
    if (!st) { findings.push(`${file} ${where}: unknown setting "${key}" for ${sectionType}`); continue; }
    if (st.type === 'select' && !(st.options || []).some((o) => o.value === value)) findings.push(`${file} ${where}: select "${key}" value "${value}" not in options`);
    if (st.type === 'range' && (typeof value !== 'number' || value < st.min || value > st.max)) findings.push(`${file} ${where}: range "${key}" value ${value} outside ${st.min}..${st.max}`);
    if (st.type === 'checkbox' && typeof value !== 'boolean') findings.push(`${file} ${where}: checkbox "${key}" value must be boolean`);
    if (st.type === 'number' && typeof value !== 'number') findings.push(`${file} ${where}: number "${key}" value must be a number`);
  }
}

function checkTemplate(file, doc) {
  if (!doc.sections || !doc.order) { findings.push(`${file}: missing sections/order`); return; }
  if (Object.keys(doc.sections).length > 25) findings.push(`${file}: more than 25 sections`);
  for (const [sid, sec] of Object.entries(doc.sections)) {
    const schema = schemas[sec.type];
    if (!schema) { findings.push(`${file}: section "${sid}" type "${sec.type}" does not exist`); continue; }
    checkValues(file, sec.type, sec.settings, schema.settings, `section ${sid}`);
    const blocks = Object.entries(sec.blocks || {});
    if (blocks.length > 50) findings.push(`${file}: section "${sid}" has more than 50 blocks`);
    for (const [bid, blk] of blocks) {
      if (blk.type === '@app') continue;
      const bs = (schema.blocks || []).find((b) => b.type === blk.type);
      if (!bs) { findings.push(`${file}: block "${bid}" type "${blk.type}" not in ${sec.type} schema`); continue; }
      checkValues(file, sec.type, blk.settings, bs.settings, `block ${bid}`);
    }
    for (const bid of sec.block_order || []) if (!(sec.blocks || {})[bid]) findings.push(`${file}: block_order references missing block "${bid}"`);
  }
  for (const sid of doc.order) if (!doc.sections[sid]) findings.push(`${file}: order references missing section "${sid}"`);
}

for (const f of readdirSync(join(ROOT, 'templates')).filter((f) => f.endsWith('.json'))) checkTemplate(`templates/${f}`, JSON.parse(readFileSync(join(ROOT, 'templates', f), 'utf8')));
for (const f of readdirSync(join(ROOT, 'sections')).filter((f) => f.endsWith('.json'))) checkTemplate(`sections/${f}`, JSON.parse(readFileSync(join(ROOT, 'sections', f), 'utf8')));

const settingsSchema = JSON.parse(readFileSync(join(ROOT, 'config/settings_schema.json'), 'utf8'));
const flat = settingsSchema.flatMap((g) => g.settings || []);
for (const st of flat) {
  if ('default' in st && st.default === '') findings.push(`settings_schema.json: "${st.id}" blank default`);
  if ('default' in st && st.type === 'url' && !['/collections', '/collections/all'].includes(st.default)) findings.push(`settings_schema.json: url "${st.id}" invalid default`);
  if ('default' in st && NO_DEFAULT.has(st.type)) findings.push(`settings_schema.json: ${st.type} "${st.id}" cannot have a default`);
}
const data = JSON.parse(readFileSync(join(ROOT, 'config/settings_data.json'), 'utf8'));
for (const [k, v] of Object.entries(data.current || {})) {
  if (typeof v === 'string' && v.includes('{{')) findings.push(`settings_data.json: "${k}" contains {{ }}`);
  if (k !== 'blocks' && !flat.some((s) => s.id === k)) findings.push(`settings_data.json: unknown setting "${k}"`);
}

if (findings.length) { console.error(findings.map((f) => `FAIL  ${f}`).join('\n')); console.error(`\n${findings.length} schema/template findings.`); process.exit(1); }
console.log('Schema and JSON template validation passed.');
