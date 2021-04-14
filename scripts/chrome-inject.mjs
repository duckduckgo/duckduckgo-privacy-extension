import { readFile } from 'fs/promises';

async function init() {
    if (process.argv.length != 3) {
        throw new Error("Specify the content-scope.js path as an argument to this script.");
    }
    const contentScopePath = process.argv[2];
    const replaceString = "SCRIPT_TO_REPLACE";
    const injectScriptPath = "shared/js/chrome-inject/inject.js";
    const injectScript = await readFile(injectScriptPath);
    const contentScope = await readFile(contentScopePath);
    // Encode in URI format to prevent breakage (we could choose to just escape ` instead)
    const encodedString = encodeURI(contentScope.toString());
    const outputScript = injectScript.toString().replace(replaceString, "decodeURI(`" + encodedString + "`)");
    console.log(outputScript);
}

init();
