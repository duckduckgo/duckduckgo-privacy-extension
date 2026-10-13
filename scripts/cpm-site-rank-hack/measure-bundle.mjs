/**
 * Raw size of the release background-embedded.js for each option, built with the same esbuild flags as the Makefile.
 *   node measure-bundle.mjs --data <dir from build-data.mjs> --base <git rev> --tmp <scratch dir> -o bundle.json
 *
 * --base is the main commit to compare with; it is exported with `git archive` and built with this checkout's node_modules.
 * Each option replaces shared/js/background/components/cpm-site-rank.js with a shim that imports its lookup module and data.
 * 'none' keeps the branch's CPM changes but returns no lookup, which isolates the cost of the lookup and its data.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { parseArgs } from 'node:util';
import { build as esbuild } from 'esbuild';
import { OPTIONS } from './options.mjs';

const { values: argv } = parseArgs({
    options: {
        data: { type: 'string' },
        base: { type: 'string' },
        tmp: { type: 'string' },
        output: { type: 'string', short: 'o' },
    },
});
const repo = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
const here = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.resolve(argv.data);
fs.mkdirSync(argv.tmp, { recursive: true });

const RELEASE = {
    bundle: true,
    write: false,
    target: ['firefox91', 'chrome92'],
    define: { BUILD_TARGET: '"embedded"', DEBUG: 'false', RELOADER: 'false' },
    // esbuild prints a `// path` comment per module, relative to absWorkingDir; node_modules is symlinked into the base tree
    // so both trees print the same paths.
    preserveSymlinks: true,
    logLevel: 'error',
};

async function build(root, shim) {
    const plugins = shim
        ? [{ name: 'swap-site-rank', setup: (b) => b.onResolve({ filter: /\/cpm-site-rank$/ }, () => ({ path: shim })) }]
        : [];
    const result = await esbuild({
        ...RELEASE,
        absWorkingDir: root,
        entryPoints: ['shared/js/background/background-embedded.js'],
        plugins,
    });
    return result.outputFiles[0].contents.length;
}

function writeShim(name, body) {
    const file = path.join(argv.tmp, `shim-${name}.js`);
    fs.writeFileSync(file, body);
    return file;
}

const baseDir = path.join(argv.tmp, 'base');
fs.rmSync(baseDir, { recursive: true, force: true });
fs.mkdirSync(baseDir);
execFileSync('tar', ['-x', '-C', baseDir], {
    input: execFileSync('git', ['archive', argv.base, 'shared'], { cwd: repo, maxBuffer: 1 << 30 }),
});
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(baseDir, 'node_modules'));

const results = { base: argv.base, baseBytes: await build(baseDir), prototypeBytes: await build(repo) };
results.noneBytes = await build(repo, writeShim('none', 'export function createBundledSiteRankLookup() {\n    return undefined;\n}\n'));
console.log(`base ${results.baseBytes}  prototype as committed ${results.prototypeBytes}  branch without lookup ${results.noneBytes}`);

results.options = [];
for (const option of OPTIONS) {
    const lookup = path.join(here, 'lookups', `${option.module}.js`);
    const data = path.join(dataDir, option.file);
    const shim = writeShim(
        option.id,
        `import data from '${data}';\nimport { createSiteRankLookup } from '${lookup}';\n\nexport function createBundledSiteRankLookup() {\n    return createSiteRankLookup(data);\n}\n`,
    );
    const bytes = await build(repo, shim);
    // Lookup code on its own, with its dependencies but without data
    const code = await esbuild({
        ...RELEASE,
        format: 'esm',
        absWorkingDir: repo,
        stdin: { contents: `export { createSiteRankLookup } from '${lookup}';`, resolveDir: here },
    });
    const row = {
        id: option.id,
        dataBytes: fs.statSync(data).size,
        codeBytes: code.outputFiles[0].contents.length,
        bundleBytes: bytes,
        deltaVsBase: bytes - results.baseBytes,
        deltaVsNone: bytes - results.noneBytes,
    };
    results.options.push(row);
    console.log(
        `${option.id.padEnd(6)} data ${row.dataBytes}  code ${row.codeBytes}  bundle ${bytes}  vs base +${row.deltaVsBase}  vs no lookup +${row.deltaVsNone}`,
    );
}
fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
