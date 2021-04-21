import { initStringExemptionLists, isFeatureBroken } from './utils'

function shouldRun () {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return false
    }
    return true
}

const protections = []

export async function loadProtections () {
    if (!shouldRun()) {
        return
    }
    const protectionNames = [
        'canvas',
        'audio',
        'temporary-storage',
        'referrer',
        'battery',
        'screen-size',
        'hardware',
        'do-not-track',
        'floc',
        'gpc'
    ]

    for (const protectionName of protectionNames) {
        const protection = import(`./${protectionName}-protection.js`).then(({ init }) => {
            return { protectionName, init }
        })
        protections.push(protection)
    }
}

export async function initProtections (args) {
    if (!shouldRun()) {
        return
    }
    initStringExemptionLists(args)
    const resolvedProtections = await Promise.all(protections)
    resolvedProtections.forEach(({ init, protectionName }) => {
        if (!isFeatureBroken(args, protectionName)) {
            init(args)
        }
    })
}
