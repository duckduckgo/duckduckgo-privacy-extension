module.exports = function(config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath()

    config.set({
        basePath: '',
        frameworks: ['jasmine','source-map-support'],
        singleRun: true,
        files: [],
        logLevel: config.LOG_ERROR,
        browsers: ['ChromeHeadless'],
        reporters: ['dots']
    })
};
