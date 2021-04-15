import { overrideProperty } from './utils'; 

export function initHardware(args) {
    overrideProperty('keyboard', {
        object: 'Navigator.prototype',
        origValue: navigator.keyboard,
        targetValue: undefined
    });
    overrideProperty('hardwareConcurrency', {
        object: 'Navigator.prototype',
        origValue: navigator.hardwareConcurrency,
        targetValue: 8
    });
    overrideProperty('deviceMemory', {
        object: 'Navigator.prototype',
        origValue: navigator.deviceMemory,
        targetValue: 8
    });
}
