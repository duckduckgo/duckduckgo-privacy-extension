#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const chalk = require('chalk');
const Xvfb = require('xvfb');
const program = require('commander');
const testRatings = require('./selenium-test/ratings.js');

const log = console.log;
const error = console.error;

let xvbf;

program
    .option('-n, --number <n>', 'Number of top 500 sites to test', parseInt)
    .option('-f, --file <file>', 'File containing list of domains to test')
    .option('-u, --url <path>', 'URL to test')
    .option('-x, --xvbf', 'Use Xvbf')
    .parse(process.argv);

if (program.xvbf) {
    execSync('export DISPLAY=:99.0');
    xvfb = new Xvfb({
        reuse: true,
        xvfb_args: '-screen 0 1280x1024x24'
    });
    log(chalk.green.bold("Starting xvfb..."));
    xvfb.startSync();
    log(chalk.green.bold("xvfb started"));
}


if (program.number) {
    testRatings.testTopSites(program.number);
} else if (program.file) {
    if (fs.existsSync(program.file)) {
        let text = fs.readFileSync(program.file, "utf8");
        let urlArray = text.split(/\r?\n/);
        testRatings.testUrls(urlArray);
    } else {
        console.error(`Could not read ${program.file}`);
    }
} else if (program.url) {
    testRatings.testUrl(program.url);
} else {
    program.help();
}

if (program.xvbf) {
    log(chalk.green.bold("Stopping xvfb..."));
    xvfb.stopSync();
    log(chalk.green.bold("Xvfb stopped"));
}
