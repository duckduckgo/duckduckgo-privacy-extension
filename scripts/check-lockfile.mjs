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

function checkDeps(pkgDeps, lockDepsMap, type) {
    const pkgDepsMap = pkgDeps || {};

    for (const [name, specifier] of Object.entries(pkgDepsMap)) {
        // Skip workspace packages
        if (specifier.startsWith('file:')) continue;

        const lockSpecifier = lockDepsMap[name];
        const normalizedPkgSpec = normalizeSpecifier(specifier);

        if (!lockSpecifier) {
            errors.push(`${type} "${name}" not found in package-lock.json`);
        } else if (lockSpecifier !== normalizedPkgSpec) {
            errors.push(
                `${type} "${name}" version mismatch:\n` +
                    `    package.json:      ${specifier}\n` +
                    `    package-lock.json: ${lockSpecifier}`,
            );
        }
    }

    // Check for deps in lockfile that aren't in package.json
    for (const name of Object.keys(lockDepsMap)) {
        if (!pkgDepsMap[name]) {
            errors.push(`${type} "${name}" in package-lock.json but not in package.json`);
        }
    }
}

checkDeps(pkg.dependencies, lockDeps, 'dependency');
checkDeps(pkg.devDependencies, lockDevDeps, 'devDependency');

function parseGithubSpecifier(specifier) {
    // Examples:
    // - github:duckduckgo/content-scope-scripts#12.13.0
    // - github:duckduckgo/pixel-schema#v1.0.8
    // - github:duckduckgo/privacy-configuration (no ref)
    if (!specifier?.startsWith('github:')) return null;
    const raw = specifier.slice('github:'.length);
    const [ownerRepo, ref] = raw.split('#');
    const [owner, repo] = ownerRepo.split('/');
    if (!owner || !repo) return null;
    return { owner, repo, ref };
}

function looksLikeSemverTag(ref) {
    // Only enforce tags that look like released semver, optionally prefixed with v.
    // Examples: 12.13.0, v1.0.8, 12.13.0-beta.1
    return typeof ref === 'string' && /^v?\d+\.\d+\.\d+([-.].+)?$/.test(ref);
}

function extractGitShaFromLockEntry(entry) {
    // npm lock entries for git deps typically look like:
    // - version: git+ssh://git@github.com/org/repo.git#<sha>
    // - resolved: git+ssh://git@github.com/org/repo.git#<sha>
    const candidates = [entry?.version, entry?.resolved].filter(Boolean);
    for (const str of candidates) {
        const m = /#([0-9a-f]{40})$/i.exec(str);
        if (m) return m[1].toLowerCase();
    }
    return null;
}

async function githubApi(path) {
    const headers = {
        accept: 'application/vnd.github+json',
        'user-agent': 'duckduckgo-privacy-extension-lockfile-check',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`GitHub API error ${res.status} for ${path}${text ? `: ${text}` : ''}`);
    }
    return await res.json();
}

async function resolveTagToCommitSha({ owner, repo, tag }) {
    // Try both "vX.Y.Z" and "X.Y.Z" because DDG repos are inconsistent here.
    const candidates = [tag];
    if (tag.startsWith('v')) candidates.push(tag.slice(1));
    else candidates.push(`v${tag}`);

    for (const candidate of candidates) {
        const ref = await githubApi(`/repos/${owner}/${repo}/git/ref/tags/${encodeURIComponent(candidate)}`);
        if (!ref) continue;

        // ref.object can be "commit" or "tag" (annotated tag)
        let obj = ref.object;
        // Follow annotated tags to the underlying commit
        for (let i = 0; i < 5; i++) {
            if (obj.type === 'commit') return obj.sha.toLowerCase();
            if (obj.type !== 'tag') break;
            const tagObj = await githubApi(`/repos/${owner}/${repo}/git/tags/${obj.sha}`);
            if (!tagObj?.object) break;
            obj = tagObj.object;
        }
        break;
    }
    return null;
}

async function checkGitDependencyPinnedCommits() {
    // Only enforce this in CI to avoid surprising local network calls during linting.
    if (!process.env.CI) return;

    const pkgDepsMap = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const lockDepsSection = lock.dependencies || {};

    for (const [name, specifier] of Object.entries(pkgDepsMap)) {
        const parsed = parseGithubSpecifier(specifier);
        if (!parsed?.ref) continue;
        if (!looksLikeSemverTag(parsed.ref)) continue;

        const lockEntry = lockDepsSection[name];
        if (!lockEntry) continue; // already handled by sync check above

        const pinnedSha = extractGitShaFromLockEntry(lockEntry);
        if (!pinnedSha) continue; // non-git or not pinned in this lock section

        let expectedSha = null;
        try {
            expectedSha = await resolveTagToCommitSha({
                owner: parsed.owner,
                repo: parsed.repo,
                tag: parsed.ref,
            });
        } catch (e) {
            errors.push(
                `dependency "${name}" failed to resolve tag "${parsed.owner}/${parsed.repo}#${parsed.ref}" via GitHub API: ${e?.message || String(e)}`,
            );
            continue;
        }

        if (!expectedSha) {
            errors.push(
                `dependency "${name}" cannot resolve tag "${parsed.owner}/${parsed.repo}#${parsed.ref}" via GitHub API (needed to validate lockfile pin)`,
            );
            continue;
        }

        if (pinnedSha !== expectedSha) {
            errors.push(
                `dependency "${name}" git pin mismatch:\n` +
                    `    package.json tag:  github:${parsed.owner}/${parsed.repo}#${parsed.ref}\n` +
                    `    expected commit:   ${expectedSha}\n` +
                    `    package-lock.json: ${pinnedSha}`,
            );
        }
    }
}

await checkGitDependencyPinnedCommits();

if (errors.length > 0) {
    console.error('❌ lockfile validation failed:\n');
    errors.forEach((e) => console.error(`  - ${e}\n`));
    console.error('Run `npm install` to update package-lock.json');
    process.exit(1);
}

console.log('✓ package-lock.json is in sync with package.json');
