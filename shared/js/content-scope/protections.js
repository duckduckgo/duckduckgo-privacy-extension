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

let initArgs = null
const updates = []
const protections = []

export async function loadProtections () {
    if (!shouldRun()) {
        return
    }
    const protectionNames = [
        'audio',
        'battery',
        'canvas',
        'cookie',
        'do-not-track',
        'floc',
        'gpc',
        'hardware',
        'referrer',
        'screen-size',
        'temporary-storage'
    ]

    for (const protectionName of protectionNames) {
        const protection = import(`./${protectionName}-protection.js`).then(({ init, load, update }) => {
            if (load) {
                load()
            }
            return { protectionName, init, update }
        })
        protections.push(protection)
    }
}

export async function initProtections (args) {
    initArgs = args
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
    // Fire off updates that came in faster than the init
    while (updates.length) {
        const update = updates.pop()
        await updateProtectionsInner(update)
    }
}

export async function updateProtections (args) {
    if (!shouldRun()) {
        return
    }
    if (initArgs === null) {
        updates.push(args)
        return
    }
    updateProtectionsInner(args)
}

async function updateProtectionsInner (args) {
    const resolvedProtections = await Promise.all(protections)
    resolvedProtections.forEach(({ update, protectionName }) => {
        if (!isFeatureBroken(initArgs, protectionName) && update) {
            update(args)
        }
    })
}
