const app = document.getElementById('app');

function moveSearchToBottom() {
    const page = app?.querySelector('.site-info > .page-inner');
    const search = page?.querySelector(':scope > .search');

    if (search && search !== page.lastElementChild) {
        page.append(search);
    }
}

if (app) {
    new MutationObserver(moveSearchToBottom).observe(app, {
        childList: true,
        subtree: true,
    });
    moveSearchToBottom();
}
