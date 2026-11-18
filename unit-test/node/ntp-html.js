import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The shape of the content-scope-scripts windows build's New Tab Page.
const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>New Tab Page</title>
    <style>
        body {
            --loading-color: $LOADING_COLOR$;
            background: var(--loading-color);
        }
    </style>
    <script src="./dist/inline.js"></script>
</head>
<body>
<div id="app"></div>
</body>
</html>`;

const COLOR_SCHEME_META_TAG = '<meta name="color-scheme" content="light dark">';
const SHIM_SCRIPT_TAG = '<script src="../public/js/ntp-interop-shim.js"></script>';

function count(haystack, needle) {
    return haystack.split(needle).length - 1;
}

describe('prepareNtpHtml', () => {
    let prepareNtpHtml;
    let dir;
    let htmlPath;

    // The build scripts are ES modules that need import.meta, which the CommonJS
    // test bundle doesn't provide, so load them unbundled. Tests run from the
    // repository root.
    beforeAll(async () => {
        const ntpModule = pathToFileURL(path.resolve('scripts/build-tools/lib/ntp.mjs')).href;
        ({ prepareNtpHtml } = await import(ntpModule));
    });

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ntp-html-'));
        htmlPath = path.join(dir, 'index.html');
        fs.writeFileSync(htmlPath, TEMPLATE);
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('fills in a loading colour that follows the browser theme', () => {
        prepareNtpHtml(htmlPath);
        const html = fs.readFileSync(htmlPath, 'utf8');
        expect(html).not.toContain('$LOADING_COLOR$');
        expect(html).toContain('--loading-color: light-dark(#fafafa, #1c1c1c);');
        expect(count(html, COLOR_SCHEME_META_TAG)).toBe(1);
        expect(html.indexOf(COLOR_SCHEME_META_TAG)).toBeLessThan(html.indexOf('<style>'));
        expect(count(html, SHIM_SCRIPT_TAG)).toBe(1);
    });

    it('is idempotent', () => {
        prepareNtpHtml(htmlPath);
        const once = fs.readFileSync(htmlPath, 'utf8');
        prepareNtpHtml(htmlPath);
        expect(fs.readFileSync(htmlPath, 'utf8')).toBe(once);
    });

    it('throws when there is no <head> to add the color-scheme meta tag to', () => {
        fs.writeFileSync(htmlPath, TEMPLATE.replace('<head>', '<head data-x>'));
        expect(() => prepareNtpHtml(htmlPath)).toThrowError(/color-scheme meta tag/);
    });
});
