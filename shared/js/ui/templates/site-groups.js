const bel = require('nanohtml');
const t = window.DDG.base.i18n.t;
const { formatRemainingLong, secondsToHoursMinutes } = require('../../shared-utils/site-groups');

function progressForGroup(group) {
    if (!group.maxSecondsPerDay) {
        return 0;
    }
    return Math.max(0, Math.min(100, (group.remainingSeconds / group.maxSecondsPerDay) * 100));
}

function groupCard(group) {
    const time = secondsToHoursMinutes(group.maxSecondsPerDay);
    const timer = bel`<div
        class="site-group-timer js-site-group-timer"
        style="--progress: ${progressForGroup(group)}"
        aria-hidden="true"
    >
        <div class="site-group-timer__inner">
            <span class="site-group-timer__label">${t('options:timeLeft.title')}</span>
            <span class="site-group-timer__value js-site-group-remaining">${formatRemainingLong(group.remainingSeconds)}</span>
        </div>
    </div>`;

    return bel`<article class="site-group-card js-site-group" data-group-id="${group.id}">
        <div class="site-group-card__main">
            ${timer}
            <div class="site-group-card__fields">
                <label class="site-group-field">
                    <span>${t('options:groupName.title')}</span>
                    <input class="js-site-group-name" type="text" value="${group.name}" maxlength="60">
                </label>
                <div class="site-group-time">
                    <span class="site-group-time__label">${t('options:maxTimeAllowed.title')}</span>
                    <label class="site-group-time__unit">
                        <input class="js-site-group-hours" type="number" min="0" max="24" value="${time.hours}">
                        <span>${t('options:hoursAbbr.title')}</span>
                    </label>
                    <label class="site-group-time__unit">
                        <input class="js-site-group-minutes" type="number" min="0" max="59" value="${time.minutes}">
                        <span>${t('options:minutesAbbr.title')}</span>
                    </label>
                </div>
                <div class="site-group-card__actions">
                    <button class="site-group-save js-site-group-save" type="button">${t('options:saveGroup.title')}</button>
                    <button class="site-group-delete js-site-group-delete" type="button">${t('options:deleteGroup.title')}</button>
                    <span class="site-group-status is-hidden js-site-group-status" role="status"></span>
                </div>
            </div>
        </div>
        <div class="site-group-sites">
            <div class="site-group-sites__header">
                <h3>${t('options:groupBlockedWebsites.title')}</h3>
            </div>
            <div class="site-group-add">
                <input
                    class="js-site-group-domain-input"
                    type="text"
                    placeholder="${t('options:addWebsitePlaceholder.title')}"
                    spellcheck="false"
                >
                <button class="js-site-group-add-domain" type="button">${t('options:addBlockedWebsite.title')}</button>
            </div>
            <ul class="site-group-domain-list js-site-group-domain-list">
                ${
                    group.domains.length
                        ? group.domains.map(
                              (domain) => bel`<li>
                        <button class="site-group-domain-remove js-site-group-remove-domain" type="button" data-domain="${domain}" aria-label="${t('options:removeWebsite.title')}">×</button>
                        <span>${domain}</span>
                    </li>`,
                          )
                        : bel`<li class="site-group-domain-empty">${t('options:noGroupedWebsites.title')}</li>`
                }
            </ul>
            <p class="site-group-error is-hidden js-site-group-error" role="alert"></p>
        </div>
    </article>`;
}

module.exports = function () {
    const groups = this.model.groups || [];
    return bel`<section class="options-content__site-groups">
        <div class="site-groups-header">
            <div>
                <h2 class="menu-title">${t('options:groupsTitle.title')}</h2>
                <p class="menu-paragraph">${t('options:groupsDesc.title')}</p>
            </div>
            <button class="site-groups-add js-site-groups-add" type="button">${t('options:addGroup.title')}</button>
        </div>
        <div class="site-groups-list js-site-groups-list">
            ${groups.map(groupCard)}
        </div>
    </section>`;
};
