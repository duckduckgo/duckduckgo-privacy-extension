const fs = require('fs');
const name = process.argv.splice(2)
const inputPath = `${process.cwd()}/${name}-grades/`;

// parent company -> site
let parents = { }

// parentdomain => [ tracker url, tracker url ]
// 'Yahoo!techcrunch.com': [ 'geo.yahoo.com' ]
let parent_domain = { }

const files = fs.readdirSync(inputPath);

files.forEach( (fileName) => {
    let siteName = fileName.replace(/\.json$/, '');
    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');
    let site = JSON.parse(jsonText);

    Object.keys(site.trackersBlocked).forEach( (k) => {
        console.log(`    ${k}`)

        if (!parents[k])
            parents[k] = [ ];

        if (parents[k].indexOf(siteName) == -1) {
            parents[k].push(siteName)
        }

        let pd = `${k}${siteName}`;

        if (!parent_domain[pd])
            parent_domain[pd] = []

        // for each tracker by parent
        Object.keys(site.trackersBlocked[k]).forEach( (pt) => {
            if (parent_domain[pd].indexOf(pt) == -1) {
                parent_domain[pd].push(pt)
                console.log(`        ${pt}`)
            }
        })
    })
});

// console.log(JSON.stringify(parents))


fs.writeFileSync(`${name}-reverse.json`, JSON.stringify(parents));

console.log('\nReverse:')

Object.keys(parents).forEach( (k) => {
    console.log(k)

    parents[k].forEach( (u) => {
        let pd = `${k}${u}`;
        console.log(`    ${u}`)

        if (parent_domain[pd]) {
            parent_domain[pd].forEach( (pdu) => {
                console.log(`        ${pdu}`)
            })
        }
    })
})
