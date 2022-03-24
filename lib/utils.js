/** @module utils */

function storeInLookup (lookup, key, values) {
    let storedValues = lookup.get(key)
    if (!storedValues) {
        storedValues = []
        lookup.set(key, storedValues)
    }
    for (const value of values) {
        storedValues.push(value)
    }
}

exports.storeInLookup = storeInLookup
