module.exports = function (config) {
    process.env.CHROME_BIN = require('puppeteer').executablePath()

    const configuration = {
        basePath: '',
        frameworks: ['jasmine', 'source-map-support'],
        singleRun: true,
        files: [],
        logLevel: config.LOG_ERROR,
        browserConsoleLogOptions: {
            level: 'warn'
        },
        browsers: ['ChromeHeadless'],
        reporters: ['dots'],
        customLaunchers: {
            Chrome_travis_ci: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        }
    }

    if (process.env.TRAVIS) {
        configuration.browsers = ['Chrome_travis_ci']
    }

    config.set(configuration)
}
