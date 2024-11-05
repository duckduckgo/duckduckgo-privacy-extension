module.exports = function (config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath();

    const configuration = {
        basePath: 'build/',
        frameworks: ['jasmine', 'source-map-support'],
        singleRun: true,
        files: ['*.js', '**/*.js'],
        logLevel: config.LOG_ERROR,
        browsers: ['ChromeNoSandbox'],
        reporters: ['dots'],
        customLaunchers: {
            ChromeNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },
    };

    config.set(configuration);
};
