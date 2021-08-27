const fs = require('fs')
const crypto = require('crypto');
const data = fs.readFileSync('shared/privacy-configuration/generated/extension-config.json', 'utf8')
const hash = crypto.createHash('md5').update(data).digest('hex');
const outputHash = `W/"${hash}"`;
const outputConfig = {
    'config-etag': outputHash
};
console.log(JSON.stringify(outputConfig))
