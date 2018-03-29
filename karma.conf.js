module.exports = function(config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath()

    config.set({
        frameworks: ['jasmine'],
        singleRun: true,
        basePath: `build/test/`,
        files: ['background.js'],
        logLevel: config.LOG_ERROR,
        browsers: ['ChromeHeadless']
    })
};
