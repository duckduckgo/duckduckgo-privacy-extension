/** Prepares a copied New Tab Page index.html. See scripts/build-tools/lib/ntp.mjs. */
import { prepareNtpHtml } from './build-tools/lib/ntp.mjs';

const htmlPath = process.argv[2];
if (!htmlPath) {
    console.error('Usage: node scripts/prepareNtpHtml.mjs <path-to-copied-index.html>');
    process.exit(1);
}
prepareNtpHtml(htmlPath);
