#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const chalk = require('chalk');
const Xvfb = require('xvfb');
const program = require('commander');
const testRatings = require('./lib/ratings.js');

const log = console.log;
const error = console.error;

program
    .option('-n, --number <n>', 'Number of top 500 sites to test', parseInt)
    .option('-f, --file <file>', 'File containing list of domains to test')
    .option('-u, --url <path>', 'URL to test')
    .option('-x, --xvbf', 'Use Xvbf')
    .option('-o, --output <path>', 'Output location')
    .parse(process.argv);

async function runTest(opts) {
    if (program.number) {
        await testRatings.testTopSites(program.number, opts);
    } else if (program.file) {
        if (fs.existsSync(program.file)) {
            let text = fs.readFileSync(program.file, "utf8");
            let urlArray = text.split(/\r?\n/);
            await testRatings.testUrls(urlArray, opts);
        } else {
            console.error(`Could not read ${program.file}`);
        }
    } else if (program.url) {
        await testRatings.testUrl(program.url, opts);
    } else {
        program.help();
    }
}

(async () => {
    let opts = {
        output: program.output || '.'
    };

    if (program.xvbf) {
        let xvfb = new Xvfb({ reuse: true });
        log(chalk.green.bold("Starting xvfb..."));
        xvfb.startSync();
        await runTest(opts);
        log(chalk.green.bold("Stopping xvfb..."));
        xvfb.stopSync();
    } else {
        runTest(opts);
    }
})();
