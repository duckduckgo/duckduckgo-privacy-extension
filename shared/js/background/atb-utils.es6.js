const ATB_EPOCH = 1456290000000
const ONE_WEEK = 604800000
const ONE_DAY = 86400000
const ONE_HOUR = 3600000
const ONE_MINUTE = 60000

/**
 * Returns an object with ATB
 * majorVersion and minorVersion
 *
 * majorVersion = # of weeks since noon EST on 2/24/16
 * minorVersion = # of days into the current week
 */
function getCurrentATB () {
    const d = new Date()
    const localTime = d.getTime()
    // convert local to UTC:
    const utcTime = localTime + (d.getTimezoneOffset() * ONE_MINUTE)
    // convert to approximation of est using 5 hour offset so we
    // can compare to the DST start/stop date in eastern time and
    // determine whether it's DST or not.
    const est = new Date(utcTime + (ONE_HOUR * -5))
    // First determine DST start/end day for Eastern Timezone.
    // It's always the 2nd Sunday in March. In 2016 it's 3/13/16 and 11/6/16, In 2017 it's 3/12/17 and 11/5/17, etc.
    const dstStartDay = 13 - ((est.getFullYear() - 2016) % 6)
    const dstStopDay = 6 - ((est.getFullYear() - 2016) % 6)
    // Once we have start/stop day for the current year, we can check whether the current day (based on est) is
    // within the EDT window:
    const isDST = (est.getMonth() > 2 || (est.getMonth() === 2 && est.getDate() >= dstStartDay)) &&
        (est.getMonth() < 10 || (est.getMonth() === 10 && est.getDate() < dstStopDay))
    // finally we need to adjust the epoch based on whether we're in EST or EDT, since
    // the constant ATB_EPOCH is in EST, when we're in EDT we need to subtract an
    // hour otherwise we'll be off by 1 hour when we try to calc the major/minor version #'s:
    const epoch = isDST ? ATB_EPOCH - ONE_HOUR : ATB_EPOCH
    // time in ms since DST adjusted epoch:
    const timeSinceATBEpoch = localTime - epoch

    const majorVersion = Math.ceil(timeSinceATBEpoch / ONE_WEEK)
    const minorVersion = Math.ceil(timeSinceATBEpoch % ONE_WEEK / ONE_DAY)
    const version = `v${majorVersion}-${minorVersion}`

    return { minorVersion, majorVersion, version }
}

function getDaysBetweenCohorts (cohort1, cohort2) {
    return 7 * (cohort2.majorVersion - cohort1.majorVersion) +
        (cohort2.minorVersion - cohort1.minorVersion)
}

module.exports = {
    getCurrentATB,
    getDaysBetweenCohorts
}
