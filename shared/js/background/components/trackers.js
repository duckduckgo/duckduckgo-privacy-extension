import trackers from '../trackers'

/**
 * @typedef {import('./tds').default} TDSStorage
 */

export default class TrackersGlobal {
    /**
     * @param {{
     *  tds: TDSStorage
    * }} options
     */
    constructor ({ tds }) {
        /** @type {import('./resource-loader').OnUpdatedCallback} */
        const setLists = (name, _, data) => {
            trackers.setLists([{ name, data }])
        }
        this.ready = Promise.all([tds.tds.ready, tds.surrogates.ready]).then(() => {
            trackers.setLists([{
                name: 'tds',
                data: tds.tds.data
            }, {
                name: 'surrogates',
                data: tds.surrogates.data
            }])
            // listen for updates to tds or surrogates
            tds.tds.onUpdate(setLists)
            tds.surrogates.onUpdate(setLists)
        })
        this.trackers = trackers
    }
}
