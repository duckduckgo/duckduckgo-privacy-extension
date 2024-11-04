import browser from 'webextension-polyfill'
import tabManager from '../../../shared/js/background/tab-manager'
import { TabState } from '../../../shared/js/background/classes/tab-state'
import '../../../shared/js/background/events'

async function createTab(id, url) {
    const tab = tabManager.create({
        id,
        requestId: 123,
        url,
        status: 200,
    })
    await TabState.done()
    return tab
}

describe('onPerformanceWarning event handler', () => {
    it('Sets the performanceWarning flag correctly', async () => {
        expect(browser.runtime.onPerformanceWarning._listeners.length).toEqual(1)
        const fireEvent = browser.runtime.onPerformanceWarning._listeners[0]

        let tab1 = await createTab(1, 'https://1.example')
        let tab2 = await createTab(2, 'https://2.example')

        // Flags should be false initially.
        expect(tab1.performanceWarning).toEqual(false)
        expect(tab2.performanceWarning).toEqual(false)

        // Flags should remain false if event fires for unknown/different tabs.
        fireEvent({ tabId: 99 })
        fireEvent({ tabId: -1 })
        fireEvent({ tabId: 0 })
        fireEvent({})

        expect(tab1.performanceWarning).toEqual(false)
        expect(tab2.performanceWarning).toEqual(false)

        // Flags should be set to true for the correct tab when the event fires.
        fireEvent({ tabId: 1 })
        expect(tab1.performanceWarning).toEqual(true)
        expect(tab2.performanceWarning).toEqual(false)

        fireEvent({ tabId: 2 })
        expect(tab1.performanceWarning).toEqual(true)
        expect(tab2.performanceWarning).toEqual(true)

        // Flags should be cleared when the tabs are navigated.
        tab1 = await createTab(1, 'https://second-1.example')
        expect(tab1.performanceWarning).toEqual(false)
        expect(tab2.performanceWarning).toEqual(true)

        tab2 = await createTab(2, 'https://second-2.example')
        expect(tab1.performanceWarning).toEqual(false)
        expect(tab2.performanceWarning).toEqual(false)

        // The flags should be set again when fired again after navigation.
        fireEvent({ tabId: 1 })
        expect(tab1.performanceWarning).toEqual(true)
        expect(tab2.performanceWarning).toEqual(false)
        fireEvent({ tabId: 2 })
        expect(tab1.performanceWarning).toEqual(true)
        expect(tab2.performanceWarning).toEqual(true)
    })
})
