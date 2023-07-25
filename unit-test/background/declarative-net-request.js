// TODO remove the * imports
import browser from 'webextension-polyfill'
// eslint-disable-next-line no-restricted-syntax
import * as allowlistedTrackers from '@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_reference.json'
// eslint-disable-next-line no-restricted-syntax
import * as tds from '../data/tds.json'
// eslint-disable-next-line no-restricted-syntax
import * as testConfig from '../data/extension-config.json'
// eslint-disable-next-line no-restricted-syntax
import * as tdsStorageStub from '../helpers/tds'
import settings from '../../shared/js/background/settings'
import tabManager from '../../shared/js/background/tab-manager'
import tdsStorage from '../../shared/js/background/storage/tds'
import trackers from '../../shared/js/background/trackers'
import {
    ensureServiceWorkerInitiatedRequestExceptions
} from '../../shared/js/background/dnr-service-worker-initiated'
import {
    onConfigUpdate
} from '../../shared/js/background/dnr-config-rulesets'
import {
    refreshUserAllowlistRules,
    toggleUserAllowlistDomain
} from '../../shared/js/background/dnr-user-allowlist'
import {
    getMatchDetails,
    SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID,
    USER_ALLOWLIST_RULE_ID,
    SETTING_PREFIX
} from '../../shared/js/background/dnr-utils'
import {
    SERVICE_WORKER_INITIATED_ALLOWING_PRIORITY,
    USER_ALLOWLISTED_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

const TEST_ETAGS = ['flib', 'flob', 'cabbage']
const TEST_EXTENION_VERSIONS = ['2023.1.1', '2023.2.1', '2023.3.1']

let onUpdateListeners

// Set up the extension configuration to ensure that tracker allowlisting is
// enabled for the right domains.
const config = JSON.parse(JSON.stringify(testConfig))
config.features.trackerAllowlist = {
    state: 'enabled',
    settings: { allowlistedTrackers }
}

const expectedRuleIdsByConfigName = {
    tds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 21001, 21002, 21003, 21004],
    config: [
        10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010
    ]
}

const expectedLookupByConfigName = {
    tds: {
        2: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['facebook.com']
        },
        3: {
            type: 'clickToLoad',
            possibleTrackerDomains: ['facebook.net']
        },
        4: {
            type: 'clickToLoad',
            possibleTrackerDomains: ['facebook.net']
        },
        5: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        6: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        7: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        8: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        9: {
            type: 'surrogateScript',
            possibleTrackerDomains: ['google-analytics.com']
        },
        10: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        11: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        12: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['yahoo.com']
        }
    },
    config: {
        10002: {
            type: 'trackerAllowlist',
            domain: 'allowlist-tracker-1.com',
            reason: 'match single resource on single site'
        },
        10003: {
            type: 'trackerAllowlist',
            domain: 'allowlist-tracker-2.com',
            reason: 'match single resource on all sites'
        },
        10004: {
            type: 'trackerAllowlist',
            domain: 'allowlist-tracker-2.com',
            reason: 'match all sites and all paths'
        },
        10005: {
            type: 'trackerAllowlist',
            domain: 'allowlist-tracker-2.com',
            reason: 'specific subdomain rule'
        },
        10006: {
            type: 'trackerAllowlist',
            domain: 'allowlist-tracker-3.com',
            reason: 'match all requests'
        },
        10007: {
            type: 'unprotectedTemporary',
            domain: 'google.com',
            reason: 'site breakage'
        },
        10008: {
            type: 'unprotectedTemporary',
            domain: 'suntrust.com',
            reason: 'site breakage'
        },
        10009: {
            type: 'contentBlocking',
            domain: 'content-blocking.example',
            reason: 'site breakage'
        },
        10010: {
            type: 'gpc'
        }
    }
}

async function updateConfiguration (configName, etag) {
    const configValue = { config, tds }[configName]
    const listeners = onUpdateListeners.get(configName)
    settings.updateSetting(`${configName}-etag`, etag)
    if (listeners) {
        await Promise.all(
            listeners.map(listener => listener(configName, etag, configValue))
        )
    }
}

describe('declarativeNetRequest', () => {
    let updateSettingObserver
    let updateDynamicRulesObserver
    let updateSessionRulesObserver

    let extensionVersion
    let settingsStorage
    let dynamicRulesByRuleId
    let sessionRulesByRuleId

    beforeAll(async () => {
        extensionVersion = TEST_EXTENION_VERSIONS[0]
        settingsStorage = new Map()
        dynamicRulesByRuleId = new Map()
        sessionRulesByRuleId = new Map()

        onUpdateListeners = tdsStorageStub.stub({ config }).onUpdateListeners
        onUpdateListeners.set('config', [onConfigUpdate])
        onUpdateListeners.set('tds', [onConfigUpdate])
        tdsStorage.getLists().then(lists => trackers.setLists(lists))

        // spyOn(startup, 'ready').and.callFake(
        //     () => Promise.resolve()
        // )

        spyOn(settings, 'getSetting').and.callFake(
            name => settingsStorage.get(name)
        )
        updateSettingObserver =
            spyOn(settings, 'updateSetting').and.callFake(
                (name, value) => {
                    settingsStorage.set(name, value)
                }
            )

        updateDynamicRulesObserver =
            spyOn(
                chrome.declarativeNetRequest,
                'updateDynamicRules'
            ).and.callFake(
                ({ removeRuleIds, addRules }) => {
                    if (removeRuleIds) {
                        for (const id of removeRuleIds) {
                            dynamicRulesByRuleId.delete(id)
                        }
                    }
                    if (addRules) {
                        for (const rule of addRules) {
                            if (dynamicRulesByRuleId.has(rule.id)) {
                                throw new Error('Duplicate rule ID: ' + rule.id)
                            }
                            dynamicRulesByRuleId.set(rule.id, rule)
                        }
                    }
                    return Promise.resolve()
                }
            )
        spyOn(chrome.declarativeNetRequest, 'getDynamicRules').and.callFake(
            () => Array.from(dynamicRulesByRuleId.values())
        )

        updateSessionRulesObserver =
            spyOn(
                chrome.declarativeNetRequest,
                'updateSessionRules'
            ).and.callFake(
                ({ removeRuleIds, addRules }) => {
                    if (removeRuleIds) {
                        for (const id of removeRuleIds) {
                            sessionRulesByRuleId.delete(id)
                        }
                    }
                    if (addRules) {
                        for (const rule of addRules) {
                            if (sessionRulesByRuleId.has(rule.id)) {
                                throw new Error('Duplicate rule ID: ' + rule.id)
                            }
                            sessionRulesByRuleId.set(rule.id, rule)
                        }
                    }
                    return Promise.resolve()
                }
            )
        spyOn(chrome.declarativeNetRequest, 'getSessionRules').and.callFake(
            () => Array.from(sessionRulesByRuleId.values())
        )

        spyOn(browser.runtime, 'getManifest').and.callFake(() => ({
            version: extensionVersion,
            manifest_version: 3
        }))
    })

    beforeEach(() => {
        updateSettingObserver.calls.reset()
        updateDynamicRulesObserver.calls.reset()
        updateSessionRulesObserver.calls.reset()
        settingsStorage.clear()
        dynamicRulesByRuleId.clear()
        sessionRulesByRuleId.clear()
    })

    it('Config ruleset updates', async () => {
        const expectState = (expectedSettings, expectedUpdateCallCount) => {
            const expectedRuleIds = new Set()
            for (const [configName, {
                etag: expectedEtag,
                extensionVersion: expectedExtensionVersion
            }] of Object.entries(expectedSettings)) {
                if (!expectedEtag) {
                    continue
                }

                const setting =
                      settingsStorage.get(SETTING_PREFIX + configName) || {}

                const {
                    etag: actualLookupEtag,
                    matchDetailsByRuleId: actualLookup,
                    extensionVersion: actualLookupExtensionVersion
                } = setting
                const etagRuleId = expectedRuleIdsByConfigName[configName][0]
                const etagRule = dynamicRulesByRuleId.get(etagRuleId)
                const actualRuleEtag = etagRule?.condition?.urlFilter

                expect(actualLookup).toEqual(expectedLookupByConfigName[configName])
                expect(actualRuleEtag).toEqual(expectedEtag)
                expect(actualLookupEtag).toEqual(expectedEtag)
                expect(actualLookupExtensionVersion)
                    .toEqual(expectedExtensionVersion)

                for (const ruleId of expectedRuleIdsByConfigName[configName]) {
                    expectedRuleIds.add(ruleId)
                }
            }

            expect(new Set(dynamicRulesByRuleId.keys())).toEqual(expectedRuleIds)

            expect(updateDynamicRulesObserver.calls.count())
                .toEqual(expectedUpdateCallCount)
        }

        expectState({
            tds: { etag: null, extensionVersion: null },
            config: { etag: null, extensionVersion: null }
        }, 0)

        // Nothing saved, tracker blocking rules should be added.
        await updateConfiguration('tds', TEST_ETAGS[0])
        expectState({
            tds: {
                etag: TEST_ETAGS[0], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: null, extensionVersion: null
            }
        }, 2) // 1x TDS, 1x Combined

        // Rules for that ruleset are already present, skip.
        await updateConfiguration('tds', TEST_ETAGS[0])
        expectState({
            tds: {
                etag: TEST_ETAGS[0], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: null, extensionVersion: null
            }
        }, 2) // 1x TDS, 1x Combined

        // Add configuration ruleset.
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[0], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 4) // 1x TDS, 2x Combined, 1x Config

        // Tracker blocking rules are outdated, replace with new ones.
        await updateConfiguration('tds', TEST_ETAGS[1])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 6) // 2x TDS, 3x Combined, 1x Config

        // Configuration ruleset already present, skip.
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 6) // 2x TDS, 3x Combined, 1x Config

        // Settings missing, add rules again.
        settingsStorage.clear()
        await updateConfiguration('tds', TEST_ETAGS[1])
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 10) // 3x TDS, 5x Combined, 2x Config

        // Rules missing, add tracker blocking rules again.
        dynamicRulesByRuleId.clear()
        await updateConfiguration('tds', TEST_ETAGS[1])
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 13) // 4x TDS, 6x Combined, 3x Config

        // All good again, skip.
        await updateConfiguration('tds', TEST_ETAGS[1])
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 13) // 4x TDS, 6x Combined, 3x Config

        // Extension has been updated, refresh rules again
        extensionVersion = TEST_EXTENION_VERSIONS[1]
        await updateConfiguration('tds', TEST_ETAGS[1])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[1]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 15) // 5x TDS, 7x Combined, 3x Config
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[1]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[1]
            }
        }, 16) // 5x TDS, 7x Combined, 4x Config

        // All good again, skip.
        await updateConfiguration('tds', TEST_ETAGS[1])
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[1]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[1]
            }
        }, 16) // 5x TDS, 7x Combined, 4x Config
    })

    it('User allowlisting updates', async () => {
        const expectState = expectedAllowlistedDomains => {
            const ruleExists = dynamicRulesByRuleId.has(USER_ALLOWLIST_RULE_ID)

            if (expectedAllowlistedDomains.length === 0) {
                expect(ruleExists).toBe(false)
            } else {
                const rule = dynamicRulesByRuleId.get(USER_ALLOWLIST_RULE_ID)
                expect(rule.id).toEqual(USER_ALLOWLIST_RULE_ID)
                expect(rule.priority).toEqual(USER_ALLOWLISTED_PRIORITY)
                expect(rule.action.type).toEqual('allowAllRequests')
                expect(rule.condition.resourceTypes).toEqual(['main_frame'])
                expect(rule.condition.requestDomains.sort())
                    .toEqual(expectedAllowlistedDomains.sort())
            }
        }

        // Initially there should be no domains allowlisted.
        expectState([])

        // Add a domain to the allowlist.
        await toggleUserAllowlistDomain('example.invalid', true)
        expectState(['example.invalid'])

        // Invalid additions should be ignored.
        await toggleUserAllowlistDomain('example.invalid', true)
        expectState(['example.invalid'])
        await toggleUserAllowlistDomain('', true)
        expectState(['example.invalid'])
        await toggleUserAllowlistDomain('/', true)
        expectState(['example.invalid'])

        // Domains should be normalized.
        await toggleUserAllowlistDomain('FOO.InVaLiD', true)
        expectState(['foo.invalid', 'example.invalid'])

        // Allowlisting rule should be restored by refresh.
        expectState(['foo.invalid', 'example.invalid'])
        refreshUserAllowlistRules(['foo.invalid', 'ExAmPlE.invalid'])
        expectState(['foo.invalid', 'example.invalid'])
        dynamicRulesByRuleId.clear()
        expectState([])
        refreshUserAllowlistRules(['foo.invalid', 'example.invalid'])
        expectState(['foo.invalid', 'example.invalid'])

        // Try removing domains from the allowlist.
        await toggleUserAllowlistDomain('unknown.invalid', false)
        expectState(['foo.invalid', 'example.invalid'])
        await toggleUserAllowlistDomain('foo.invalid', false)
        expectState(['example.invalid'])
        await toggleUserAllowlistDomain('EXAMPLE.invalid', false)
        expectState([])
        await toggleUserAllowlistDomain('another-unknown.invalid', false)
        expectState([])
    })

    it('User denylisting updates', async () => {
        const expectAllowlistDenylistState = ({
            expectedDenylistedDomains,
            expectedUnprotectedTemporaryDomains,
            expectedContentBlockingDomains
        }) => {
            const setting =
                settingsStorage.get(SETTING_PREFIX + 'config') || {}
            const matchDetailsByRuleId = setting.matchDetailsByRuleId || {}
            const denylistedDomains = setting.denylistedDomains || ''

            expect(denylistedDomains)
                .toEqual(expectedDenylistedDomains.sort().join())

            const allowlistedDomains = new Map([
                ['unprotectedTemporary', []],
                ['contentBlocking', []]
            ])
            for (const [ruleIdString, matchDetails]
                of Object.entries(matchDetailsByRuleId)) {
                const ruleId = parseInt(ruleIdString, 10)
                if (allowlistedDomains.has(matchDetails.type)) {
                    const domains = allowlistedDomains.get(matchDetails.type)
                    domains.push(matchDetails.domain)

                    // Sanity check that the rule exists and it's an allowing
                    // rule
                    expect(dynamicRulesByRuleId.has(ruleId)).toBeTrue()
                    expect(
                        dynamicRulesByRuleId.get(ruleId).action.type
                    ).toEqual('allowAllRequests')
                }
            }

            expect(allowlistedDomains.get('unprotectedTemporary'))
                .toEqual(expectedUnprotectedTemporaryDomains)
            expect(allowlistedDomains.get('contentBlocking'))
                .toEqual(expectedContentBlockingDomains)
        }

        expect(updateDynamicRulesObserver.calls.count()).toEqual(0)

        // If a domain is denylisted before the configuration is ready, not much
        // should happen.
        await tabManager.setList(
            { list: 'denylisted', domain: 'denylisted.example', value: true }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(0)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [],
            expectedUnprotectedTemporaryDomains: [],
            expectedContentBlockingDomains: []
        })

        // But once the configuration is ready, the domain should be denylisted.
        await updateConfiguration('config', TEST_ETAGS[0])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(1)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: ['denylisted.example'],
            expectedUnprotectedTemporaryDomains: ['google.com', 'suntrust.com'],
            expectedContentBlockingDomains: ['content-blocking.example']
        })

        // Once TDS is also set, combined rules are also updated
        await updateConfiguration('tds', TEST_ETAGS[0])

        // By default, contentBlocking and unprotectedTemporary allowlist rules
        // should be added and no domains should be denylisted.
        await tabManager.setList(
            { list: 'denylisted', domain: 'denylisted.example', value: false }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(5) // 2x Config, 2x Combined, 1x TDS
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [],
            expectedUnprotectedTemporaryDomains: ['google.com', 'suntrust.com'],
            expectedContentBlockingDomains: ['content-blocking.example']
        })

        // Denylisting a domain should cancel an unprotectedTemporary allow.
        settingsStorage.set(
            'denylisted',
            { 'google.com': true }
        )
        await updateConfiguration('config', TEST_ETAGS[0])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(7) // 3x Config, 3x Combined, 1x TDS
        expectAllowlistDenylistState({
            expectedDenylistedDomains: ['google.com'],
            expectedUnprotectedTemporaryDomains: ['suntrust.com'],
            expectedContentBlockingDomains: ['content-blocking.example']
        })

        // If denylist (and other state) hasn't changed, rules should not be
        // regenerated.
        await updateConfiguration('config', TEST_ETAGS[0])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(7) // 3x Config, 3x Combined, 1x TDS
        expectAllowlistDenylistState({
            expectedDenylistedDomains: ['google.com'],
            expectedUnprotectedTemporaryDomains: ['suntrust.com'],
            expectedContentBlockingDomains: ['content-blocking.example']
        })

        // But if other state changes, rules should be regenerates.
        await updateConfiguration('config', TEST_ETAGS[1])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(9)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: ['google.com'],
            expectedUnprotectedTemporaryDomains: ['suntrust.com'],
            expectedContentBlockingDomains: ['content-blocking.example']
        })

        // Denylisting a domain should cancel a contentblocking allow.
        settingsStorage.set(
            'denylisted',
            { 'google.com': false, 'content-blocking.example': true }
        )
        await updateConfiguration('config', TEST_ETAGS[1])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(11)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: ['content-blocking.example'],
            expectedUnprotectedTemporaryDomains: ['google.com', 'suntrust.com'],
            expectedContentBlockingDomains: []
        })

        // Denylisting domains should be normalized.
        settingsStorage.set(
            'denylisted',
            { ':': true, 'suntrust.COM': true, 'cOnTeNt-blocking.example': true }
        )
        await updateConfiguration('config', TEST_ETAGS[1])
        expect(updateDynamicRulesObserver.calls.count()).toEqual(13)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [
                'content-blocking.example',
                'suntrust.com'
            ],
            expectedUnprotectedTemporaryDomains: ['google.com'],
            expectedContentBlockingDomains: []
        })

        // The tabManager.setList() code path should trigger the rules to be
        // regenerated when a new domain is added to the denylist.
        await tabManager.setList(
            { list: 'denylisted', domain: 'google.com', value: true }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(15)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [
                'content-blocking.example',
                'google.com',
                'suntrust.com'
            ],
            expectedUnprotectedTemporaryDomains: [],
            expectedContentBlockingDomains: []
        })

        // But not when the domain was already in the list.
        await tabManager.setList(
            { list: 'denylisted', domain: 'google.com', value: true }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(15)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [
                'content-blocking.example',
                'google.com',
                'suntrust.com'
            ],
            expectedUnprotectedTemporaryDomains: [],
            expectedContentBlockingDomains: []
        })

        // Nor when removing a domain that didn't previously exist in the
        // denylist.
        await tabManager.setList(
            { list: 'denylisted', domain: 'unknown.example', value: false }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(15)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [
                'content-blocking.example',
                'google.com',
                'suntrust.com'
            ],
            expectedUnprotectedTemporaryDomains: [],
            expectedContentBlockingDomains: []
        })

        // The tabManager.setList() code path should trigger the rules to be
        // regenerated when an existing domains is removed from the denylist.
        await tabManager.setList(
            { list: 'denylisted', domain: 'google.com', value: false }
        )
        expect(updateDynamicRulesObserver.calls.count()).toEqual(17)
        expectAllowlistDenylistState({
            expectedDenylistedDomains: [
                'content-blocking.example',
                'suntrust.com'
            ],
            expectedUnprotectedTemporaryDomains: ['google.com'],
            expectedContentBlockingDomains: []
        })
    })

    it('ServiceWorker initiated request allowing', async () => {
        const ruleId = SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID
        const rulePriority = SERVICE_WORKER_INITIATED_ALLOWING_PRIORITY
        const rule = {
            id: ruleId,
            priority: rulePriority,
            action: { type: 'allow' },
            condition: { tabIds: [-1], initiatorDomains: ['example.com', 'google.com', 'suntrust.com'] }
        }
        const tempUnprotected = config.unprotectedTemporary

        // The rule won't exist initially.
        expect(updateSessionRulesObserver.calls.count()).toEqual(0)
        expect(sessionRulesByRuleId.has(ruleId)).toBeFalse()

        // if there are no serviceworker exceptions, or unprotected sites, no rule should be created
        config.features.serviceworkerInitiatedRequests = {
            state: 'enabled',
            exceptions: []
        }
        config.unprotectedTemporary = []
        await ensureServiceWorkerInitiatedRequestExceptions(config)
        expect(updateSessionRulesObserver.calls.count()).toEqual(1)
        expect(sessionRulesByRuleId.has(ruleId)).toBeFalse()

        // If completely disabled, a rule should be created with no domain
        // exceptions.
        config.features.serviceworkerInitiatedRequests = {
            state: 'disabled',
            exceptions: [{ domain: 'example.com', reason: '' }]
        }
        config.unprotectedTemporary = tempUnprotected
        await ensureServiceWorkerInitiatedRequestExceptions(config)
        expect(updateSessionRulesObserver.calls.count()).toEqual(2)
        expect(sessionRulesByRuleId.has(ruleId)).toBeTrue()
        expect(sessionRulesByRuleId.get(ruleId)?.condition?.initiatorDomains).toBeUndefined()

        // But if enabled, domain exceptions should be used.
        config.features.serviceworkerInitiatedRequests.state = 'enabled'
        await ensureServiceWorkerInitiatedRequestExceptions(config)
        expect(updateSessionRulesObserver.calls.count()).toEqual(3)
        expect(sessionRulesByRuleId.has(ruleId)).toBeTrue()
        expect(sessionRulesByRuleId.get(ruleId)).toEqual(rule)
        expect(sessionRulesByRuleId.get(ruleId)?.condition?.initiatorDomains[0]).toEqual('example.com')

        // If ensureServiceWorkerInitiatedRequestException is called again, the
        // rule should just be recreated.
        await ensureServiceWorkerInitiatedRequestExceptions(config)
        expect(updateSessionRulesObserver.calls.count()).toEqual(4)
        expect(sessionRulesByRuleId.has(ruleId)).toBeTrue()
        expect(sessionRulesByRuleId.get(ruleId)).toEqual(rule)

        // If enabled and there are no domain exceptions, the rule should be
        // removed.
        config.features.serviceworkerInitiatedRequests.exceptions = []
        config.unprotectedTemporary = []
        await ensureServiceWorkerInitiatedRequestExceptions(config)
        expect(updateSessionRulesObserver.calls.count()).toEqual(5)
        expect(sessionRulesByRuleId.has(ruleId)).toBeFalse()

        config.unprotectedTemporary = tempUnprotected
    })

    it('getMatchDetails', async () => {
        // No rules, so no match details.
        // - Tracker blocking:
        for (let i = 0; i < expectedLookupByConfigName.tds.length; i++) {
            if (!expectedLookupByConfigName.tds[i]) continue
            expect(await getMatchDetails(i)).toEqual({ type: 'unknown' })
        }
        // - Extension configuration:
        for (let i in expectedLookupByConfigName.config) {
            i = parseInt(i, 10)
            expect(await getMatchDetails(i)).toEqual({ type: 'unknown' })
        }

        // Add the tracker blocking rules.
        await updateConfiguration('tds', TEST_ETAGS[0])

        // Still should not be any match details for the extension configuration
        // yet.
        for (let i in expectedLookupByConfigName.config) {
            i = parseInt(i, 10)
            expect(await getMatchDetails(i)).toEqual({ type: 'unknown' })
        }

        // But there should be tracker blocking match details now.
        for (let i = 0; i < expectedLookupByConfigName.tds.length; i++) {
            if (!expectedLookupByConfigName.tds[i]) continue
            expect(await getMatchDetails(i)).toEqual({
                type: 'trackerBlocking',
                possibleTrackerDomains:
                    expectedLookupByConfigName.tds[i].split(',')
            })
        }

        // Add the extension configuration rules.
        await updateConfiguration('config', TEST_ETAGS[1])

        // Extension configuration match details should now show up.
        for (let i in expectedLookupByConfigName.config) {
            i = parseInt(i, 10)
            expect(await getMatchDetails(i)).toEqual(
                expectedLookupByConfigName.config[i]
            )
        }

        // Tracker blocking match details should still be there too.
        for (let i = 0; i < expectedLookupByConfigName.tds.length; i++) {
            if (!expectedLookupByConfigName.tds[i]) continue
            expect(await getMatchDetails(i)).toEqual({
                type: 'trackerBlocking',
                possibleTrackerDomains:
                    expectedLookupByConfigName.tds[i].split(',')
            })
        }

        // User allowlisting matches should be easy to identify.
        expect(await getMatchDetails(USER_ALLOWLIST_RULE_ID)).toEqual({
            type: 'userAllowlist'
        })

        // Likewise for ServiceWorker initiated requests.
        expect(
            await getMatchDetails(SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID)
        ).toEqual({ type: 'serviceWorkerInitiatedAllowing' })
    })
})
