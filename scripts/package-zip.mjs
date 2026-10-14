#!/usr/bin/env node
/**
 * Builds jamalati-theme.zip from the theme folders only, ready to upload in
 * Shopify admin → Online Store → Themes → Add theme → Upload zip file.
 * Uses the system `zip` binary so there are no extra dependencies.
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const OUT = 'jamalati-theme.zip';
const DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];

if (existsSync(OUT)) rmSync(OUT);
execSync(`zip -r -X ${OUT} ${DIRS.join(' ')} -x '*.DS_Store'`, { stdio: 'inherit' });
console.log(`\nWrote ${OUT}`);
