#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const chalk = require('chalk');
const Xvfb = require('xvfb');
const program = require('commander');
const testRatings = require('./selenium-test/ratings.js');

const log = console.log;
const error = console.error;

program
    .option('-n, --number <n>', 'Number of top 500 sites to test', parseInt)
    .option('-f, --file <file>', 'File containing list of domains to test')
    .option('-u, --url <path>', 'URL to test')
    .option('-x, --xvbf', 'Use Xvbf')
    .parse(process.argv);

async function runTest() {
    if (program.number) {
        await testRatings.testTopSites(program.number);
    } else if (program.file) {
        if (fs.existsSync(program.file)) {
            let text = fs.readFileSync(program.file, "utf8");
            let urlArray = text.split(/\r?\n/);
            await testRatings.testUrls(urlArray);
        } else {
            console.error(`Could not read ${program.file}`);
        }
    } else if (program.url) {
        await testRatings.testUrl(program.url);
    } else {
        program.help();
    }
}

(async () => {
    if (program.xvbf) {
        let xvfb = new Xvfb({ reuse: true });
        log(chalk.green.bold("Starting xvfb..."));
        xvfb.startSync();
        await runTest();
        log(chalk.green.bold("Stopping xvfb..."));
        xvfb.stopSync();
    } else {
        runTest();
    }
})();
