/**
 * Splices the bundled tracker lookup and extension configuration into a
 * content-scope-scripts bundle. See scripts/build-tools/lib/contentScopeScripts.mjs.
 *
 *   node scripts/bundleContentScopeScripts.mjs <target> <source> <tracker-lookup.json> <extension-config.json>
 */
import { bundleContentScopeScripts } from './build-tools/lib/contentScopeScripts.mjs';

const [targetPath, sourcePath, trackerLookupPath, configPath] = process.argv.slice(2);
bundleContentScopeScripts(targetPath, sourcePath, trackerLookupPath, configPath);
