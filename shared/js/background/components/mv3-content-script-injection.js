// With Manifest V2 the content scripts are run directly from the manifest and
// they inject into the main world of websites by adding a <script> element to
// the DOM. With Manifest V3 however the chrome.scripting API must be used to
// inject scripts into the main world.
// Note: It's important that the isolated world script runs first. The order the
//       scripts are added by registerContentScripts is based on the script ID,
//       but note that's an implementation detail (from use of std::set for new
//       script IDs[1]) and could change in the future.
// 1 - https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/extensions/api/scripting/scripting_api.cc;l=929

export async function registerContentScripts(scripts) {
    const existingScripts = await chrome.scripting.getRegisteredContentScripts();
    const finalScripts = existingScripts.filter((s) => scripts.every((newScript) => newScript.id !== s.id)).concat(scripts);
    await chrome.scripting.registerContentScripts(finalScripts);
}

export async function unregisterContentScripts(scriptIds) {
    await chrome.scripting.unregisterContentScripts({ ids: scriptIds });
}

export default class MV3ContentScriptInjection {
    constructor() {
        this.ready = this.registerScripts();
    }

    async registerScripts() {
        // check if scripts were already registered - in scripts will remain registered under
        // some startup conditions, and in that case registering the scripts will throw an error.
        await registerContentScripts([
            {
                id: '1-script-injection-isolated-world',
                allFrames: true,
                js: ['public/js/content-scripts/content-scope-messaging.js'],
                runAt: 'document_start',
                world: 'ISOLATED',
                matches: ['<all_urls>'],
                excludeMatches: ['*://localhost/*', '*://*.localhost/'],
            },
            {
                id: '2-script-injection-main-world',
                allFrames: true,
                js: ['public/js/inject.js'],
                runAt: 'document_start',
                world: 'MAIN',
                matches: ['<all_urls>'],
                excludeMatches: ['*://localhost/*', '*://*.localhost/'],
            },
        ]);
    }
}
