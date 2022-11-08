import '../helpers/mock-browser-api'
import * as allowlistedTrackers from '../data/reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_reference.json'
import * as tds from '../data/tds.json'
import * as browserWrapper from '../../shared/js/background/wrapper.es6'
import * as testConfig from '../data/extension-config.json'
import * as tdsStorageStub from '../helpers/tds.es6'
import * as startup from '../../shared/js/background/startup'
import settings from '../../shared/js/background/settings.es6'
import tdsStorage from '../../shared/js/background/storage/tds.es6'
import trackers from '../../shared/js/background/trackers.es6'
import {
    getMatchDetails,
    onConfigUpdate,
    toggleUserAllowlistDomain,
    SETTING_PREFIX,
    USER_ALLOWLIST_RULE_ID
} from '../../shared/js/background/declarative-net-request'
import {
    USER_ALLOWLISTED_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

const TEST_ETAGS = ['flib', 'flob', 'cabbage']
const TEST_EXTENION_VERSIONS = ['0.1', '0.2', '0.3']

let onUpdateListeners

// Set up the extension configuration to ensure that tracker allowlisting is
// enabled for the right domains.
const config = JSON.parse(JSON.stringify(testConfig))
config.features.trackerAllowlist = {
    state: 'enabled',
    settings: { allowlistedTrackers }
}

const expectedRuleIdsByConfigName = {
    tds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    config: [10001, 10002, 10003, 10004, 10005, 10006]
}

const expectedLookupByConfigName = {
    tds: {
        2: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['facebook.com', 'facebook.net']
        },
        3: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        4: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
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
            type: 'surrogateScript',
            possibleTrackerDomains: ['google-analytics.com']
        },
        8: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        9: {
            type: 'trackerBlocking',
            possibleTrackerDomains: ['google-analytics.com']
        },
        10: {
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
        }
    }
}

async function updateConfiguration (configName, etag) {
    const configValue = { config, tds }[configName]
    const listeners = onUpdateListeners.get(configName)
    if (listeners) {
        await Promise.all(
            listeners.map(listener => listener(configName, etag, configValue))
        )
    }
}

describe('declarativeNetRequest', () => {
    let updateSettingObserver
    let updateDynamicRulesObserver

    let extensionVersion
    let settingsStorage
    let dynamicRulesByRuleId

    beforeAll(async () => {
        extensionVersion = TEST_EXTENION_VERSIONS[0]
        settingsStorage = new Map()
        dynamicRulesByRuleId = new Map()

        onUpdateListeners = tdsStorageStub.stub({ config }).onUpdateListeners
        onUpdateListeners.set('config', [onConfigUpdate])
        onUpdateListeners.set('tds', [onConfigUpdate])
        tdsStorage.getLists().then(lists => trackers.setLists(lists))

        spyOn(startup, 'ready').and.callFake(
            () => Promise.resolve()
        )

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

        spyOn(browserWrapper, 'getExtensionVersion').and.callFake(
            () => extensionVersion
        )
        spyOn(browserWrapper, 'getManifestVersion').and.callFake(
            () => 3
        )
    })

    beforeEach(() => {
        updateSettingObserver.calls.reset()
        updateDynamicRulesObserver.calls.reset()
        settingsStorage.clear()
        dynamicRulesByRuleId.clear()
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
            expect(updateSettingObserver.calls.count())
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
        }, 1)

        // Rules for that ruleset are already present, skip.
        await updateConfiguration('tds', TEST_ETAGS[0])
        expectState({
            tds: {
                etag: TEST_ETAGS[0], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: null, extensionVersion: null
            }
        }, 1)

        // Add configuration ruleset.
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[0], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 2)

        // Tracker blocking rules are outdated, replace with new ones.
        await updateConfiguration('tds', TEST_ETAGS[1])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 3)

        // Configuration ruleset already present, skip.
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[0]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[0]
            }
        }, 3)

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
        }, 5)

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
        }, 7)

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
        }, 7)

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
        }, 8)
        await updateConfiguration('config', TEST_ETAGS[2])
        expectState({
            tds: {
                etag: TEST_ETAGS[1], extensionVersion: TEST_EXTENION_VERSIONS[1]
            },
            config: {
                etag: TEST_ETAGS[2], extensionVersion: TEST_EXTENION_VERSIONS[1]
            }
        }, 9)

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
        }, 9)
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
    })
})
