const fs = require("fs");
const BloomFilter = require("jsbloom").filter;
// const BloomFilter = require("node_bloom_filter");
const httpsFull = require("../https2.json");
const allURLs = require("../static_domains.json");

console.log(`upgrade list: ${httpsFull.length} items`);
console.log(`test list: ${allURLs.length} items`);
console.log(`desired false positive rate: 0.01%`);

let bloom = new BloomFilter(httpsFull.length, 0.0001);

// let bloom = new BloomFilter({
    // optimize: true,
    // falsePositiveRate: 0.00001,
    // nElements: httpsFull.length
// });

httpsFull.forEach((url) => {
    bloom.addEntry(url);
    // bloom.add(url);
});

console.log("filter created");

// create hash so we can check against it
const httpsFullObj = {};
httpsFull.forEach((url) => {
    httpsFullObj[url] = true;
});

let bloomHits = 0;
let bloomFalsePositives = 0;
let hits = 0;

allURLs.forEach((url) => {
    // let bloomResult = bloom.has(url);
    let bloomResult = bloom.checkEntry(url);

    if (bloomResult) {
        if (httpsFullObj[url]) {
            bloomHits += 1;
            hits += 1;
        } else {
            bloomFalsePositives += 1;
        }
    } else if (httpsFullObj[url]) {
        hits += 1;
    }
});

console.log(`bloom upgrades: ${((bloomHits + bloomFalsePositives) / allURLs.length) * 100}%`);
console.log(`JSON upgrades: ${(hits / allURLs.length) * 100}%`);

// run lookup again to get timing data

const time = process.hrtime();
allURLs.forEach((url) => {
    let bloomResult = bloom.checkEntry(url);
    // let bloomResult = bloom.has(url);
});
const endTime = process.hrtime(time);
const endTimeNanoseconds = endTime[0] * 1e9 + endTime[1];
const nanosecondPerLookup = endTimeNanoseconds / allURLs.length;
const microsecondPerLookup = nanosecondPerLookup / 1000;

console.log(`mean time to look up: ${microsecondPerLookup}μs`);

function toBuffer(ab) {
    var buf = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

// const arrayBuffer = bloom.serialize();
// let buffer = toBuffer(arrayBuffer);

// fs.writeFileSync("./filter-2", buffer);

let data = bloom.exportData();
let buf = new Buffer(data);
fs.writeFileSync("./filter", buf);

console.time("deserialize");
let bloom2 = new BloomFilter(httpsFull.length, 0.0001);
bloom2.importData(new Uint8Array(buf));
// new BloomFilter({}, new Uint8Array(buffer).buffer);
console.timeEnd("deserialize");

hits = 0;
bloomHits = 0;
bloomFalsePositives = 0;

allURLs.forEach((url) => {
    // let bloomResult = bloom.has(url);
    let bloomResult = bloom2.checkEntry(url);

    if (bloomResult) {
        if (httpsFullObj[url]) {
            bloomHits += 1;
            hits += 1;
        } else {
            bloomFalsePositives += 1;
        }
    } else if (httpsFullObj[url]) {
        hits += 1;
    }
});

console.log(`bloom upgrades: ${((bloomHits + bloomFalsePositives) / allURLs.length) * 100}%`);
console.log(`JSON upgrades: ${(hits / allURLs.length) * 100}%`);

const newBloom = new BloomFilter(allURLs.length, 0.0001);

allURLs.forEach((url) => {
    bloom.addEntry(url);
});
data = bloom.exportData();
buf = new Buffer(data);

fs.writeFileSync("./filter-large", buf)
