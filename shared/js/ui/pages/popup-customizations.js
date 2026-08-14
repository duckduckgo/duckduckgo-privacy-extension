import { formatRemaining } from '../../shared-utils/site-groups';

const app = document.getElementById('app');
const OPTIONS_BAR_CLASS = 'openfocusd-popup-options';
const STATUS_CLASS = 'openfocusd-group-status';

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

function ensureStatusCard(page) {
    let card = page.querySelector(`:scope > .${STATUS_CLASS}`);
    if (!card) {
        card = document.createElement('section');
        card.className = STATUS_CLASS;
        page.prepend(card);
    } else if (card !== page.firstElementChild) {
        page.prepend(card);
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
    box.append(el('div', 'openfocusd-group-status__group-label', 'Group'));

    if (!status || status.ungrouped) {
        box.classList.add('is-empty');
        box.append(el('div', 'openfocusd-group-status__group-name', 'Not in a group'));
        card.append(box);
        return;
    }

    if (status.isBlocked || displayedRemaining(status) <= 0) {
        box.classList.add('is-blocked');
    }

    box.append(el('div', 'openfocusd-group-status__group-name', status.groupName));
    box.append(el('div', 'openfocusd-group-status__allowance', status.allowanceLabel));
    box.append(el('div', 'openfocusd-group-status__remaining-label', 'Time remaining'));
    box.append(el('div', 'openfocusd-group-status__remaining', formatRemaining(displayedRemaining(status))));
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

    const statusCard = ensureStatusCard(page);

    let optionsBar = page.querySelector(`:scope > .${OPTIONS_BAR_CLASS}`);
    if (!optionsBar) {
        optionsBar = document.createElement('div');
        optionsBar.className = OPTIONS_BAR_CLASS;
        statusCard.after(optionsBar);
    } else if (optionsBar.previousElementSibling !== statusCard) {
        statusCard.after(optionsBar);
    }

    const cogButton = search.querySelector(':scope > .cog-button');
    if (cogButton && cogButton.parentElement !== optionsBar) {
        optionsBar.append(cogButton);
    }

    if (search !== page.lastElementChild) {
        page.append(search);
    }

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
