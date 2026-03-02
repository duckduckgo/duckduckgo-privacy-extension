const fs = require('fs');
const { getMergedPr } = require('./asana-utils');

function extractMetadata(prBody) {
    const match = prBody.match(/<!-- apple_task_url: (.*?) apple_task_gid: (.*?) -->/);
    const appleTaskUrl = match?.[1] || '';
    const appleTaskGid = match?.[2] || '';

    return { appleTaskUrl, appleTaskGid };
}

async function run() {
    const pr = await getMergedPr(
        process.env.GITHUB_TOKEN,
        process.env.GITHUB_REPOSITORY,
        process.env.GITHUB_SHA,
    );

    const { appleTaskGid } = extractMetadata(pr?.body ?? '');

    // When autoconsent metadata is present, chain onto the same branch as the native Apple PR.
    // Otherwise, use a standalone branch (e.g. triggered by a normal extension release).
    const branch = appleTaskGid ? 'update-autoconsent' : 'update-embedded-extension';

    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
        fs.appendFileSync(outputFile, `APPLE_TASK_GID=${appleTaskGid}\n`);
        fs.appendFileSync(outputFile, `APPLE_BRANCH=${branch}\n`);
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
