#!/usr/bin/env node

/**
 * Recreates the node_modules links to the npm workspace packages.
 * CI runs this after it restores node_modules from the cache: the cache archive does not
 * keep Windows junctions, so a restored link can be missing or be a stale copy.
 */

import { lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const { workspaces } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

for (const workspace of workspaces) {
    const target = join(rootDir, workspace);
    const { name } = JSON.parse(readFileSync(join(target, 'package.json'), 'utf-8'));
    const link = join(rootDir, 'node_modules', name);

    let stat = null;
    try {
        stat = lstatSync(link);
    } catch {}
    if (stat?.isSymbolicLink()) {
        // Remove only the link, never the workspace it points to
        unlinkSync(link);
    } else if (stat) {
        rmSync(link, { recursive: true, force: true });
    }

    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link, 'junction');
}
