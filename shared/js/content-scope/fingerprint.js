import sjcl from "./sjcl";
import {initStringExemptionLists, isFeatureBroken} from "./utils";
import {initCanvasProtection} from "./canvas";

export function initProtection (args) {
    initStringExemptionLists(args)
    // JKTODO remove
    if (true || !isFeatureBroken(args, 'canvas')) {
        initCanvasProtection(args)
    }
    if (!isFeatureBroken(args, 'audio')) {
        initAudioProtection(args)
    }
}
