import { initStringExemptionLists, isFeatureBroken } from './utils'

export async function initProtection (args) {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return
    }

    const protections = [
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

    initStringExemptionLists(args)
    for (const protection of protections) {
        const { init } = await import(`./${protection}-protection.js`)
        if (!isFeatureBroken(args, protection)) {
            init(args)
        }
    }
}
