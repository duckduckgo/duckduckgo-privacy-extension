/**
 *
 * Sets GPC signal header
 *
 */
import settings from './settings.es6'

// Return Sec-GPC header if setting enabled
export function getHeader () {
    const GPCEnabled = settings.getSetting('GPC')
    if (GPCEnabled) {
        return {
            name: 'Sec-GPC',
            value: '1'
        }
    }
}
