import { readFile } from 'fs/promises';
import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dynamicImportVariables from 'rollup-plugin-dynamic-import-variables';


async function generateContentScope() {
    let mozProxies = false;
    // The code is using a global, that we define here which means once tree shaken we get a browser specific output.
    if (process.argv[2] == "firefox") {
        mozProxies = true;
    }
    const inputOptions = {
        input: 'shared/js/content-scope/protections.js',
        plugins: [
            dynamicImportVariables({}),
            commonjs(),
            replace({
                preventAssignment: true,
                values: {
                    mozProxies
                }
            })
        ]
    };
    const outputOptions = {
        dir: 'build',
        format: 'iife',
        inlineDynamicImports: true,
        name: 'protections'
    };

    const bundle = await rollup.rollup(inputOptions);
    const generated = await bundle.generate(outputOptions);
    return generated.output[0].code;
}

async function init() {
    if (process.argv.length != 3) {
        throw new Error("Specify the build type as an argument to this script.");
    }
    if (process.argv[2] == "firefox") {
        initFirefox();
    } else {
        initChrome();
    }
}

async function initFirefox() {
    const replaceString = "/* global protections */";
    const injectScriptPath = "shared/js/inject/mozilla.js";
    const injectScript = await readFile(injectScriptPath);
    const contentScope = await generateContentScope();
    const outputScript = injectScript.toString().replace(replaceString, contentScope.toString());
    console.log(outputScript);
}

async function initChrome() {
    const replaceString = "/* global protections */";
    const injectScriptPath = "shared/js/inject/chrome.js";
    const injectScript = await readFile(injectScriptPath);
    const contentScope = await generateContentScope();
    // Encode in URI format to prevent breakage (we could choose to just escape ` instead)
    const encodedString = encodeURI(contentScope.toString());
    const outputScript = injectScript.toString().replace(replaceString, '${decodeURI("' + encodedString + '")}');
    console.log(outputScript);
}

init();
