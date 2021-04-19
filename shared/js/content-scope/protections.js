import { initStringExemptionLists, isFeatureBroken } from './utils'
import { initCanvasProtection } from './canvas'
import { initAudioProtection } from './audio'
import { initTemporaryStorage } from './temporary-storage'
import { initReferrer } from './referrer'
import { initBattery } from './battery'
import { initScreenSize } from './screen-size'
import { initHardware } from './hardware'
import { initDoNotTrack } from './do-not-track'
import { initFloc } from './floc'
import { initGpc } from './gpc'

export function initProtection (args) {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return
    }

    initStringExemptionLists(args)
    if (!isFeatureBroken(args, 'canvas')) {
        initCanvasProtection(args)
    }
    if (!isFeatureBroken(args, 'audio')) {
        initAudioProtection(args)
    }
    if (!isFeatureBroken(args, 'temporary-storage')) {
        initTemporaryStorage(args)
    }
    if (!isFeatureBroken(args, 'referrer')) {
        initReferrer(args)
    }
    if (!isFeatureBroken(args, 'battery')) {
        initBattery(args)
    }
    if (!isFeatureBroken(args, 'screen-size')) {
        initScreenSize(args)
    }
    if (!isFeatureBroken(args, 'hardware')) {
        initHardware(args)
    }
    if (!isFeatureBroken(args, 'do-not-track')) {
        initDoNotTrack(args)
    }
    if (!isFeatureBroken(args, 'floc')) {
        initFloc(args)
    }
    if (!isFeatureBroken(args, 'gpc')) {
        initGpc(args)
    }
}
