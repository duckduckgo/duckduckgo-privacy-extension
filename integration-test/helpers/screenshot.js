const path = require('path')

const Jimp = require('jimp')

const allowedOptions = new Set([
    'fullPage', 'clip', 'omitBackground', 'captureBeyondViewport'
])

const actualScreenshotsDir = path.resolve(__dirname, '..', 'artifacts', 'screenshots')
const expectedScreenshotsDir = path.resolve(__dirname, '..', 'data', 'screenshots')

function screenshotDiffFilename (screenshotFilename) {
    const { dir, name, ext } = path.parse(screenshotFilename)
    return path.join(dir, name + '-diff' + ext)
}

/**
 * Takes a screenshot of a page and compares that to the expected screenshot.
 * If the screenshots don't match, the actual screenshot is written to disk as
 * a test artifact and a debugging message is logged.
 * @param {Page} page
 *   The page to screenshot.
 * @param {Object} options
 *   Options to be passed through to Puppeteer's `page.screenshot` API.
 *   Note: Unsafe options such as path are stripped.
 *   See https://github.com/puppeteer/puppeteer/blob/v13.2.0/docs/api.md#pagescreenshotoptions
 * @param {string} expectedScreenshotFilename
 *   The file name of the expected screenshot, in the
 *   /integration-test/data/screenshots/ directory.
 *   Note: It's recommended to first write a failing test, then copy the
 *         screenshot artifact for the failing test over to be used as the
 *         expected screenshot. That way the screenshots will match exactly and
 *         file formats etc are taken care of automatically.
 * @returns {boolean}
 *    True if the screenshots match, false otherwise.
 */
async function screenshotMatches (page, screenshotFilename, options = {}) {
    const actualScreenshotPath = path.resolve(actualScreenshotsDir, screenshotFilename)
    const screenshotDiffPath = path.resolve(actualScreenshotsDir, screenshotDiffFilename(screenshotFilename))
    const expectedScreenshotPath = path.resolve(expectedScreenshotsDir, screenshotFilename)

    const screenshotOptions = {
        type: 'png',
        encoding: 'binary'
    }
    for (const key of Object.keys(options)) {
        if (allowedOptions.has(key)) {
            screenshotOptions[key] = options[key]
        }
    }

    let expectedScreenshot = null
    const actualScreenshot = await Jimp.read(await page.screenshot(screenshotOptions))

    try {
        expectedScreenshot = await Jimp.read(expectedScreenshotPath)
    } catch (e) {
        await actualScreenshot.write(actualScreenshotPath)
        console.error(
            'Failed to open screenshot: ', screenshotFilename, '\n',
            'If this is a new test...\n',
            ' - Copy:', actualScreenshotPath, '\n',
            ' - To:', expectedScreenshotPath, '\n'
        )
        return false
    }

    const screenshotDiff = Jimp.diff(expectedScreenshot, actualScreenshot)

    // Screenshots match.
    // Note: `screenshotDiff.percent` is a number between 0 and 1. Ignore very
    //       small differences, to avoid test flakes due to font rendering etc.
    //       The threshold for acceptable difference might need to be adjusted
    //       in the future.
    // See also https://www.npmjs.com/package/jimp
    if (screenshotDiff.percent < 0.01) {
        return true
    }

    // Screenshots don't match.
    console.error(
        'Screenshot doesn\'t match:', screenshotFilename, '\n',
        ' - Expected screenshot:', expectedScreenshotPath, '\n',
        ' - Actual screenshot:', actualScreenshotPath, '\n',
        ' - Image diff:', screenshotDiffPath, '\n',
        ' - Diff calculated:', screenshotDiff.percent, '\n'
    )
    return false
}

module.exports = {
    screenshotMatches
}
