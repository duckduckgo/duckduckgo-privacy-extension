import {initStringExemptionLists, isFeatureBroken} from "./utils";
import {initCanvasProtection} from "./canvas";

export function initProtection (args) {
    initStringExemptionLists(args)
    if (!isFeatureBroken(args, 'canvas')) {
        initCanvasProtection(args)
    }
    if (!isFeatureBroken(args, 'audio')) {
        initAudioProtection(args)
    }
}
