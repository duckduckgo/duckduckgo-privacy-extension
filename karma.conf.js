module.exports = function(config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath()

    config.set({
        basePath: '',
        frameworks: ['jasmine'],
        singleRun: true,
        files: [],
        logLevel: config.LOG_ERROR,
        browsers: ['ChromeHeadless'],
        reporters: ['dots']
    })
};
