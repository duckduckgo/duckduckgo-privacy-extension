#!/usr/bin/env node

/**
 * Validates that package-lock.json is in sync with package.json
 * Run this in CI before `npm ci` to catch lockfile drift early with a clear error.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const lock = JSON.parse(readFileSync(join(rootDir, 'package-lock.json'), 'utf-8'));

const errors = [];

// Get the specifiers stored in the lockfile's root package entry
const lockDeps = lock.packages?.['']?.dependencies || {};
const lockDevDeps = lock.packages?.['']?.devDependencies || {};

function normalizeSpecifier(spec) {
    // Normalize github shorthand to match lockfile format
    // "github:org/repo#tag" stays as is in lockfile
    return spec;
}

function checkDeps(pkgDeps, lockDeps, type) {
    if (!pkgDeps) return;
    for (const [name, specifier] of Object.entries(pkgDeps)) {
        // Skip workspace packages
        if (specifier.startsWith('file:')) continue;

        const lockSpecifier = lockDeps[name];
        const normalizedPkgSpec = normalizeSpecifier(specifier);

        if (!lockSpecifier) {
            errors.push(`${type} "${name}" not found in package-lock.json`);
        } else if (lockSpecifier !== normalizedPkgSpec) {
            errors.push(
                `${type} "${name}" version mismatch:\n` +
                `    package.json:      ${specifier}\n` +
                `    package-lock.json: ${lockSpecifier}`
            );
        }
    }

    // Check for deps in lockfile that aren't in package.json
    for (const name of Object.keys(lockDeps)) {
        if (!pkgDeps[name]) {
            errors.push(`${type} "${name}" in package-lock.json but not in package.json`);
        }
    }
}

checkDeps(pkg.dependencies, lockDeps, 'dependency');
checkDeps(pkg.devDependencies, lockDevDeps, 'devDependency');

if (errors.length > 0) {
    console.error('❌ package-lock.json is out of sync with package.json:\n');
    errors.forEach(e => console.error(`  - ${e}\n`));
    console.error('Run `npm install` to update package-lock.json');
    process.exit(1);
}

console.log('✓ package-lock.json is in sync with package.json');
