/** creates surrogates.txt file that contains names of all available surrogates files in a legacy format */
import { parseArgs } from 'node:util';
import fs from 'fs';

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

const files = fs.readdirSync(argv.input);

if (argv.json) {
    console.log(JSON.stringify(files, null, 2));
} else {
    // Legacy format used by the extension at runtime.
    files.forEach((file) => {
        console.log(`domain.com/${file} application/javascript\n`);
    });
}
