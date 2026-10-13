/**
 * Accuracy of each lookup option for one member list.
 *   node measure.mjs --data <dir from build-data.mjs> --tranco tranco.csv -o results.json [--serp serp-clicks.csv --serp-totals totals.json]
 *
 * Hostnames are tested bare (as listed) and with "www." prepended, which exercises one more suffix in the walk.
 * --serp-totals is a JSON file with { denominator, outsideClicks, outsideDomains, minClicks } for the click-weighted metrics.
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'node:util';
import { getDomain } from 'tldts';
import { someSuffix } from './lookups/suffix-walk.js';
import { loadSerp, loadTranco, readMembers } from './lists.mjs';
import { OPTIONS } from './options.mjs';

const { values: argv } = parseArgs({
    options: {
        data: { type: 'string' },
        tranco: { type: 'string' },
        serp: { type: 'string' },
        'serp-totals': { type: 'string' },
        output: { type: 'string', short: 'o' },
    },
});

const members = readMembers(path.join(argv.data, 'members.txt'));
const memberSet = new Set(members);
const tranco = loadTranco(argv.tranco);
const nonMembers = tranco.filter((d) => !memberSet.has(getDomain(d)));
const serp = argv.serp ? loadSerp(argv.serp) : null;
const results = { members: members.length, trancoNonMembers: nonMembers.length, options: [] };
console.log(`members ${members.length}, Tranco non-members ${nonMembers.length}`);

// Bucket agreement between the exact suffix walk and tldts.getDomain(), on the same member set.
function bucketDiffs(hosts) {
    const diffs = [];
    for (const host of hosts) {
        const viaTldts = memberSet.has(getDomain(host));
        const viaWalk = someSuffix(host, (s) => memberSet.has(s));
        if (viaTldts !== viaWalk) {
            diffs.push({ host, tldtsDomain: getDomain(host), tldts: viaTldts, walk: viaWalk });
        }
    }
    return diffs;
}
results.bucketDiffs = {
    trancoBare: bucketDiffs(tranco),
    trancoWww: bucketDiffs(tranco.map((d) => `www.${d}`)),
};
if (serp) {
    results.bucketDiffs.serpBare = bucketDiffs(serp.map((r) => r.domain));
    results.bucketDiffs.serpWww = bucketDiffs(serp.map((r) => `www.${r.domain}`));
}
for (const [k, v] of Object.entries(results.bucketDiffs)) {
    console.log(`bucket diffs ${k}: ${v.length}`, v.slice(0, 5));
}

let serpTotals = null;
if (serp && argv['serp-totals']) {
    serpTotals = JSON.parse(fs.readFileSync(argv['serp-totals'], 'utf-8'));
}
const trueTop = serp ? new Set(serp.slice(0, 10000).map((r) => r.domain)) : null;
if (serp) {
    const overlap = serp.slice(0, 10000).filter((r) => memberSet.has(r.domain));
    results.serpOverlap = {
        membersInTrueTop: overlap.length,
        clicks: overlap.reduce((s, r) => s + r.clicks, 0),
        membersInFile: serp.filter((r) => memberSet.has(r.domain)).length,
    };
}

for (const option of OPTIONS) {
    const dataFile = path.join(argv.data, option.file);
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    const mod = await import(`./lookups/${option.module}.js`);

    const match = mod.createHostMatcher(data);
    await match.ready;

    const missedMembers = members.filter((d) => !match(d) || !match(`www.${d}`)).length;
    const fpBare = nonMembers.filter((d) => match(d)).length;
    const fpWww = nonMembers.filter((d) => match(`www.${d}`)).length;
    const row = {
        ...option,
        dataBytes: fs.statSync(dataFile).size,
        missedMembers,
        fpBare,
        fpWww,
        fpRateBare: fpBare / nonMembers.length,
        fpRateWww: fpWww / nonMembers.length,
        // members always land in top10k (missedMembers is 0), so impostors are false matches over all matches
        impostorShareWww: fpWww / (fpWww + members.length),
    };

    if (serp) {
        let landed = 0;
        let impostor = 0;
        let impostorDomains = 0;
        let covered = 0;
        for (const { domain, clicks } of serp) {
            if (!match(`www.${domain}`)) {
                continue;
            }
            landed += clicks;
            if (!memberSet.has(domain)) {
                impostor += clicks;
                impostorDomains++;
            }
            if (trueTop.has(domain)) {
                covered += clicks;
            }
        }
        row.serp = { landedClicks: landed, impostorClicks: impostor, impostorDomains, coveredClicks: covered };
        if (serpTotals) {
            const { denominator, outsideClicks, outsideDomains, minClicks } = serpTotals;
            // Outside the file: false matches are independent of clicks, so the expected impostor clicks are rate x clicks.
            const expected = row.fpRateWww * outsideClicks;
            const capped = row.fpRateWww * outsideDomains * minClicks;
            Object.assign(row.serp, {
                impostorShareZero: impostor / landed,
                impostorShareExpected: (impostor + expected) / (landed + expected),
                impostorShareCapped: (impostor + capped) / (landed + capped),
                expectedOutsideImpostorClicks: expected,
                cappedOutsideImpostorClicks: capped,
                coverage: covered / denominator,
                bucketShare: landed / denominator,
            });
        }
    }
    results.options.push(row);
    console.log(
        `${option.id.padEnd(6)} data ${row.dataBytes} B  missed ${missedMembers}  fp bare ${(row.fpRateBare * 100).toFixed(4)}%  fp www ${(row.fpRateWww * 100).toFixed(4)}%  impostors ${(row.impostorShareWww * 100).toFixed(2)}%`,
    );
}

fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
