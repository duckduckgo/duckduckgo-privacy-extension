const {updateSetting} = require('./settings.es6')
const REFETCH_ALIAS_ALARM = 'refetchAlias'

const fetchAlias = () => {
    // if another fetch was previously scheduled, clear that and execute now
    chrome.alarms.get(REFETCH_ALIAS_ALARM, () => chrome.alarms.clear(REFETCH_ALIAS_ALARM))

    fetch('')
        .then(response => {
            if (response.ok) {
                response.text().then(alias => updateSetting('nextAlias', alias))
            } else {
                // ERROR
            }
        })
        .catch(e => {
            // TODO: Do we want to logout if the error is a 401 unauthorized?
            console.log(e)
            chrome.alarms.create(REFETCH_ALIAS_ALARM, {delayInMinutes: 2})
        })
}

module.exports = {
    REFETCH_ALIAS_ALARM,
    fetchAlias
}
