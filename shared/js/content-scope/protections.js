import { initStringExemptionLists, isFeatureBroken } from './utils'
import { initCanvasProtection } from './canvas'
import { initAudioProtection } from './audio'
import { initTemporaryStorage } from './temporary-storage'
import { initReferrer } from './referrer'
import { initBattery } from './battery'
import { initScreenSize } from './screen-size'
import { initHardware } from './hardware'

export function initProtection (args) {
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
}
