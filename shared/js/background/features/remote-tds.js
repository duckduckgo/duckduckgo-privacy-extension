import tdsStorage from '../storage/tds'
import trackers from '../trackers'

export default {
    init: async () => {
        try {
            const tdsLists = await tdsStorage.getLists(/* preferLocal= */true)
            trackers.setLists(tdsLists)
        } catch (e) {
            console.warn('Error loading tds lists', e)
        }
        return tdsStorage
    },
    onInstalled: () => {
        tdsStorage.initOnInstall()
    }
}
