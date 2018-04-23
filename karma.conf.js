module.exports = function(config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath()

    let configuration = {
        basePath: '',
        frameworks: ['jasmine','source-map-support'],
        singleRun: true,
        files: [],
        logLevel: config.LOG_ERROR,
        browsers: ['ChromeNoSandbox'],
        reporters: ['dots'],
        customLaunchers: {
            ChromeNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        }
    }

    config.set(configuration)
};
