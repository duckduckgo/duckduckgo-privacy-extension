import * as tldts from 'tldts'
import { Trackers } from '@duckduckgo/privacy-grade'
import * as utils from '../url-utils'
import { convertState } from '../classes/privacy-dashboard-data'

const getTrackers = async () => {
    const tds = await (
        await fetch(chrome.runtime.getURL('/data/bundled/tds.json'))
    ).json()
    const trackers = new Trackers({ tldjs: tldts, utils })
    trackers.setLists([{ name: 'tds', data: tds }])
    return trackers
}

export async function getPrivacyDashboardData (options) {
    let { tabId } = options
    if (tabId === null) {
        const currentTab = await chrome.tabs.getCurrent()
        if (!currentTab?.id) {
            throw new Error('could not get the current tab...')
        }
        tabId = currentTab?.id
    }
    const tab = await chrome.tabs.get(tabId)
    const matched = await chrome.declarativeNetRequest.getMatchedRules({
        tabId
    })
    const trackers = await getTrackers()
    const requests = matched.map(({ request }) => {
        const url = request.url
        const match = trackers.getTrackerData(url, tab.url, {})
        if (!match) {
            console.log('no match for', url)
            return {}
        }
        return {
            action: match.action,
            url,
            eTLDplus1: utils.getBaseDomain(url),
            pageUrl: tab.url,
            entityName: match.tracker.owner?.displayName,
            prevalence: match.tracker.prevalence,
            ownerName: match.tracker.owner?.name,
            category: match.tracker.categories[0],
            state: convertState(match.action, match.firstParty)
        }
    }).filter(r => !!r.action)
    console.log('xxx', requests)
    return {
        tab: {
            id: tabId,
            url: tab.url,
            protections: {
                allowlisted: false,
                denylisted: false,
                unprotectedTemporary: false,
                enabledFeatures: ['contentBlocking']
            },
            upgradedHttps: tab.url?.startsWith('https:'),
            parentEntity: undefined,
            localeSettings: { locale: 'en' }
        },
        requestData: {
            requests
        }
    }
}
