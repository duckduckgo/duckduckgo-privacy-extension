/** creates surrogates.txt file that contains names of all available surrogates files in a legacy format */
import { parseArgs } from 'node:util';
import fs from 'fs';
import { generateSurrogatesList, listSurrogates } from './build-tools/lib/surrogates.mjs';

const { values: argv } = parseArgs({
    options: {
        input: { type: 'string', short: 'i' },
        json: { type: 'boolean' },
    },
});

if (!argv.input || !fs.existsSync(argv.input)) {
    console.error('Input folder (-i) must exist.');
    process.exit(1);
}

if (argv.json) {
    console.log(JSON.stringify(listSurrogates(argv.input), null, 2));
} else {
    // Legacy format used by the extension at runtime.
    process.stdout.write(generateSurrogatesList(argv.input));
}
