/**
 * Prints the generated shared/js/ui/base/locale-resources.js module to stdout.
 * See scripts/build-tools/lib/locales.mjs.
 */
import { generateLocaleResources } from './build-tools/lib/locales.mjs';

process.stdout.write(generateLocaleResources());
