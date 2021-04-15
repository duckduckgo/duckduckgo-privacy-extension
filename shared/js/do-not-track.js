import { overrideProperty } from './utils'; 

export function initHardware(args) {
    overrideProperty('doNotTrack', {
        object: 'Navigator.prototype',
        origValue: navigator.doNotTrack,
        targetValue: /Firefox/i.test(navigator.userAgent) ? 'unspecified' : null
    });
}
