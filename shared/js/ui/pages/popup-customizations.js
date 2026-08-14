import { formatRemaining } from '../../shared-utils/site-groups';
import { SEARCH_ENGINE_DDG, normalizeSearchEngine, searchPlaceholder } from '../../shared-utils/search-engine';

const app = document.getElementById('app');
const CHROME_CLASS = 'openfocusd-popup-chrome';
const TABS_CLASS = 'openfocusd-popup-tabs';
const OPTIONS_BAR_CLASS = 'openfocusd-popup-options';
const STATUS_CLASS = 'openfocusd-group-status';
const TAB_BLOCKER = 'blocker';
const TAB_TRACKERS = 'trackers';
const TAB_BLOCKER_CLASS = 'openfocusd-tab-blocker';
const TAB_TRACKERS_CLASS = 'openfocusd-tab-trackers';
const SEARCH_ENGINE_ATTR = 'data-openfocusd-search-engine';

let activeTab = TAB_BLOCKER;
let searchEngine = SEARCH_ENGINE_DDG;
let searchEngineRequest = null;

function getTabId() {
    const value = Number(new URLSearchParams(location.search).get('tabId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text != null) {
        node.textContent = text;
    }
    return node;
}

function displayedRemaining(status) {
    if (!status || status.ungrouped || status.remainingSeconds <= 0) {
        return 0;
    }
    return Math.max(0, status.remainingSeconds - (Date.now() - status.serverNow) / 1000);
}

function createTabButton(id, label) {
    const button = el('button', 'openfocusd-popup-tab', label);
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('data-openfocusd-tab', id);
    return button;
}

function applyActiveTab(page) {
    page.classList.toggle(TAB_BLOCKER_CLASS, activeTab === TAB_BLOCKER);
    page.classList.toggle(TAB_TRACKERS_CLASS, activeTab === TAB_TRACKERS);
    page.querySelectorAll('[data-openfocusd-tab]').forEach((button) => {
        const selected = button.getAttribute('data-openfocusd-tab') === activeTab;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
    });
}

function applySearchEngine(page, search) {
    page.setAttribute(SEARCH_ENGINE_ATTR, searchEngine);
    const input = search.querySelector('.search-form__input');
    if (input) {
        input.setAttribute('placeholder', searchPlaceholder(searchEngine));
    }
}

function refreshSearchEngine(page, search) {
    applySearchEngine(page, search);
    if (!searchEngineRequest) {
        searchEngineRequest = chrome.runtime
            .sendMessage({
                messageType: 'getSetting',
                options: { name: 'searchEngine' },
            })
            .then((value) => {
                searchEngine = normalizeSearchEngine(value);
            })
            .catch(() => {
                searchEngine = SEARCH_ENGINE_DDG;
            });
    }

    return searchEngineRequest.then(() => applySearchEngine(page, search));
}

function ensureChrome(page) {
    let chromeBar = page.querySelector(`:scope > .${CHROME_CLASS}`);
    if (!chromeBar) {
        chromeBar = el('div', CHROME_CLASS);

        const tabs = el('nav', TABS_CLASS);
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Popup sections');
        tabs.append(createTabButton(TAB_BLOCKER, 'Website Blocker'), createTabButton(TAB_TRACKERS, 'Tracker Blocker'));
        tabs.addEventListener('click', (event) => {
            const button = event.target.closest('[data-openfocusd-tab]');
            if (!button) {
                return;
            }
            activeTab = button.getAttribute('data-openfocusd-tab') || TAB_BLOCKER;
            applyActiveTab(page);
        });

        const optionsBar = el('div', OPTIONS_BAR_CLASS);
        chromeBar.append(tabs, optionsBar);
        page.prepend(chromeBar);
    } else if (chromeBar !== page.firstElementChild) {
        page.prepend(chromeBar);
    }

    applyActiveTab(page);
    return chromeBar;
}

function ensureStatusCard(page, afterNode) {
    let card = page.querySelector(`:scope > .${STATUS_CLASS}`);
    if (!card) {
        card = document.createElement('section');
        card.className = STATUS_CLASS;
        afterNode.after(card);
    } else if (card.previousElementSibling !== afterNode) {
        afterNode.after(card);
    }
    return card;
}

function renderStatus(card, status) {
    card.replaceChildren();

    const current = el('div', 'openfocusd-group-status__current');
    current.append(el('div', 'openfocusd-group-status__label', 'You are currently on'));
    current.append(el('div', 'openfocusd-group-status__host', status?.hostname || 'this page'));
    card.append(current);

    const box = el('div', 'openfocusd-group-status__box');

    if (!status || status.ungrouped) {
        box.classList.add('is-empty');
        box.append(el('div', 'openfocusd-group-status__group-label', 'Group'));
        box.append(el('div', 'openfocusd-group-status__group-name', 'Not in a group'));
        card.append(box);
        return;
    }

    if (status.isBlocked || displayedRemaining(status) <= 0) {
        box.classList.add('is-blocked');
    }

    const row = el('div', 'openfocusd-group-status__row');
    const details = el('div', 'openfocusd-group-status__details');
    details.append(el('div', 'openfocusd-group-status__group-label', 'Group'));
    details.append(el('div', 'openfocusd-group-status__group-name', status.groupName));
    details.append(el('div', 'openfocusd-group-status__allowance', status.allowanceLabel));

    const remaining = el('div', 'openfocusd-group-status__time');
    remaining.append(el('div', 'openfocusd-group-status__remaining-label', 'Time remaining'));
    remaining.append(el('div', 'openfocusd-group-status__remaining', formatRemaining(displayedRemaining(status))));

    row.append(details);
    row.append(remaining);
    box.append(row);
    card.append(box);
}

function tickRemaining(card) {
    const status = card._status;
    if (!status || status.ungrouped) {
        return;
    }

    const remaining = displayedRemaining(status);
    const node = card.querySelector('.openfocusd-group-status__remaining');
    if (node) {
        node.textContent = formatRemaining(remaining);
    }

    const box = card.querySelector('.openfocusd-group-status__box');
    if (box && remaining <= 0) {
        box.classList.add('is-blocked');
    }

    if (remaining <= 0 && !status.isBlocked) {
        refreshStatus(card);
    }
}

async function refreshStatus(card) {
    try {
        const status = await chrome.runtime.sendMessage({
            messageType: 'getPopupGroupStatus',
            options: { tabId: getTabId() },
        });
        card._status = status;
        renderStatus(card, status);
    } catch {
        // Firefox and older builds may not have the groups handler.
    }
}

function customizePopupLayout() {
    const page = app?.querySelector('.site-info > .page-inner');
    const search = page?.querySelector(':scope > .search');

    if (!page || !search) {
        return;
    }

    const chromeBar = ensureChrome(page);
    if (search.previousElementSibling !== chromeBar) {
        chromeBar.after(search);
    }
    const statusCard = ensureStatusCard(page, search);
    const optionsBar = chromeBar.querySelector(`.${OPTIONS_BAR_CLASS}`);

    const cogButton = search.querySelector(':scope > .cog-button');
    if (cogButton && optionsBar && cogButton.parentElement !== optionsBar) {
        optionsBar.append(cogButton);
    }

    refreshSearchEngine(page, search);

    if (!statusCard._refreshing) {
        statusCard._refreshing = true;
        refreshStatus(statusCard);
        window.setInterval(() => tickRemaining(statusCard), 250);
        window.setInterval(() => refreshStatus(statusCard), 1000);
    }
}

if (app) {
    new MutationObserver(customizePopupLayout).observe(app, {
        childList: true,
        subtree: true,
    });
    customizePopupLayout();
}
