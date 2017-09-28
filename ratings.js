#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const chalk = require('chalk');
const log = console.log;
const error = console.error;

const testRatings = require('./selenium-test/ratings.js');

const program = require('commander');

function _initXvfb() {
    execSync('export DISPLAY=:99.0');
    fs.exists('/tmp/.X99-lock', (exists) => {
        if (!exists) {
            log(chalk.green.bold('Creating Xvfb...'));
            execSync('Xvfb :99 -screen 0 1280x1024x24 &');
        }
    });
}

program
  .version('0.1.0')
  .option('-n, --number <n>', 'Number of top 500 sites to test', parseInt)
  .option('-f, --file <file>', 'File containing list of domains to test')
  .option('-u, --url <path>', 'URL to test')
  .option('-x, --xvbf', 'Use Xvbf')
  .parse(process.argv);

// if (!program.args.length) program.help();

if (program.xvbf) {
    _initXvfb();
}

if (program.number) {
    testRatings.testTopSites(program.number);
}

else if (program.file) {
    fs.exists(program.file, (exists) => {
        if (exists) {
            let text = fs.readFileSync(fileName, "utf8");
            let urlArray = text.split(/\r?\n/);
            testRatings.getUrls(urlArray);
        }
        else {
            console.error(`File ${program.file} does not exist.`);
        }
    });
}

else if (program.url) {

}