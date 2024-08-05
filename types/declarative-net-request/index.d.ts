type DNRRule = import('../../packages/ddg2dnr/lib/utils.js').DNRRule;
type DNRRuleWithID = import('../../packages/ddg2dnr/lib/utils.js').DNRRuleWithID;

// Augment the chrome.declarativeNetRequest API type definitions as provided by
// @types/chrome to allow for DNRRule/DNRRuleWithID to be used. This is
// necessary since working with the original Rule type that @types/chrome
// provides is tricky from JS code, as that uses enums for some of the argument
// properties. Enums unfortunately aren't ergonomic to use from JavaScript code,
// assigning a correct string value for the enum isn't enough.
declare namespace chrome.declarativeNetRequest {
    export interface ExtraUpdateRuleOptions {
        addRules?: DNRRuleWithID[] | undefined;
        removeRuleIds?: number[] | undefined;
    }

    export function updateDynamicRules(options: ExtraUpdateRuleOptions, callback: Function): void;
    export function updateDynamicRules(options: ExtraUpdateRuleOptions): Promise<void>;
    export function updateSessionRules(options: ExtraUpdateRuleOptions, callback: Function): void;
    export function updateSessionRules(options: ExtraUpdateRuleOptions): Promise<void>;
}
