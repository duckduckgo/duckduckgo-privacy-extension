import { readFile } from 'fs/promises';

async function init() {
    if (process.argv.length != 4) {
        throw new Error("Specify the content-scope.js path and build type as an argument to this script.");
    }
    if (process.argv[3] == "firefox") {
        initFirefox();
    } else {
        initChrome();
    }
}

async function initFirefox() {
    const contentScopePath = process.argv[2];
    const replaceString = "SCRIPT_TO_REPLACE";
    const injectScriptPath = "shared/js/inject/mozilla.js";
    const injectScript = await readFile(injectScriptPath);
    const contentScope = await readFile(contentScopePath);
    const outputScript = injectScript.toString().replace(replaceString, contentScope.toString());
    console.log(outputScript);
}

async function initChrome() {
    const contentScopePath = process.argv[2];
    const replaceString = "SCRIPT_TO_REPLACE";
    const injectScriptPath = "shared/js/inject/chrome.js";
    const injectScript = await readFile(injectScriptPath);
    const contentScope = await readFile(contentScopePath);
    // Encode in URI format to prevent breakage (we could choose to just escape ` instead)
    const encodedString = encodeURI(contentScope.toString());
    const outputScript = injectScript.toString().replace(replaceString, "decodeURI(`" + encodedString + "`)");
    console.log(outputScript);
}

init();
